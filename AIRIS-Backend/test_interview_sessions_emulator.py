"""Actual Firestore transactions and HTTP routes; only external AI/embeddings are faked."""
import copy
import datetime
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore
from main import app, get_authenticated_user
import interview_engine as engine
import interview_sessions as sessions

HOST = os.getenv('FIRESTORE_EMULATOR_HOST', '')
pytestmark = pytest.mark.skipif(not HOST, reason='Requires local Firestore emulator; never production.')


@pytest.fixture
def flow(monkeypatch):
    assert HOST.startswith(('127.0.0.1:', 'localhost:'))
    project = 'demo-airis-acceptance'
    db = firestore.Client(project=project, credentials=AnonymousCredentials())
    owner = 'synthetic-' + uuid.uuid4().hex
    other = owner + '-other'
    for uid in (owner, other):
        db.collection('users').document(uid).set({'uid': uid, 'email': uid + '@tip.edu.ph', 'role': 'student', 'accountState': 'ACTIVE'})
    actor = [owner]
    app.dependency_overrides[get_authenticated_user] = lambda: actor[0]
    monkeypatch.setattr(sessions, 'get_firestore_client', lambda: db)
    monkeypatch.setattr(engine, '_cached_encode', lambda value: value)
    monkeypatch.setattr(engine, 'calculate_cosine_similarity', lambda *_: .6)
    calls = []
    def provider(prompt):
        calls.append(prompt)
        if 'aiHolisticEvaluation' in prompt:
            return '{"metrics":{"aiHolisticEvaluation":80,"communicationClarity":70}}'
        return '{"evaluation":{"overall":73,"feedback":"Synthetic feedback"}}'
    monkeypatch.setattr(engine, 'generate_text_with_fallback', provider)
    client = TestClient(app)
    class Flow:
        def start(self, role='Arbitrary approved employability role', interview_type='panel'):
            response = client.post('/interview/start', json={'targetRole': role, 'program': 'Synthetic Program', 'parsedResume': {}, 'resumeId': 'synthetic-resume', 'interviewType': interview_type})
            assert response.status_code == 200, response.text
            return response.json()['sessionId']
        def answer(self, sid, number, turn=None, text=None, **extra):
            return client.post('/interview/answer', json={'sessionId': sid, 'questionId': f'survey-{number}', 'turn': number - 1 if turn is None else turn, 'currentAnswer': text or 'I developed a coursework project with my team and tested our work to meet the deadline.', **extra})
        def complete(self, sid):
            for number in range(1, 10):
                response = self.answer(sid, number, text='What mentoring and collaboration opportunities are available?' if number == 9 else None)
                assert response.status_code == 200, response.text
                assert response.json()['nextQuestion']['questionId'] == f'survey-{number + 1}'
            return self.report(sid)
        def report(self, sid, **extra):
            return client.post('/interview/report', json={'sessionId': sid, **extra})
        def state(self, sid):
            return db.collection('users').document(owner).collection('interviewSessions').document(sid)
    result = Flow()
    result.db, result.owner, result.other, result.actor, result.client, result.calls = db, owner, other, actor, client, calls
    yield result
    app.dependency_overrides.clear()
    for uid in (owner, other):
        db.recursive_delete(db.collection('users').document(uid))
    db.close()


def test_benchmark_forgery_is_rejected_and_canonical_reference_used(flow, monkeypatch):
    sid = flow.start()
    rejected = flow.answer(sid, 1, benchmarkAnswer='same as my answer', currentBenchmarkAnswer='same as my answer')
    assert rejected.status_code == 422
    encoded = []
    monkeypatch.setattr(engine, '_cached_encode', lambda value: encoded.append(value) or value)
    result = flow.complete(sid)
    assert result.status_code == 200, result.text
    assert engine.CORE_SURVEY_QUESTIONS[0]['idealAnswer'] in encoded
    assert 'same as my answer' not in encoded
    assert result.json()['categoryBreakdown']['SemanticCorrectness'] == 60


