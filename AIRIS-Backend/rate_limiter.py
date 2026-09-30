"""
Single-Instance, In-Memory Production Rate Limiter & Concurrency Guard for AIRIS Backend.

ARCHITECTURAL CONSTRAINT: This rate limiter is designed for SINGLE-INSTANCE deployment.
Do not scale horizontally without implementing a shared rate-limit store (e.g., Redis).

Rules:
1. Authenticated rate limiting and concurrency locking strictly use verified Firebase UIDs
   extracted from `Authorization: Bearer <token>` headers via `firebase_admin.auth.verify_id_token`.
2. Client-supplied UIDs in request bodies or custom headers are NEVER trusted.
3. Unauthenticated/public traffic falls back to client IP address rate limiting.
4. Shared campus Wi-Fi NAT IPs do NOT throttle distinct authenticated student UIDs collectively.
5. Per-UID expensive concurrency locks release cleanly in `finally` blocks (no stuck locks).
6. A global ceiling limits maximum concurrent expensive processing to protect container RAM/CPU.
7. Rejections return HTTP 429 Too Many Requests with standard JSON error shapes and Retry-After headers.
8. Stale entries are cleaned up to prevent unbounded memory growth.
"""

import time
import os
import threading
from typing import Dict, List, Tuple, Optional, Any
from fastapi import Request, HTTPException, Header
import config

# --- CENTRALIZED CONFIGURATION DEFAULTS ---
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"

# Expensive endpoints: /upload, /analyze, /interview/transcribe
PER_USER_CONCURRENCY_LIMIT = int(os.getenv("PER_USER_CONCURRENCY_LIMIT", "1"))
PER_USER_EXPENSIVE_REQUEST_LIMIT = int(os.getenv("PER_USER_EXPENSIVE_REQUEST_LIMIT", "5"))  # per min

# General authenticated endpoints: /interview/start, /interview/answer, /interview/report
PER_USER_GENERAL_REQUEST_LIMIT = int(os.getenv("PER_USER_GENERAL_REQUEST_LIMIT", "20"))  # per min

# Public endpoints: /, /normalize, /career/compatibility
PER_IP_PUBLIC_REQUEST_LIMIT = int(os.getenv("PER_IP_PUBLIC_REQUEST_LIMIT", "60"))  # per min

# Global server-wide ceiling for expensive operations (PyTorch / LLM / Transcribe)
GLOBAL_EXPENSIVE_CONCURRENCY_LIMIT = int(os.getenv("GLOBAL_EXPENSIVE_CONCURRENCY_LIMIT", "5"))

# --- IN-MEMORY STATE & THREAD LOCKS ---
_lock = threading.Lock()

# Sliding window request timestamps: { "uid:student123": [t1, t2], "ip:120.28.1.1": [t1] }
_request_timestamps: Dict[str, List[float]] = {}

# Active concurrency counts per user: { "uid:student123": 1 }
_user_concurrency_counts: Dict[str, int] = {}

# Active global expensive concurrency count
_global_expensive_count: int = 0


import ipaddress

# Trusted reverse proxies (e.g. Caddy, local loopback, Docker bridge network)
# Configurable via TRUSTED_PROXIES env var (comma-separated IPs/CIDRs)
DEFAULT_TRUSTED_PROXIES = "127.0.0.1,::1,localhost,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

def _get_trusted_networks() -> List[Any]:
    raw_trusted = os.getenv("TRUSTED_PROXIES", DEFAULT_TRUSTED_PROXIES)
    networks = []
    for item in raw_trusted.split(","):
        cleaned = item.strip()
        if not cleaned:
            continue
        try:
            if "/" in cleaned:
                networks.append(ipaddress.ip_network(cleaned, strict=False))
            else:
                networks.append(ipaddress.ip_network(f"{cleaned}/32" if ":" not in cleaned else f"{cleaned}/128", strict=False))
        except ValueError:
            pass
    return networks

def is_trusted_proxy(ip_str: str) -> bool:
    """Checks whether an immediate peer IP address matches a configured trusted reverse proxy."""
    if not ip_str or ip_str in ("testclient", "localhost", "127.0.0.1", "::1"):
        return True
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in _get_trusted_networks())
    except ValueError:
        return False

