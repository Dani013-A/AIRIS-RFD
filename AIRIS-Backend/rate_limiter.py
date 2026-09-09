"""
Single-Instance, In-Memory Production Rate Limiter & Concurrency Guard for AIRIS Backend.

Rules:
1. Authenticated rate limiting and concurrency locking strictly use verified Firebase UIDs
   extracted from `Authorization: Bearer <token>` headers via `firebase_admin.auth.verify_id_token`.
2. Client-supplied UIDs in request bodies or custom headers are NEVER trusted.
3. Unauthenticated/public traffic falls back to client IP address rate limiting.
4. Shared campus Wi-Fi NAT IPs do NOT throttle distinct authenticated student UIDs collectively.
5. Per-UID expensive concurrency locks release cleanly in `finally` blocks (no stuck locks).
6. A global ceiling limits maximum concurrent expensive processing to protect container RAM/CPU.
7. Rejections return HTTP 429 Too Many Requests with standard JSON error shapes and Retry-After headers.
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


def resolve_request_identity(request: Request, authorization: Optional[str] = None) -> Tuple[str, str]:
    """
    Extracts verified identity for rate limiting & concurrency protection.
    Order of precedence:
    1. Authorization: Bearer <firebase_id_token> -> Verified Firebase UID via firebase_admin.auth.verify_id_token
    2. Fallback -> Client IP address (for public/unauthenticated requests or when token is missing/unverified)
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

    # Fallback to client IP
    client_ip = "127.0.0.1"
    if request.client and request.client.host:
        client_ip = request.client.host

    # Check X-Real-IP set authoritatively by Caddy/reverse proxy
    real_ip = request.headers.get("X-Real-IP") or request.headers.get("x-real-ip")
    if real_ip and isinstance(real_ip, str):
        client_ip = real_ip.strip()
    else:
        # Check X-Forwarded-For chain if behind proxy
        forwarded = request.headers.get("X-Forwarded-For") or request.headers.get("x-forwarded-for")
        if forwarded and isinstance(forwarded, str):
            # Take rightmost IP appended by trusted reverse proxy to prevent spoofing
            client_ip = forwarded.split(",")[-1].strip()

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


def _reset_limiter_state_for_testing():
    """Resets all in-memory rate limiting and concurrency state for unit testing."""
    global _global_expensive_count
    with _lock:
        _request_timestamps.clear()
        _user_concurrency_counts.clear()
        _global_expensive_count = 0