def test_nine_fabricated_evaluations_without_answer_flow_fail(flow):
    sid = flow.start()
    assert flow.report(sid, history=[{'answer': 'fabricated'}] * 9, evaluations=[{'overall': 100}] * 9).status_code == 422
    assert flow.report(sid).status_code == 400
    assert not list(flow.db.collection('users').document(flow.owner).collection('interviews').stream())


@pytest.mark.parametrize('injection', [
    {'evaluation': {'overall': 100}}, {'overallScore': 100}, {'semanticScore': 100},
    {'history': []}, {'evaluations': [{'overall': 100}]}, {'targetRole': 'Changed role'},
])
def test_score_and_context_injection_rejected(flow, injection):
    sid = flow.start()
    assert flow.answer(sid, 1, **injection).status_code == 422
    assert flow.state(sid).get().to_dict()['revision'] == 0


def test_modified_generated_evaluation_rejected(flow):
    sid = flow.start()
    original = flow.answer(sid, 1)
    assert original.status_code == 200
    altered = original.json()['evaluation']
    altered['overall'] = 100
    assert flow.answer(sid, 2, evaluation=altered).status_code == 422
    assert flow.report(sid, evaluations=[altered] * 9).status_code == 422
    assert flow.state(sid).get().to_dict()['evaluations'][0]['overall'] == 73


def test_user_and_session_bindings(flow):
    sid = flow.start()
    other_sid = flow.start()
    assert flow.answer(sid, 1).status_code == 200
    flow.actor[0] = flow.other
    assert flow.answer(sid, 1).status_code == 404
    assert flow.report(sid).status_code == 404
    assert flow.client.post('/interview/cancel', json={'sessionId': sid}).status_code == 404
    flow.actor[0] = flow.owner
    assert flow.answer(other_sid, 2).status_code == 409
    assert flow.report(other_sid).status_code == 400


@pytest.mark.parametrize('question,turn', [('survey-0', 0), ('survey-2', 0), ('survey-11', 0), ('unknown', 0), ('survey-1', 1)])
def test_invalid_or_out_of_order_turn(flow, question, turn):
    sid = flow.start()
    response = flow.client.post('/interview/answer', json={'sessionId': sid, 'questionId': question, 'turn': turn, 'currentAnswer': 'Synthetic substantive answer'})
    assert response.status_code in (400, 409)
    assert flow.state(sid).get().to_dict()['revision'] == 0


def test_replay_is_idempotent_and_modified_duplicate_rejected(flow):
    sid = flow.start()
    first = flow.answer(sid, 1)
    calls = len(flow.calls)
    second = flow.answer(sid, 1)
    assert second.json() == first.json()
    assert len(flow.calls) == calls
    assert flow.answer(sid, 1, text='A modified answer replay').status_code == 409
    assert len(flow.state(sid).get().to_dict()['evaluations']) == 1


def test_concurrent_replays_commit_only_one_turn(flow):
    sid = flow.start()
    text = 'I developed a coursework project with my team and tested the deliverable.'
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: sessions.answer(flow.owner, sid, 'survey-1', 0, text), range(2)))
    assert responses[0] == responses[1]
    assert len(flow.state(sid).get().to_dict()['evaluations']) == 1


def test_report_rejects_missing_ninth_response(flow):
    sid = flow.start()
    for n in range(1, 9):
        assert flow.answer(sid, n).status_code == 200
    assert flow.report(sid).status_code == 400


def test_ninth_answer_scored_tenth_cannot_score_and_completion_is_atomic_idempotent(flow):
    sid = flow.start()
    response = flow.complete(sid)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['overallPerformance'] == round(.4 * 60 + .4 * 80 + .2 * 70) == 70
    assert result['persisted'] is True
    state = flow.state(sid).get().to_dict()
    assert [e['questionId'] for e in state['evaluations']] == [f'survey-{n}' for n in range(1, 10)]
    calls = len(flow.calls)
    assert flow.answer(sid, 10).status_code == 409
    assert flow.report(sid).json() == result
    assert len(flow.calls) == calls
    owner = flow.db.collection('users').document(flow.owner)
    interviews = list(owner.collection('interviews').stream())
    activities = list(owner.collection('activities').stream())
    assert len(interviews) == len(activities) == 1
    assert interviews[0].to_dict()['finalReport'] == result
    assert activities[0].to_dict()['score'] == 70
    assert activities[0].to_dict()['completedAt']
    assert interviews[0].to_dict()['resumeId'] == 'synthetic-resume'


