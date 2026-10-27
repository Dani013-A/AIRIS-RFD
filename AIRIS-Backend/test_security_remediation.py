import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
import io
import os

from main import app

client = TestClient(app)

def mock_verify_id_token(token, *args, **kwargs):
    if token == "token-studentA":
        return {"uid": "studentA", "email": "mstudenta@tip.edu.ph", "email_verified": True}
    elif token == "token-studentB":
        return {"uid": "studentB", "email": "mstudentb@tip.edu.ph", "email_verified": True}
    elif token == "token-admin":
        return {"uid": "admin_uid_123", "admin": True}
    elif token == "token-non-admin":
        return {"uid": "regular_user_456", "email": "mregular@tip.edu.ph", "email_verified": True}
    elif token == "token-non-tip":
        return {"uid": "external_user", "email": "attacker@gmail.com", "email_verified": True}
    elif token == "token-unverified-tip":
        return {"uid": "unverified_student", "email": "mstudent@tip.edu.ph", "email_verified": False}
    elif token == "token-no-email":
        return {"uid": "no_email_student"}
    raise Exception("Invalid token")


class TestSecurityRemediation(unittest.TestCase):
    def setUp(self):
        # These endpoint tests isolate token/ownership validation; lifecycle has its own persisted-state suite.
        lifecycle = patch("main.assert_active_student")
        lifecycle.start()
        self.addCleanup(lifecycle.stop)


    def test_learning_rejects_unauthenticated_and_qc_students(self):
        payload = {"analysisId": "synthetic", "targetPosition": "Accountant", "gaps": ["accounting"]}
        self.assertEqual(client.post("/learning/recommendations", json=payload).status_code, 401)
        with patch("firebase_admin.auth.verify_id_token", return_value={"uid": "qc", "email": "qstudent@tip.edu.ph", "email_verified": True}):
            response = client.post("/learning/recommendations", json=payload, headers={"Authorization": "Bearer synthetic"})
            self.assertEqual(response.status_code, 403)
            self.assertIn("Manila", response.json()["detail"])

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_learning_context_authentication_and_schema(self, mock_auth):
        payload = {"analysisId": "synthetic", "targetPosition": "Accountant", "gaps": ["accounting"]}
        with patch("learning_discovery.recommendations", return_value={"placements": {}}) as recommend:
            response = client.post("/learning/recommendations", json=payload, headers={"Authorization": "Bearer token-studentA"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(recommend.call_args.args[1], "studentA")
        for invalid in [dict(payload,userId="studentB"),dict(payload,targetPosition=""),dict(payload,gaps=["x"*121])]:
            self.assertIn(client.post("/learning/recommendations", json=invalid, headers={"Authorization": "Bearer token-studentA"}).status_code, (400,422))

    def test_interview_endpoints_reject_missing_auth(self):
        requests = [
            ("/interview/start", {"json": {"targetRole": "Synthetic Role"}}),
            ("/interview/answer", {"json": {
                "history": [], "currentQuestion": "Synthetic question",
                "currentAnswer": "Synthetic answer", "currentQuestionType": "behavioral",
                "totalQuestions": 1,
            }}),
            ("/interview/report", {"json": {"history": [], "evaluations": []}}),
            ("/interview/cancel", {"json": {"sessionId": "a" * 32}}),
            ("/interview/transcribe", {"files": {"audio": ("synthetic.m4a", io.BytesIO(b"synthetic"), "audio/m4a")}}),
        ]
        for path, kwargs in requests:
            with self.subTest(path=path):
                response = client.post(path, **kwargs)
                self.assertEqual(response.status_code, 401)

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_interview_start_rejects_unverified_student(self, mock_auth):
        response = client.post(
            "/interview/start",
            headers={"Authorization": "Bearer token-unverified-tip"},
            json={"targetRole": "Synthetic Role"},
        )
        self.assertEqual(response.status_code, 403)

    @patch("firebase_admin.auth.verify_id_token", side_effect=RuntimeError("secret diagnostic detail"))
    @patch("main.verify_firebase_jwt_with_public_keys", side_effect=RuntimeError("secret diagnostic detail"))
    def test_auth_error_does_not_expose_internal_details(self, mock_fallback, mock_auth):
        response = client.post(
            "/interview/start",
            headers={"Authorization": "Bearer invalid"},
            json={"targetRole": "Synthetic Role"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertNotIn("secret diagnostic detail", response.text)

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

    # Domain Gate Test: Non-TIP email token attempting protected endpoint -> MUST return 403
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_non_tip_token_rejected_403(self, mock_auth):
        response = client.post(
            "/analyze",
            headers={"Authorization": "Bearer token-non-tip"},
            json={"rawText": "Dummy content", "targetPosition": "Software Engineer"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Only T.I.P. Manila institutional email addresses", response.json().get("detail", ""))

    # Domain Gate Test: Unverified TIP email token attempting protected endpoint -> MUST return 403
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_unverified_tip_token_rejected_403(self, mock_auth):
        response = client.post(
            "/analyze",
            headers={"Authorization": "Bearer token-unverified-tip"},
            json={"rawText": "Dummy content", "targetPosition": "Software Engineer"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Institutional email address has not been verified", response.json().get("detail", ""))

    # Domain Gate Test: Missing email token attempting protected endpoint -> MUST return 403
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_missing_email_token_rejected_403(self, mock_auth):
        response = client.post(
            "/analyze",
            headers={"Authorization": "Bearer token-no-email"},
            json={"rawText": "Dummy content", "targetPosition": "Software Engineer"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("does not contain an authoritative email address", response.json().get("detail", ""))

    # C-2: Error responses must NOT leak internal exception details
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    @patch("main.normalize_career_input", side_effect=RuntimeError("Internal API key: sk-12345"))
    def test_normalize_error_does_not_leak_internal_details(self, mock_normalize, mock_auth):
        with self.assertLogs("airis", level="ERROR") as captured:
            response = client.post(
                "/normalize",
                headers={"Authorization": "Bearer token-studentA"},
                json={"type": "job", "input": "Software Engineer"}
            )
        self.assertEqual(response.status_code, 500)
        detail = response.json().get("detail", "")
        self.assertNotIn("sk-12345", detail)
        self.assertNotIn("Internal API key", detail)
        self.assertIn("internal error", detail.lower())
        log_text = "\n".join(captured.output)
        self.assertIn("Endpoint: /normalize, Status: 500, Exception: RuntimeError", log_text)
        self.assertNotIn("sk-12345", log_text)
        self.assertNotIn("Internal API key", log_text)
        self.assertNotIn("Traceback", log_text)

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    @patch("interview_engine.generate_first_question", side_effect=RuntimeError("Provider API URL: https://api.example.com/v1"))
    def test_interview_start_error_does_not_leak_internal_details(self, mock_generate, mock_auth):
        response = client.post(
            "/interview/start",
            headers={"Authorization": "Bearer token-studentA"},
            json={"targetRole": "Software Engineer"}
        )
        self.assertEqual(response.status_code, 500)
        detail = response.json().get("detail", "")
        self.assertNotIn("https://api.example.com", detail)
        self.assertNotIn("Provider API URL", detail)
        self.assertIn("internal error", detail.lower())

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    @patch("interview_sessions.answer", side_effect=RuntimeError("Database connection: postgres://internal"))
    def test_interview_answer_error_does_not_leak_internal_details(self, mock_evaluate, mock_auth):
        response = client.post(
            "/interview/answer",
            headers={"Authorization": "Bearer token-studentA"},
            json={"sessionId": "a" * 32, "questionId": "survey-1", "turn": 0,
                  "currentAnswer": "I am a software engineer"}
        )
        self.assertEqual(response.status_code, 500)
        detail = response.json().get("detail", "")
        self.assertNotIn("postgres://internal", detail)
        self.assertNotIn("Database connection", detail)
        self.assertIn("internal error", detail.lower())

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_report_rejects_legacy_client_scores_and_claimed_identity(self, mock_auth):
        # The old success fixture demonstrated the vulnerability: a mocked report function
        # accepted nine fabricated client answers. Actual session persistence/retry coverage
        # now runs against Firestore transactions in test_interview_sessions_emulator.py.
        payloads = [
            {"history": [{"answer": "fabricated"}] * 9, "evaluations": [{"overall": 100}] * 9},
            {"userId": "studentB"},
            {"overallScore": 100},
            {"history": [{"answer": "incomplete"}] * 5},
        ]
        for payload in payloads:
            with self.subTest(payload_keys=list(payload)):
                response = client.post("/interview/report", headers={"Authorization": "Bearer token-studentA"},
                                       json={"sessionId": "a" * 32, **payload})
                self.assertEqual(response.status_code, 422)

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    @patch("interview_sessions.report", side_effect=RuntimeError("Firestore connection: internal-secret"))
    def test_interview_report_persistence_error_is_safe_failure(self, mock_report, mock_auth):
        response = client.post("/interview/report", headers={"Authorization": "Bearer token-studentA"},
                               json={"sessionId": "a" * 32})
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("internal-secret", response.text)
        self.assertIn("internal error", response.json()["detail"].lower())


if __name__ == "__main__":
    unittest.main()
