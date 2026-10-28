"""
Authoritative Backend AI Recommendation Generator and Security Verifier.
Enforces SSRF protection, DNS resolution checks, trusted domain policies,
external network reachability, gap-first conditioning, and quota bounds.
"""

import os
import hashlib
import re
import json
import time
import socket
import ipaddress
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
import requests

TRUSTED_DOMAINS = {
    "hrci.org", "cfainstitute.org",
    "coursera.org",
    "edx.org",
    "cisco.com",
    "netacad.com",
    "skillsforall.com",
    "comptia.org",
    "microsoft.com",
    "learn.microsoft.com",
    "amazon.com",
    "aws.amazon.com",
    "google.com",
    "cloud.google.com",
    "redhat.com",
    "linuxfoundation.org",
    "linuxjourney.com",
    "subnetting.net",
    "wireshark.org",
    "github.com",
    "freecodecamp.org",
    "kaggle.com",
    "w3schools.com",
    "developer.mozilla.org",
    "oracle.com",
    "pmi.org", "asq.org", "open.edu", "selenium.dev", "istqb.org",
    "udacity.com",
    "pluralsight.com",
    "udemy.com",
    "codecademy.com",
    "datacamp.com",
    "cloudacademy.com",
    "mit.edu",
    "stanford.edu",
    "harvard.edu",
    "berkeley.edu",
    "purdue.edu", "openstax.org", "who.int", "autodesk.com", "mathworks.com",
    "lean.org", "opm.gov", "react.dev", "python.org", "pydata.org", "postgresql.org", "owasp.org", "unity.com", "hubspot.com", "figma.com", "cypress.io", "ansible.com", "use-the-index-luke.com",
}

DISALLOWED_DOMAINS = {
    "google.com/search",
    "bing.com/search",
    "yahoo.com/search",
    "duckduckgo.com",
    "example.com",
    "placeholder.com",
    "test.com",
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
}

DISALLOWED_HOSTS = {
    "localhost",
    "metadata.google.internal",
    "instance-data",
    "metadata.azure.com",
}

FORBIDDEN_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback IPv4
    ipaddress.ip_network("10.0.0.0/8"),        # RFC1918 Private
    ipaddress.ip_network("172.16.0.0/12"),     # RFC1918 Private
    ipaddress.ip_network("192.168.0.0/16"),    # RFC1918 Private
    ipaddress.ip_network("169.254.0.0/16"),    # Link-local / Cloud metadata
    ipaddress.ip_network("100.64.0.0/10"),     # CGNAT
    ipaddress.ip_network("0.0.0.0/8"),         # "This" network
    ipaddress.ip_network("224.0.0.0/4"),       # Multicast
    ipaddress.ip_network("240.0.0.0/4"),       # Reserved
    ipaddress.ip_network("::1/128"),           # Loopback IPv6
    ipaddress.ip_network("fe80::/10"),         # Link-local IPv6
    ipaddress.ip_network("fc00::/7"),          # Unique local IPv6
    ipaddress.ip_network("::/128"),            # Unspecified IPv6
    ipaddress.ip_network("ff00::/8"),          # Multicast IPv6
]

