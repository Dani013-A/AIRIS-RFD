"""Enforce the same persisted lifecycle boundary for protected student APIs."""
import hashlib
from fastapi import HTTPException
from market_intelligence import get_firestore_client


def assert_active_student(uid, email):
    try:
        db = get_firestore_client()
        if db is None:
            raise RuntimeError('unavailable')
        profile = db.collection('users').document(uid).get().to_dict()
        key = hashlib.sha256(email.strip().lower().encode()).hexdigest()
        entry = db.collection('account_lifecycle').document(key).get().to_dict()
    except Exception:
        raise HTTPException(status_code=503, detail='Account status is temporarily unavailable.')
    if not profile or profile.get('uid') != uid or str(profile.get('email', '')).strip().lower() != email.strip().lower():
        raise HTTPException(status_code=403, detail='Account registration is required.')
    if profile.get('isDeleted') or profile.get('isDisabled') or profile.get('accountState') in ('DELETED', 'DISABLED'):
        raise HTTPException(status_code=403, detail='Account access is restricted.')
    if entry and (entry.get('state') != 'ACTIVE' or entry.get('uid') != uid):
        raise HTTPException(status_code=403, detail='Account access is restricted.')
