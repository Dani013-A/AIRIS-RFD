import json
import os
import re
import random
import numpy as np
from typing import Dict, Any, List, Optional
from ai_service import generate_text_with_fallback
from sbert_matcher import _cached_encode, calculate_cosine_similarity

DATASET_PATH = os.path.join(os.path.dirname(__file__), "data", "interview_questions.json")

def load_dataset() -> List[Dict[str, Any]]:
    if not os.path.exists(DATASET_PATH):
        return []
    with open(DATASET_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

# Official 10-Question Core Backbone based on AIRIS Survey
CORE_SURVEY_QUESTIONS = [
    {
        "id": "survey-1",
        "category": "introductory",
        "competency": "communication",
        "text": "Tell me about yourself.",
        "spokenOpening": "Hi, thanks for joining me today. Let's start with a brief introduction. Tell me about yourself.",
        "idealAnswer": "I am a recent graduate with a degree in my field, where I developed a strong foundation in both core academic principles and practical project work. Throughout my studies, I took the initiative to apply my skills to hands-on projects and collaborative coursework, focusing on solving concrete problems and continuously expanding my capabilities. I am enthusiastic about beginning my professional career, bringing a strong work ethic, adaptability, and an eagerness to contribute meaningfully to the team while continuing to learn and grow."
    },
    {
        "id": "survey-2",
        "category": "motivation",
        "competency": "motivation and company alignment",
        "text": "Why are you interested in this position?",
        "spokenTemplate": "That's helpful context. Now, why are you interested in this position?",
        "roleAwareTemplate": "That's helpful context. What interests you most about starting your career in {target_role}?",
        "idealAnswer": "I am interested in this position because it directly aligns with my career aspirations and provides the ideal environment to apply the competencies I built during my academic preparation. The responsibilities of this role match my strengths, and I am drawn to the impactful work your organization delivers. I want to contribute effectively from day one while continuing to develop my skills alongside experienced professionals."
    },
    {
        "id": "survey-3",
        "category": "academic",
        "competency": "academic and technical alignment",
        "text": "How does your educational background relate to this position?",
        "spokenTemplate": "Got it. How does your educational background relate to this position?",
        "roleAwareTemplate": "Got it. How does your educational background relate to the requirements of the {target_role} position?",
        "idealAnswer": "My degree program provided me with specialized coursework, foundational theory, and practical project experience that directly align with the core requirements of this position. Through coursework and laboratory deliverables, I developed competencies in industry-relevant methodologies and modern problem-solving tools. In my capstone and major project work, I worked on deliverables that reflect the responsibilities of this role, giving me a solid practical transition from academic preparation to workplace execution."
    },
    {
        "id": "survey-4",
        "category": "behavioral",
        "competency": "strengths and self-awareness",
        "text": "What would you consider your greatest strengths?",
        "spokenTemplate": "That gives me a clearer picture of your background. What would you consider your greatest strengths?",
        "idealAnswer": "My greatest strengths are my structured analytical approach to problem-solving, attention to detail, and ability to learn and adapt quickly. When given a complex assignment, I break it down systematically into clear milestones and ensure thorough follow-through. I also communicate proactively and collaborate effectively with teammates to keep projects on track."
    },
    {
        "id": "survey-5",
        "category": "behavioral",
        "competency": "growth mindset and development",
        "text": "What is one area you are currently working to improve?",
        "spokenTemplate": "I understand. What is one area you are currently working to improve?",
        "idealAnswer": "One area I have been actively working to improve is delegating tasks and seeking input earlier rather than trying to resolve every bottleneck independently. During past projects, I sometimes spent excessive time exploring edge cases alone before asking for guidance. I have been practicing clearer check-ins with team members and mentors to validate approaches sooner and maintain collaborative alignment."
    },
    {
        "id": "survey-6",
        "category": "situational",
        "competency": "problem solving and resilience",
        "text": "Tell me about a challenging situation or project you faced and how you handled it.",
        "spokenTemplate": "That's useful to know. Tell me about a challenging situation or project you faced and how you handled it.",
        "idealAnswer": "During a major project with a tight deadline, our team encountered an unexpected technical bottleneck where a key deliverable failed integration testing. Rather than panicking, I systematically analyzed the error logs to isolate the root cause, researched potential workarounds, and proposed an alternative implementation to the team. By adjusting our task distribution and testing collaboratively, we resolved the issue and delivered the project on schedule."
    },
    {
        "id": "survey-7",
        "category": "behavioral",
        "competency": "teamwork and collaboration",
        "text": "Tell me about a time you worked as part of a team. What was your role?",
        "spokenTemplate": "That gives me a good sense of how you approach challenges. Let's talk about teamwork. Tell me about a time you worked as part of a team. What was your role?",
        "idealAnswer": "In a recent capstone team project, I served as a core contributor responsible for coordinating key deliverables and ensuring cross-functional alignment. Throughout the collaboration, I maintained open communication, assisted teammates when they hit roadblocks, and made sure our deliverables met quality standards. When differing opinions arose, I helped facilitate constructive discussions to find a practical consensus, allowing our team to complete our milestones smoothly."
    },
    {
        "id": "survey-8",
        "category": "behavioral",
        "competency": "time management and prioritization",
        "text": "How do you prioritize your tasks when you have multiple deadlines?",
        "spokenTemplate": "That's helpful context. How do you prioritize your tasks when you have multiple deadlines?",
        "idealAnswer": "When handling multiple competing deadlines, I organize my deliverables using a structured task tracking system and evaluate each task by its urgency, impact, and dependencies. I focus on critical-path milestones first, allocate dedicated focus blocks for complex deliverables, and communicate proactively with stakeholders if any timeline adjustments are needed. This disciplined approach ensures all obligations are met without compromising quality."
    },
    {
        "id": "survey-9",
        "category": "behavioral",
        "competency": "adaptability and continuous learning",
        "text": "Tell me about a time you had to learn something new quickly. How did you approach it?",
        "spokenTemplate": "I see. Tell me about a time you had to learn something new quickly. How did you approach it?",
        "idealAnswer": "When a project required using a software framework and workflow tools I had not encountered before, I took an intensive, hands-on learning approach. I reviewed official documentation and tutorials, built small proof-of-concept prototypes to test key mechanisms, and consulted experienced peers when clarifying best practices. Within a few days, I was comfortable enough to implement the project requirements accurately and deliver our component on time."
    },
    {
        "id": "survey-10",
        "category": "behavioral",
        "competency": "career planning and goal orientation",
        "text": "Where do you see yourself in the next three to five years?",
        "spokenTemplate": "That helps me understand your approach to learning. Where do you see yourself in the next three to five years?",
        "idealAnswer": "Over the next three to five years, I aim to develop deep domain expertise in my field, master my core responsibilities, and take ownership of increasingly complex initiatives. As I build a track record of reliable contributions, I hope to take on greater responsibilities, mentor newer graduates, and help drive collaborative success across our team while continuing to stay current with industry developments."
    },
]

CLOSING_QUESTION = {
    "id": "survey-closing",
    "category": "closing",
    "competency": "inquisitiveness and candidate engagement",
    "text": "Thanks, that covers the main questions I wanted to ask. Before we wrap up, what questions do you have for me about the role or company?",
    "spokenTemplate": "Thanks, that covers the main questions I wanted to ask. Before we wrap up, what questions do you have for me about the role or company?",
    "idealAnswer": "I would like to ask about the day-to-day workflow for a fresh graduate joining the team, and what opportunities exist for ongoing mentorship and professional growth within the organization."
}

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
        return CORE_SURVEY_QUESTIONS[0]

    # Filter by category and exclude already asked questions
    asked_texts = [h.get("question", "").lower() for h in history]
    candidates = [q for q in dataset if q.get("category", "") == category]

    if not candidates:
        candidates = dataset

    target_emb = _cached_encode(target_role or "General Employability")
    best_score = -1.0
    best_q = None

    for q in candidates:
        if any(q.get("text", "").lower() in asked for asked in asked_texts):
            continue

        tags_str = " ".join(q.get("tags", []))
        q_emb = _cached_encode(tags_str + " " + q.get("text", ""))
        score = calculate_cosine_similarity(target_emb, q_emb)
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

    base_question = CORE_SURVEY_QUESTIONS[0]
    benchmark_answer = base_question["idealAnswer"]
    first_q_text = base_question["spokenOpening"]

    # Natural prompt that keeps the core "Tell me about yourself"
    prompt = f"""
    You are an expert, professional, and friendly interviewer conducting a fresh-graduate employability interview for the position of '{safe_target_role}'.

    CANDIDATE CONTEXT:
    Target Role: {safe_target_role}
    Degree Program: {program or 'Relevant Program'}

    BASE QUESTION:
    "{base_question['text']}"

    TASK:
    Generate the spoken opening question for the interview.
    It MUST start with a brief professional greeting and ask the candidate to introduce themselves.
    CRITICAL:
    - Keep the core ask: "Tell me about yourself."
    - DO NOT ask technical trivia or deep domain questions. This is an introductory question.
    - Exactly 1 or 2 spoken sentences.

    OUTPUT FORMAT (Strict JSON):
    {{
        "question": "{first_q_text}",
        "questionType": "introductory",
        "difficulty": 1,
        "targetCompetencies": ["communication", "background"]
    }}
    """

    try:
        raw_response = generate_text_with_fallback(prompt)
        extracted_json = _extract_json(raw_response)
        if isinstance(extracted_json, dict) and extracted_json.get("question"):
            # Ensure "tell me about yourself" or "introduce yourself" is present
            q_text = extracted_json["question"].strip()
            if "about yourself" in q_text.lower() or "introduce yourself" in q_text.lower():
                extracted_json["questionId"] = "survey-1"
                extracted_json["benchmarkAnswer"] = benchmark_answer
                extracted_json["coreQuestion"] = base_question["text"]
                extracted_json["isFollowUp"] = False
                return extracted_json
    except Exception as llm_err:
        print(f"[INTERVIEW ERROR] LLM question generation failed: {llm_err}. Using deterministic fallback.")

    return {
        "questionId": "survey-1",
        "question": first_q_text,
        "coreQuestion": base_question["text"],
        "questionType": "introductory",
        "difficulty": 1,
        "targetCompetencies": ["communication", "background"],
        "benchmarkAnswer": benchmark_answer,
        "isFallback": True,
        "isFollowUp": False,
    }

def classify_interaction_intent(current_question: str, current_answer: str) -> dict:
    raw = (current_answer or "").strip()
    clean = re.sub(r"[^\w\s']", " ", raw.lower())
    clean = re.sub(r"\s+", " ", clean).strip()
    words = clean.split()

    if not words:
        return {"intent": "ANSWER", "suggestedResponse": ""}

    # 1. STOP intent (preserve existing working stop behavior)
    exact_stops = {
        "stop", "stop interview", "stop the interview", "end interview", "end the interview",
        "quit", "quit interview", "exit", "exit interview", "cancel interview", "terminate interview",
        "stop please", "please stop"
    }
    if clean in exact_stops:
        return {"intent": "STOP_REQUEST", "suggestedResponse": ""}
    if len(words) <= 6:
        if re.search(r"^(please\s+)?(can we|i want to|let'?s)?\s*(stop|end|quit|exit|cancel)\s*(the\s+)?interview(\s+please)?$", clean):
            return {"intent": "STOP_REQUEST", "suggestedResponse": ""}

    # 2. REPEAT intent
    # Must NOT be an advancement command like "ask the next question"
    if not re.search(r"\b(next|skip|move on|advance)\b", clean):
        exact_repeats = {
            "repeat", "repeat question", "repeat the question", "say that again", "say again",
            "ask that again", "ask again", "what was the question", "what is the question",
            "pardon", "come again", "replay the question", "replay question", "can you repeat",
            "can you repeat that", "could you repeat that", "can you repeat the question",
            "could you repeat the question", "can you say that again", "could you say that again",
            "sorry what was the question", "what was the question again"
        }
        if clean in exact_repeats:
            return {"intent": "REPEAT_REQUEST", "suggestedResponse": current_question}

        if len(words) <= 10:
            if re.search(r"\b(repeat|say\s+(that\s+)?again|ask\s+(that\s+)?again|did\s+not\s+hear|didn'?t\s+hear|what\s+was\s+the\s+question|what\s+is\s+the\s+question|didn'?t\s+catch\s+that)\b", clean):
                return {"intent": "REPEAT_REQUEST", "suggestedResponse": current_question}

    # 3. NEXT / SKIP intent
    exact_skips = {
        "next", "next question", "next one", "next please", "please next",
        "skip", "skip this", "skip this question", "skip question", "skip this one", "skip one",
        "move on", "lets move on", "let's move on",
        "continue", "lets continue", "let's continue",
        "proceed", "lets proceed", "let's proceed",
        "pass", "i pass", "pass question", "pass this question",
        "go to next", "go to next question", "go to the next question", "go to the next one",
    }
    if clean in exact_skips:
        return {"intent": "SKIP_REQUEST", "suggestedResponse": ""}

    if len(words) <= 10:
        pattern = r"^(please\s+)?(can we|can you|could you|can i|let'?s|i want to|i would like to|i'd like to)?\s*(move on|skip|continue|proceed|go to|ask|advance|jump to)?\s*(to\s+)?(the\s+)?(next|next question|next one|skip this|skip this question|skip this one|move on)(\s+please)?$"
        if re.match(pattern, clean):
            return {"intent": "SKIP_REQUEST", "suggestedResponse": ""}

        if re.search(r"^(can we|can you|could you|let'?s|i want to|i would like to|i'd like to)\s+(move to the next( one| question)?|move on|ask the next question|go to the next question|skip this( question| one)?|continue)\b", clean):
            return {"intent": "SKIP_REQUEST", "suggestedResponse": ""}

    # 4. Other interaction intents
    if re.search(r"\b(give me a (second|moment|minute)|one second|one moment|hold on|one sec|give me time)\b", clean) and len(words) <= 8:
        return {"intent": "TIME_REQUEST", "suggestedResponse": "Take your time. Whenever you are ready."}
    if re.search(r"\b(clarify|what do you mean|explain what you mean|can you elaborate on the question)\b", clean) and len(words) <= 10:
        return {"intent": "CLARIFICATION_REQUEST", "suggestedResponse": "Let's focus on your core experience. How would you approach this?"}
    if re.search(r"\b(start over|restart my answer|start from the beginning)\b", clean) and len(words) <= 8:
        return {"intent": "RESTART_ANSWER", "suggestedResponse": "Of course, go ahead."}

    # If the input is long (more than 10 words), it's overwhelmingly a substantive candidate answer
    if len(words) > 10:
        return {"intent": "ANSWER", "suggestedResponse": ""}

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

def calculate_filler_metrics(text: str) -> dict:
    if not text:
        return {"fillerCount": 0, "fillerRatio": 0.0, "excessive": False, "moderate": False, "natural": True, "fillers": []}

    words = re.findall(r"\b[A-Za-z'-]+\b", text.lower())
    total_words = len(words)
    if total_words == 0:
        return {"fillerCount": 0, "fillerRatio": 0.0, "excessive": False, "moderate": False, "natural": True, "fillers": []}

    filler_patterns = [
        r"\bum+\b",
        r"\buh+\b",
        r"\bah+\b",
        r"\ber+\b",
        r"\byou know\b",
    ]
    matches: List[str] = []
    for pattern in filler_patterns:
        found = re.findall(pattern, text.lower())
        matches.extend(found)

    count = len(matches)
    ratio = count / total_words

    return {
        "fillerCount": count,
        "fillerRatio": round(ratio, 3),
        "natural": count <= 3,
        "moderate": 4 <= count <= 6,
        "excessive": count > 6,
        "fillers": matches
    }

def _identify_current_core_index(current_question: str, history: List[dict]) -> int:
    """
    Identifies the 0-based index of the core question currently being answered (0 to 9).
    Falls back cleanly using history count of core non-interaction questions.
    """
    clean_q = current_question.lower()
    for idx, q in enumerate(CORE_SURVEY_QUESTIONS):
        core_text = q["text"].lower()
        # Direct phrase match
        if core_text in clean_q or (idx == 0 and "about yourself" in clean_q):
            return idx

    # If closing question
    if "questions do you have for me" in clean_q or "about the role or company" in clean_q:
        return 10

    # Fallback based on non-interaction, non-follow-up count in history
    core_count = 0
    for h in history:
        if not h.get("isInteraction", False) and h.get("questionType") != "follow-up":
            core_count += 1
    return min(core_count, len(CORE_SURVEY_QUESTIONS) - 1)

def evaluate_answer_and_generate_next(
    target_role: str,
    program: str,
    parsed_resume: dict,
    history: List[dict],
    current_question: str,
    current_answer: str,
    current_question_type: str,
    total_questions: int = 10,
    pause_metrics: Optional[dict] = None
) -> Dict[str, Any]:

    # 1. Pre-filter Conversational Interruptions, Meta-Requests, and Navigation Commands
    intent_data = classify_interaction_intent(current_question, current_answer)
    intent = intent_data.get("intent", "ANSWER")

    if intent == "STOP_REQUEST":
        return {
            "evaluation": None,
            "nextQuestion": None,
            "isComplete": True,
            "isInteractionEvent": False
        }

    if intent in ["REPEAT_REQUEST", "CLARIFICATION_REQUEST", "TIME_REQUEST", "UNRELATED_QUESTION", "RESTART_ANSWER"]:
        suggested = intent_data.get("suggestedResponse", "")
        if not suggested:
            if intent == "REPEAT_REQUEST":
                suggested = current_question
            elif intent == "CLARIFICATION_REQUEST":
                suggested = "Let's focus on your core experience. How would you approach this?"
            elif intent == "TIME_REQUEST":
                suggested = "Take your time. Whenever you are ready."
            elif intent == "UNRELATED_QUESTION":
                suggested = "Let's return to the interview topic. Please answer the original question."
            else:
                suggested = "Please go ahead and begin your answer."

        return {
            "isInteractionEvent": True,
            "nextQuestion": {
                "question": suggested,
                "questionType": "interaction",
                "difficulty": 0,
                "isFollowUp": False,
                "targetCompetencies": []
            },
            "evaluation": None,
            "isComplete": False
        }

    is_skip = (intent == "SKIP_REQUEST")

    # 2. Deterministic Validation for Empty/Corrupted Text (for substantive answers)
    cleaned_ans = current_answer.strip()
    words = [w for w in cleaned_ans.split() if re.search(r'[a-zA-Z0-9]', w)]
    if not is_skip and (not cleaned_ans or len(words) < 2):
        return {
            "isInteractionEvent": True,
            "nextQuestion": {
                "question": "I'm sorry, I didn't quite catch that. Could you please repeat yourself?",
                "questionType": "interaction",
                "difficulty": 0,
                "isFollowUp": False,
                "targetCompetencies": []
            },
            "evaluation": None,
            "isComplete": False
        }

    # 3. Determine Position in the Core Survey Sequence
    current_core_idx = _identify_current_core_index(current_question, history)
    was_follow_up = (current_question_type == "follow-up")
    was_closing = (current_question_type == "closing" or current_core_idx >= 10)

    # If the candidate was answering the closing question, the interview is complete!
    if was_closing:
        return {
            "evaluation": {
                "overall": 80,
                "clarity": 80,
                "relevance": 80,
                "technicalAccuracy": 80,
                "specificity": 80,
                "communication": 80,
                "evidence": 80,
                "strengths": ["Demonstrated thoughtful curiosity about the role and company."],
                "weaknesses": [],
                "feedback": "The candidate engaged well with the closing stage of the interview."
            } if not is_skip else None,
            "nextQuestion": None,
            "isComplete": True,
            "isInteractionEvent": False
        }

    # Pause and Filler Metrics Calculation
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
            "EVALUATION INSTRUCTION FOR 'communication' SCORE: Minor filler words and normal pauses (under 1.5s) must NOT be penalized."
        )

    filler_metrics = calculate_filler_metrics(current_answer)
    filler_info = ""
    if filler_metrics["fillerCount"] > 0:
        f_count = filler_metrics["fillerCount"]
        f_status = "excessive" if filler_metrics["excessive"] else ("moderate" if filler_metrics["moderate"] else "natural")
        filler_info = (
            f"\nMEASURED TRANSCRIPT FILLER WORDS:\n"
            f"- Count: {f_count} (classification: {f_status})\n"
            f"- Fillers detected: {', '.join(filler_metrics['fillers'][:5])}\n"
            "Guideline: Natural occasional fillers (1-3) should NOT be penalized."
        )

    # 4. Check whether to produce an adaptive follow-up
    # Criteria:
    # - Previous question was NOT already a follow-up (strictly at most ONE follow-up per core question)
    # - Not a skip request
    # - Answer was weak, incomplete, vague, or short (less than 15 words)
    # - Not the closing question
    is_weak_answer = len(words) < 15

    # Determine default next core question
    if was_follow_up:
        completed_core_count = len([
            h for h in history
            if not h.get("isInteraction", False) and h.get("questionType") != "follow-up"
        ])
        next_core_idx = completed_core_count
    else:
        next_core_idx = current_core_idx + 1

    # Check if we should allow a follow-up
    can_follow_up = (not was_follow_up) and (not is_skip) and (current_core_idx < len(CORE_SURVEY_QUESTIONS))

    # Base target for next question
    if next_core_idx < len(CORE_SURVEY_QUESTIONS):
        next_base_meta = CORE_SURVEY_QUESTIONS[next_core_idx]
        next_id = next_base_meta["id"]
        next_cat = next_base_meta["category"]
        next_ideal = next_base_meta["idealAnswer"]
        next_core_text = next_base_meta["text"]
        # Role-aware spoken template
        if "{target_role}" in next_base_meta.get("roleAwareTemplate", ""):
            next_spoken_default = next_base_meta["roleAwareTemplate"].format(target_role=target_role or "this role")
        else:
            next_spoken_default = next_base_meta.get("spokenTemplate", next_base_meta["text"])
    else:
        next_base_meta = CLOSING_QUESTION
        next_id = "survey-closing"
        next_cat = "closing"
        next_ideal = CLOSING_QUESTION["idealAnswer"]
        next_core_text = CLOSING_QUESTION["text"]
        next_spoken_default = CLOSING_QUESTION["spokenTemplate"]

    # 5. Prompt Construction
    prompt = f"""
    You are an expert, professional, and friendly interviewer conducting a fresh-graduate employability interview for '{target_role}'.

    CANDIDATE CONTEXT:
    Target Role: {target_role}
    Degree Program: {program or 'General'}

    CURRENT INTERACTION:
    Question Asked: "{current_question}"
    Candidate Answer:
    <candidate_answer>
    {current_answer}
    </candidate_answer>
    {pause_info}
    {filler_info}

    NEXT CORE TOPIC IN SURVEY SEQUENCE:
    Next Question ID: {next_id}
    Next Core Question: "{next_core_text}"
    Default Spoken Delivery: "{next_spoken_default}"

    EVALUATION INSTRUCTIONS:
    - Score out of 100 on clarity, relevance, technicalAccuracy, specificity, communication, evidence, overall.
    - Provide 2–3 sentences of constructive feedback grounded strictly in their actual answer.
    - If candidate skipped, set evaluation to null.

    TRANSITION & QUESTION GENERATION INSTRUCTIONS:
    - NEVER use "Thank you for your answer" or generic canned phrasing.
    - DO NOT overpraise the candidate (NEVER say "Excellent!", "Fantastic!", "Great job!", "Amazing!"). Maintain a professional, neutral interviewer persona.
    - Start the next utterance with ONE short neutral acknowledgement sentence (e.g., "That's helpful context.", "Got it.", "That gives me a clearer picture.", "That's useful to know.", "I understand.").
    - ADAPTIVE FOLLOW-UP RULE:
      If the candidate's answer was significantly incomplete, vague, or lacked personal evidence, and can_follow_up is True ({can_follow_up}):
      Set "isFollowUp": true, and ask ONE focused follow-up asking for specific detail or personal role (e.g. "That's a good starting point. Can you tell me a little more about what you personally did in that situation?").
      Otherwise, set "isFollowUp": false, and transition smoothly into the NEXT CORE QUESTION ("{next_core_text}").
    - The full question text must combine the short neutral transition + question in 1–2 spoken sentences.

    OUTPUT FORMAT (Strict JSON):
    {{
        "evaluation": {{
            "overall": 75,
            "clarity": 80,
            "relevance": 75,
            "technicalAccuracy": 75,
            "specificity": 70,
            "communication": 80,
            "evidence": 70,
            "strengths": ["Addressed the core topic"],
            "weaknesses": ["Could provide more concrete details"],
            "feedback": "Constructive observation in 2-3 sentences."
        }} if not skipped else null,
        "nextQuestion": {{
            "questionId": "{next_id}",
            "question": "{next_spoken_default}",
            "coreQuestion": "{next_core_text}",
            "questionType": "{next_cat}",
            "difficulty": 1,
            "isFollowUp": false,
            "followUpReason": "",
            "targetCompetencies": ["{next_base_meta['competency']}"]
        }},
        "isComplete": false
    }}
    """

    try:
        raw_response = generate_text_with_fallback(prompt)
        extracted_json = _extract_json(raw_response)
    except Exception as llm_err:
        print(f"[INTERVIEW ERROR] LLM evaluation failed: {llm_err}. Using deterministic fallback.")
        extracted_json = {}

    if not isinstance(extracted_json, dict):
        extracted_json = {}

    # Evaluation normalization
    if is_skip:
        extracted_json["evaluation"] = None
    elif not isinstance(extracted_json.get("evaluation"), dict):
        eval_score = 30 if is_weak_answer else 75
        extracted_json["evaluation"] = {
            "overall": eval_score,
            "clarity": eval_score,
            "relevance": eval_score,
            "technicalAccuracy": eval_score,
            "specificity": eval_score,
            "communication": eval_score,
            "evidence": eval_score,
            "strengths": ["Attempted to answer the question."] if not is_weak_answer else [],
            "weaknesses": ["Answer was brief or lacked supporting examples."] if is_weak_answer else [],
            "feedback": "The candidate provided an initial response. Elaborating with structured examples from coursework or projects will demonstrate greater competency depth."
        }

    # Ensure evaluation feedback never contains robotic overpraise or "Thank you for your answer"
    eval_obj = extracted_json.get("evaluation")
    if isinstance(eval_obj, dict) and eval_obj.get("feedback"):
        fb = eval_obj["feedback"]
        fb = re.sub(r"(?i)thank you for your answer[.,!]?\s*", "", fb)
        eval_obj["feedback"] = fb.strip()

    # Deterministic Progression Invariant Enforcement
    should_follow_up = can_follow_up and is_weak_answer

    follow_up_texts = {
        0: "That gives me some initial context. Could you tell me a little more about the projects or coursework that shaped your interests?",
        1: "I see. What specifically attracted you to this role compared to other opportunities?",
        2: "Got it. Can you give a concrete example of a project from your degree that connects with this role?",
        3: "That's helpful. Could you provide a specific example of when you demonstrated that strength?",
        4: "I understand. What steps are you actively taking to work on that improvement area?",
        5: "That's a good starting point. Can you tell me a little more about what you personally did to resolve that challenge?",
        6: "Got it. What was your specific personal role and contribution to that team effort?",
        7: "I understand. When two urgent tasks conflict, how do you decide which one to tackle first?",
        8: "That's helpful context. What was your systematic approach to picking up that new skill quickly?",
        9: "Got it. What specific skills or experience do you hope to build along the way?",
    }
    default_fu_text = follow_up_texts.get(
        current_core_idx,
        "That's a good starting point. Can you tell me a little more about what you personally did in that situation?"
    )

    next_q = extracted_json.get("nextQuestion")
    if not isinstance(next_q, dict):
        next_q = {}

    if should_follow_up:
        # Enforce follow-up invariants
        llm_text = next_q.get("question", "").strip() if next_q.get("isFollowUp") else ""
        chosen_fu = llm_text if (llm_text and len(llm_text.split()) >= 6) else default_fu_text
        extracted_json["nextQuestion"] = {
            "questionId": f"survey-{current_core_idx + 1}-followup",
            "question": chosen_fu,
            "coreQuestion": CORE_SURVEY_QUESTIONS[current_core_idx]["text"],
            "questionType": "follow-up",
            "difficulty": 1,
            "isFollowUp": True,
            "followUpReason": "Candidate response was concise; requesting concrete personal example.",
            "targetCompetencies": [CORE_SURVEY_QUESTIONS[current_core_idx]["competency"]],
            "benchmarkAnswer": ""
        }
    else:
        # Advance to next core question in survey sequence
        llm_text = next_q.get("question", "").strip() if not next_q.get("isFollowUp") else ""
        chosen_text = llm_text if (llm_text and len(llm_text.split()) >= 5) else next_spoken_default
        extracted_json["nextQuestion"] = {
            "questionId": next_id,
            "question": chosen_text,
            "coreQuestion": next_core_text,
            "questionType": next_cat,
            "difficulty": 1,
            "isFollowUp": False,
            "targetCompetencies": [next_base_meta["competency"]],
            "benchmarkAnswer": next_ideal
        }

    # Strict check on generated question text: Remove robotic phrases
    q_text = extracted_json["nextQuestion"].get("question", "")
    clean_spoken = re.sub(r"(?i)thank you for your answer[.,!]?\s*", "", q_text)
    clean_spoken = re.sub(r"(?i)excellent answer[.,!]?\s*", "", clean_spoken)
    clean_spoken = re.sub(r"(?i)great job[.,!]?\s*", "", clean_spoken)
    clean_spoken = re.sub(r"(?i)fantastic[.,!]?\s*", "", clean_spoken)
    extracted_json["nextQuestion"]["question"] = clean_spoken.strip()
    extracted_json["isComplete"] = False
    extracted_json["isInteractionEvent"] = False
    return extracted_json

