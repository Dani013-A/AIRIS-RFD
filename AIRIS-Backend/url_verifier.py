import urllib.request
import urllib.parse
import urllib.error
import ssl
import datetime
from typing import Dict, Any, Optional

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AIRIS-LinkVerifier/1.0"
VERIFICATION_TIMEOUT_SECONDS = 4.0

def verify_resource_url(url_string: str) -> Dict[str, Any]:
    """
    Multiphase HTTP Link Verifier.
    Performs network verification of resource links:
    - Follows 301/302/307/308 redirects
    - Records finalUrl and providerDomain
    - Validates status codes
    - Detects broken, 404, 500, and timeout links
    """
    checked_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if not url_string or not isinstance(url_string, str):
        return {
            "status": "broken",
            "checkedAt": checked_at,
            "statusCode": 0,
            "verificationMethod": "http",
            "notes": "Empty or invalid URL type"
        }

    parsed = urllib.parse.urlparse(url_string)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return {
            "status": "broken",
            "checkedAt": checked_at,
            "statusCode": 0,
            "verificationMethod": "http",
            "notes": "Malformed scheme or missing hostname"
        }

    # Exclude dummy/search URL fallbacks
    if "google.com/search" in url_string or "example.com" in url_string:
        return {
            "status": "broken",
            "checkedAt": checked_at,
            "statusCode": 400,
            "verificationMethod": "http",
            "notes": "Rejected search query or fallback URL"
        }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        url_string,
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"}
    )

    try:
        # Try HEAD request first for speed
        req.get_method = lambda: "HEAD"
        with urllib.request.urlopen(req, timeout=VERIFICATION_TIMEOUT_SECONDS, context=ctx) as response:
            final_url = response.geturl()
            status_code = response.getcode()
            content_type = response.info().get("Content-Type", "")

            parsed_final = urllib.parse.urlparse(final_url)
            domain = parsed_final.netloc.lower()

            status = "verified"
            if final_url.lower().strip() != url_string.lower().strip():
                status = "redirected"

            return {
                "status": status,
                "checkedAt": checked_at,
                "finalUrl": final_url,
                "statusCode": status_code,
                "contentType": content_type,
                "providerDomain": domain,
                "verificationMethod": "http"
            }
    except (urllib.error.HTTPError, urllib.error.URLError, Exception):
        # Fallback to GET request if HEAD method is disallowed by provider
        try:
            req_get = urllib.request.Request(
                url_string,
                headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
            )
            with urllib.request.urlopen(req_get, timeout=VERIFICATION_TIMEOUT_SECONDS, context=ctx) as response:
                final_url = response.geturl()
                status_code = response.getcode()
                content_type = response.info().get("Content-Type", "")

                parsed_final = urllib.parse.urlparse(final_url)
                domain = parsed_final.netloc.lower()

                status = "verified"
                if final_url.lower().strip() != url_string.lower().strip():
                    status = "redirected"

                return {
                    "status": status,
                    "checkedAt": checked_at,
                    "finalUrl": final_url,
                    "statusCode": status_code,
                    "contentType": content_type,
                    "providerDomain": domain,
                    "verificationMethod": "http"
                }
        except urllib.error.HTTPError as e:
            # Handle HTTP redirect responses (301, 302, 307, 308)
            if e.code in (301, 302, 307, 308):
                redirect_target = e.headers.get("Location")
                if redirect_target:
                    resolved_target = urllib.parse.urljoin(url_string, redirect_target)
                    parsed_target = urllib.parse.urlparse(resolved_target)
                    return {
                        "status": "redirected",
                        "checkedAt": checked_at,
                        "finalUrl": resolved_target,
                        "statusCode": e.code,
                        "providerDomain": parsed_target.netloc.lower(),
                        "verificationMethod": "http"
                    }
            return {
                "status": "broken",
                "checkedAt": checked_at,
                "statusCode": e.code,
                "verificationMethod": "http",
                "notes": f"HTTP Error {e.code}"
            }
        except Exception as err:
            return {
                "status": "broken",
                "checkedAt": checked_at,
                "statusCode": 0,
                "verificationMethod": "http",
                "notes": str(err)
            }

if __name__ == "__main__":
    # Test sample verification
    test_urls = [
        "https://aws.amazon.com/certification/certified-cloud-practitioner/",
        "https://capd.mit.edu/resources/interviewing/",
        "https://invalid.domain.that.does.not.exist.xyz/test"
    ]
    print("Testing AIRIS Link Verifier...")
    for u in test_urls:
        res = verify_resource_url(u)
        print(f"URL: {u} -> Status: {res['status']} (HTTP {res.get('statusCode')})")
