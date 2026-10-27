# AIRIS Cross-Service API & Bridge Contracts

This document records the exact, verified contracts between AIRIS subsystems:
1. **HTTP REST Endpoints** (Mobile & Web -> FastAPI Backend)
2. **Unity UaaL Bridge Envelopes** (React Native Mobile <-> Embedded Unity Engine)

---

## 1. Authentication & Common Error Contract

### Request Headers
Protected backend endpoints require:
```http
Authorization: Bearer <Firebase_ID_Token>
Content-Type: application/json
```

### Standard Error Response Format
All errors return consistent JSON payloads without leaking internal server stack traces:
```json
{
  "detail": "Descriptive, safe error message suitable for user display."
}
```

Common status codes:
- `400 Bad Request`: Missing mandatory parameters or malformed JSON.
- `401 Unauthorized`: Missing, expired, or invalid Firebase ID token.
- `403 Forbidden`: Cross-user data access attempt or non-admin accessing admin route.
- `413 Payload Too Large`: Uploaded file exceeds size limit (5MB for audio, 15MiB for resume).
- `429 Too Many Requests`: Rate limit or expensive concurrency limit exceeded.
- `500 Internal Server Error`: Safe generic error returned while logging details server-side.

---

## 2. FastAPI Backend Endpoints

### 2.1 `POST /upload`
Uploads and evaluates a raw resume document.

- **Content-Type:** `multipart/form-data`
- **Query Parameters:** `targetPosition` (string, required)
- **Form Fields:** `file` (binary document, required, formats: `.pdf`, `.docx`, `.txt`, `.rtf`)
- **Headers:** Required `Authorization: Bearer <Token>`
- **Response `200 OK`:**
```json
{
  "valid": true,
  "scoringModelVersion": "3.1.0-manuscript",
  "resumeScore": {
    "overallScore": 70,
    "total": 70,
    "formula": "Resume Score = round(ATS Readability × 0.40 + Role Alignment × 0.60)",
    "atsContribution": 32.0,
    "alignmentContribution": 38.4
  },
  "atsScore": { "overallScore": 80 },
  "alignmentScore": { "overallScore": 64 },
  "overallScore": 70,
  "detectedSkills": [],
  "suggestions": [],
  "detectedSections": [{ "name": "Education", "isPresent": true, "hasContent": true }],
  "missingSections": [],
  "recommendations": [],
  "aiRecommendedResources": []
}
```

Illustrative synthetic response subset; numbers demonstrate schema, not a measured result. ATS and Role Alignment are separately reported components of the new two-tier Resume Score. Historical 3.0.0-canonical records retain their original alignment-only values.

### 2.2 `POST /analyze`
Analyzes extracted resume text for a target position. The backend reparses `rawText`; optional client section labels cannot add facts.

- **Content-Type:** `application/json`
- **Headers:** Required `Authorization: Bearer <Token>`
- **Request Body:**
```json
{
  "userId": "firebase_uid_123",
  "rawText": "Extracted text content...",
  "parsedSections": {
    "ContactInformation": "...",
    "Education": "...",
    "WorkExperience": "...",
    "Skills": "..."
  },
  "targetPosition": "Junior Software Engineer"
}
```
- **Response `200 OK`:** Same schema as `POST /upload`.

### 2.3 `POST /interview/start`

Creates a backend-owned session and returns `survey-1`. Authenticated Firebase UID owns the session; there is no caller-selected owner or session ID.

```json
{
  "targetRole": "Software Engineer",
  "program": "BS Computer Science",
  "parsedResume": { "Skills": "Python, React, SQL" },
  "resumeId": "resume-record-id",
  "interviewType": "one-on-one"
}
```

Response includes the existing question fields (`questionId`, `question`, `coreQuestion`, `questionType`, `benchmarkAnswer`, `isFollowUp`), plus:

```json
{
  "sessionId": "0123456789abcdef0123456789abcdef",
  "turn": 0,
  "questionId": "survey-1",
  "speechDecisionId": "0123456789abcdef0123456789abcdef"
}
```

`sessionId` is a server-generated 32-character UUID hex string. `turn` is the zero-based answer-attempt revision, including clarification interactions. It is distinct from the core-question number. `resumeId` defaults to `none`; supported interview types remain `one-on-one`, `panel`, `vr`, `immersive-one-on-one`, and `immersive-panel`.

### 2.4 `POST /interview/answer`

Only these fields are accepted; extra fields are rejected with `422`:

```json
{
  "sessionId": "0123456789abcdef0123456789abcdef",
  "questionId": "survey-1",
  "turn": 0,
  "currentAnswer": "Candidate answer text transcribed from audio..."
}
```