def calculate_semantic_correctness(history: List[dict]) -> float:
    scores = []
    for turn in history:
        ans = turn.get("answer", turn.get("candidateAnswer", ""))
        bm = turn.get("benchmarkAnswer", "")

        if turn.get("isInteraction", False):
            continue

        if not ans or not bm:
            continue

        target_emb = _cached_encode(bm)
        user_emb = _cached_encode(ans)
        sim = calculate_cosine_similarity(target_emb, user_emb)

        score = max(0.0, min(100.0, float(sim * 100)))
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
    2. communicationClarity (0-100): Based on transcript text and measured audio metrics (if available), evaluate fluency, delivery clarity, and speaking pace. Natural occasional fillers (1-3) should NOT be penalized. Only apply a modest deduction if filler frequency or pauses are excessive and genuinely impair clarity. Communication delivery must NOT overpower technical correctness or relevance.

    OUTPUT FORMAT (Strict JSON):
    {{
        "metrics": {{
            "aiHolisticEvaluation": 80,
            "communicationClarity": 70
        }},
        "strengths": [
            "Handled the background and motivation questions well.",
            "Spoke confidently during the introduction."
        ],
        "areasToImprove": [
            "Could provide more quantifiable examples of teamwork and project milestones.",
            "Practice structuring situational answers using the STAR framework."
        ],
        "weakestAnswer": {{
            "question": "The question they struggled with most",
            "whyItWasWeak": "Reasoning based on actual response",
            "howToImprove": "Actionable advice",
            "betterResponseStructure": "Example of a good response"
        }},
        "recommendedPractice": [
            "Practice the STAR method for behavioral questions",
            "Prepare concrete examples of overcoming technical challenges"
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