def is_safe_ip(ip_str: str) -> bool:
    """Validates that an IP address is public and not private/loopback/link-local/metadata."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False

    if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_unspecified or ip.is_reserved:
        return False

    for net in FORBIDDEN_IP_NETWORKS:
        if ip in net:
            return False

    return True

def resolve_and_validate_hostname(hostname: str) -> Tuple[bool, str]:
    """
    Authoritative SSRF gate: resolves hostname via DNS and verifies all resolved
    IPv4/IPv6 addresses are strictly public.
    """
    h_clean = hostname.strip().lower().rstrip(".")
    if not h_clean:
        return False, "Empty hostname"

    if h_clean in DISALLOWED_HOSTS or "metadata" in h_clean:
        return False, f"Forbidden metadata hostname: {h_clean}"

    # Try literal IP check first
    try:
        ip = ipaddress.ip_address(h_clean)
        if not is_safe_ip(str(ip)):
            return False, f"Literal non-public IP rejected: {h_clean}"
        return True, str(ip)
    except ValueError:
        pass

    try:
        addr_info = socket.getaddrinfo(h_clean, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as e:
        return False, f"DNS resolution failed for {h_clean}: {str(e)}"
    except Exception as e:
        return False, f"Socket error resolving {h_clean}: {str(e)}"

    if not addr_info:
        return False, f"No IP addresses resolved for {h_clean}"

    for entry in addr_info:
        sockaddr = entry[4]
        ip_cand = sockaddr[0]
        if not is_safe_ip(ip_cand):
            return False, f"Resolved address {ip_cand} is private/loopback/metadata"

    return True, "Safe"

def canonicalize_resource_url(raw_url: str) -> str:
    """Strips tracking query parameters and trailing slashes."""
    parsed = urllib.parse.urlparse(raw_url)
    qs = urllib.parse.parse_qsl(parsed.query)
    tracking_keys = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref"}
    cleaned_qs = [(k, v) for k, v in qs if k.lower() not in tracking_keys]
    new_query = urllib.parse.urlencode(cleaned_qs)
    cleaned = urllib.parse.urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        parsed.path.rstrip("/") if parsed.path != "/" else "/",
        parsed.params,
        new_query,
        ""
    ))
    return cleaned

def is_domain_trusted(hostname: str) -> bool:
    h = hostname.lower().replace("www.", "").strip()
    return any(h == td or h.endswith("." + td) for td in TRUSTED_DOMAINS)

def verify_external_resource_url(url: str, timeout: float = 5.0, max_redirects: int = 3) -> Dict[str, Any]:
    """
    Authoritative external resource verifier with deep SSRF protection.
    Checks protocol, domain whitelist, path specificity, DNS IP resolution,
    and HTTP reachability without blind redirect following.
    """
    if not url or not isinstance(url, str):
        return {"status": "invalid_url", "verified": False, "reason": "Empty URL"}

    url_clean = url.strip()
    if not (url_clean.startswith("https://") or url_clean.startswith("http://")):
        return {"status": "invalid_protocol", "verified": False, "reason": "Requires HTTP/HTTPS"}

    parsed = urllib.parse.urlparse(url_clean)
    host = (parsed.hostname or "").lower().removeprefix("www.")
    if not host or parsed.username or parsed.password:
        return {"status": "invalid_host", "verified": False, "reason": "Missing hostname or URL credentials"}
    for blocked in DISALLOWED_DOMAINS:
        domain, _, prefix = blocked.partition("/")
        if (host == domain or host.endswith("." + domain)) and (not prefix or parsed.path.startswith("/" + prefix)):
            return {"status": "disallowed_domain", "verified": False, "reason": "Search or shortener destination"}

    if not is_domain_trusted(host):
        return {"status": "domain_mismatch", "verified": False, "reason": f"Host '{host}' not in trusted educational registry"}

    path = parsed.path.strip()
    if path in ("", "/", "/en", "/en-us", "/courses", "/certifications"):
        return {"status": "generic_landing", "verified": False, "reason": "Generic root homepage without specific course/cert slug"}

    # Authoritative DNS SSRF Check
    safe, msg = resolve_and_validate_hostname(host)
    if not safe:
        return {"status": "ssrf_blocked", "verified": False, "reason": msg}

    canonical_url = canonicalize_resource_url(url_clean)

    # Safe HTTP Reachability Probe
    current_url = canonical_url
    redirect_count = 0
    session = requests.Session()
    headers = {
        "User-Agent": "AIRIS-Learning-Link-Audit/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }

    try:
        while redirect_count <= max_redirects:
            parsed_curr = urllib.parse.urlparse(current_url)
            curr_host = parsed_curr.hostname or ""
            is_safe, err = resolve_and_validate_hostname(curr_host)
            if not is_safe:
                return {"status": "ssrf_redirect_blocked", "verified": False, "reason": err}
            if not is_domain_trusted(curr_host):
                return {"status": "domain_mismatch", "verified": False, "reason": f"Redirected to untrusted host: {curr_host}"}

            try:
                resp = session.head(current_url, headers=headers, timeout=timeout, allow_redirects=False)
                if resp.status_code in (405, 501):
                    # Some educational servers disallow HEAD, try shallow GET
                    resp = session.get(current_url, headers=headers, timeout=timeout, allow_redirects=False, stream=True)
            except requests.exceptions.Timeout:
                return {"status": "timeout", "verified": False, "reason": "Connection timed out"}
            except requests.exceptions.SSLError:
                return {"status": "ssl_error", "verified": False, "reason": "SSL handshake failure"}
            except Exception as e:
                return {"status": "unreachable", "verified": False, "reason": str(e)}

            if resp.status_code in (301, 302, 303, 307, 308):
                loc = resp.headers.get("Location")
                if not loc:
                    return {"status": "broken_redirect", "verified": False, "reason": "Redirect missing location"}
                current_url = urllib.parse.urljoin(current_url, loc)
                redirect_count += 1
                continue

            if resp.status_code == 200:
                return {
                    "status": "verified",
                    "verified": True,
                    "finalUrl": current_url,
                    "providerDomain": curr_host,
                    "statusCode": 200
                }
            elif resp.status_code == 404:
                return {"status": "not_found", "verified": False, "reason": "HTTP 404 Not Found"}
            elif resp.status_code == 403:
                # WAF protection: do not bypass CAPTCHA/WAF. Mark unverified.
                return {"status": "waf_blocked", "verified": False, "reason": "HTTP 403 WAF/Access Denied"}
            else:
                return {"status": "http_error", "verified": False, "reason": f"HTTP {resp.status_code}"}

        return {"status": "too_many_redirects", "verified": False, "reason": "Exceeded max redirect depth"}

    finally:
        session.close()

# Bounded in-memory recommendation cache: (target_position, gaps_hash) -> recommendations
_BOUNDED_RECOMMENDATION_CACHE: Dict[str, List[Dict[str, Any]]] = {}
_MAX_CACHE_ENTRIES = 200

def _get_cache_key(target_position: str, priority_gaps: List[str], degree_program: str = "", raw_text: str = "", curated_catalog=None) -> str:
    norm_pos = target_position.strip().lower()
    norm_gaps = ",".join(sorted(g.strip().lower() for g in priority_gaps if g.strip()))
    context = json.dumps([norm_pos, norm_gaps, degree_program, raw_text, curated_catalog], sort_keys=True)
    return hashlib.sha256(context.encode()).hexdigest()

def generate_and_verify_ai_recommendations(
    target_position: str,
    priority_gaps: List[str],
    degree_program: str = "",
    raw_text: str = "",
    curated_catalog: Optional[List[Dict[str, Any]]] = None,
    verify_live_network: bool = True
) -> List[Dict[str, Any]]:
    """
    Authoritative backend generator and verifier for AI recommendations.
    Enforces gap-first prompting, quota rules (<=3 certs, <=3 courses, <=3 practice),
    authoritative SSRF and reachability checks, and failure tolerance.
    """
    if not verify_live_network or not target_position or not priority_gaps:
        return []

    cache_key = _get_cache_key(target_position, priority_gaps, degree_program, raw_text, curated_catalog)
    if cache_key in _BOUNDED_RECOMMENDATION_CACHE:
        return _BOUNDED_RECOMMENDATION_CACHE[cache_key]

    from ai_service import generate_text_with_fallback

    gaps_str = "\n".join(f"- {g}" for g in priority_gaps[:6])
    prompt = f"""