The server loads configuration, prior answers, evaluations, and the current question from private state. The question ID must equal the active approved `survey-1` through `survey-9` topic. The engine's canonical `CORE_SURVEY_QUESTIONS` registry supplies semantic references; client benchmarks never control scoring. Missing or unapproved references fail explicitly.

Response retains `evaluation`, `nextQuestion`, `isInteractionEvent`, `isComplete`, and `speechDecisionId`, and adds the same `sessionId` and the next attempt `turn`. Exact replay of an accepted attempt returns its stored response without evaluating it again. A changed answer at the same revision, out-of-order attempt, cancelled session, or attempt to answer Q10 is rejected. Clarifications retain the core question ID and advance only the attempt revision. `cancelled: true` identifies a Stop intent; it never represents successful interview completion.

Answers are limited to 8,000 characters; sessions accept at most 48 attempts and remain active for 24 hours. Expired sessions return `410`; obsolete attempts return `409`. These are integrity/storage bounds, not additional scored questions.

### 2.5 `POST /interview/transcribe`

Authenticated multipart upload: `audio` (maximum 5MB), optionally `sessionId` and `turn`. Mobile supplies both session fields. Response remains `{ "transcription": "...", "pauseMetrics": { ... } }`.

The backend binds measured pause metrics to that session, attempt, and transcript hash. Answer evaluation uses those stored metrics only when the submitted transcript matches. Edited or combined transcripts and direct Unity transcripts have no verified acoustic metrics; the evaluator must not infer acoustic pacing. Answer requests cannot supply pause metrics. Legacy unbound transcription remains available, but cannot attest metrics for scored answers.

### 2.6 `POST /interview/report`

```json
{ "sessionId": "0123456789abcdef0123456789abcdef" }
```

Extra fields, including client history, evaluations, benchmarks, identity, or scores, return `422`. A session requires nine server-evaluated candidate responses with matching UID/session/question/attempt bindings. Q9 is a scored final reflection on improvement and learning transfer; it does not invite company questions. Q10 is an unscored closing statement. The backend may adapt spoken wording within the same numbered competency; `coreQuestion` and `questionId` retain their canonical scoring binding. `reflection` is derived from exact current-answer evidence, and `question` is the single composed bubble/TTS value. Normal mobile completion requests the report after closing delivery; cancellation never requests a completed report.

The formula remains `round(SemanticCorrectness × 0.40 + AIHolisticEvaluation × 0.40 + CommunicationClarity × 0.20)`. The backend atomically persists the completed interview and matching `Mock Interview` activity under `users/{uid}` before returning success. The activity uses `completedAt`, preserving dashboard ordering. Response retains report fields and includes:

```json
{
  "overallPerformance": 84,
  "categoryBreakdown": { "SemanticCorrectness": 80, "AIHolisticEvaluation": 85, "CommunicationClarity": 90 },
  "sessionId": "0123456789abcdef0123456789abcdef",
  "completedAt": 1792930000000,
  "persisted": true,
  "status": "completed",
  "reportId": "0123456789abcdef0123456789abcdef"
}
```

A prepared report is cached server-side before final persistence so storage retries reuse it. Completion retries return the identical committed report/timestamp without duplicate activities or score writes. Storage unavailability fails closed; no success is returned when saving fails. Mobile marks completion only after matching session and persistence confirmation. Existing completed history documents remain readable; pre-update stateless in-progress sessions must restart.

### Read-only `GET /interview/status/{sessionId}`

Requires the same Firebase authentication and UID ownership as report finalization. Returns `{sessionId, status}` with `in_progress`, `ready`, `finalizing`, or `completed`. The private stored `active` state is exposed as `in_progress`; nine accepted evaluations produce `ready`. A prepared, recoverable report is `finalizing`. Completed status includes `report`, using the receipt schema above, only after the canonical interview and activity are read and match the private completed state. Missing canonical data returns `503`, never a fabricated receipt. Cancelled/expired/unowned sessions fail with the existing `409`/`410`/`404` behavior.

Mobile sends only the canonical session ID to finalization; it never supplies local history, evaluations or benchmarks. Missing or contradictory receipts are errors. A lost finalization response is reconciled through this read endpoint; further explicit retries use the same idempotent report ID. Only owner-scoped pending IDs are stored locally, with one marker per session and no answer/audio content. Dashboard focus/refresh reads persisted activities and offers recovery for pending IDs after restart. Leaving the saving screen does not cancel valid finalization; explicit interview cancellation remains separate and unscored. Unity's closing handoff marks the local audio lifecycle exiting before navigating, so late exit callbacks cannot clear the completed answer evidence.

### Shared spoken delivery

