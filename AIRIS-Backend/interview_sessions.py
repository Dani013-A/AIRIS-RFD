"""Durable, server-only interview state and atomic completed-result persistence."""
import copy
import datetime
import hashlib
import json
import re
import uuid

from fastapi import HTTPException
from firebase_admin import firestore
from market_intelligence import get_firestore_client
import interview_engine as engine


def _database():
    db = get_firestore_client()
    if db is None:
        raise HTTPException(503, "Interview storage is temporarily unavailable. Please retry.")
    return db


def _reference(db, uid, session_id):
    if not re.fullmatch(r"[a-f0-9]{32}", session_id or ""):
        raise HTTPException(400, "A server-issued interview session is required.")
    return db.collection("users").document(uid).collection("interviewSessions").document(session_id)


def _active_profile(transaction, db, uid):
    profile = db.collection("users").document(uid).get(transaction=transaction).to_dict()
    if not profile or profile.get("uid") != uid or profile.get("isDeleted") or profile.get("isDisabled") or profile.get("accountState") in ("DELETED", "DISABLED"):
        raise HTTPException(403, "Account access is restricted.")


def _state(ref, uid, transaction=None):
    state = ref.get(transaction=transaction).to_dict()
    if not state or state.get("userId") != uid:
        raise HTTPException(404, "Interview session is unavailable.")
    if state["status"] == "cancelled":
        raise HTTPException(409, "Interview session was cancelled.")
    if state["status"] != "completed" and state["expiresAt"] <= datetime.datetime.now(datetime.timezone.utc):
        raise HTTPException(410, "Interview session expired. Please start a new interview.")
    return state


def _completed_record(transaction, db, uid, session_id, state):
    owner = db.collection("users").document(uid)
    record = owner.collection("interviews").document(session_id).get(transaction=transaction).to_dict()
    activity = owner.collection("activities").document(session_id).get(transaction=transaction).to_dict()
    report = state.get("finalReport")
    if (not record or record.get("userId") != uid or record.get("sessionId") != session_id
            or not report or record.get("finalReport") != report
            or not activity or activity.get("id") != session_id or activity.get("type") != "Mock Interview"
            or activity.get("score") != report.get("overallPerformance")):
        raise HTTPException(503, "The saved interview could not be confirmed. Please retry.")
    return report


def _transaction(db, operation):
    return firestore.transactional(operation)(db.transaction())


def start(uid, target_role, program, parsed_resume, resume_id="none", interview_type="one-on-one"):
    first = engine.generate_first_question(target_role, program, parsed_resume)
    session_id = uuid.uuid4().hex
    now = datetime.datetime.now(datetime.timezone.utc)
    state = {"sessionId": session_id, "userId": uid, "targetRole": target_role,
             "program": program, "parsedResume": parsed_resume, "resumeId": resume_id,
             "interviewType": interview_type, "startedAt": int(now.timestamp() * 1000),
             "expiresAt": now + datetime.timedelta(hours=24), "status": "active",
             "questionSetVersion": engine.INTERVIEW_QUESTION_SET_VERSION,
             "revision": 0, "currentQuestion": first, "history": [], "evaluations": []}
    db = _database()
    def create(transaction):
        _active_profile(transaction, db, uid)
        transaction.create(_reference(db, uid, session_id), state)
    _transaction(db, create)
    return {**first, "sessionId": session_id, "turn": 0, "speechDecisionId": uuid.uuid4().hex}


