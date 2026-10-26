# AIRIS Project Map

This document is the authoritative directory map and navigation index for AIRIS. Use this map to navigate directly to relevant source files, eliminating unnecessary repository greps and recursive directory scanning.

---

## 1. High-Level Subsystems

| Subsystem | Directory | Tech Stack | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Backend** | [`AIRIS-Backend/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend) | Python 3.10+, FastAPI, PyTorch, SBERT, Google GenAI | Authoritative scoring, ATS parsing, resume validation, interview progression, transcription |
| **Mobile** | [`AIRIS-Mobile/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile) | React Native 0.86, Expo 57, Expo Router, NativeWind, Zustand | Student interface, resume upload/OCR, VR interview orchestration, audio capture handoff |
| **Admin Web** | [`AIRIS-Web/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web) | Next.js 16, React 19, Tailwind CSS 4, Zustand | Administrator & OJT coordinator dashboards, student rosters, aggregate analytics |
| **Unity Presentation** | [`AIRIS-Mobile/android/unityLibrary/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/android/unityLibrary) | Unity C# (IL2CPP) embedded via UaaL | Immersive 3D interviewer avatar, VR Cardboard view, speech bubble, TTS, microphone recording |
| **Root Configurations** | Root | Shell, Firebase CLI | Firebase rules, build scripts, deployment configuration, test runners |

---

## 2. AIRIS-Backend Source Index

Entry point: [`AIRIS-Backend/main.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/main.py)

### Core Modules

| Module / File | Responsibility |
| :--- | :--- |
| [`main.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/main.py) | FastAPI application entry point, route definitions, Firebase JWT authentication, rate limiting, CORS configuration |
| [`interview_engine.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/interview_engine.py) | Authoritative 10-turn interview backbone, bounded follow-up adaptation, rubric scoring, question selection |
| [`interview_sessions.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/interview_sessions.py) | Server-owned Firestore interview sessions, answer-attempt replay receipts, ownership/turn binding, and atomic report/activity persistence |
| [`data/interview_questions.json`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/data/interview_questions.json) | Ground-truth question bank with spoken templates, benchmark answers, and evaluation rubrics |
| [`deterministic_scorer.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/deterministic_scorer.py) | Authoritative deterministic ATS and competency scoring engine; mathematical weighting invariants |
| [`sbert_matcher.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/sbert_matcher.py) | Sentence-BERT semantic similarity scoring for resume sections against target role profiles |
| [`role_profile_registry.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/role_profile_registry.py) | Canonical registry of career roles, required/recommended competencies, and taxonomy mappings |
| [`resume_parser.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/resume_parser.py) | Section identification (Contact, Education, Experience, Skills, Certifications) from extracted text |
| [`resume_format.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/resume_format.py) | Structural ATS checks (word count, section presence, contact data, parseability rating) |
| [`file_utils.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/file_utils.py) | Multi-format resume text extraction (PDF via PyMuPDF/OCR, DOCX, TXT, RTF) |
| [`ai_validator.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/ai_validator.py) | LLM-based resume validity gate and qualitative feedback synthesis using bounded Gemini calls |
| [`ai_service.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/ai_service.py) | Gemini client wrappers for career compatibility, learning resources, and interview feedback |
| [`transcriber.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/transcriber.py) | Audio transcription service and pause metric analysis |
| [`rate_limiter.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/rate_limiter.py) | Token-bucket rate limiting and concurrency guard for expensive operations |
| [`market_intelligence.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/market_intelligence.py) | Job market trends snapshot refresh and caching |

### Key Tests

- [`test_survey_interview_backbone.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/test_survey_interview_backbone.py): 10-turn interview progression, ID sequence (`survey-1` .. `survey-10`), anti-repetition rules.
- [`test_canonical_scoring_engine.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/test_canonical_scoring_engine.py): Deterministic ATS scoring invariants and weighting.
- [`test_security_remediation.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/test_security_remediation.py): Authentication, cross-user authorization rejection, rate limiting.
- [`test_resume_format_assessment.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/test_resume_format_assessment.py): File upload hygiene and ATS parsing bounds.

---

## 3. AIRIS-Mobile Source Index

Entry point: [`AIRIS-Mobile/app/_layout.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/app/_layout.tsx)

### App Routing (`AIRIS-Mobile/app/`)

| Route File | Screen / Role |
| :--- | :--- |
| [`app/index.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/app/index.tsx) | Auth state gate / splash redirect |
| [`app/(auth)/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/app) | Student login, registration, email verification, onboarding |
| [`app/(student)/(tabs)/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/app/(student)/(tabs)) | Bottom tabs: Dashboard (`index`), Resume (`resume`), Interview (`interview`), Profile (`profile`) |
| [`app/(student)/interview-session/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/app/(student)/interview-session) | Active interview flows: standard simulation, immersive VR screen, summary report |

### Core Screens & State (`AIRIS-Mobile/src/`)

