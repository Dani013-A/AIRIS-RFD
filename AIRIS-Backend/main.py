import os
import uuid
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

@app.post("/analyze")
async def analyze_resume(request: Request):
    try:
        try:
            body = await request.json()
        except Exception:
            body = {}

        raw_text = str(body.get("rawText") or body.get("raw_text") or "")
        parsed_sections = body.get("parsedSections") or body.get("parsed_sections") or {}
        if not isinstance(parsed_sections, dict):
            parsed_sections = {"Content": str(parsed_sections)}

        target_pos = str(body.get("targetPosition") or body.get("target_position") or "Software Engineer")

        skills_text = str(parsed_sections.get("Skills", ""))
        experience_text = str(parsed_sections.get("WorkExperience", "") or parsed_sections.get("Experience", ""))
        
        # 1. Run semantic similarity scoring with SBERT
        sbert_results = evaluate_semantic_alignment(
            skills_text=skills_text,
            experience_text=experience_text,
            target_position=target_pos
        )
        
        local_analysis = body.get("localAnalysis")

        # 2. Get explainable feedback from Gemini AI validator using the authoritative frontend deterministic scores
        enhanced_result = validate_and_enhance_analysis(
            raw_text=raw_text,
            parsed_sections=parsed_sections,
            target_position=target_pos,
            sbert_results=sbert_results,
            local_analysis=local_analysis
        )
        
        # Validate resume content using parsed sections
        if not is_resume_valid(parsed_sections):
            return {
                "valid": False,
                "message": "The provided data does not appear to be a valid resume.",
                "analysisId": None,
            }

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
            "isAnalysisComplete": True,
            "analyzedAt": enhanced_result.get("analyzedAt", ""),
            "analysisVersion": "1.1.0-sbert",
        }
        
        return response

    except Exception as e:
        print("Analysis error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    targetPosition: Optional[str] = Form(None),
    target_position: Optional[str] = Query(None)
):
    """
    Accept a resume file, extract raw text, parse sections, and run analysis.
    Guaranteed immune to 422 Unprocessable Content errors.
    """
    try:
        selected_position = targetPosition or target_position or "Software Engineer"
        filename = getattr(file, "filename", "uploaded_resume.pdf") or "uploaded_resume.pdf"
        content = await file.read()
        raw_text = extract_text(content, filename)

        from resume_parser import parse_resume
        parsed_sections = parse_resume(raw_text)

        if not is_resume_valid(parsed_sections):
            return {
                "valid": False,
                "message": "The provided file does not appear to be a valid resume.",
                "analysisId": None,
            }

        analysis_id = str(uuid.uuid4())

        sbert_results = evaluate_semantic_alignment(
            skills_text=str(parsed_sections.get("Skills", "")),
            experience_text=str(parsed_sections.get("WorkExperience", "") or parsed_sections.get("Experience", "")),
            target_position=selected_position,
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
            "recommendations": enhanced_result.get("recommendations", []),
            "isAnalysisComplete": True,
            "analyzedAt": enhanced_result.get("analyzedAt", ""),
            "analysisVersion": "1.1.0-sbert",
        }
    except Exception as e:
        print("Upload analysis error:", e)
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/normalize")
def normalize_input(req: NormalizationRequest):
    """
    Function of page:
    Intelligently normalizes any career-related input string.
    """
    try:
        res = normalize_career_input(req.input, req.type)
        return res
    except Exception as e:
        print("Normalization error:", e)
        raise HTTPException(status_code=500, detail=str(e))

class InterviewStartRequest(BaseModel):
    targetRole: str
    program: str
    parsedResume: Dict[str, Any]

class InterviewAnswerRequest(BaseModel):
    targetRole: str
    program: str
    parsedResume: Dict[str, Any]
    history: List[Dict[str, Any]]
    currentQuestion: str
    currentAnswer: str
    currentQuestionType: str
    totalQuestions: int

class InterviewReportRequest(BaseModel):
    targetRole: str
    program: str
    parsedResume: Dict[str, Any]
    history: List[Dict[str, Any]]
    evaluations: List[Dict[str, Any]]

import datetime

@app.post("/interview/start")
def start_interview(req: InterviewStartRequest):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [INTERVIEW] Starting session for target role: {req.targetRole}")
    try:
        from interview_engine import generate_first_question
        result = generate_first_question(req.targetRole, req.program, req.parsedResume)
        print(f"[{timestamp}] [INTERVIEW] Successfully generated first question.")
        return result
    except Exception as e:
        print(f"[{timestamp}] [INTERVIEW ERROR] Start Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

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
