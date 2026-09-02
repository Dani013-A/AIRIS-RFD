#!/usr/bin/env python3
import json
import os
import re

REPORT_PATH = os.path.join(os.path.dirname(__file__), "../URL_VERIFICATION_REPORT.json")
CATALOG_PATH = os.path.join(os.path.dirname(__file__), "../AIRIS-Mobile/src/data/verifiedLearningCatalog.ts")

def main():
    if not os.path.exists(REPORT_PATH):
        print("URL_VERIFICATION_REPORT.json not found")
        return

    with open(REPORT_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    evidence = data.get("catalog_resource_evidence", [])
    print(f"Total evidence items: {len(evidence)}")

    status_counts = {}
    for item in evidence:
        st = item["FINAL_STATUS"]
        sub = item.get("SUB_CLASSIFICATION")
        key = f"{st}:{sub}" if sub else st
        status_counts[key] = status_counts.get(key, 0) + 1

    print("\n--- DETAILED AUDIT STATUS COUNTS ---")
    for k, v in sorted(status_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"{k}: {v}")

    # Reconcile counts
    dead_items = [i for i in evidence if i["FINAL_STATUS"] in ("DEAD_RESOURCE", "HTTP_FAILED", "DOM_UNVERIFIED")]
    landing_items = [i for i in evidence if i["FINAL_STATUS"] == "GENERIC_LANDING_PAGE" or i.get("SUB_CLASSIFICATION") in ("GENERIC_CATEGORY_PAGE", "UNRELATED_DESTINATION")]
    blocked_items = [i for i in evidence if i["FINAL_STATUS"] == "BLOCKED"]
    verified_items = [i for i in evidence if i["FINAL_STATUS"] == "FULLY_VERIFIED" or i.get("SUB_CLASSIFICATION") == "LEGITIMATE_PROVIDER_PAGE"]

    print(f"\nSummary Grouping:")
    print(f"  Verified / Eligible: {len(verified_items)}")
    print(f"  Generic / Non-Specific Landing: {len(landing_items)}")
    print(f"  Dead / Failed: {len(dead_items)}")
    print(f"  WAF / Blocked: {len(blocked_items)}")
    print(f"  Total Accounted: {len(verified_items) + len(landing_items) + len(dead_items) + len(blocked_items)} == {len(evidence)}")

if __name__ == "__main__":
    main()