def test_persistence_failure_is_not_success_and_retry_reuses_prepared_report(flow):
    sid = flow.start()
    for n in range(1, 10):
        assert flow.answer(sid, n).status_code == 200
    original = sessions._transaction
    def fail_completed_commit(db, operation):
        if operation.__name__ == 'complete':
            raise RuntimeError('synthetic storage failure')
        return original(db, operation)
    with patch.object(sessions, '_transaction', side_effect=fail_completed_commit):
        response = flow.report(sid)
    assert response.status_code == 500
    assert 'synthetic storage failure' not in response.text
    assert flow.state(sid).get().to_dict()['status'] == 'finalizing'
    owner = flow.db.collection('users').document(flow.owner)
    assert not list(owner.collection('interviews').stream())
    assert not list(owner.collection('activities').stream())
    calls = len(flow.calls)
    assert flow.report(sid).status_code == 200
    assert len(flow.calls) == calls


def test_cancel_inflight_answer_cannot_commit_or_finalize(flow, monkeypatch):
    sid = flow.start()
    original = engine.evaluate_answer_and_generate_next
    def cancelling(*args, **kwargs):
        result = original(*args, **kwargs)
        sessions.cancel(flow.owner, sid)
        return result
    monkeypatch.setattr(engine, 'evaluate_answer_and_generate_next', cancelling)
    assert flow.answer(sid, 1).status_code == 409
    assert flow.report(sid).status_code == 409
    assert flow.state(sid).get().to_dict()['evaluations'] == []


def test_cancel_inflight_report_cannot_persist(flow, monkeypatch):
    sid = flow.start()
    for n in range(1, 10):
        assert flow.answer(sid, n).status_code == 200
    original = engine.generate_final_report
    def cancelling(*args, **kwargs):
        result = original(*args, **kwargs)
        sessions.cancel(flow.owner, sid)
        return result
    monkeypatch.setattr(engine, 'generate_final_report', cancelling)
    assert flow.report(sid).status_code == 409
    assert not list(flow.db.collection('users').document(flow.owner).collection('interviews').stream())


def test_disabled_account_during_evaluation_cannot_commit(flow, monkeypatch):
    sid = flow.start()
    original = engine.evaluate_answer_and_generate_next
    def disabling(*args, **kwargs):
        result = original(*args, **kwargs)
        flow.db.collection('users').document(flow.owner).update({'isDisabled': True})
        return result
    monkeypatch.setattr(engine, 'evaluate_answer_and_generate_next', disabling)
    assert flow.answer(sid, 1).status_code == 403
    assert flow.state(sid).get().to_dict()['revision'] == 0


def test_audio_metrics_are_server_bound_to_turn_and_transcript(flow):
    sid = flow.start()
    text = 'I developed a coursework project with my team and tested our work to meet the deadline.'
    metrics = {'pauseCount': 2, 'totalPauseDuration': 1.2}
    sessions.attach_audio(flow.owner, sid, 0, text, metrics)
    assert flow.answer(sid, 1).status_code == 200
    assert flow.state(sid).get().to_dict()['history'][0]['pauseMetrics'] == metrics
    assert flow.answer(sid, 2, pauseMetrics={'pauseCount': 0}).status_code == 422
    assert flow.answer(sid, 2).status_code == 200
    assert 'pauseMetrics' not in flow.state(sid).get().to_dict()['history'][1]


def test_expired_session_fails_explicitly(flow):
    sid = flow.start()
    flow.state(sid).update({'expiresAt': datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=1)})
    assert flow.answer(sid, 1).status_code == 410
    assert flow.report(sid).status_code == 410


def test_clarification_is_same_core_question_but_new_attempt(flow):
    sid = flow.start()
    first = flow.answer(sid, 1, text='Repeat the question')
    assert first.status_code == 200
    assert first.json()['isInteractionEvent'] is True
    assert first.json()['nextQuestion']['questionId'] == 'survey-1'
    second = flow.answer(sid, 1, turn=1)
    assert second.status_code == 200
    state = flow.state(sid).get().to_dict()
    assert len(state['history']) == 2 and len(state['evaluations']) == 1
    assert state['evaluations'][0]['turn'] == 1


