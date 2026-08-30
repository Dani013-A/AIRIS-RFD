import os
import uuid
import logging
import warnings

# Suppress verbose third-party loggers
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

from ai_validator import is_resume_valid
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
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
from firebase_admin import auth

app = FastAPI(
    title="AIRIS SBERT Resume Evaluator",
    description="FastAPI endpoint utilizing SBERT and Gemini to score, analyze, and normalize student resumes.",
    version="1.1.0"
)

# Configure CORS
frontend_url = os.getenv("FRONTEND_URL", "*")
origins = [frontend_url] if frontend_url != "*" else ["*"]
# If running locally, you might want to allow localhost explicitly
if frontend_url != "*":
    origins.append("http://localhost:8081")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, Request

class NormalizationRequest(BaseModel):
    type: str  # "job" | "skill" | "certification" | "program"
    input: str

@app.get("/")
def read_root():
    return {"status": "running", "service": "AIRIS SBERT Evaluator API"}

def verify_admin_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

    admin_uids = [u.strip() for u in os.getenv("ADMIN_UIDS", "").split(",") if u.strip()]
    if not admin_uids or uid not in admin_uids:
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges")
    return uid

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
async def analyze_resume(request: Request):
    try:
        try:
            analysis_payload = await request.json()
        except Exception:
            analysis_payload = {}

        raw_text = str(analysis_payload.get("rawText") or analysis_payload.get("raw_text") or "")
        parsed_sections = analysis_payload.get("parsedSections") or analysis_payload.get("parsed_sections") or {}
        if not parsed_sections or not isinstance(parsed_sections, dict) or len(parsed_sections) < 2:
            from resume_parser import parse_resume
            parsed_sections = parse_resume(raw_text)

        target_pos = str(analysis_payload.get("targetPosition") or analysis_payload.get("target_position") or "").strip()
        if not target_pos:
            raise HTTPException(status_code=400, detail="Target position is required for resume analysis.")

        # Validate resume content BEFORE expensive SBERT / LLM analysis
        if not is_resume_valid(parsed_sections, raw_text):
            return {
                "valid": False,
                "message": "The provided data does not appear to be a valid resume.",
                "analysisId": None,
            }

        skills_text = str(parsed_sections.get("Skills", ""))
        experience_text = str(parsed_sections.get("WorkExperience", "") or parsed_sections.get("Experience", ""))
        # 1. Run semantic similarity scoring with SBERT
        sbert_results = evaluate_semantic_alignment(
            parsed_sections=parsed_sections,
            target_position=target_pos
        )

        # 2. Get explainable feedback from Gemini AI validator using the authoritative frontend deterministic scores
        enhanced_result = validate_and_enhance_analysis(
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
            "suggestions": enhanced_result["suggestions"],
            "detectedSections": enhanced_result.get("detectedSections", []),
            "missingSections": enhanced_result.get("missingSections", []),
            "recommendations": enhanced_result.get("recommendations", []),
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

@app.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    targetPosition: Optional[str] = Form(None),
    target_position: Optional[str] = Query(None)
):
    """
    Accept a resume file, extract raw text, parse sections, and run analysis.
    """
    try:
        selected_position = (targetPosition or target_position or "").strip()
        if not selected_position:
            raise HTTPException(status_code=400, detail="Target position is required for upload analysis.")

        filename = getattr(file, "filename", "uploaded_resume.pdf") or "uploaded_resume.pdf"
        content = await file.read()
        raw_text = extract_text(content, filename)

        from resume_parser import parse_resume
        parsed_sections = parse_resume(raw_text)

        if not is_resume_valid(parsed_sections, raw_text):
            return {
                "valid": False,
                "message": "The provided file does not appear to be a valid resume.",
                "analysisId": None,
            }

        analysis_id = str(uuid.uuid4())

        sbert_results = evaluate_semantic_alignment(
            parsed_sections=parsed_sections,
            target_position=selected_position
        )

        enhanced_result = validate_and_enhance_analysis(
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
def normalize_input(req: NormalizationRequest):
    """
    Function of page:
    Intelligently normalizes any career-related input string.
    """
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

class InterviewReportRequest(BaseModel):
    targetRole: Optional[str] = None
    program: Optional[str] = None
    parsedResume: Optional[Dict[str, Any]] = None
    history: List[Dict[str, Any]]
    evaluations: List[Dict[str, Any]]

import datetime

@app.post("/interview/start")
def start_interview(req: InterviewStartRequest):
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
def evaluate_interview_answer(req: InterviewAnswerRequest):
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
            total_questions=req.totalQuestions
        )
        print(f"[{timestamp}] [INTERVIEW] Evaluation complete. Score: {result.get('evaluation', {}).get('overall', 'N/A')}")
        return result
    except Exception as e:
        print(f"[{timestamp}] [INTERVIEW ERROR] Answer Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/interview/transcribe")
async def transcribe_interview_audio(audio: UploadFile = File(...)):
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
        text = transcribe_audio(bytes(file_bytes), mime)
        print(f"[{timestamp}] [INTERVIEW] Transcription complete: '{text[:50]}...'")
        return {"transcription": text}
    except Exception as e:
        print(f"[{timestamp}] [INTERVIEW ERROR] Transcribe Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/interview/report")
def generate_interview_report(req: InterviewReportRequest):
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