You are an expert Educational Curation Engine for AIRIS.
Generate real, authoritative learning resources specifically targeting the validated competency gaps for the target role.

TARGET POSITION: "{target_position}"
DEGREE PROGRAM: "{degree_program or 'Not Specified'}"

VALIDATED COMPETENCY GAPS (YOU MUST ADDRESS THESE SPECIFIC GAPS FIRST):
{gaps_str}

CRITICAL RULES:
1. Every resource MUST be real, publicly accessible, and hosted on an authoritative platform:
   (coursera.org, edx.org, cisco.com, netacad.com, skillsforall.com, comptia.org, microsoft.com, aws.amazon.com, google.com, redhat.com, linuxfoundation.org, subnetting.net, wireshark.org, github.com, freecodecamp.org, kaggle.com).
2. NEVER return generic root homepages (e.g. "https://www.coursera.org"). Include the specific course/cert URL slug.
3. Certifications MUST ONLY be recognized credentials issued by established vendor bodies (Cisco, CompTIA, AWS, Microsoft, Google, etc.).
4. Do NOT recommend skills that do not address the validated gaps.
5. Return ONLY a valid JSON array of resource candidate objects.

JSON SCHEMA:
[
  {{
    "title": "<Specific Course, Certification, or Lab Title>",
    "provider": "<Authoritative Provider Name>",
    "type": "certification" | "course" | "practice",
    "url": "<Full HTTPS URL to specific resource>",
    "description": "<At least 15 words explaining how this resource closes the candidate's gap>",
    "skills": ["<gap1>", "<gap2>"]
  }}
]
"""
    raw_candidates: List[Dict[str, Any]] = []
    try:
        raw_res = generate_text_with_fallback(prompt)
        match = re.search(r'\[.*\]', raw_res, re.DOTALL)
        if match:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list):
                raw_candidates = parsed
    except Exception as e:
        print(f"[AIRIS Backend AI Recommendation] Provider error or unavailable: {e}")
        return []

    verified_certs: List[Dict[str, Any]] = []
    verified_courses: List[Dict[str, Any]] = []
    verified_practice: List[Dict[str, Any]] = []

    seen_urls = set()
    curated_urls = set()
    if curated_catalog:
        for item in curated_catalog:
            if isinstance(item, dict) and item.get("url"):
                curated_urls.add(canonicalize_resource_url(item["url"]))

    resume_lower = raw_text.lower() if raw_text else ""

    for cand in raw_candidates:
        if not isinstance(cand, dict):
            continue

        from learning_catalog import resolve_resource_candidates
        reviewed = resolve_resource_candidates([cand])
        if not reviewed:
            continue
        cand = reviewed[0]
        raw_url = str(cand.get("url", "")).strip()
        title = str(cand.get("title", "")).strip()
        provider = str(cand.get("provider", "")).strip()
        desc = str(cand.get("description", "")).strip()
        rtype = str(cand.get("type", "")).lower().strip()
        cand_skills = [str(s).strip() for s in cand.get("skills", []) if str(s).strip()]

        # Structural & Quality gates
        if len(title.split()) < 3 or len(title) < 10:
            continue
        if len(desc.split()) < 8 or len(desc) < 30:
            continue
        if len(provider) < 2:
            continue
        if rtype not in ("certification", "course", "practice", "guide", "documentation", "video"):
            continue

        # Resume deduplication: skip credentials already possessed
        if rtype == "certification" and resume_lower and (title.lower() in resume_lower):
            continue

        # Gap relevance gate: must match at least one validated gap or target role
        target_lower = target_position.lower()
        gaps_lower = [g.lower() for g in priority_gaps]
        matches_gap = any(
            g in title.lower() or g in desc.lower() or any(g in s.lower() or s.lower() in g for s in cand_skills)
            for g in gaps_lower
        )
        matches_role = target_lower in title.lower() or target_lower in desc.lower()
        if not (matches_gap or matches_role):
            continue

        # Authoritative URL & SSRF verification
        if not verify_live_network:
            # Invariant: No candidate can receive verificationStatus = 'verified'
            # when live network verification is unavailable or disabled.
            continue

        v_report = verify_external_resource_url(raw_url)
        if not v_report.get("verified"):
            continue
        canonical_url = v_report.get("finalUrl", canonicalize_resource_url(raw_url))

        if canonical_url in seen_urls or canonical_url in curated_urls:
            continue
        seen_urls.add(canonical_url)

        verified_item = {**cand, "source": "curated"}

        # Enforce quota: up to 3 per category
        if rtype == "certification" and len(verified_certs) < 3:
            verified_certs.append(verified_item)
        elif rtype == "course" and len(verified_courses) < 3:
            verified_courses.append(verified_item)
        elif rtype in ("practice", "guide", "documentation", "video") and len(verified_practice) < 3:
            verified_practice.append(verified_item)

    all_verified = verified_certs + verified_courses + verified_practice

    # Bound cache management
    if len(_BOUNDED_RECOMMENDATION_CACHE) >= _MAX_CACHE_ENTRIES:
        _BOUNDED_RECOMMENDATION_CACHE.clear()
    _BOUNDED_RECOMMENDATION_CACHE[cache_key] = all_verified

    return all_verified