def test_unavailable_storage_fails_closed(flow, monkeypatch):
    monkeypatch.setattr(sessions, 'get_firestore_client', lambda: None)
    response = flow.client.post('/interview/start', json={'targetRole': 'Synthetic Role'})
    assert response.status_code == 503


@pytest.mark.parametrize('field,value', [('userId', 'other-user'), ('sessionId', 'b' * 32), ('questionId', 'survey-2'), ('turn', 8)])
def test_report_checks_every_stored_evaluation_binding(flow, field, value):
    sid = flow.start()
    for n in range(1, 10):
        assert flow.answer(sid, n).status_code == 200
    state = flow.state(sid).get().to_dict()
    state['evaluations'][0][field] = value
    # Fault injection through emulator Admin SDK, never a permitted client write.
    flow.state(sid).update({'evaluations': state['evaluations']})
    assert flow.report(sid).status_code == 409


def test_report_rejects_invalid_stored_question_identifier(flow):
    sid = flow.start()
    for n in range(1, 10):
        assert flow.answer(sid, n).status_code == 200
    state = flow.state(sid).get().to_dict()
    state['history'][0]['questionId'] = 'unapproved'
    flow.state(sid).update({'history': state['history']})
    assert flow.report(sid).status_code == 409


def test_lost_completion_response_retries_the_committed_report(flow):
    sid = flow.start()
    for n in range(1, 10):
        assert flow.answer(sid, n).status_code == 200
    original = sessions._transaction
    def lose_response(db, operation):
        result = original(db, operation)
        if operation.__name__ == 'complete':
            raise RuntimeError('Synthetic response lost after commit')
        return result
    with patch.object(sessions, '_transaction', side_effect=lose_response):
        assert flow.report(sid).status_code == 500
    saved = flow.state(sid).get().to_dict()['finalReport']
    calls = len(flow.calls)
    assert flow.report(sid).json() == saved
    assert len(flow.calls) == calls
    owner = flow.db.collection('users').document(flow.owner)
    assert len(list(owner.collection('interviews').stream())) == len(list(owner.collection('activities').stream())) == 1


def test_atomic_commit_failure_leaves_neither_interview_nor_activity(flow):
    from google.cloud.firestore_v1.transaction import Transaction
    sid = flow.start()
    for n in range(1, 10):
        assert flow.answer(sid, n).status_code == 200
    original = Transaction._commit
    def unavailable(transaction):
        if any(write.update.name.endswith('/activities/' + sid) for write in transaction._write_pbs):
            raise RuntimeError('Synthetic commit transport failure')
        return original(transaction)
    with patch.object(Transaction, '_commit', unavailable):
        assert flow.report(sid).status_code == 500
    owner = flow.db.collection('users').document(flow.owner)
    assert not list(owner.collection('interviews').stream())
    assert not list(owner.collection('activities').stream())
    assert flow.state(sid).get().to_dict()['status'] == 'finalizing'
    assert flow.report(sid).status_code == 200


def test_concurrent_reports_return_one_committed_result(flow):
    sid = flow.start()
    for n in range(1, 10):
        assert flow.answer(sid, n).status_code == 200
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: sessions.report(flow.owner, sid), range(2)))
    assert results[0] == results[1]
    owner = flow.db.collection('users').document(flow.owner)
    assert len(list(owner.collection('interviews').stream())) == len(list(owner.collection('activities').stream())) == 1


def test_transcription_route_binds_measured_metrics_to_the_scored_attempt(flow, monkeypatch):
    import transcriber
    sid = flow.start()
    text = 'I developed a coursework project with my team and tested our work to meet the deadline.'
    metrics = {'pauseCount': 1, 'totalPauseDuration': .5}
    monkeypatch.setattr(transcriber, 'transcribe_audio', lambda *_: {'text': text, 'pauseMetrics': metrics})
    response = flow.client.post('/interview/transcribe', data={'sessionId': sid, 'turn': '0'}, files={'audio': ('synthetic.wav', b'synthetic audio', 'audio/wav')})
    assert response.status_code == 200, response.text
    assert flow.answer(sid, 1, text=text).status_code == 200
    assert flow.state(sid).get().to_dict()['history'][0]['pauseMetrics'] == metrics