Canonical question text and order remain backend-owned. The same evaluation call selects only from deterministic, topic-gated acknowledgments grounded in explicit first-person actions. Introductions/disclaimers do not eclipse a later substantive clause. Negated, hypothetical, injected, unrelated, unverifiable-company or team-only claims produce a neutral direct question. Reflections do not infer a result, leadership or numerical accomplishment. `reflection` is separate from `nextQuestion.coreQuestion`; `nextQuestion.question` is the bounded spoken composition. Invalid generated acknowledgment choices produce the sanitized `INTERVIEW_DIALOGUE_INVALID_ACK` diagnostic and a grounded/neutral fallback only after evaluation is valid. No extra provider request or scoring change is introduced.

### 2.7 `POST /interview/cancel`

Accepts only `{ "sessionId": "..." }`, with Firebase authentication. Cancels private state, clears draft evidence, and invalidates outstanding evaluation/report commits. It never generates a final result. Repeated cancellation is idempotent; already-completed sessions return `409`. Mobile stops audio locally immediately and sends cancellation; offline cancellation cannot be confirmed remotely, and incomplete sessions expire.

Private storage is `users/{uid}/interviewSessions/{sessionId}`, with attempt receipts in `turns/{attempt}`. Firestore rules deny client reads/writes to private state and writes to completed interviews/interview activities. Account deletion recursively removes private state and receipts. Drafts and receipts have `expiresAt`; operational TTL policies for both collection groups must be configured separately before rollout. Expiry enforcement in the API does not itself delete documents. Completed state retains the immutable retry receipt without TTL. No production policy was changed during implementation.

---

## 3. React Native <-> Unity UaaL Bridge Contracts

