import json
import os
import re
import random
import numpy as np
from typing import Dict, Any, List
from ai_service import generate_text_with_fallback
from sbert_matcher import _cached_encode, calculate_cosine_similarity

DATASET_PATH = os.path.join(os.path.dirname(__file__), "data", "interview_questions.json")

def load_dataset() -> List[Dict[str, Any]]:
    if not os.path.exists(DATASET_PATH):
        return []
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def _extract_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
            
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end+1])
        except Exception:
            pass
            
    raise ValueError(f"Could not extract JSON from response: {text[:100]}...")

def find_best_dataset_question(target_role: str, category: str, history: List[dict]) -> Dict[str, Any]:
    dataset = load_dataset()
    if not dataset:
        return {"text": f"Tell me about your experience as a {target_role}."}

    # Filter by category and exclude already asked questions
    asked_texts = [h.get("question", "").lower() for h in history]
    candidates = [q for q in dataset if q.get("category", "") == category]
    
    if not candidates:
        candidates = dataset  # Fallback if category empty

    # Calculate similarity to target role
    target_emb = _cached_encode(target_role)
    best_score = -1.0
    best_q = None

    for q in candidates:
        # Avoid exact repetition
        if any(q.get("text", "").lower() in asked for asked in asked_texts):
            continue
            
        tags_str = " ".join(q.get("tags", []))
        q_emb = _cached_encode(tags_str + " " + q.get("text", ""))
        score = calculate_cosine_similarity(target_emb, q_emb)
        
        # Add a tiny bit of randomness to break ties or prevent absolute determinism
        score += random.uniform(0, 0.05)
        
        if score > best_score:
            best_score = score
            best_q = q

    if not best_q:
        best_q = random.choice(dataset)

    return best_q

def generate_first_question(target_role: str, program: str, parsed_resume: dict) -> Dict[str, Any]:
    # Fetch a dataset question
    base_question = find_best_dataset_question(target_role, "introductory", [])
    
    prompt = f"""
    You are an expert, professional, and rigorous technical interviewer. You are interviewing a fresh graduate for the role of '{target_role}'.
    
    CANDIDATE CONTEXT:
    Degree Program: {program}
    Resume Data: {json.dumps(parsed_resume)}
    
    BASE KNOWLEDGE QUESTION:
    "{base_question.get("text")}"
    
    TASK:
    Adapt the BASE KNOWLEDGE QUESTION into the FIRST question for this interview based on the candidate's context. 
    DO NOT invent a completely new question. Slightly tailor the wording so it feels personal, referencing their program or a resume detail if relevant.
    DO NOT be conversational. You are generating structured data for an interview engine.
    
    OUTPUT FORMAT (Strict JSON):
    {{
        "question": "The adapted text of the question",
        "questionType": "introductory",
        "difficulty": 1,
        "targetCompetencies": ["communication", "background"]
    }}
    """
    
    raw_response = generate_text_with_fallback(prompt)
    return _extract_json(raw_response)

