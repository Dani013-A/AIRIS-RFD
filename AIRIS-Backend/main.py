import os
import uuid
import logging
import warnings

# Suppress verbose third-party loggers
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

from ai_validator import is_resume_valid, validate_resume_validity_with_llm
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from starlette.concurrency import run_in_threadpool
from file_utils import extract_text
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

from sbert_matcher import evaluate_semantic_alignment
from ai_validator import validate_and_enhance_analysis
from normalizer import normalize_career_input
from fastapi import Header, Depends
import firebase_admin
from firebase_admin import auth

# Initialize Firebase Admin SDK safely
def init_firebase_admin():
    try:
        firebase_admin.get_app()
    except ValueError:
        project_id = os.getenv("FIREBASE_PROJECT_ID", "airis-development")
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
        if cred_path and os.path.exists(cred_path):
            from firebase_admin import credentials
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {"projectId": project_id})
        else:
            firebase_admin.initialize_app(options={"projectId": project_id})

init_firebase_admin()

app = FastAPI(
    title="AIRIS SBERT Resume Evaluator",
    description="FastAPI endpoint utilizing SBERT and Gemini to score, analyze, and normalize student resumes.",
    version="1.1.0"
)

# Configure CORS - Fail-closed in production
is_production = (
    os.getenv("ENVIRONMENT", "").strip().lower() in ("production", "prod") or
    os.getenv("APP_ENV", "").strip().lower() in ("production", "prod")
)

raw_origins = os.getenv("ALLOWED_ORIGINS") or os.getenv("FRONTEND_URL")

if is_production:
    if not raw_origins or raw_origins.strip() == "*":
        logging.error("[CORS][CRITICAL] Production CORS misconfiguration: ALLOWED_ORIGINS must be explicitly configured and cannot be wildcard.")
        origins = []  # Fail closed: reject cross-origin requests
    else:
        origins = [o.strip() for o in raw_origins.split(",") if o.strip() and o.strip() != "*"]
        if not origins:
            logging.error("[CORS][CRITICAL] Production CORS misconfiguration: No valid non-wildcard origins configured.")
            origins = []
