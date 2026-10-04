import pytest
from unittest.mock import patch
import interview_engine
from interview_engine import (
    generate_first_question,
    evaluate_answer_and_generate_next,
    CORE_SURVEY_QUESTIONS,
)

def test_core_question_sequence_count_and_ids():
    """Verify exactly 10 core questions with stable IDs survey-1 through survey-10 in correct order."""
    assert len(CORE_SURVEY_QUESTIONS) == 10
    expected_ids = [f"survey-{i}" for i in range(1, 11)]
    actual_ids = [q["id"] for q in CORE_SURVEY_QUESTIONS]
    assert actual_ids == expected_ids

    # Verify competencies match survey themes
    assert CORE_SURVEY_QUESTIONS[0]["competency"] == "communication"
    assert CORE_SURVEY_QUESTIONS[1]["competency"] == "motivation and company alignment"
    assert CORE_SURVEY_QUESTIONS[2]["competency"] == "academic and technical alignment"
    assert CORE_SURVEY_QUESTIONS[3]["competency"] == "strengths and self-awareness"
    assert CORE_SURVEY_QUESTIONS[4]["competency"] == "growth mindset and development"
    assert CORE_SURVEY_QUESTIONS[5]["competency"] == "problem solving and resilience"
    assert CORE_SURVEY_QUESTIONS[6]["competency"] == "teamwork and collaboration"
    assert CORE_SURVEY_QUESTIONS[7]["competency"] == "time management and prioritization"
    assert CORE_SURVEY_QUESTIONS[8]["category"] == "synthesis"
    assert CORE_SURVEY_QUESTIONS[9]["category"] == "closing"
    assert "before we end" in CORE_SURVEY_QUESTIONS[9]["text"].lower()

def test_generate_first_question_returns_survey_1():
    """First question must be survey-1 (Tell me about yourself)."""
    res = generate_first_question(
        target_role="Software Engineer",
        program="BS Computer Science",
        parsed_resume={"skills": "Python, React"}
    )
    assert res["questionId"] == "survey-1"
    assert "about yourself" in res["question"].lower()
    assert res["questionType"] == "introductory"
    assert res["isFollowUp"] is False

def test_no_robotic_thank_you_or_overpraise():
    """Interviewer response must NOT contain repetitive 'Thank you for your answer' or robotic overpraise."""
    forbidden_phrases = [
        "thank you for your answer",
        "excellent answer",
        "great job",
        "fantastic",
        "amazing"
    ]
    # Check all spoken templates in dataset
    for q in CORE_SURVEY_QUESTIONS:
        template = q.get("spokenTemplate", "").lower()
        opening = q.get("spokenOpening", "").lower()
        for phrase in forbidden_phrases:
            assert phrase not in template, f"Forbidden phrase '{phrase}' found in {q['id']} spokenTemplate"
            assert phrase not in opening, f"Forbidden phrase '{phrase}' found in {q['id']} spokenOpening"

def test_deterministic_question_progression_through_all_10_questions():
    """Trace discovery, synthesis, and closing within exactly ten turns."""
    history = []
    current_q = CORE_SURVEY_QUESTIONS[0]["spokenOpening"]
    current_type = "introductory"

    for i in range(1, 10):
        # Good substantive answer (no follow-up triggered)
        answer = (
            "I have worked on several software development projects during my degree program, "
            "focusing on structured coding practices, automated testing, and agile team deliverables."
        )
        res = evaluate_answer_and_generate_next(
            target_role="Software Engineer",
            program="BS Computer Science",
            parsed_resume={},
            history=history,
            current_question=current_q,
            current_answer=answer,
            current_question_type=current_type,
            total_questions=10
        )

        assert res["isComplete"] is False
        next_q = res["nextQuestion"]
        expected_id = f"survey-{i + 1}"
        assert next_q["questionId"] == expected_id, f"Expected {expected_id} after question {i}, got {next_q['questionId']}"
        assert next_q["isFollowUp"] is False
        if i == 8:
            assert next_q["questionType"] == "synthesis"
        if i == 9:
            assert next_q["questionType"] == "closing"

        # Verify no robotic phrase in spoken question
        assert "thank you for your answer" not in next_q["question"].lower()

        history.append({
            "question": current_q,
            "answer": answer,
            "questionType": current_type,
            "benchmarkAnswer": ""
        })
        current_q = next_q["question"]
        current_type = next_q["questionType"]

    # Now answer Q10 (survey-10)
    answer_q10 = "I would like to add that I enjoy collaborative work and ask how new graduates receive mentoring."
    res_q10 = evaluate_answer_and_generate_next(
        target_role="Software Engineer",
        program="BS Computer Science",
        parsed_resume={},
        history=history,
        current_question=current_q,
        current_answer=answer_q10,
        current_question_type=current_type,
        total_questions=10
    )

    assert res_q10["isComplete"] is True
    assert res_q10["nextQuestion"] is None
    assert res_q10["evaluation"] is not None