def evaluate_answer_and_generate_next(
    target_role: str, 
    program: str, 
    parsed_resume: dict, 
    history: List[dict], 
    current_question: str, 
    current_answer: str, 
    current_question_type: str,
    total_questions: int
) -> Dict[str, Any]:
    
    is_final_question = len(history) >= total_questions - 1

    # Decide next category based on progress
    next_cat = "technical"
    if is_final_question:
        next_cat = "closing"
    elif len(history) % 2 != 0:
        next_cat = "behavioral"

    next_base = find_best_dataset_question(target_role, next_cat, history)

    prompt = f"""
    You are an expert, professional, and rigorous technical interviewer. You are conducting an interview for the role of '{target_role}'.
    
    CANDIDATE CONTEXT:
    Degree Program: {program}
    Resume Data: {json.dumps(parsed_resume)}
    
    INTERVIEW PROGRESS:
    Question {len(history) + 1} of {total_questions}
    
    PREVIOUS INTERVIEW HISTORY:
    {json.dumps(history[-3:])} # (Showing last 3 interactions for context)
    
    CURRENT INTERACTION:
    Question asked ({current_question_type}): "{current_question}"
    Candidate's Answer: "{current_answer}"
    
    KNOWLEDGE BASE QUESTION FOR NEXT TOPIC:
    "{next_base.get("text")}"
    
    TASK 1: EVALUATE THE ANSWER
    Evaluate the candidate's answer strictly. Score out of 100 on multiple dimensions.
    Be rigorous. If the answer is vague, generic, or lacks evidence, penalize it heavily.
    Do NOT give high scores just for participating.
    
    TASK 2: DECIDE ON FOLLOW-UP OR NEXT TOPIC
    If the answer was extremely vague, contradictory, or unsupported, you MUST ask a challenging follow-up question. Do not use the KNOWLEDGE BASE QUESTION in this case.
    Otherwise, move on to a new topic by ADAPTING the provided KNOWLEDGE BASE QUESTION to fit the candidate's context.
    {"Since this is the final question, the next question should be a concluding remark or asking if they have questions." if is_final_question else ""}
    
    OUTPUT FORMAT (Strict JSON):
    {{
        "evaluation": {{
            "overall": 80,
            "clarity": 85,
            "relevance": 70,
            "technicalAccuracy": 90,
            "specificity": 60,
            "communication": 75,
            "evidence": 50,
            "strengths": ["Clear communication"],
            "weaknesses": ["Lacked quantifiable evidence"],
            "feedback": "Internal observation of the candidate's performance on this question."
        }},
        "nextQuestion": {{
            "question": "The adapted dataset question OR a follow-up question",
            "questionType": "behavioral | technical | situational | follow-up | closing",
            "difficulty": 3,
            "isFollowUp": true,
            "followUpReason": "Only populate if isFollowUp is true.",
            "targetCompetencies": ["problem_solving"]
        }},
        "isComplete": {str(is_final_question).lower()}
    }}
    """
    
    raw_response = generate_text_with_fallback(prompt)
    return _extract_json(raw_response)

def generate_final_report(target_role: str, program: str, parsed_resume: dict, history: List[dict], evaluations: List[dict]) -> Dict[str, Any]:
    prompt = f"""
    You are an expert HR assessor. The candidate just completed a simulated interview for the role of '{target_role}'.
    
    CANDIDATE CONTEXT:
    Degree Program: {program}
    Resume Data: {json.dumps(parsed_resume)}
    
    INTERVIEW DATA:
    Transcript (History): {json.dumps(history)}
    Question-by-Question Evaluations: {json.dumps(evaluations)}
    
    TASK:
    Generate a final, structured interview report.
    Do NOT be overly encouraging. Be strictly professional, objective, and realistic. 
    Calculate an overall performance score based on the evaluations.
    Identify overall strengths, areas to improve, the absolute weakest answer, and actionable feedback.
    
    OUTPUT FORMAT (Strict JSON):
    {{
        "overallPerformance": 75,
        "categoryBreakdown": {{
            "Communication": 80,
            "Relevance": 70,
            "TechnicalAccuracy": 75,
            "Specificity": 65,
            "ProblemSolving": 78
        }},
        "strengths": [
            "Handled the technical Python question well.",
            "Spoke confidently during the introduction."
        ],
        "areasToImprove": [
            "Did not provide specific metrics when discussing the dashboard project.",
            "Struggled to articulate the STAR method in the conflict resolution question."
        ],
        "weakestAnswer": {{
            "question": "The question they failed at",
            "whyItWasWeak": "Reasoning",
            "howToImprove": "Actionable advice",
            "betterResponseStructure": "Example of a good response"
        }},
        "recommendedPractice": [
            "Practice the STAR method for behavioral questions",
            "Review SQL JOIN concepts"
        ]
    }}
    """
    
    raw_response = generate_text_with_fallback(prompt)
    return _extract_json(raw_response)
