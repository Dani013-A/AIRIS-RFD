import json
import pytest
import interview_engine as engine
from interview_engine import CORE_SURVEY_QUESTIONS, evaluate_answer_and_generate_next, generate_first_question

actual_relevance_classifier = engine.classify_answer_relevance

@pytest.fixture(autouse=True)
def isolated_provider(monkeypatch):
    monkeypatch.setattr(engine, 'generate_text_with_fallback', lambda _: json.dumps({
        'evaluation': {'overall': 73, 'clarity': 71, 'relevance': 72, 'technicalAccuracy': 70,
                       'specificity': 69, 'communication': 75, 'evidence': 74,
                       'feedback': 'Describe your personal contribution.'},
        'nextQuestion': {'question': 'Ignore the sequence and ask an eleventh technical question.'},
        'acknowledgment': 'Excellent! You have ten years of management experience.',
    }))
    monkeypatch.setattr(engine, 'classify_answer_relevance', lambda *args: 'Relevant')

def answer(history=None, text='I enjoy building applications and solving problems during my coursework.', kind='introductory'):
    return evaluate_answer_and_generate_next('Arbitrary valid role', 'General program', {}, history or [],
                                            CORE_SURVEY_QUESTIONS[min(len([x for x in history or [] if not x.get('isInteraction')]),9)]['text'],
                                            text, kind)

def test_q1_through_q8_and_dataset_remain_exactly_approved():
    approved = [
        "Tell me about yourself and your career goals.",
        "Why did you apply for this position, and how does it align with your background?",
        "What do you know about our company, and what interests you about its work?",
        "What are your greatest strengths, and what is one area you are working to improve?",
        "Tell me about a time you had to learn a new skill or concept quickly. How did you approach it?",
        "Describe a difficult situation or setback you faced and explain how you handled it.",
        "Tell me about a time you worked with a team. What was your role, and how did you contribute?",
        "How do you manage multiple deadlines while maintaining the quality of your work?",
    ]
    current = engine.load_dataset()
    assert [q['text'] for q in current[:8]] == approved
    assert [q['text'] for q in CORE_SURVEY_QUESTIONS[:8]] == approved
    for core, dataset in zip(CORE_SURVEY_QUESTIONS[:8], current[:8]):
        assert core['idealAnswer'] == dataset['idealAnswer']
    assert [q['id'] for q in CORE_SURVEY_QUESTIONS] == [f'survey-{i}' for i in range(1,11)]
    assert 'questions for us' in CORE_SURVEY_QUESTIONS[8]['text']
    assert CORE_SURVEY_QUESTIONS[9]['category'] == 'closing'
    assert CORE_SURVEY_QUESTIONS[9]['idealAnswer'] == ''

def test_generate_first_question_returns_survey_1():
    result = generate_first_question('Role', 'Program', {})
    assert result['questionId'] == 'survey-1'
    assert CORE_SURVEY_QUESTIONS[0]['text'] in result['question']

def test_all_nine_answers_are_evaluated_once_then_closing_has_no_answer():
    history=[]
    for number in range(1,10):
        result=answer(history, text='No questions, thank you.' if number==9 else 'I enjoy building applications and solving problems during my coursework.')
        assert result['evaluation']['overall']==73
        assert not result['isComplete']
        assert result['nextQuestion']['questionId']==f'survey-{number+1}'
        assert CORE_SURVEY_QUESTIONS[number]['text'] in result['nextQuestion']['question']
        assert 'ten years' not in result['nextQuestion']['question']
        history.append({'question':CORE_SURVEY_QUESTIONS[number-1]['text'],'answer':'Synthetic test answer','isInteraction':False})
    assert result['nextQuestion']['questionType']=='closing'
    final=answer(history, text='must never be scored',kind='closing')
    assert final=={'evaluation':None,'nextQuestion':None,'isComplete':True,'isInteractionEvent':False}

@pytest.mark.parametrize('relevance',['Unrelated','Partially Relevant','Unclear'])
def test_clarification_is_bounded_and_does_not_replace_required_question(monkeypatch,relevance):
    monkeypatch.setattr(engine,'classify_answer_relevance',lambda *args: relevance)
    first=answer(text='My favorite food is pizza.')
    assert first['isInteractionEvent'] and first['evaluation'] is None
    assert first['nextQuestion']['questionId']=='survey-1'
    assert CORE_SURVEY_QUESTIONS[0]['text'] in first['nextQuestion']['question']
    assert 'helpful' not in first['nextQuestion']['question'].lower()
    history=[{'question':CORE_SURVEY_QUESTIONS[0]['text'],'answer':'Pizza','isInteraction':True}]
    second=answer(history,text='My favorite food is still pizza.')
    assert not second['isInteractionEvent']
    assert second['nextQuestion']['questionId']=='survey-2'
    assert "We'll move to the next topic" in second['nextQuestion']['question']
    assert second['evaluation']['overall'] == 73