else:
    # Development mode: allow configured origins or standard local dev servers
    if raw_origins and raw_origins.strip() != "*":
        origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
    else:
        origins = ["http://localhost:3000", "http://localhost:8081"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, Request, Header, Depends
from fastapi.responses import JSONResponse
from rate_limiter import (
    resolve_request_identity,
    check_rate_limit,
    ExpensiveConcurrencyGuard,
    PER_USER_EXPENSIVE_REQUEST_LIMIT,
    PER_USER_GENERAL_REQUEST_LIMIT,
    PER_IP_PUBLIC_REQUEST_LIMIT,
)

def get_authenticated_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Cryptographically verifies Firebase ID token from Authorization header.
    Derives authoritative UID, validates email verification and institutional @tip.edu.ph
    domain for protected operations. Rejects unauthenticated requests with HTTP 401 and
    unauthorized domains with HTTP 403.
    """
    if not authorization or not isinstance(authorization, str) or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Missing or invalid Authorization header."
        )
    token = authorization.split("Bearer ")[1].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Missing Bearer token."
        )
    try:
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=10)
        uid = decoded_token.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token payload: missing UID.")

        # Check admin exemption (custom claims or ADMIN_UIDS)
        is_admin = decoded_token.get("admin") is True or decoded_token.get("role") == "admin"
        admin_uids = [u.strip() for u in os.getenv("ADMIN_UIDS", "").split(",") if u.strip()]
        if is_admin or (admin_uids and str(uid) in admin_uids):
            return str(uid)

        # Non-admin student security boundary: enforce authoritative email, verified identity, and TIP domain
        email = decoded_token.get("email")
        if not email or not isinstance(email, str):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Authenticated token does not contain an authoritative email address."
            )

        email_lower = email.strip().lower()
        if not email_lower.endswith("@tip.edu.ph"):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Only verified TIP institutional accounts (@tip.edu.ph) are authorized to access AIRIS services."
            )

        email_verified = decoded_token.get("email_verified")
        if email_verified is not True:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Institutional email address has not been verified."
            )

        return str(uid)
    except HTTPException:
        raise
    except Exception:
        # Never expose raw Firebase internal errors or stack traces to callers
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

def assert_user_authorization(auth_uid: str, requested_user_id: Optional[str] = None):
    """
    Prevents cross-user impersonation and unauthorized operations.
    If a target user ID is specified, it must strictly match the authenticated token UID.
    """
    if requested_user_id and str(requested_user_id).strip() and str(requested_user_id).strip() != auth_uid:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You cannot perform operations for another user."
        )

def verify_admin_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split("Bearer ")[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=10)
        uid = decoded_token.get("uid")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Check custom claims first, then ADMIN_UIDS environment variable
    is_admin = decoded_token.get("admin") is True or decoded_token.get("role") == "admin"
    admin_uids = [u.strip() for u in os.getenv("ADMIN_UIDS", "").split(",") if u.strip()]
    if not is_admin and (not admin_uids or uid not in admin_uids):
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")
    return uid

class NormalizationRequest(BaseModel):
    type: str  # "job" | "skill" | "certification" | "program"
    input: str

class CareerCompatibilityRequest(BaseModel):
    academicProgram: str
    targetCareer: str
    resumeSkills: Optional[List[str]] = []

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 429:
        content = exc.detail if isinstance(exc.detail, dict) else {
            "error": "TOO_MANY_REQUESTS",
            "message": str(exc.detail),
            "retryAfterSeconds": 5
        }
        return JSONResponse(status_code=429, content=content, headers=exc.headers)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)

@app.get("/")
@app.get("/health")
def read_root(request: Request):
    id_type, id_val = resolve_request_identity(request)
    check_rate_limit(id_type, id_val, PER_IP_PUBLIC_REQUEST_LIMIT)
    return {"status": "running", "service": "AIRIS SBERT Evaluator API", "health": "healthy"}

@app.post("/career/compatibility")
def check_career_compatibility(req: CareerCompatibilityRequest, request: Request, authorization: Optional[str] = Header(None)):
    id_type, id_val = resolve_request_identity(request, authorization)
    limit = PER_USER_GENERAL_REQUEST_LIMIT if id_type == "uid" else PER_IP_PUBLIC_REQUEST_LIMIT
    check_rate_limit(id_type, id_val, limit)
    from ai_service import evaluate_career_compatibility
    return evaluate_career_compatibility(req.academicProgram, req.targetCareer, req.resumeSkills or [])

@app.post("/admin/refresh-trends")
def trigger_refresh_trends(admin_uid: str = Depends(verify_admin_token)):
    from market_intelligence import refresh_job_market_snapshot
    from ai_service import invalidate_market_cache
    try:
        result = refresh_job_market_snapshot()
        # Invalidate memory cache so next request fetches the new snapshot instantly
        invalidate_market_cache()
        return result
    except Exception as e:
        print(f"[Admin] Refresh failed: {e}")
        raise HTTPException(status_code=500, detail="Refresh operation failed. See backend logs.")

@app.post("/analyze")
async def analyze_resume(request: Request, auth_uid: str = Depends(get_authenticated_user)):
    check_rate_limit("uid", auth_uid, PER_USER_EXPENSIVE_REQUEST_LIMIT)

    with ExpensiveConcurrencyGuard(f"uid:{auth_uid}"):
        try:
            try:
                analysis_payload = await request.json()
            except Exception:
                analysis_payload = {}

            # Authoritative identity check: reject cross-user requests
            client_user_id = analysis_payload.get("userId") or analysis_payload.get("uid") or analysis_payload.get("account_id")
            assert_user_authorization(auth_uid, client_user_id)

            raw_text = str(analysis_payload.get("rawText") or analysis_payload.get("raw_text") or "")
            parsed_sections = analysis_payload.get("parsedSections") or analysis_payload.get("parsed_sections") or {}
            if not parsed_sections or not isinstance(parsed_sections, dict) or len(parsed_sections) < 2:
                from resume_parser import parse_resume
                parsed_sections = await run_in_threadpool(parse_resume, raw_text)

            target_pos = str(analysis_payload.get("targetPosition") or analysis_payload.get("target_position") or "").strip()
            if not target_pos:
                raise HTTPException(status_code=400, detail="Target position is required for resume analysis.")

            # Validate resume content BEFORE expensive SBERT / LLM analysis via Universal LLM Resume Validity Gate
            validity_res = await run_in_threadpool(validate_resume_validity_with_llm, raw_text, parsed_sections)
            if not validity_res.get("is_resume"):
                return {
                    "valid": False,
                    "message": validity_res.get("reason") or "This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information.",
                    "analysisId": None,
                }

            skills_text = str(parsed_sections.get("Skills", ""))
            experience_text = str(parsed_sections.get("WorkExperience", "") or parsed_sections.get("Experience", ""))
            # 1. Run semantic similarity scoring with SBERT
            sbert_results = await run_in_threadpool(
                evaluate_semantic_alignment,
                parsed_sections=parsed_sections,
                target_position=target_pos
            )

            # 2. Get explainable feedback from Gemini AI validator using the authoritative frontend deterministic scores
            enhanced_result = await run_in_threadpool(
                validate_and_enhance_analysis,
                raw_text=raw_text,
                parsed_sections=parsed_sections,
                target_position=target_pos,
                sbert_results=sbert_results
            )

            analysis_id = str(uuid.uuid4())
            response = {
                "valid": True,
                "message": "Resume processed successfully.",
                "analysisId": analysis_id,
                "parsedSections": parsed_sections,
                "atsScore": enhanced_result["atsScore"],
                "detectedSkills": enhanced_result.get("detectedSkills", []),
                "suggestions": enhanced_result["suggestions"],
                "detectedSections": enhanced_result.get("detectedSections", []),
                "missingSections": enhanced_result.get("missingSections", []),
                "recommendations": enhanced_result.get("recommendations", []),
                "aiRecommendedResources": enhanced_result.get("aiRecommendedResources", []),
                "learningSnapshot": enhanced_result.get("learningSnapshot"),
                "isAnalysisComplete": True,
                "analyzedAt": enhanced_result.get("analyzedAt", ""),
                "analysisVersion": "1.1.0-sbert",
            }

            return response

        except HTTPException:
            raise
        except Exception as e:
            print("Analysis error:", e)
            raise HTTPException(status_code=500, detail="An internal error occurred during analysis.")

@app.post("/verify-resource-url")
async def verify_resource_url_endpoint(request: Request, auth_uid: str = Depends(get_authenticated_user)):
    check_rate_limit("uid", auth_uid, PER_USER_EXPENSIVE_REQUEST_LIMIT)
    try:
        body = await request.json()
    except Exception:
        body = {}
    url = str(body.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="Resource URL is required.")

    from ai_recommendation_verifier import verify_external_resource_url
    result = await run_in_threadpool(verify_external_resource_url, url)
    return result

@app.post("/upload")
async def upload_resume(
    request: Request,
    auth_uid: str = Depends(get_authenticated_user),
    file: UploadFile = File(...),
    targetPosition: Optional[str] = Form(None),
    target_position: Optional[str] = Query(None),
    accountName: Optional[str] = Form(None),
    account_name: Optional[str] = Form(None),
    userId: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None)
):
    """
    Accept a resume file, extract raw text, parse sections, and run analysis for authenticated user.
    """
    client_user_id = userId or user_id
    assert_user_authorization(auth_uid, client_user_id)

    check_rate_limit("uid", auth_uid, PER_USER_EXPENSIVE_REQUEST_LIMIT)

    with ExpensiveConcurrencyGuard(f"uid:{auth_uid}"):
        try:
            selected_position = (targetPosition or target_position or "").strip()
            if not selected_position:
                raise HTTPException(status_code=400, detail="Target position is required for upload analysis.")

            filename = getattr(file, "filename", "uploaded_resume.pdf") or "uploaded_resume.pdf"
            content = await file.read()

            if not content or len(content) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="The uploaded file is empty. Please choose a valid resume file."
                )

            allowed_exts = (".pdf", ".docx", ".doc", ".rtf", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".heic")
            if not any(filename.lower().endswith(ext) for ext in allowed_exts):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file format. Please upload a valid PDF, DOCX, DOC, RTF, TXT, or Image (PNG, JPG, JPEG, WEBP, HEIC) resume document."
                )

            if filename.lower().endswith(".pdf"):
                from file_utils import get_pdf_page_count
                page_count = await run_in_threadpool(get_pdf_page_count, content)
                if page_count > 3:
                    raise HTTPException(
                        status_code=400,
                        detail="Resumes must not exceed 3 pages. Please upload a 1–3 page resume."
                    )

            try:
                raw_text = await run_in_threadpool(extract_text, content, filename)
            except ValueError as ve:
                raise HTTPException(status_code=400, detail=str(ve))

            if not raw_text or len(raw_text.strip()) < 30:
                return {
                    "valid": False,
                    "message": "Unable to extract readable text from this document. Please ensure the file is not empty, corrupted, or password-protected.",
                    "analysisId": None,
                }

            from resume_parser import parse_resume
            parsed_sections = await run_in_threadpool(parse_resume, raw_text)

            # Invariant: Unsupported / Invalid documents MUST be validated as resume BEFORE identity checking
            validity_res = await run_in_threadpool(validate_resume_validity_with_llm, raw_text, parsed_sections)
            if not validity_res.get("is_resume"):
                return {
                    "valid": False,
                    "message": validity_res.get("reason") or "This document doesn't appear to be a resume or CV. Please upload a document containing your academic, professional, or career information.",
                    "analysisId": None,
                }

            user_acc_name = (accountName or account_name or "").strip()
            if user_acc_name and raw_text:
                from ai_validator import validate_resume_name_match
                name_res = await run_in_threadpool(validate_resume_name_match, user_acc_name, raw_text)
                if not name_res["is_valid"]:
                    raise HTTPException(
                        status_code=400,
                        detail=name_res.get("reason") or "The uploaded resume appears to belong to a different individual. Please ensure you upload your own resume."
                    )

            analysis_id = str(uuid.uuid4())

            sbert_results = await run_in_threadpool(
                evaluate_semantic_alignment,
                parsed_sections=parsed_sections,
                target_position=selected_position
            )

            enhanced_result = await run_in_threadpool(
                validate_and_enhance_analysis,
                raw_text=raw_text,
                parsed_sections=parsed_sections,
                target_position=selected_position,
                sbert_results=sbert_results,
            )

            return {
                "valid": True,
                "message": "Resume processed successfully.",
                "analysisId": analysis_id,
                "rawText": raw_text,
                "parsedSections": parsed_sections,
                "atsScore": enhanced_result["atsScore"],
                "detectedSkills": enhanced_result.get("detectedSkills", []),
                "suggestions": enhanced_result["suggestions"],
                "detectedSections": enhanced_result.get("detectedSections", []),
                "missingSections": enhanced_result.get("missingSections", []),
                "recommendations": enhanced_result.get("recommendations", []),
                "learningSnapshot": enhanced_result.get("learningSnapshot"),
                "isAnalysisComplete": True,
                "analyzedAt": enhanced_result.get("analyzedAt", ""),
                "analysisVersion": "1.1.0-sbert",
            }
        except HTTPException:
            raise
        except Exception as e:
            print("Upload analysis error:", e)
            raise HTTPException(status_code=500, detail="An internal error occurred during upload analysis.")

@app.post("/normalize")
def normalize_input(req: NormalizationRequest, request: Request, authorization: Optional[str] = Header(None)):
    """
    Function of page:
    Intelligently normalizes any career-related input string.
    """
    id_type, id_val = resolve_request_identity(request, authorization)
    limit = PER_USER_GENERAL_REQUEST_LIMIT if id_type == "uid" else PER_IP_PUBLIC_REQUEST_LIMIT
    check_rate_limit(id_type, id_val, limit)
    try:
        normalization_result = normalize_career_input(req.input, req.type)
        return normalization_result
    except Exception as e:
        print("Normalization error:", e)
        raise HTTPException(status_code=500, detail=str(e))

class InterviewStartRequest(BaseModel):
    targetRole: Optional[str] = None
    program: Optional[str] = None
    parsedResume: Optional[Dict[str, Any]] = None

class InterviewAnswerRequest(BaseModel):
    targetRole: Optional[str] = None
    program: Optional[str] = None
    parsedResume: Optional[Dict[str, Any]] = None
    history: List[Dict[str, Any]]
    currentQuestion: str
    currentAnswer: str
    currentQuestionType: str
    totalQuestions: int
    pauseMetrics: Optional[Dict[str, Any]] = None

class InterviewReportRequest(BaseModel):
    targetRole: Optional[str] = None
    program: Optional[str] = None
    parsedResume: Optional[Dict[str, Any]] = None
    history: List[Dict[str, Any]]
    evaluations: List[Dict[str, Any]]

import datetime

@app.post("/interview/start")
def start_interview(req: InterviewStartRequest, request: Request, authorization: Optional[str] = Header(None)):
    id_type, id_val = resolve_request_identity(request, authorization)
    limit = PER_USER_GENERAL_REQUEST_LIMIT if id_type == "uid" else PER_IP_PUBLIC_REQUEST_LIMIT
    check_rate_limit(id_type, id_val, limit)

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    target_role = (req.targetRole or "").strip()
    if not target_role:
        raise HTTPException(status_code=400, detail="Target role is required to start an interview session.")

    program = (req.program or "").strip()
    parsed_resume = req.parsedResume if isinstance(req.parsedResume, dict) else {}

    print(f"[{timestamp}] [INTERVIEW] Starting session for target role: {target_role}")
    try:
        from interview_engine import generate_first_question
        result = generate_first_question(target_role, program, parsed_resume)
        print(f"[{timestamp}] [INTERVIEW] Successfully generated first question.")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[{timestamp}] [INTERVIEW ERROR] Start Error:", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate interview question: {str(e)}")

@app.post("/interview/answer")
def evaluate_interview_answer(req: InterviewAnswerRequest, request: Request, authorization: Optional[str] = Header(None)):
    id_type, id_val = resolve_request_identity(request, authorization)
    limit = PER_USER_GENERAL_REQUEST_LIMIT if id_type == "uid" else PER_IP_PUBLIC_REQUEST_LIMIT
    check_rate_limit(id_type, id_val, limit)

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [INTERVIEW] Evaluating answer to question: '{req.currentQuestion[:30]}...'")
    try:
        from interview_engine import evaluate_answer_and_generate_next
        result = evaluate_answer_and_generate_next(
            target_role=req.targetRole,
            program=req.program,
            parsed_resume=req.parsedResume,
            history=req.history,
            current_question=req.currentQuestion,
            current_answer=req.currentAnswer,
            current_question_type=req.currentQuestionType,
            total_questions=req.totalQuestions,
            pause_metrics=req.pauseMetrics
        )
        eval_dict = result.get("evaluation") if isinstance(result, dict) and isinstance(result.get("evaluation"), dict) else {}
        score_val = eval_dict.get("overall", "N/A")
        print(f"[{timestamp}] [INTERVIEW] Evaluation complete. Score: {score_val}")
        return result
    except Exception as e:
        print(f"[{timestamp}] [INTERVIEW ERROR] Answer Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/interview/transcribe")
async def transcribe_interview_audio(
    request: Request,
    authorization: Optional[str] = Header(None),
    audio: UploadFile = File(...)
):
    id_type, id_val = resolve_request_identity(request, authorization)
    limit = PER_USER_EXPENSIVE_REQUEST_LIMIT if id_type == "uid" else PER_IP_PUBLIC_REQUEST_LIMIT
    check_rate_limit(id_type, id_val, limit)

    with ExpensiveConcurrencyGuard(f"{id_type}:{id_val}"):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [INTERVIEW] Received audio for transcription. MIME: {audio.content_type}")

        # Enforce 5MB limit
        MAX_SIZE = 5 * 1024 * 1024
        file_bytes = bytearray()
        chunk_size = 1024 * 1024 # 1MB chunks

        try:
            while chunk := await audio.read(chunk_size):
                file_bytes.extend(chunk)
                if len(file_bytes) > MAX_SIZE:
                    raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")

            from transcriber import transcribe_audio
            # Default fallback mime type if not provided
            mime = audio.content_type if audio.content_type else "audio/m4a"
            transcribe_res = transcribe_audio(bytes(file_bytes), mime)

            if isinstance(transcribe_res, dict):
                text = transcribe_res.get("text", "")
                pause_metrics = transcribe_res.get("pauseMetrics", {})
            else:
                text = str(transcribe_res)
                pause_metrics = {}

            print(f"[{timestamp}] [INTERVIEW] Transcription complete: '{text[:50]}...'")
            return {"transcription": text, "pauseMetrics": pause_metrics}
        except HTTPException:
            raise
        except Exception as e:
            print(f"[{timestamp}] [INTERVIEW ERROR] Transcribe Error:", e)
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/interview/report")
def generate_interview_report(req: InterviewReportRequest, request: Request, authorization: Optional[str] = Header(None)):
    id_type, id_val = resolve_request_identity(request, authorization)
    limit = PER_USER_GENERAL_REQUEST_LIMIT if id_type == "uid" else PER_IP_PUBLIC_REQUEST_LIMIT
    check_rate_limit(id_type, id_val, limit)

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [INTERVIEW] Generating final report...")
    try:
        from interview_engine import generate_final_report
        result = generate_final_report(
            target_role=req.targetRole,
            program=req.program,
            parsed_resume=req.parsedResume,
            history=req.history,
            evaluations=req.evaluations
        )
        print(f"[{timestamp}] [INTERVIEW] Final report generated successfully.")
        return result
    except Exception as e:
        print(f"[{timestamp}] [INTERVIEW ERROR] Report Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