def test_adaptive_follow_up_on_weak_answer():
    """A weak answer produces one follow-up turn before the next discovery topic."""
    weak_answer = "Yes, I did projects."  # Very short, incomplete (< 15 words)
    res = evaluate_answer_and_generate_next(
        target_role="Customer Success",
        program="BS Business Administration",
        parsed_resume={},
        history=[],
        current_question="Tell me about yourself.",
        current_answer=weak_answer,
        current_question_type="introductory",
        total_questions=10
    )

    # Follow-up should be generated
    assert res["isComplete"] is False
    assert res["nextQuestion"]["isFollowUp"] is True
    assert res["nextQuestion"]["questionType"] == "follow-up"

    # Now simulate the candidate answering the follow-up
    fu_history = [{
        "question": "Tell me about yourself.",
        "answer": weak_answer,
        "questionType": "introductory"
    }]
    fu_question = res["nextQuestion"]["question"]
    fu_answer = (
        "Specifically, I handled customer communications and coordinated deliverables "
        "for our senior marketing campaign project, which taught me stakeholder engagement."
    )

    res_after_fu = evaluate_answer_and_generate_next(
        target_role="Customer Success",
        program="BS Business Administration",
        parsed_resume={},
        history=fu_history,
        current_question=fu_question,
        current_answer=fu_answer,
        current_question_type="follow-up",
        total_questions=10
    )

    # The next turn resumes the next discovery topic after the follow-up.
    assert res_after_fu["isComplete"] is False
    assert res_after_fu["nextQuestion"]["questionId"] == "survey-3"
    assert res_after_fu["nextQuestion"]["coreQuestion"] == CORE_SURVEY_QUESTIONS[1]["text"]
    assert res_after_fu["nextQuestion"]["isFollowUp"] is False

def test_substantive_project_answer_can_trigger_a_bounded_follow_up():
    answer = "I developed a mobile application for our capstone project using React Native and Firebase with my team."
    result = evaluate_answer_and_generate_next(
        target_role="Software Engineer",
        program="BS Information Technology",
        parsed_resume={},
        history=[],
        current_question="Tell me about yourself.",
        current_answer=answer,
        current_question_type="introductory",
    )
    assert result["nextQuestion"]["questionId"] == "survey-2"
    assert result["nextQuestion"]["isFollowUp"] is True
    assert "project" in result["nextQuestion"]["question"].lower()

def test_follow_ups_do_not_displace_synthesis_or_create_question_eleven():
    history = []
    question = CORE_SURVEY_QUESTIONS[0]["spokenOpening"]
    question_type = "introductory"
    for turn in range(1, 11):
        answer = (
            "I developed a capstone application with my classmates, tested the main flows, "
            "and coordinated our work to meet the project deadline."
        ) if turn < 9 else "I would apply those experiences to contribute to this position and keep learning with the team."
        result = evaluate_answer_and_generate_next(
            target_role="Software Engineer",
            program="BS Information Technology",
            parsed_resume={},
            history=history,
            current_question=question,
            current_answer=answer,
            current_question_type=question_type,
        )
        if turn == 10:
            assert result["isComplete"] is True
            assert result["nextQuestion"] is None
            break
        next_question = result["nextQuestion"]
        assert next_question["questionId"] == f"survey-{turn + 1}"
        if turn == 8:
            assert next_question["questionType"] == "synthesis"
        if turn == 9:
            assert next_question["questionType"] == "closing"
        history.append({"question": question, "answer": answer, "questionType": question_type})
        question = next_question["question"]
        question_type = next_question["questionType"]

def test_closing_candidate_question_finalizes_without_an_extra_question():
    history = [{"question": f"Question {i}", "answer": "Relevant answer", "questionType": "behavioral"} for i in range(9)]
    result = evaluate_answer_and_generate_next(
        target_role="Software Engineer",
        program="BS Information Technology",
        parsed_resume={},
        history=history,
        current_question=CORE_SURVEY_QUESTIONS[9]["text"],
        current_answer="What mentorship is available to new graduates?",
        current_question_type="closing",
    )
    assert result["isComplete"] is True
    assert result["nextQuestion"] is None
    assert result["isInteractionEvent"] is False

def test_interaction_intents_do_not_advance_question():
    """Requests like 'Can you repeat that?' or 'Give me a moment' trigger an interaction event without advancing."""
    res = evaluate_answer_and_generate_next(
        target_role="Software Engineer",
        program="BS Computer Science",
        parsed_resume={},
        history=[],
        current_question="Tell me about yourself.",
        current_answer="Could you please repeat the question?",
        current_question_type="introductory",
        total_questions=10
    )
    assert res["isInteractionEvent"] is True
    assert res["isComplete"] is False
    assert res["evaluation"] is None