def resolve_request_identity(request: Request, authorization: Optional[str] = None) -> Tuple[str, str]:
    """
    Extracts verified identity for rate limiting & concurrency protection.
    Order of precedence:
    1. Authorization: Bearer <firebase_id_token> -> Verified Firebase UID via firebase_admin.auth.verify_id_token
    2. Fallback -> Client IP address (for public/unauthenticated requests or when token is missing/unverified)
       Only trusts X-Forwarded-For / X-Real-IP if the immediate peer is in TRUSTED_PROXIES.
    """
    auth_header = None
    if isinstance(authorization, str):
        auth_header = authorization
    else:
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")

    if auth_header and isinstance(auth_header, str) and auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ")[1].strip()
        if token:
            try:
                from firebase_admin import auth
                decoded_token = auth.verify_id_token(token, clock_skew_seconds=10)
                uid = decoded_token.get("uid")
                if uid:
                    return ("uid", str(uid))
            except Exception:
                # Token invalid, expired, or firebase_admin uninitialized in test
                pass

    # Immediate peer IP
    peer_ip = "127.0.0.1"
    if request.client and request.client.host:
        peer_ip = request.client.host.strip()

    # Security rule F09: If immediate peer is NOT a trusted proxy, ignore all forwarding headers!
    if not is_trusted_proxy(peer_ip):
        return ("ip", peer_ip)

    # Immediate peer is trusted proxy (e.g. Caddy) -> safely inspect forwarding headers
    client_ip = peer_ip
    forwarded = request.headers.get("X-Forwarded-For") or request.headers.get("x-forwarded-for")
    if forwarded and isinstance(forwarded, str) and forwarded.strip():
        # In an X-Forwarded-For chain, trusted proxies append to the right.
        # Traverse from right-to-left to find the rightmost non-trusted client IP.
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        for candidate in reversed(parts):
            if not is_trusted_proxy(candidate):
                client_ip = candidate
                break
        else:
            client_ip = parts[-1] if parts else peer_ip
    else:
        real_ip = request.headers.get("X-Real-IP") or request.headers.get("x-real-ip")
        if real_ip and isinstance(real_ip, str) and real_ip.strip():
            client_ip = real_ip.strip()

    return ("ip", client_ip)


def check_rate_limit(identity_type: str, identity_val: str, max_requests: int, window_seconds: int = 60):
    """
    Applies sliding window rate limiting for a given identity.
    Throws HTTP 429 if the request limit is exceeded within window_seconds.
    """
    if not RATE_LIMIT_ENABLED:
        return

    key = f"{identity_type}:{identity_val}"
    now = time.time()

    with _lock:
        timestamps = _request_timestamps.get(key, [])
        valid_timestamps = [t for t in timestamps if (now - t) < window_seconds]

        if len(valid_timestamps) >= max_requests:
            oldest = valid_timestamps[0]
            retry_after = max(1, int(window_seconds - (now - oldest)))
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "TOO_MANY_REQUESTS",
                    "message": f"Rate limit exceeded. Please wait {retry_after} seconds before trying again.",
                    "retryAfterSeconds": retry_after
                },
                headers={"Retry-After": str(retry_after)}
            )

        valid_timestamps.append(now)
        _request_timestamps[key] = valid_timestamps

        # Periodically clean up stale entries to prevent memory growth
        # Only run cleanup occasionally to avoid performance impact
        if len(_request_timestamps) > 1000:
            _cleanup_stale_entries()


class ExpensiveConcurrencyGuard:
    """
    Context manager that acquires and safely releases per-UID and global concurrency locks.
    Guarantees clean release via __exit__ even if exceptions or failures occur inside the block.
    """
    def __init__(self, identity_key: str):
        self.identity_key = identity_key
        self.acquired = False

    def __enter__(self):
        if not RATE_LIMIT_ENABLED:
            return self

        global _global_expensive_count
        with _lock:
            # 1. Check Global Ceiling
            if _global_expensive_count >= GLOBAL_EXPENSIVE_CONCURRENCY_LIMIT:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "TOO_MANY_REQUESTS",
                        "message": "Server peak capacity reached. Please retry in a few seconds.",
                        "retryAfterSeconds": 5
                    },
                    headers={"Retry-After": "5"}
                )

            # 2. Check Per-User Concurrency
            current_user_count = _user_concurrency_counts.get(self.identity_key, 0)
            if current_user_count >= PER_USER_CONCURRENCY_LIMIT:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "TOO_MANY_REQUESTS",
                        "message": "An expensive operation is already processing for your account. Please wait for it to complete.",
                        "retryAfterSeconds": 5
                    },
                    headers={"Retry-After": "5"}
                )

            _global_expensive_count += 1
            _user_concurrency_counts[self.identity_key] = current_user_count + 1
            self.acquired = True

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if not self.acquired:
            return False

        global _global_expensive_count
        with _lock:
            if _global_expensive_count > 0:
                _global_expensive_count -= 1

            count = _user_concurrency_counts.get(self.identity_key, 0)
            if count > 1:
                _user_concurrency_counts[self.identity_key] = count - 1
            elif self.identity_key in _user_concurrency_counts:
                del _user_concurrency_counts[self.identity_key]

        return False


def _cleanup_stale_entries():
    """
    Remove stale entries from rate limit tracking to prevent unbounded memory growth.
    Called periodically and during rate limit checks.
    """
    now = time.time()
    with _lock:
        stale_keys = []
        for key, timestamps in _request_timestamps.items():
            # Remove timestamps older than the window (60 seconds)
            valid = [t for t in timestamps if (now - t) < 60]
            if valid:
                _request_timestamps[key] = valid
            else:
                stale_keys.append(key)
        for key in stale_keys:
            del _request_timestamps[key]


def _reset_limiter_state_for_testing():
    """Resets all in-memory rate limiting and concurrency state for unit testing."""
    global _global_expensive_count
    with _lock:
        _request_timestamps.clear()
        _user_concurrency_counts.clear()
        _global_expensive_count = 0
