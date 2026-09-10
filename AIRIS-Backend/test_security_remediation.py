import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
import io
import os

from main import app

client = TestClient(app)

def mock_verify_id_token(token, *args, **kwargs):
    if token == "token-studentA":
        return {"uid": "studentA"}
    elif token == "token-studentB":
        return {"uid": "studentB"}
    elif token == "token-admin":
        return {"uid": "admin_uid_123", "admin": True}
    elif token == "token-non-admin":
        return {"uid": "regular_user_456"}
    raise Exception("Invalid token")


class TestSecurityRemediation(unittest.TestCase):

    # Attack Test A: No Authorization -> /upload MUST return 401
    def test_upload_missing_auth_returns_401(self):
        response = client.post(
            "/upload",
            files={"file": ("resume.pdf", io.BytesIO(b"%PDF-1.4 dummy content"), "application/pdf")},
            data={"targetPosition": "Software Engineer"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Authentication required", response.json().get("detail", ""))

    # Attack Test B: No Authorization -> /analyze MUST return 401
    def test_analyze_missing_auth_returns_401(self):
        response = client.post(
            "/analyze",
            json={"rawText": "Dummy resume", "targetPosition": "Software Engineer"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Authentication required", response.json().get("detail", ""))

    # Attack Test C: Valid Student A token attempting Student B operation -> MUST return 403
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_cross_user_spoofing_rejected_403(self, mock_auth):
        # 1. /upload with student A token and userId = studentB
        response_upload = client.post(
            "/upload",
            headers={"Authorization": "Bearer token-studentA"},
            files={"file": ("resume.pdf", io.BytesIO(b"%PDF-1.4 dummy content"), "application/pdf")},
            data={"targetPosition": "Software Engineer", "userId": "studentB"}
        )
        self.assertEqual(response_upload.status_code, 403)
        self.assertIn("Forbidden", response_upload.json().get("detail", ""))

        # 2. /analyze with student A token and userId = studentB
        response_analyze = client.post(
            "/analyze",
            headers={"Authorization": "Bearer token-studentA"},
            json={
                "rawText": "Dummy resume content",
                "targetPosition": "Software Engineer",
                "userId": "studentB"
            }
        )
        self.assertEqual(response_analyze.status_code, 403)
        self.assertIn("Forbidden", response_analyze.json().get("detail", ""))

    # Attack Test F: Non-admin token attempting admin endpoint -> MUST return 403
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    @patch.dict("os.environ", {"ADMIN_UIDS": "admin_uid_123"})
    def test_non_admin_rejected_on_admin_endpoint(self, mock_auth):
        response = client.post(
            "/admin/refresh-trends",
            headers={"Authorization": "Bearer token-non-admin"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Forbidden", response.json().get("detail", ""))

    # Attack Test G: Admin token attempting admin endpoint -> Authorized (passes auth check)
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    @patch.dict("os.environ", {"ADMIN_UIDS": "admin_uid_123"})
    @patch("market_intelligence.refresh_job_market_snapshot", return_value={"status": "refreshed"})
    @patch("ai_service.invalidate_market_cache")
    def test_admin_authorized_on_admin_endpoint(self, mock_cache, mock_snapshot, mock_auth):
        response = client.post(
            "/admin/refresh-trends",
            headers={"Authorization": "Bearer token-admin"}
        )
        self.assertEqual(response.status_code, 200)

    # Attack Test: Invalid token format / expired token returns 401
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_invalid_token_returns_401(self, mock_auth):
        response = client.post(
            "/analyze",
            headers={"Authorization": "Bearer invalid-expired-token"},
            json={"rawText": "Dummy", "targetPosition": "Software Engineer"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid or expired", response.json().get("detail", ""))


if __name__ == "__main__":
    unittest.main()