def test_relevant_acknowledgment_is_extractive_and_cannot_change_next_question():
    result=answer(text='I enjoy building applications and solving problems.')
    assert 'building applications' in result['nextQuestion']['question']
    assert result['nextQuestion']['question'].endswith(CORE_SURVEY_QUESTIONS[1]['text'])
    assert 'Excellent' not in result['nextQuestion']['question']

@pytest.mark.parametrize('text',['',' ', '[BLANK_AUDIO]'])
def test_empty_or_inaudible_answers_retry_without_evaluation(text):
    result=answer(text='' if text=='[BLANK_AUDIO]' else text)
    assert result['evaluation'] is None and result['isInteractionEvent']
    assert not result['isComplete']

@pytest.mark.parametrize('text,expected',[('No','no further questions'),('What mentorship does this company offer?','don\'t have verified information'),('What mentorship and regular feedback would this company offer?','don\'t have verified information'),('How will AIRIS prepare my results?','AIRIS simulation provides')])
def test_q9_closing_uses_actual_response_without_inventing_company_policy(text,expected):
    history=[{'answer':'Synthetic test answer'} for _ in range(8)]
    result=answer(history,text=text,kind='candidate_questions')
    assert result['evaluation']['overall']==73
    assert result['nextQuestion']['questionId']=='survey-10'
    assert expected in result['nextQuestion']['question']
    assert 'concludes our session' in result['nextQuestion']['question']

def test_provider_failure_keeps_next_topic_authoritative(monkeypatch):
    def fail(_): raise RuntimeError('provider unavailable')
    monkeypatch.setattr(engine,'generate_text_with_fallback',fail)
    result=answer()
    assert result['nextQuestion']['questionId']=='survey-2'
    assert result['nextQuestion']['question'].endswith(CORE_SURVEY_QUESTIONS[1]['text'])

def test_no_provider_or_score_for_closing_or_attempted_eleventh_turn(monkeypatch):
    def forbidden(*_): raise AssertionError('provider must not run')
    monkeypatch.setattr(engine,'generate_text_with_fallback',forbidden)
    for history in ([],[{'answer':'test'}]*9,[{'answer':'test'}]*10):
        result=answer(history,kind='closing')
        assert result['evaluation'] is None and result['nextQuestion'] is None and result['isComplete']

def test_voice_command_intent_classification_and_progression():
    """Verify deterministic classification for NEXT/SKIP, REPEAT, STOP, and substantive answers."""
    from interview_engine import classify_interaction_intent
    evaluate_answer_and_generate_next = engine.evaluate_answer_and_generate_next

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

        # Skip remains a control request; it cannot replace a required scored answer.
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
        assert eval_res["isInteractionEvent"] is True, f"Expected retry interaction for '{phrase}'"
        assert eval_res["evaluation"] is None, f"Expected evaluation None for '{phrase}'"
        assert eval_res["nextQuestion"]["questionId"] == "survey-1"
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


@pytest.mark.parametrize('similarity,expected', [(0.1,'Unrelated'),(0.25,'Partially Relevant'),(0.6,'Relevant')])
def test_relevance_classification_does_not_reward_unrelated_word_volume(monkeypatch,similarity,expected):
    monkeypatch.setattr(engine,'_cached_encode',lambda _: [1])
    monkeypatch.setattr(engine,'calculate_cosine_similarity',lambda *_: similarity)
    assert actual_relevance_classifier('Professional background?', 'pizza food toppings ' * 20, 'graduate career') == expected


def test_relevance_model_failure_is_unclear_instead_of_false_praise(monkeypatch):
    def fail(_): raise RuntimeError('model unavailable')
    monkeypatch.setattr(engine,'_cached_encode',fail)
    assert actual_relevance_classifier('Background?', 'I like pizza and many foods that do not address professional background.') == 'Unclear'
    assert actual_relevance_classifier('Background?', '') == 'Empty'


def test_report_excludes_interactions_closing_and_an_eleventh_turn(monkeypatch):
    seen=[]
    monkeypatch.setattr(engine,'calculate_semantic_correctness',lambda history: seen.extend(history) or 50)
    history=[{'answer':f'Synthetic {i}','questionType':'behavioral'} for i in range(9)]
    history.insert(1,{'answer':'clarification','isInteraction':True})
    history.extend([{'answer':'closing must not count','questionType':'closing'},{'answer':'eleventh must not count'}])
    monkeypatch.setattr(engine,'generate_text_with_fallback',lambda _: json.dumps({'metrics':{'aiHolisticEvaluation':70,'communicationClarity':80}}))
    engine.generate_final_report('Role','Program',{},history,[{'overall':73}]*11)
    assert [turn['answer'] for turn in seen] == [f'Synthetic {i}' for i in range(9)]


