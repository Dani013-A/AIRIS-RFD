#!/usr/bin/env python3
import json
import os
import re
import urllib.request
import urllib.error
import ssl

REPORT_PATH = os.path.join(os.path.dirname(__file__), "../URL_VERIFICATION_REPORT.json")
CATALOG_PATH = os.path.join(os.path.dirname(__file__), "../AIRIS-Mobile/src/data/verifiedLearningCatalog.ts")

def test_url(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    }
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            return res.getcode(), res.geturl()
    except urllib.error.HTTPError as e:
        return e.code, e.url
    except Exception as e:
        return 0, str(e)

def main():
    with open(REPORT_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    evidence = data.get("catalog_resource_evidence", [])

    need_remediation = [
        item for item in evidence
        if item["FINAL_STATUS"] in ("DEAD_RESOURCE", "HTTP_FAILED", "GENERIC_LANDING_PAGE", "DOM_UNVERIFIED")
        or item.get("SUB_CLASSIFICATION") in ("GENERIC_CATEGORY_PAGE", "UNRELATED_DESTINATION", "RESOURCE_SPECIFIC_UNAVAILABLE")
    ]

    print(f"Total resources requiring remediation assessment: {len(need_remediation)}\n")

    remediation_plan = []
    for r in need_remediation:
        remediation_plan.append({
            "id": r["id"],
            "title": r["title"],
            "provider": r["provider"],
            "type": r["type"],
            "status": r["FINAL_STATUS"],
            "sub": r.get("SUB_CLASSIFICATION"),
            "url": r["original_url"]
        })

    print(f"Sample items needing remediation:")
    for item in remediation_plan[:20]:
        print(f"[{item['id']}] {item['title'][:45]} | Provider: {item['provider']} | Status: {item['status']}/{item['sub']}")

if __name__ == "__main__":
    main()