def answer(uid, session_id, question_id, turn, text):
    db = _database()
    ref = _reference(db, uid, session_id)
    state = _state(ref, uid)
    # A revision is an answer attempt, including clarification interactions, not a core index.
    digest = hashlib.sha256(json.dumps([question_id, text], sort_keys=True, allow_nan=False).encode()).hexdigest()
    turn_ref = ref.collection("turns").document(str(turn))
    previous = turn_ref.get().to_dict()
    if previous:
        if previous["digest"] != digest:
            raise HTTPException(409, "This turn already has a different answer.")
        return previous["response"]
    if state["status"] != "active" or turn != state["revision"]:
        raise HTTPException(409, "Interview turn is out of order.")
    if state.get("questionSetVersion") != engine.INTERVIEW_QUESTION_SET_VERSION:
        raise HTTPException(409, "The interview question set has changed. Please start a new interview.")
    try:
        engine.validate_conversation_history(state["history"], state["evaluations"])
    except ValueError as error:
        raise HTTPException(409, "Interview context is incomplete. Please start a new interview.") from error
    number = len(state["evaluations"]) + 1
    if number > 9 or question_id != f"survey-{number}":
        raise HTTPException(400, "Question does not belong to the active scored turn.")
    if turn >= 48:
        raise HTTPException(400, "Interview attempt limit reached. Please start a new interview.")
    audio = state.get("audioEvidence", {})
    pause_metrics = audio.get("pauseMetrics") if audio.get("turn") == turn and audio.get("transcriptHash") == hashlib.sha256(text.encode()).hexdigest() else None
    meta = engine.CORE_SURVEY_QUESTIONS[number - 1]
    result = engine.evaluate_answer_and_generate_next(
        state["targetRole"], state["program"], state["parsedResume"], state["history"],
        state["currentQuestion"]["question"], text, meta["category"], 10, pause_metrics)
    result = copy.deepcopy(result)
    result.update(sessionId=session_id, turn=turn + 1, speechDecisionId=uuid.uuid4().hex)
    updated = copy.deepcopy(state)
    updated["revision"] += 1
    evaluation = result.get("evaluation")
    interaction = result.get("isInteractionEvent", False)
    if result.get("isComplete") and evaluation is None and not interaction:
        updated.update(status="cancelled", parsedResume={}, history=[], evaluations=[])
        result["cancelled"] = True
    else:
        record = {"questionId": question_id, "turn": turn, "question": meta["text"],
                  "questionType": meta["category"], "answer": text, "isInteraction": interaction,
                  "spokenQuestion": state["currentQuestion"]["question"],
                  "clarificationAnswer": bool(interaction and result.get("nextQuestion", {}).get("isFollowUp"))}
        if not interaction:
            earlier = [item["answer"] for item in state["history"]
                       if item.get("questionId") == question_id and item.get("clarificationAnswer")]
            if earlier:
                record["answer"] = "\n".join(earlier + [text])
        if pause_metrics:
            record["pauseMetrics"] = pause_metrics
        updated["history"].append(record)
        if not interaction:
            if not isinstance(evaluation, dict) or not engine.valid_evaluation(evaluation):
                raise HTTPException(502, "Interview evaluation is unavailable. Please retry.")
            updated["evaluations"].append({**evaluation, "questionId": question_id, "turn": turn,
                                            "sessionId": session_id, "userId": uid})
        next_question = result.get("nextQuestion")
        expected_id = f"survey-{len(updated['evaluations']) + 1}"
        if not isinstance(next_question, dict) or next_question.get("questionId", expected_id) != expected_id:
            raise HTTPException(502, "Interview question is unavailable. Please retry.")
        next_question["questionId"] = expected_id
        updated["currentQuestion"] = next_question
        if len(updated["evaluations"]) == 9:
            updated["status"] = "ready"
    if len(json.dumps(updated, default=str).encode()) > 700000:
        raise HTTPException(413, "Interview session is too large.")
    def commit(transaction):
        _active_profile(transaction, db, uid)
        current = _state(ref, uid, transaction)
        saved = turn_ref.get(transaction=transaction).to_dict()
        if saved:
            if saved["digest"] != digest:
                raise HTTPException(409, "This turn already has a different answer.")
            return saved["response"]
        if current["revision"] != turn or current["status"] != "active":
            raise HTTPException(409, "Interview changed while evaluating. Please retry.")
        transaction.set(ref, updated)
        transaction.create(turn_ref, {"digest": digest, "response": result, "expiresAt": state["expiresAt"]})
        return result
    try:
        return _transaction(db, commit)
    except Exception:
        # A concurrent identical attempt may have committed despite this transaction's failure.
        _state(ref, uid)
        saved = turn_ref.get().to_dict()
        if saved and saved.get("digest") == digest:
            return saved["response"]
        raise



