# Learning and academic data maintenance

Edit `AIRIS-Backend/data/tip_programs.json` and `AIRIS-Backend/data/learning_resources.json`. Mobile imports generated mirrors; do not hand-edit those mirrors. Admin academic labels preserve historical grouping and do not certify current offerings.

For institutional facts, read an official campus-specific page or approved curriculum. Record source URL, checked date, Manila applicability, status and uncertainty per program. Keep historical options readable; only verified undergraduate options appear in new mobile selections. Suggested career titles are AIRIS editorial examples, not university or employer requirements. The eight Industrial Engineering course records are selected entries from the 2023 document, not a complete current curriculum.

For a resource, inspect the actual destination and record the exact provider/title, truthful description, skills covered, explicit relevant programs/roles, career stage and format. Relevance metadata is an editorial mapping to the resource content, not proof of an institutional course equivalency, accreditation, employment requirement or candidate ability. Do not activate invented or HTTP-only records. Prefer no thumbnail to an unlicensed or unrelated image: the app supplies a local icon/provider fallback.

Run from the repository root:

```sh
node AIRIS-Mobile/scripts/sync-academic-catalog.mjs
node AIRIS-Mobile/scripts/sync-academic-catalog.mjs --check
cd AIRIS-Backend
.venv/bin/python scripts/verify_learning_catalog.py --output ../audit/learning-resume-accuracy/resource-http-recheck.json
```

The verifier uses four host groups concurrently, sequential requests within each host, a four-second request timeout and a small rate-limit pause. It reports redirects, failures, duplicates and intentional thumbnail fallbacks. It never promotes an HTTP success to reviewed factual metadata. Use `--ids id1,id2` for focused checks. A 403/429 remains blocked/rate-limited even if separate browser inspection succeeds; record both, with date and scope. Do not hammer blocked providers. Store browser review evidence separately and exclude a resource if its intended content cannot be established.

Published records require affirmative active/verified flags, source review matching their title/provider/destination, and review no older than 90 days. Matchers revalidate records before returning them. Review again before expiration; do not merely advance the date. Runtime checks do not make requests per card/render. No automated schedule or production seeding was created by this audit.

For You returns at most ten items; fewer/zero is valid. Priority tiers remain direct gap coverage, role learning, then supporting academic learning. Stable IDs break ties; provider/topic diversity is a preference within a tier, never permission to add irrelevant filler. Partial compound coverage must not claim the missing component. Missing resume evidence is not proof of inability.

The audit test runtime lives in `/private/tmp/airis-learning-test-runtime` (Jest 29.7 and React renderer 19.2.3). It is disposable and is not a production dependency. Audit Jest configs use the project's TypeScript plus standard mock hoisting. Recreate that runtime with `npm install --prefix /private/tmp/airis-learning-test-runtime --ignore-scripts --no-package-lock jest@29.7.0 react-test-renderer@19.2.3`; project lockfiles are unchanged.