def test_voice_command_intent_classification_and_progression():
    """Verify deterministic classification for NEXT/SKIP, REPEAT, STOP, and substantive answers."""
    from interview_engine import classify_interaction_intent

    # 1. NEXT / SKIP intents
    next_phrases = [
        "next",
        "next question",
        "skip",
        "skip this question",
        "move on",
        "go to the next question",
        "let's continue",
        "can we move to the next one?",
        "skip this",
        "continue",
        "can we move on?",
        "I want to skip this",
        "Can you ask the next question?",
        "Let's move on to the next question.",
        "Skip this one."
    ]
    for phrase in next_phrases:
        intent_res = classify_interaction_intent("Tell me about yourself.", phrase)
        assert intent_res["intent"] == "SKIP_REQUEST", f"Expected SKIP_REQUEST for '{phrase}', got {intent_res['intent']}"

        # Test that evaluate_answer_and_generate_next cleanly advances to survey-2 without follow-up
        eval_res = evaluate_answer_and_generate_next(
            target_role="Software Engineer",
            program="BS Computer Science",
            parsed_resume={},
            history=[],
            current_question="Tell me about yourself.",
            current_answer=phrase,
            current_question_type="introductory",
            total_questions=10
        )
        assert eval_res["isComplete"] is False, f"Expected isComplete False for '{phrase}'"
        assert eval_res["isInteractionEvent"] is False, f"Expected isInteractionEvent False for '{phrase}'"
        assert eval_res["evaluation"] is None, f"Expected evaluation None for '{phrase}'"
        assert eval_res["nextQuestion"]["questionId"] == "survey-2", f"Expected survey-2 for '{phrase}', got {eval_res['nextQuestion']['questionId']}"
        assert eval_res["nextQuestion"]["isFollowUp"] is False, f"Expected isFollowUp False for '{phrase}'"

    # 2. REPEAT intents
    repeat_phrases = [
        "repeat",
        "repeat the question",
        "say that again",
        "what was the question?",
        "ask that again",
        "can you repeat that?",
        "Can you repeat the question?",
        "Sorry, what was the question?"
    ]
    for phrase in repeat_phrases:
        intent_res = classify_interaction_intent("Tell me about yourself.", phrase)
        assert intent_res["intent"] == "REPEAT_REQUEST", f"Expected REPEAT_REQUEST for '{phrase}', got {intent_res['intent']}"
        assert intent_res["suggestedResponse"] == "Tell me about yourself."

        eval_res = evaluate_answer_and_generate_next(
            target_role="Software Engineer",
            program="BS Computer Science",
            parsed_resume={},
            history=[],
            current_question="Tell me about yourself.",
            current_answer=phrase,
            current_question_type="introductory",
            total_questions=10
        )
        assert eval_res["isInteractionEvent"] is True, f"Expected isInteractionEvent True for '{phrase}'"
        assert eval_res["isComplete"] is False
        assert eval_res["evaluation"] is None
        assert eval_res["nextQuestion"]["question"] == "Tell me about yourself."

    # 3. STOP intents
    stop_phrases = [
        "stop",
        "stop the interview",
        "end the interview",
        "quit",
        "exit",
        "please stop"
    ]
    for phrase in stop_phrases:
        intent_res = classify_interaction_intent("Tell me about yourself.", phrase)
        assert intent_res["intent"] == "STOP_REQUEST", f"Expected STOP_REQUEST for '{phrase}', got {intent_res['intent']}"

        eval_res = evaluate_answer_and_generate_next(
            target_role="Software Engineer",
            program="BS Computer Science",
            parsed_resume={},
            history=[],
            current_question="Tell me about yourself.",
            current_answer=phrase,
            current_question_type="introductory",
            total_questions=10
        )
        assert eval_res["isComplete"] is True, f"Expected isComplete True for '{phrase}'"
        assert eval_res["nextQuestion"] is None
        assert eval_res["evaluation"] is None

    # 4. Ordinary substantive answers with ambiguous words (MUST NOT be classified as commands)
    substantive_answers = [
        "In my next project, I will continue to learn Python and move on to advanced topics.",
        "My greatest strength is that I always finish the next task on time and skip unnecessary steps.",
        "For my next role, I want to continue developing as a frontend engineer.",
        "When faced with difficult code, I do not just skip it; I continue debugging until it works.",
        "I think the next step for me in this position is to learn how the team manages deployments.",
        "I repeated the experiment three times to ensure the results were reliable."
    ]
    for ans in substantive_answers:
        intent_res = classify_interaction_intent("Tell me about yourself.", ans)
        assert intent_res["intent"] == "ANSWER", f"False positive: expected ANSWER for '{ans}', got {intent_res['intent']}"
