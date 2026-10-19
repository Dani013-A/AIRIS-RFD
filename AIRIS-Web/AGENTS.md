<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AIRIS-Web Agent Guidelines

This file governs administrator web application engineering in [`AIRIS-Web/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web).

---

## 1. Environment & Execution

- **Runtime:** Node.js 20+, Next.js 16, React 19, Tailwind CSS 4.
- **Run Dev Server:** `npm run dev` (runs on `http://localhost:3000`)
- **Lint Check:** `npm run lint`
- **Build Production Bundle:** `npm run build`
- **Test Runner:** `node --test <test_path>`

---

## 2. Invariants & Source of Truth

1. **OJT Exclusion & Metric Scoping:**
   - Administrative and coordinator accounts must never be treated as students.
   - Aggregate metrics, competency distributions, and student rosters must strictly enforce [`src/lib/ojtExclusion.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/lib/ojtExclusion.ts) to exclude non-student profiles.

2. **API Endpoint Configuration:**
   - Managed in [`src/config/api.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/config/api.ts).
   - In production, must point to the verified backend (`https://18-143-33-249.sslip.io`) and strictly reject unauthenticated loopback or insecure overrides.

3. **Role-Based Authorization:**
   - Admin routes require verified admin status via Firebase custom claims or Firestore role records.
   - OJT Coordinators are strictly scoped to their assigned academic program.

---

## 3. Targeted Verification Commands

Before concluding web modifications, run the relevant checks:

```bash
# API endpoint configuration & production security:
node --test src/config/api.test.mjs

# OJT administrative exclusion and role scoping:
node --test src/lib/ojtExclusion.test.mjs

# Build validation:
npm run build
```