def test_actual_emulator_firebase_tokens_own_sessions_and_disabled_accounts_fail(flow, monkeypatch):
    import firebase_admin
    from firebase_admin import auth
    import requests
    import account_lifecycle
    assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST') == '127.0.0.1:9099'
    assert firebase_admin.get_app().project_id == 'demo-airis-acceptance'
    app.dependency_overrides.clear()
    monkeypatch.setattr(account_lifecycle, 'get_firestore_client', lambda: flow.db)
    uid = 'token-' + uuid.uuid4().hex
    email = uid + '@tip.edu.ph'
    password = 'Synthetic-only-123!'
    auth.create_user(uid=uid, email=email, password=password, email_verified=True)
    profile = flow.db.collection('users').document(uid)
    profile.set({'uid': uid, 'email': email, 'role': 'student', 'accountState': 'ACTIVE'})
    try:
        signed = requests.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic', json={'email': email, 'password': password, 'returnSecureToken': True}, timeout=10)
        assert signed.status_code == 200
        headers = {'Authorization': 'Bearer ' + signed.json()['idToken']}
        response = flow.client.post('/interview/start', headers=headers, json={'targetRole': 'Synthetic Role'})
        assert response.status_code == 200, response.text
        sid = response.json()['sessionId']
        response = flow.client.post('/interview/answer', headers=headers, json={'sessionId': sid, 'questionId': 'survey-1', 'turn': 0, 'currentAnswer': 'I developed and tested a coursework project with my team.'})
        assert response.status_code == 200, response.text
        profile.update({'isDisabled': True})
        response = flow.client.post('/interview/report', headers=headers, json={'sessionId': sid})
        assert response.status_code == 403
    finally:
        auth.delete_user(uid)
        flow.db.recursive_delete(profile)


def test_status_recovers_durable_report_without_generation_or_duplicate_writes(flow):
    sid = flow.start()
    assert flow.client.get('/interview/status/' + sid).json()['status'] == 'in_progress'
    response = flow.complete(sid)
    assert response.status_code == 200
    receipt = response.json()
    assert receipt['status'] == 'completed' and receipt['reportId'] == sid
    calls = len(flow.calls)
    for _ in range(3):
        recovered = flow.client.get('/interview/status/' + sid)
        assert recovered.status_code == 200
        assert recovered.json()['report'] == receipt
    assert len(flow.calls) == calls
    owner = flow.db.collection('users').document(flow.owner)
    assert len(list(owner.collection('activities').stream())) == 1
    assert len(list(owner.collection('interviews').stream())) == 1
    flow.actor[0] = flow.other
    assert flow.client.get('/interview/status/' + sid).status_code == 404


def test_status_does_not_claim_completion_for_a_missing_canonical_record(flow):
    sid = flow.start()
    assert flow.complete(sid).status_code == 200
    flow.db.collection('users').document(flow.owner).collection('interviews').document(sid).delete()
    response = flow.client.get('/interview/status/' + sid)
    assert response.status_code == 503
    assert 'report' not in response.json()
    assert flow.report(sid).status_code == 503


def test_status_exposes_finalizing_after_storage_failure_without_report(flow):
    sid = flow.start()
    for n in range(1,10):
        assert flow.answer(sid,n).status_code == 200
    original = sessions._transaction
    def fail(db, operation):
        if operation.__name__ == 'complete': raise RuntimeError('Synthetic storage failure')
        return original(db, operation)
    with patch.object(sessions, '_transaction', side_effect=fail):
        assert flow.report(sid).status_code == 500
    status = flow.client.get('/interview/status/' + sid).json()
    assert status == {'sessionId':sid,'status':'finalizing'}
    assert flow.report(sid).status_code == 200


