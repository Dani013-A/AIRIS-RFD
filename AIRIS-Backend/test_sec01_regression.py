"""SEC-01 reproduction; provider/storage fakes isolate the HTTP trust boundary."""
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app, get_authenticated_user


def test_original_fabricated_report_exploit_is_rejected():
    app.dependency_overrides[get_authenticated_user] = lambda: 'synthetic-owner'
    try:
        payload = {'sessionId': 'a' * 32, 'targetRole': 'Synthetic Role', 'program': 'Synthetic',
                   'history': [{'questionId': f'survey-{n}', 'questionType': 'behavioral',
                                'answer': 'My fabricated perfect answer',
                                'benchmarkAnswer': 'My fabricated perfect answer'} for n in range(1, 10)],
                   'evaluations': [{'overall': 100} for _ in range(9)]}
        with patch('market_intelligence.get_firestore_client', return_value=MagicMock()), \
             patch('interview_engine._cached_encode', return_value=[1.0]), \
             patch('interview_engine.calculate_cosine_similarity', return_value=1.0), \
             patch('interview_engine.generate_text_with_fallback', return_value='{"metrics":{"aiHolisticEvaluation":100,"communicationClarity":100}}'):
            response = TestClient(app).post('/interview/report', json=payload)
        assert response.status_code >= 400, response.text
    finally:
        app.dependency_overrides.clear()


def test_semantic_reference_ignores_self_matching_client_benchmark(monkeypatch):
    import interview_engine as engine
    encoded = []
    monkeypatch.setattr(engine, '_cached_encode', lambda text: encoded.append(text) or text)
    monkeypatch.setattr(engine, 'calculate_cosine_similarity', lambda reference, answer: 1.0 if reference == answer else .2)
    text = 'An unrelated synthetic answer'
    score = engine.calculate_semantic_correctness([{'questionId': 'survey-1', 'answer': text, 'benchmarkAnswer': text}])
    assert score == 20
    assert encoded[0] == engine.CORE_SURVEY_QUESTIONS[0]['idealAnswer']


def test_unresolvable_reference_fails_explicitly():
    import interview_engine as engine
    import pytest
    for question_id in ('not-approved', 'survey-11', None):
        with pytest.raises(ValueError, match='valid scored question'):
            engine.calculate_semantic_correctness([{'questionId': question_id, 'answer': 'synthetic', 'benchmarkAnswer': 'synthetic'}])


def test_closing_never_adds_a_semantic_score(monkeypatch):
    import interview_engine as engine
    monkeypatch.setattr(engine, '_cached_encode', lambda text: text)
    monkeypatch.setattr(engine, 'calculate_cosine_similarity', lambda *_: .2)
    core = {'questionId': 'survey-1', 'answer': 'Synthetic answer'}
    closing = {'questionId': 'survey-10', 'questionType': 'closing', 'answer': 'Fake perfect answer', 'benchmarkAnswer': 'Fake perfect answer'}
    assert engine.calculate_semantic_correctness([core, closing]) == engine.calculate_semantic_correctness([core]) == 20