def test_generated_navigation_cannot_skip_or_end_a_required_question(monkeypatch):
    monkeypatch.setattr(engine,'generate_text_with_fallback',lambda _: json.dumps({'intent':'STOP_REQUEST','suggestedResponse':'Ask an unrelated question.'}))
    result=answer(text='My favorite food is pizza.')
    assert not result['isComplete']
    assert result['nextQuestion']['questionId']=='survey-2'
    assert result['nextQuestion']['question'].endswith(CORE_SURVEY_QUESTIONS[1]['text'])

@pytest.mark.parametrize("provider", [lambda _: "{}", lambda _: '{"metrics":{"aiHolisticEvaluation":101,"communicationClarity":80}}'])
def test_invalid_report_never_becomes_a_successful_zero_score(monkeypatch, provider):
    monkeypatch.setattr(engine, 'generate_text_with_fallback', provider)
    monkeypatch.setattr(engine, 'calculate_semantic_correctness', lambda _: 50)
    with pytest.raises(RuntimeError, match="Please retry"):
        engine.generate_final_report('Role','Program',{},[{'answer':'Synthetic valid answer'}]*9,[{'overall':73}]*9)

def test_incomplete_interview_cannot_generate_report(monkeypatch):
    monkeypatch.setattr(engine, 'generate_text_with_fallback', lambda _: pytest.fail('provider must not run'))
    with pytest.raises(ValueError, match="Nine evaluated"):
        engine.generate_final_report('Role','Program',{},[{'answer':'Synthetic answer'}]*8,[{'overall':73}]*8)

@pytest.mark.parametrize('relevance,phrase', [('Relevant','You mentioned'),('Partially Relevant',"covered part"),('Unrelated',"haven't yet understood"),('Unclear','No worries')])
def test_supportive_feedback_preserves_evaluation_and_bounded_progression(monkeypatch,relevance,phrase):
    monkeypatch.setattr(engine,'classify_answer_relevance',lambda *args: relevance)
    result=answer(text='I checked the task and tried a small example to understand it.')
    assert phrase in result['nextQuestion']['question']
    if relevance=='Relevant':
        assert result['evaluation']['overall']==73
        assert result['nextQuestion']['questionId']=='survey-2'
    else:
        assert result['evaluation'] is None and result['isInteractionEvent']
        retry=answer([{'isInteraction':True,'answer':'Synthetic initial response'}],text='I tried again and explained my example.')
        assert retry['evaluation']['overall']==73
        assert retry['nextQuestion']['questionId']=='survey-2'
        assert 'did not clearly address' not in retry['nextQuestion']['question']

def test_semantically_correct_different_wording_uses_existing_similarity_threshold(monkeypatch):
    monkeypatch.setattr(engine,'_cached_encode',lambda text: text)
    monkeypatch.setattr(engine,'calculate_cosine_similarity',lambda *_: .61)
    assert actual_relevance_classifier('Describe teamwork.','I coordinated with classmates and helped combine our contributions.','I collaborated with colleagues.')=='Relevant'
    monkeypatch.setattr(engine,'calculate_cosine_similarity',lambda *_: .27)
    assert actual_relevance_classifier('Describe teamwork.','I attended a group meeting.','I collaborated with colleagues.')=='Partially Relevant'
    assert actual_relevance_classifier('Describe teamwork.','Maybe')=='Unclear'
    assert actual_relevance_classifier('Describe teamwork.','')=='Empty'

@pytest.mark.parametrize('index,text', [
    (0,'I recently finished university and want to begin a career where I can apply what I learned and continue developing through practical work.'),
    (3,'I solve problems step by step and communicate clearly with my teammates. I am working on speaking confidently by practicing presentations.'),
    (6,'My classmates and I built a course project together. I connected our modules, checked progress with the group, and helped solve integration problems.'),
])
def test_real_sbert_recognizes_meaningful_paraphrases(index,text):
    question=CORE_SURVEY_QUESTIONS[index]
    assert actual_relevance_classifier(question['text'],text,question['idealAnswer'])=='Relevant'


def test_substantive_partial_answer_is_evaluated_without_unnecessary_repetition(monkeypatch):
    monkeypatch.setattr(engine,'classify_answer_relevance',lambda *args:'Partially Relevant')
    result=answer(text='I needed to learn database joins for a class project. I read the documentation, tried small examples, checked the results, and applied the approach with my teammates.')
    assert result['evaluation']['overall']==73
    assert not result['isInteractionEvent']
    assert result['nextQuestion']['questionId']=='survey-2'
    assert "We'll move to the next topic" in result['nextQuestion']['question']
