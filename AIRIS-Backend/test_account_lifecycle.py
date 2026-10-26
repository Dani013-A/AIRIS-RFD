from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
import account_lifecycle as lifecycle


def db_fixture(monkeypatch, profile, entry):
    db = MagicMock()
    db.collection.return_value.document.return_value.get.side_effect = [
        MagicMock(to_dict=lambda: profile), MagicMock(to_dict=lambda: entry)]
    monkeypatch.setattr(lifecycle, 'get_firestore_client', lambda: db)


@pytest.mark.parametrize('profile,entry', [
    (None, None),
    ({'uid': 'old', 'email': 'synthetic@tip.edu.ph'}, None),
    ({'uid': 'new', 'email': 'synthetic@tip.edu.ph', 'isDeleted': True}, None),
    ({'uid': 'new', 'email': 'synthetic@tip.edu.ph', 'isDisabled': True}, None),
    *[({'uid': 'new', 'email': 'synthetic@tip.edu.ph'}, {'uid': 'old', 'state': state}) for state in ['ACTIVE', 'SELF_DELETE_PENDING', 'SELF_DELETED', 'ADMIN_REMOVED', 'ADMIN_DISABLED', 'LEGACY_REVIEW']],
])
def test_protected_api_rejects_orphaned_or_restricted_identity(monkeypatch, profile, entry):
    db_fixture(monkeypatch, profile, entry)
    with pytest.raises(HTTPException) as error:
        lifecycle.assert_active_student('new', 'synthetic@tip.edu.ph')
    assert error.value.status_code == 403


@pytest.mark.parametrize('entry', [None, {'uid': 'new', 'state': 'ACTIVE'}])
def test_active_legacy_and_registered_accounts_work(monkeypatch, entry):
    db_fixture(monkeypatch, {'uid': 'new', 'email': 'synthetic@tip.edu.ph'}, entry)
    lifecycle.assert_active_student('new', 'synthetic@tip.edu.ph')


def test_unavailable_database_fails_closed(monkeypatch):
    monkeypatch.setattr(lifecycle, 'get_firestore_client', lambda: None)
    with pytest.raises(HTTPException) as error:
        lifecycle.assert_active_student('new', 'synthetic@tip.edu.ph')
    assert error.value.status_code == 503