def test_lost_answer_commit_response_reconciles_only_the_durable_attempt(flow):
    sid = flow.start()
    original = sessions._transaction
    def lose(db, operation):
        result = original(db, operation)
        if operation.__name__ == 'commit':
            raise RuntimeError('Synthetic lost commit response')
        return result
    with patch.object(sessions, '_transaction', side_effect=lose):
        first = flow.answer(sid, 1)
    assert first.status_code == 200
    calls = len(flow.calls)
    assert flow.answer(sid, 1).json() == first.json()
    assert len(flow.calls) == calls
    assert len(flow.state(sid).get().to_dict()['evaluations']) == 1


def test_failed_answer_transaction_without_a_receipt_cannot_advance(flow):
    sid = flow.start()
    original = sessions._transaction
    def fail(db, operation):
        if operation.__name__ == 'commit':
            raise RuntimeError('Synthetic failed commit')
        return original(db, operation)
    with patch.object(sessions, '_transaction', side_effect=fail):
        assert flow.answer(sid, 1).status_code == 500
    state = flow.state(sid).get().to_dict()
    assert state['revision'] == 0 and state['evaluations'] == []
    assert not list(flow.state(sid).collection('turns').stream())
    assert flow.report(sid).status_code == 400


def test_clarification_preserves_original_answer_and_actual_spoken_question(flow):
    sid=flow.start()
    for number in range(1,7):
        assert flow.answer(sid,number).status_code==200
    initial='We built a scheduling application and coordinated the integration with our team.'
    first=flow.answer(sid,7,text=initial)
    assert first.status_code==200
    assert first.json()['isInteractionEvent']
    spoken=first.json()['nextQuestion']['question']
    assert 'own responsibility' in spoken
    detail='I built the scheduling service and documented the integration requests for my teammates.'
    second=flow.answer(sid,7,turn=7,text=detail)
    assert second.status_code==200
    assert second.json()['nextQuestion']['questionId']=='survey-8'
    state=flow.state(sid).get().to_dict()
    record=state['history'][-1]
    assert record['answer']==initial+'\n'+detail
    assert record['spokenQuestion']==spoken
    assert len(state['evaluations'])==7


@pytest.mark.parametrize('mutation',['missing','duplicate','order'])
def test_corrupt_server_history_fails_closed_without_new_evaluation(flow,mutation):
    sid=flow.start()
    assert flow.answer(sid,1).status_code==200
    state=flow.state(sid).get().to_dict()
    history=state['history']
    if mutation=='missing':history=[]
    elif mutation=='duplicate':history=history*2
    else:history[0]['turn']=3
    flow.state(sid).update({'history':history})
    before=len(flow.calls)
    response=flow.answer(sid,2)
    assert response.status_code==409
    assert len(flow.calls)==before
    assert flow.state(sid).get().to_dict()['revision']==1


def test_older_active_question_set_cannot_be_scored_against_new_benchmark(flow):
    sid=flow.start()
    flow.state(sid).update({'questionSetVersion':'previous-candidate-questions'})
    before=len(flow.calls)
    response=flow.answer(sid,1)
    assert response.status_code==409
    assert len(flow.calls)==before
    assert flow.state(sid).get().to_dict()['revision']==0


def test_completed_older_question_set_remains_readable_without_rescoring(flow):
    sid=flow.start()
    completed=flow.complete(sid)
    assert completed.status_code==200
    flow.state(sid).update({'questionSetVersion':'previous-candidate-questions'})
    before=len(flow.calls)
    cached=flow.report(sid)
    assert cached.status_code==200
    assert cached.json()==completed.json()
    assert len(flow.calls)==before


@pytest.mark.parametrize('mode',['one-on-one','panel','immersive-one-on-one','immersive-panel','vr'])
def test_shared_modes_complete_nine_answers_and_persist_one_report(flow,mode):
    sid=flow.start(interview_type=mode)
    result=flow.complete(sid)
    assert result.status_code==200
    assert flow.report(sid).json()==result.json()
    state=flow.state(sid).get().to_dict()
    assert state['status']=='completed'
    assert state['interviewType']==mode
    assert len(state['evaluations'])==9
    assert state['currentQuestion']['questionId']=='survey-10'
    assert state['currentQuestion']['questionType']=='closing'
    assert [t['questionId'] for t in state['history'] if not t['isInteraction']]==[f'survey-{n}' for n in range(1,10)]