Communication between React Native ([`ImmersiveInterviewScreen.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/screens/interview/ImmersiveInterviewScreen.tsx)) and Unity uses the standard Unity-as-a-Library envelope:

### Envelope Schema
```json
{
  "type": "MESSAGE_TYPE_STRING",
  "payload": "{\"key\": \"value\"}"
}
```
*Note: The `payload` field is a JSON-serialized string inside the outer JSON envelope.*

### 3.1 Mobile -> Unity Messages (Dispatched via `postToUnity`)

| Type | Payload Properties | Description |
| :--- | :--- | :--- |
| `LOAD_SCENE` | `{ "sceneName": string }` | Directs Unity to load a specific VR environment (e.g. `"OneOnOneOffice"` or `"PanelBoardroom"`). |
| `SHOW_QUESTION` | `{ "questionText": string, "speakerIndex": number, "speakerName": string }` | Updates the in-VR speech bubble and initiates TTS playback for the specified avatar. |
| `START_RECORDING`| `{}` | Triggers Unity microphone capture for the candidate's answer. |
| `STOP_RECORDING` | `{}` | Halts recording immediately (sent by silence detection or safety watchdog). |
| `END_INTERVIEW` | `{ "closingMessage": string }` | Displays the final wrap-up bubble and transitions the scene to conclusion. |
| `SESSION_EXIT` | `{}` | Cleanly resets Unity state when student exits or cancels the session. |

### 3.2 Unity -> Mobile Messages (Received via `onUnityMessage`)

| Type | Payload Properties | Mobile Action |
| :--- | :--- | :--- |
| `UNITY_READY` | `{}` | Unity runtime initialization confirmed; marks bridge ready. |
| `SCENE_LOADED` | `{ "sceneName": string }` | Confirms requested scene is loaded and ready for questions. |
| `QUESTION_SPOKEN`| `{}` | TTS playback completed; mobile automatically issues `START_RECORDING`. |
| `RECORDING_STARTED`| `{}` | Informational confirmation that audio capture is active. |
| `RECORDING_STOPPED`| `{}` | Microphone buffer closed; starts handoff watchdog timer. |
| `TRANSCRIPT_READY`| `{ "transcript": string, "audioPath": string }` | Audio ready for transcription; mobile calls `/interview/transcribe`. |
| `FEEDBACK_SPOKEN`| `{}` | Transition acknowledgement TTS finished; mobile presents pending next question. |
| `NEXT_QUESTION` | `{}` | Explicit request from Unity to advance question display. |

## Learning and resume accuracy contract (2026-10)

- `POST /analyze` requires authenticated identity, `rawText` and `targetPosition`. Client `parsedSections` cannot supply additional resume facts: the backend parses the extracted text. Empty extraction returns 400; provider/internal failure returns a safe error, never a successful zero. A valid authoritative zero remains a result.
- New `3.1.0-manuscript` records follow finalized manuscript section 3.5.1, PDF p133: `round(0.40 * ATS + 0.60 * Role Alignment)`. Role Alignment retains Skills 40%, Experience 30%, Education 20%, Certifications 10%. Both endpoints propagate the same version and traceability. Historical records are not recalculated.
- Structural suggestions include `ruleId`, `sourceSection`, `evidenceQuote` (nullable when absence is uncertain), `confidence` and `necessity`. An undetected heading is not proof of missing candidate information.
- `aiRecommendedResources` remains a backward-compatible empty array in analysis. The existing mobile matcher selects source-reviewed records, deduplicates destinations and returns at most ten For You items.
- Canonical resource metadata is `AIRIS-Backend/data/learning_resources.json`; the mobile JSON mirror is generated by `AIRIS-Mobile/scripts/sync-academic-catalog.mjs`. Dated source review is distinct from HTTP reachability. Student refresh reads Firestore and never seeds it.
- Admin usage/report aggregates request the `genuine` scope, which excludes only explicitly marked `isDefenseDemo` / `isSyntheticUat` accounts. This is not proof that every unmarked account is a research participant. Roster `all` scope remains available. Missing activity timestamps remain unknown.

### Server-owned account lifecycle (local, not deployed)

`POST {AdminWeb}/api/accounts/lifecycle` uses a current Firebase Bearer token. Actions: `register` (fullName only), `self_delete`, `admin_remove`, `admin_disable`, `admin_enable` (targetUid). UID/email/role/deletion origin are never accepted from student request data. Admin actions additionally require a matching signed OTP cookie and current permitted server profile role. Unknown request fields are rejected. Registration returns `{profile}`; operations return `{success:true}` only after completion. Errors return safe `code` values, including ACCOUNT_REMOVED, ACCOUNT_DISABLED, LEGACY_REVIEW_REQUIRED, RECENT_LOGIN_REQUIRED, or ACCOUNT_OPERATION_UNAVAILABLE. No client fallback writes a profile or lifecycle tombstone.

See `docs/ACCOUNT_LIFECYCLE_MIGRATION.md`: an unreviewed legacy population blocks unknown new registrations by default. Protected FastAPI student endpoints now require an active persisted profile and no conflicting email restriction. This adds authoritative reads and fail-closed 503 behavior when account state cannot be retrieved. Deploying these local changes requires coordinated server/rules/client rollout and separate authorization.

### Manuscript completion clarification (owner approved, 2026-10-25)

The Appendix O “Stop” instruction is superseded by the cancellation correction: Stop cancels the active session; it does not score, generate a final report, or persist a completed interview. Successful completion requires Q1–Q9 evaluated answers followed by Q10 closing delivery. The final report endpoint fails closed for incomplete history. See the corrected review manual and flow addendum under `audit/manuscript-finalization-2026-10-25/`.

### Personalized learning resource sets

`POST /learning/recommendations` requires the existing verified, active Manila
student Firebase identity (administrator claim exemptions remain unchanged) and
uses the existing expensive-request rate/concurrency limits. Request fields:
`analysisId` (latest analysis timestamp/identifier), `targetPosition`, `program`,
and `gaps` (at most 30 short labels). These are advisory learning needs from the
mobile analysis snapshot, never authoritative score inputs. No raw resume,
transcript, client UID, or scoring fields are accepted or sent to source sites.

The backend returns `placements`, `counts`, `shortfall`, `complete`, `contextId`,
`generatedAt`, `expiresAt`, `cached`, `rankingMethod`, and `unavailableSources`. Destination
keys are `certifications`, `courses`, `practice`, `for_you`. Their respective
per-origin limits are 2, 2, 2, 5. Every resource retains `origin` (`hardcoded` or
`ai_discovered`), `destination`, source-owned title/provider/URL/type, relevance,
expected learning focus, and access information (unknown unless established).
All hardcoded slots are reserved before discovered slots; canonical URL,
provider ID, and provider/title aliases are globally deduplicated. Shortfalls
are explicit; `complete` is true only for all 22 unique placements.

Official catalog metadata establishes discovery provenance, not accreditation,
completion, admission eligibility, or permanent link availability. The model
ranks supplied IDs only. When AI relevance validation fails, only reviewed hardcoded fallbacks are
returned, with explicit discovered-slot shortfalls and a ten-minute retry expiry.
Keyword overlap alone cannot approve discovered recommendations (for example,
mechanical dynamics and a software product named Dynamics). Retired/legacy
credentials are excluded. Source facts cache for six hours; successful owner and
analysis/context-specific sets cache for 24 hours with bounded memory and
in-flight coalescing. The mobile client shares one set between Dashboard and
For You, scopes its cache to identity/context, and discards obsolete UI results.
Changing analysis, role, program, or gap labels invalidates the selection key.
