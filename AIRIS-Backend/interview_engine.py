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
        return {"text": f"Tell me about your experience as a {target_role}.", "idealAnswer": "Relevant experience detailed clearly."}

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
    safe_target_role = (target_role or "").strip()
    if not safe_target_role:
        raise ValueError("target_role is required for question generation.")

    safe_program = (program or "").strip()
    program_context = f"    Degree Program: {safe_program}\n" if safe_program else ""
    safe_resume = parsed_resume if isinstance(parsed_resume, dict) else {}

    base_question = find_best_dataset_question(safe_target_role, "introductory", [])
    benchmark_answer = base_question.get("idealAnswer", "")

    resume_str = json.dumps(safe_resume, default=str)

    prompt = f"""
    You are an expert, professional, and rigorous technical interviewer. You are interviewing a fresh graduate for the role of '{safe_target_role}'.

    CANDIDATE CONTEXT:
    Target Role: {safe_target_role}
{program_context}    Resume Data: {resume_str}

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

    try:
        raw_response = generate_text_with_fallback(prompt)
        extracted_json = _extract_json(raw_response)
        if isinstance(extracted_json, dict) and extracted_json.get("question"):
            extracted_json["benchmarkAnswer"] = benchmark_answer
            return extracted_json
    except Exception as llm_err:
        print(f"[INTERVIEW ERROR] LLM question generation failed: {llm_err}. Using deterministic fallback.")

    # High-quality fallback matching candidate target role
    fallback_text = base_question.get("text") or f"Tell me about your background and preparation for the {safe_target_role} role."
    return {
        "question": fallback_text,
        "questionType": "introductory",
        "difficulty": 1,
        "targetCompetencies": ["communication", "background"],
        "benchmarkAnswer": benchmark_answer,
        "isFallback": True,
    }

def classify_interaction_intent(current_question: str, current_answer: str) -> dict:
    prompt = f"""
    You are classifying a candidate's speech during an interview.

    Current Interviewer Question: "{current_question}"
    Candidate's Input: "{current_answer}"

    Classify the candidate's input into exactly one of the following INTENT categories:
    - ANSWER: A substantive attempt to answer the question (including partial answers, self-corrections, or explicitly stating "I don't know" / "I'm not sure").
    - REPEAT_REQUEST: Asking the interviewer to repeat the question or stating they didn't hear it.
    - CLARIFICATION_REQUEST: Asking what the question means or asking for an example.
    - TIME_REQUEST: Asking for a moment to think (e.g., "Give me a second").
    - UNRELATED_QUESTION: Asking an unrelated conversational question (e.g., "What's the salary?", "Where is the office?").
    - SKIP_REQUEST: Explicitly asking to skip to the next question.
    - RESTART_ANSWER: Explicitly asking to restart their current answer from the beginning.

    If the intent is NOT 'ANSWER' or 'SKIP_REQUEST', provide a 'suggestedResponse' for the interviewer to say.
    - For REPEAT_REQUEST: Simply repeat the original question naturally.
    - For CLARIFICATION_REQUEST: Briefly clarify the meaning of the question without giving away the answer, then ask them to proceed.
    - For TIME_REQUEST: Acknowledge naturally ("Take your time.").
    - For UNRELATED_QUESTION: State that you do not have that specific information (do not hallucinate company policies or salaries) and gracefully pivot back to the interview question.
    - For RESTART_ANSWER: Acknowledge ("Of course, go ahead") and let them start over.

    OUTPUT FORMAT (Strict JSON):
    {{
        "intent": "ANSWER | REPEAT_REQUEST | CLARIFICATION_REQUEST | TIME_REQUEST | UNRELATED_QUESTION | SKIP_REQUEST | RESTART_ANSWER",
        "suggestedResponse": "If intent is an interaction, provide the interviewer's natural response here. Otherwise, leave empty."
    }}
    """
    try:
        raw_response = generate_text_with_fallback(prompt)
        extracted_json = _extract_json(raw_response)
        return extracted_json if isinstance(extracted_json, dict) else {"intent": "ANSWER", "suggestedResponse": ""}
    except Exception as e:
        print("Intent classification failed:", e)
        return {"intent": "ANSWER", "suggestedResponse": ""}

def evaluate_answer_and_generate_next(
    target_role: str,
    program: str,
    parsed_resume: dict,
    history: List[dict],
    current_question: str,
    current_answer: str,
    current_question_type: str,
    total_questions: int,
    pause_metrics: Optional[dict] = None
) -> Dict[str, Any]:

    # 1. Deterministic Validation for Empty/Corrupted Text
    cleaned_ans = current_answer.strip()
    words = [w for w in cleaned_ans.split() if re.search(r'[a-zA-Z0-9]', w)]
    if not cleaned_ans or len(words) < 2:
        return {
            "isInteractionEvent": True,
            "nextQuestion": {
                "question": "I'm sorry, I didn't quite catch that. Could you please repeat yourself?",
                "questionType": "interaction",
                "difficulty": 0,
                "isFollowUp": True,
                "benchmarkAnswer": ""
            },
            "evaluation": None,
            "isComplete": False
        }

    # 2. AI Intent Classification
    intent_res = classify_interaction_intent(current_question, current_answer)
    if not isinstance(intent_res, dict):
        intent_res = {}
    intent = intent_res.get("intent", "ANSWER")

    if intent in ["REPEAT_REQUEST", "CLARIFICATION_REQUEST", "TIME_REQUEST", "UNRELATED_QUESTION", "RESTART_ANSWER"]:
        suggested_response = intent_res.get("suggestedResponse", "Could you please elaborate?")
        return {
            "isInteractionEvent": True,
            "nextQuestion": {
                "question": suggested_response,
                "questionType": "interaction",
                "difficulty": 0,
                "isFollowUp": True,
                "benchmarkAnswer": ""
            },
            "evaluation": None,
            "isComplete": False
        }

    # For SKIP_REQUEST, we bypass evaluation but still generate a new substantive question.
    is_skip = (intent == "SKIP_REQUEST")

    is_final_question = len(history) >= total_questions - 1

    next_cat = "technical"
    if is_final_question:
        next_cat = "closing"
    elif len(history) % 2 != 0:
        next_cat = "behavioral"

    next_base = find_best_dataset_question(target_role, next_cat, history)

    pause_info = ""
    if pause_metrics and isinstance(pause_metrics, dict):
        p_tot = pause_metrics.get("totalPauseDuration", 0.0)
        p_cnt = pause_metrics.get("pauseCount", 0)
        p_eq = pause_metrics.get("pausePeriodEquivalent", 0.0)
        p_long = pause_metrics.get("longestPause", 0.0)
        p_avg = pause_metrics.get("averagePauseDuration", 0.0)
        pause_info = (
            f"\nMEASURED AUDIO PAUSE METRICS (AUTHORITATIVE FROM AUDIO TIMESTAMPS):\n"
            f"- Total Pause Duration: {p_tot}s\n"
            f"- Pause Count: {p_cnt}\n"
            f"- Pause Period Equivalent (1s = 1.00 period): {p_eq}\n"
            f"- Longest Pause: {p_long}s\n"
            f"- Average Pause Duration: {p_avg}s\n"
            "EVALUATION INSTRUCTION: Interpret these measured audio values together with filler-word frequency for communication scoring. "
            "Do NOT invent pause values. Do NOT automatically penalize every pause—natural short pauses (under 1.5s) are expected and natural, "
            "whereas repeated long pauses (over 2.0s) indicate hesitation."
        )

    prompt = f"""
    You are an expert, professional, and rigorous technical interviewer. You are conducting an interview for the role of '{target_role}'.

    CANDIDATE CONTEXT:
    Degree Program: {program}
    Resume Data: {json.dumps(parsed_resume)}

    INTERVIEW PROGRESS:
    Question {len(history) + 1}

    PREVIOUS INTERVIEW HISTORY:
    {json.dumps(history[-3:])} # (Showing last 3 interactions for context)

    CURRENT INTERACTION:
    Question asked ({current_question_type}): "{current_question}"
    Candidate's Answer: "{current_answer}"
    {pause_info}

    KNOWLEDGE BASE QUESTION FOR NEXT TOPIC:
    "{next_base.get("text")}"

    TASK 1: EVALUATE THE ANSWER
    {
    "The candidate requested to SKIP this question. Do not evaluate it. Leave the evaluation object strictly as null." if is_skip else
    "Evaluate the candidate's answer strictly. Score out of 100 on multiple dimensions.\n"
    "Be rigorous. If the answer is vague, generic, extremely short, or lacks evidence, penalize it heavily.\n"
    "Do NOT give high scores just for participating."
    }

    TASK 2: DECIDE ON FOLLOW-UP OR NEXT TOPIC
    {
    "Since the candidate skipped, move on to a new topic by ADAPTING the provided KNOWLEDGE BASE QUESTION to fit the candidate's context." if is_skip else
    "If the answer was extremely vague, contradictory, or unsupported, you MUST ask a challenging follow-up question. Do not use the KNOWLEDGE BASE QUESTION in this case.\n"
    "Otherwise, move on to a new topic by ADAPTING the provided KNOWLEDGE BASE QUESTION to fit the candidate's context."
    }
    {"Since this is the final question, the next question should be a concluding remark or asking if they have questions." if is_final_question else ""}

    OUTPUT FORMAT (Strict JSON):
    {{
        "evaluation": {{"overall": 80, "clarity": 85, "relevance": 70, "technicalAccuracy": 90, "specificity": 60, "communication": 75, "evidence": 50, "strengths": ["Clear communication"], "weaknesses": ["Lacked quantifiable evidence"], "feedback": "Internal observation of the candidate's performance on this question."}} if this is NOT a skip request, otherwise null,
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

    try:
        raw_response = generate_text_with_fallback(prompt)
        extracted_json = _extract_json(raw_response)
    except Exception as llm_err:
        print(f"[INTERVIEW ERROR] LLM evaluation failed: {llm_err}. Utilizing deterministic low-score fallback.")
        extracted_json = {}

    if not isinstance(extracted_json, dict):
        extracted_json = {}

    # If this is a substantive non-skip question answer and LLM returned null evaluation or unparseable JSON,
    # generate an authentic low-scoring evaluation object with explicit feedback.
    if not is_skip and not isinstance(extracted_json.get("evaluation"), dict):
        extracted_json["evaluation"] = {
            "overall": 15,
            "clarity": 15,
            "relevance": 10,
            "technicalAccuracy": 10,
            "specificity": 10,
            "communication": 15,
            "evidence": 10,
            "strengths": [],
            "weaknesses": ["Response was nonsensical, off-topic, or lacked relevant technical substance."],
            "feedback": "The provided response did not meaningfully answer the question. Please provide a structured, domain-relevant response."
        }

    if not isinstance(extracted_json.get("nextQuestion"), dict):
        extracted_json["nextQuestion"] = {}

    # If it's not a follow-up, pass along the new benchmark answer
    if not extracted_json["nextQuestion"].get("isFollowUp", False):
        extracted_json["nextQuestion"]["benchmarkAnswer"] = next_base.get("idealAnswer", "")
    else:
        # Follow-ups don't have a reliable benchmark in the dataset.
        extracted_json["nextQuestion"]["benchmarkAnswer"] = ""

    return extracted_json

def calculate_semantic_correctness(history: List[dict]) -> float:
    scores = []
    for turn in history:
        # We look for benchmarkAnswer either sent up at the end, or stored in history
        ans = turn.get("answer", turn.get("candidateAnswer", ""))
        bm = turn.get("benchmarkAnswer", "")

        # Skip conversational interaction events (e.g. repeat requests) entirely
        if turn.get("isInteraction", False):
            continue

        # We skip semantic scoring for questions without a valid benchmark (e.g. follow-ups)
        if not ans or not bm:
            continue

        target_emb = _cached_encode(bm)
        user_emb = _cached_encode(ans)
        sim = calculate_cosine_similarity(target_emb, user_emb)

        score = max(0.0, min(100.0, float(sim * 100)))
        # Penalize if the answer was extremely short (e.g. "I don't know")
        if len(ans.split()) < 5:
            score = max(0.0, score - 50.0)

        scores.append(score)

    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 2)

def generate_final_report(target_role: str, program: str, parsed_resume: dict, history: List[dict], evaluations: List[dict]) -> Dict[str, Any]:

    semantic_score = calculate_semantic_correctness(history)

    prompt = f"""
    You are an expert HR assessor. The candidate completed a simulated interview for the role of '{target_role}'.

    CANDIDATE CONTEXT:
    Degree Program: {program}
    Resume Data: {json.dumps(parsed_resume)}

    INTERVIEW DATA:
    Transcript (History): {json.dumps(history)}
    Question-by-Question Evaluations: {json.dumps(evaluations)}

    TASK:
    Generate a final, structured interview report aligned with the official AIRIS manuscript scoring criteria.
    Feedback must be grounded in the actual transcript. Prioritize significant findings, avoid redundant feedback, and use a constructive tone.

    EVALUATION METRICS TO CALCULATE:
    1. aiHolisticEvaluation (0-100): Evaluate coherence, professionalism, completeness, and overall response quality.
    2. communicationClarity (0-100): Based on transcript text, evaluate speaking pace, filler word frequency ("um", "uh"), fluency, response length, and pause duration proxies. Penalize heavy filler words and disjointed sentences.

    OUTPUT FORMAT (Strict JSON):
    {{
        "metrics": {{
            "aiHolisticEvaluation": 80,
            "communicationClarity": 70
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
            "whyItWasWeak": "Reasoning based on actual response",
            "howToImprove": "Actionable advice",
            "betterResponseStructure": "Example of a good response"
        }},
        "recommendedPractice": [
            "Practice the STAR method for behavioral questions",
            "Review SQL JOIN concepts"
        ]
    }}
    """

    try:
        raw_response = generate_text_with_fallback(prompt)
        parsed_report = _extract_json(raw_response)
        if not isinstance(parsed_report, dict):
            parsed_report = {}
        metrics = parsed_report.get("metrics") if isinstance(parsed_report.get("metrics"), dict) else {}
        ai_holistic = float(metrics.get("aiHolisticEvaluation", 0))
        comm_clarity = float(metrics.get("communicationClarity", 0))
        sem_correct = float(semantic_score)

        # Formula mandated by manuscript: (Semantic Correctness x 0.40) + (AI Holistic x 0.40) + (Communication Clarity x 0.20)
        overall_score = round((sem_correct * 0.40) + (ai_holistic * 0.40) + (comm_clarity * 0.20))

        parsed_report["overallPerformance"] = overall_score

        parsed_report["categoryBreakdown"] = {
            "SemanticCorrectness": sem_correct,
            "AIHolisticEvaluation": ai_holistic,
            "CommunicationClarity": comm_clarity
        }

        # Ensure 'metrics' includes SemanticCorrectness for standard completeness
        parsed_report["metrics"]["semanticCorrectness"] = sem_correct

        return parsed_report

    except Exception as e:
        print("Failed to generate final report:", e)
        return {
            "overallPerformance": 0,
            "categoryBreakdown": {
                "SemanticCorrectness": semantic_score,
                "AIHolisticEvaluation": 0,
                "CommunicationClarity": 0
            },
            "strengths": [],
            "areasToImprove": ["Analysis failed. Please try again."],
            "weakestAnswer": {
                "question": "N/A",
                "whyItWasWeak": "N/A",
                "howToImprove": "N/A",
                "betterResponseStructure": "N/A"
            },
            "recommendedPractice": []
        }