def report(uid, session_id):
    db = _database()
    ref = _reference(db, uid, session_id)
    state = _state(ref, uid)
    if state["status"] == "completed":
        return completion_status(uid, session_id)["report"]
    if state.get("questionSetVersion") != engine.INTERVIEW_QUESTION_SET_VERSION:
        raise HTTPException(409, "The interview question set has changed. Please start a new interview.")
    if state["status"] not in ("ready", "finalizing") or len(state["evaluations"]) != 9:
        raise HTTPException(400, "Nine evaluated candidate answers are required before generating a report.")
    scored = [item for item in state["history"] if not item.get("isInteraction")]
    if [item["questionId"] for item in scored] != [f"survey-{n}" for n in range(1, 10)]:
        raise HTTPException(409, "Interview evidence is incomplete.")
    for item, evaluation in zip(scored, state["evaluations"]):
        if any(evaluation.get(key) != value for key, value in {
            "userId": uid, "sessionId": session_id, "questionId": item["questionId"], "turn": item["turn"]}.items()):
            raise HTTPException(409, "Interview evaluation binding is invalid.")
    candidate = state.get("preparedReport")
    if candidate is None:
        candidate = engine.generate_final_report(state["targetRole"], state["program"], state["parsedResume"], state["history"], state["evaluations"])
        def prepare(transaction):
            _active_profile(transaction, db, uid)
            current = _state(ref, uid, transaction)
            if current["revision"] != state["revision"] or current["status"] not in ("ready", "finalizing", "completed"):
                raise HTTPException(409, "Interview changed while generating the report.")
            if current["status"] == "completed":
                return _completed_record(transaction, db, uid, session_id, current)
            if current.get("preparedReport"):
                return current["preparedReport"]
            transaction.update(ref, {"preparedReport": candidate, "status": "finalizing"})
            return candidate
        candidate = _transaction(db, prepare)
    def complete(transaction):
        _active_profile(transaction, db, uid)
        current = _state(ref, uid, transaction)
        if current["status"] == "completed":
            return _completed_record(transaction, db, uid, session_id, current)
        if current["status"] not in ("ready", "finalizing") or current["revision"] != state["revision"]:
            raise HTTPException(409, "Interview changed while saving the report.")
        now = datetime.datetime.now(datetime.timezone.utc)
        result = {**candidate, "sessionId": session_id, "completedAt": int(now.timestamp() * 1000), "persisted": True, "status": "completed", "reportId": session_id}
        owner = db.collection("users").document(uid)
        record = {key: current[key] for key in ("sessionId", "userId", "targetRole", "program", "resumeId", "interviewType", "startedAt", "history", "evaluations")}
        record.update(status="completed", reportId=session_id, finalReport=result, completedAt=result["completedAt"], totalQuestions=10, questionsAsked=10, persistedBy="backend", createdAt=now)
        transaction.set(owner.collection("interviews").document(session_id), record)
        transaction.set(owner.collection("activities").document(session_id), {
            "id": session_id, "title": f"Completed {current['targetRole']} Interview", "type": "Mock Interview",
            "score": result["overallPerformance"], "completedAt": now, "resumeId": current["resumeId"], "persistedBy": "backend"})
        transaction.update(ref, {"status": "completed", "finalReport": result, "parsedResume": {}, "expiresAt": firestore.DELETE_FIELD, "preparedReport": firestore.DELETE_FIELD, "audioEvidence": firestore.DELETE_FIELD})
        return result
    return _transaction(db, complete)


def cancel(uid, session_id):
    db = _database()
    ref = _reference(db, uid, session_id)
    def stop(transaction):
        _active_profile(transaction, db, uid)
        state = ref.get(transaction=transaction).to_dict()
        if not state or state.get("userId") != uid:
            raise HTTPException(404, "Interview session is unavailable.")
        if state["status"] == "completed":
            raise HTTPException(409, "The interview is already completed.")
        transaction.update(ref, {"status": "cancelled", "parsedResume": {}, "history": [], "evaluations": [], "audioEvidence": firestore.DELETE_FIELD, "preparedReport": firestore.DELETE_FIELD})
    _transaction(db, stop)
    return {"cancelled": True}


def attach_audio(uid, session_id, turn, text, pause_metrics):
    db = _database()
    ref = _reference(db, uid, session_id)
    def attach(transaction):
        _active_profile(transaction, db, uid)
        state = _state(ref, uid, transaction)
        if state["status"] != "active" or turn != state["revision"]:
            raise HTTPException(409, "Audio belongs to an obsolete interview turn.")
        if not isinstance(text, str) or len(text) > 8000:
            raise HTTPException(400, "Transcription is too large.")
        transaction.update(ref, {"audioEvidence": {"turn": turn,
            "transcriptHash": hashlib.sha256(text.strip().encode()).hexdigest(), "pauseMetrics": pause_metrics}})
    _transaction(db, attach)


def completion_status(uid, session_id):
    """Read-only reconciliation for a response lost after the atomic completion commit."""
    db = _database()
    ref = _reference(db, uid, session_id)
    def read(transaction):
        _active_profile(transaction, db, uid)
        state = _state(ref, uid, transaction)
        result = {"sessionId": session_id, "status": "in_progress" if state["status"] == "active" else state["status"]}
        if state["status"] == "completed":
            result["report"] = _completed_record(transaction, db, uid, session_id, state)
        return result
    return _transaction(db, read)
