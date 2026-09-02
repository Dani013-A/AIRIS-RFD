#!/usr/bin/env python3
import json
import os

REPORT_PATH = os.path.join(os.path.dirname(__file__), "../URL_VERIFICATION_REPORT.json")

def main():
    if not os.path.exists(REPORT_PATH):
        print("URL_VERIFICATION_REPORT.json not found")
        return

    with open(REPORT_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    evidence = data.get("catalog_resource_evidence", [])
    provider_pages = [item for item in evidence if item.get("SUB_CLASSIFICATION") == "LEGITIMATE_PROVIDER_PAGE"]

    print(f"Total LEGITIMATE_PROVIDER_PAGE records: {len(provider_pages)}\n")

    records_report = []
    for idx, item in enumerate(provider_pages, 1):
        rec_id = item["id"]
        title = item["title"]
        provider = item["provider"]
        res_type = item["type"]
        orig_url = item["original_url"]
        final_url = item["final_url"]
        dom_title = item.get("dom_page_title", "")
        h1s = item.get("dom_h1_headings", [])

        # Check specificity
        title_words = [w.lower() for w in title.split() if len(w) >= 4 and w.lower() not in ("with", "from", "intro", "guide", "course", "cert", "analysis")]
        matched_words = [w for w in title_words if w in dom_title.lower() or any(w in h.lower() for h in h1s)]

        is_specific = len(title_words) > 0 and (len(matched_words) / len(title_words) >= 0.3)
        
        eligibility = "ELIGIBLE (Resource-Specific Provider Series)" if is_specific else "NOT ELIGIBLE (Generic Provider Portal)"

        records_report.append({
            "index": idx,
            "id": rec_id,
            "title": title,
            "provider": provider,
            "type": res_type,
            "url": final_url,
            "dom_title": dom_title,
            "h1_headings": h1s,
            "matched_keywords": matched_words,
            "is_specific": is_specific,
            "eligibility": eligibility
        })

        print(f"[{idx}/19] {rec_id}")
        print(f"   Declared Title: {title} ({res_type})")
        print(f"   Provider: {provider}")
        print(f"   URL: {final_url}")
        print(f"   DOM Page Title: {dom_title}")
        print(f"   H1 Headings: {h1s}")
        print(f"   Specific Match: {is_specific} -> {eligibility}")
        print("-" * 80)

    # Output JSON summary
    with open("AUDIT_19_PROVIDER_PAGES_SUMMARY.json", "w", encoding="utf-8") as out:
        json.dump(records_report, out, indent=2)

if __name__ == "__main__":
    main()