| File | Purpose |
| :--- | :--- |
| [`src/screens/interview/ImmersiveInterviewScreen.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/screens/interview/ImmersiveInterviewScreen.tsx) | VR Cardboard interview host; drives Unity view, audio handoff, and conversation lifecycle |
| [`src/screens/interview/ActiveSimulationScreen.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/screens/interview/ActiveSimulationScreen.tsx) | Standard mobile (non-VR) interview simulation screen with audio recording |
| [`src/screens/interview/InterviewSummaryScreen.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/screens/interview/InterviewSummaryScreen.tsx) | Displays completed interview scores, rubrics, and feedback |
| [`src/store/interviewStore.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/store/interviewStore.ts) | Zustand store for active interview session, history, questions, and recording state |
| [`src/store/authStore.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/store/authStore.ts) | Zustand store for Firebase auth user, token caching, student profile |
| [`src/services/api/apiClient.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/services/api/apiClient.ts) | Authoritative API base URL resolver (enforces production HTTPS, forbids localhost in prod) |
| [`src/services/api/interviewApi.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/services/api/interviewApi.ts) | Client wrapper for `/interview/start`, `/interview/answer`, `/interview/transcribe`, `/interview/report` |
| [`src/services/resume/resumeAnalysisService.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/services/resume/resumeAnalysisService.ts) | Resume upload and analysis orchestration |

### Mobile Native & Unity Integration

| File | Purpose |
| :--- | :--- |
| [`android/unityLibrary/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/android/unityLibrary) | Exported Unity Android library packaged directly inside standalone APK |
| [`android/patch_assembly.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/android/patch_assembly.py) | IL2CPP assembly patch script ensuring compatibility between Unity and modern Android NDK |
| [`scripts/build-standalone-apk.sh`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/scripts/build-standalone-apk.sh) | Native standalone APK build script (no Expo Go or Metro dependency) |

---

## 4. AIRIS-Web Source Index

Entry point: [`AIRIS-Web/src/app/layout.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/app/layout.tsx)

| Path | Purpose |
| :--- | :--- |
| [`src/app/page.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/app/page.tsx) | Admin login and authentication landing |
| [`src/app/dashboard/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/app/dashboard) | Institutional executive dashboard (placement, readiness metrics) |
| [`src/app/students/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/app/students) | Student roster, individual candidate inspection, historical interview records |
| [`src/app/analytics/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/app/analytics) | Program-level competency gap reports and trends |
| [`src/config/api.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/config/api.ts) | Backend API endpoint configuration for web |
| [`src/lib/ojtExclusion.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/lib/ojtExclusion.ts) | Scoping logic excluding non-student administrative users from student metrics |

---

## 5. Navigation Decision Tree for Agents

Before searching the codebase, find your task type below:

1. **Modifying Interview Logic or Questions:**
   - Spoken question wording / themes -> [`AIRIS-Backend/data/interview_questions.json`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/data/interview_questions.json)
   - Question flow, turns, follow-up rules -> [`AIRIS-Backend/interview_engine.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/interview_engine.py)
   - Mobile interview session store -> [`AIRIS-Mobile/src/store/interviewStore.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/store/interviewStore.ts)
   - VR bridge & speech events -> [`AIRIS-Mobile/src/screens/interview/ImmersiveInterviewScreen.tsx`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/screens/interview/ImmersiveInterviewScreen.tsx)

2. **Modifying ATS or Resume Scoring:**
   - Formulas and deterministic scoring -> [`AIRIS-Backend/deterministic_scorer.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/deterministic_scorer.py)
   - Role competency definitions -> [`AIRIS-Backend/role_profile_registry.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/role_profile_registry.py)
   - Section parsing -> [`AIRIS-Backend/resume_parser.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/resume_parser.py)
   - PDF/DOCX text extraction -> [`AIRIS-Backend/file_utils.py`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Backend/file_utils.py)

3. **Modifying Mobile UI / Styling:**
   - Design tokens and typography -> [`AIRIS-Mobile/src/components/ui/designTokens.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/components/ui/designTokens.ts)
   - UI primitives -> [`AIRIS-Mobile/src/components/ui/`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Mobile/src/components/ui)

4. **Modifying Admin Web Features:**
   - Student filtering / OJT rules -> [`AIRIS-Web/src/lib/ojtExclusion.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/lib/ojtExclusion.ts)
   - Admin authentication -> [`AIRIS-Web/src/services/firebase/authService.ts`](file:///Users/danieltan/Desktop/AIRIS/AIRIS-Web/src/services/firebase/authService.ts)

## Learning/resume accuracy ownership

| Owner | Source | Responsibility |
|---|---|---|
| Backend | `data/tip_programs.json` | Dated campus provenance; current and historical program status; explicitly partial curriculum evidence |
| Backend | `data/learning_resources.json`, `learning_catalog.py` | Reviewed factual resource records and canonical resolution of selected URLs |
| Backend | `credential_evidence.py`, `resume_findings.py` | Credential status eligibility and source-grounded structural findings; no numerical score calculation |
| Backend | `scripts/verify_learning_catalog.py` | Read-only repeatable HTTP checks, redirects and duplicate reporting |
| Mobile | `scripts/sync-academic-catalog.mjs`, `src/data/*Programs.json`, `src/data/reviewedLearningResources.json` | Generated mirrors; check sync before builds |
| Mobile | `src/services/learning/catalogValidator.ts`, `learningCatalogService.ts` | Proof/freshness gate, read-only refresh, ranking, relevance, diversity and For You cap |
| Web | `src/services/firebase/userService.ts`, `analyticsService.ts`, `reportService.ts` | Historical reads, explicit synthetic scope, recorded timestamps and honest evaluation-completion labels |

Maintenance and verification: [LEARNING_CATALOG_MAINTENANCE.md](LEARNING_CATALOG_MAINTENANCE.md).
