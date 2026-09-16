import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

import rate_limiter
from rate_limiter import (
    _reset_limiter_state_for_testing,
    ExpensiveConcurrencyGuard,
    check_rate_limit,
    resolve_request_identity,
)
import main
from main import app

client = TestClient(app)

def mock_verify_id_token(token, *args, **kwargs):
    if token.startswith("token-"):
        uid = token.replace("token-", "")
        return {"uid": uid, "email": f"{uid}@tip.edu.ph", "email_verified": True}
    raise Exception("Invalid token")


class TestProductionHardeningRateLimiting(unittest.TestCase):

    def setUp(self):
        _reset_limiter_state_for_testing()

    def tearDown(self):
        _reset_limiter_state_for_testing()

    # Test A: Same UID concurrent expensive requests -> first allowed, second receives 429
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_A_same_uid_concurrent_expensive_requests(self, mock_auth):
        with ExpensiveConcurrencyGuard("uid:studentA"):
            # Second attempt while lock active for same UID
            with self.assertRaises(rate_limiter.HTTPException) as ctx:
                with ExpensiveConcurrencyGuard("uid:studentA"):
                    pass
            self.assertEqual(ctx.exception.status_code, 429)
            self.assertIn("retryAfterSeconds", str(ctx.exception.detail))

    # Test B: Different UIDs -> both can proceed independently
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_B_different_uids_concurrency(self, mock_auth):
        with ExpensiveConcurrencyGuard("uid:studentA"):
            # Different UID studentB should enter cleanly
            with ExpensiveConcurrencyGuard("uid:studentB"):
                self.assertTrue(True)

    # Test C: Shared campus IP -> different authenticated UIDs are not collectively throttled
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_C_shared_campus_ip_independent_quotas(self, mock_auth):
        # Exhaust rate limit for studentA on campus IP
        for _ in range(rate_limiter.PER_USER_EXPENSIVE_REQUEST_LIMIT):
            check_rate_limit("uid", "studentA", rate_limiter.PER_USER_EXPENSIVE_REQUEST_LIMIT, window_seconds=60)

        # Student A should now be throttled
        with self.assertRaises(rate_limiter.HTTPException) as ctx:
            check_rate_limit("uid", "studentA", rate_limiter.PER_USER_EXPENSIVE_REQUEST_LIMIT, window_seconds=60)
        self.assertEqual(ctx.exception.status_code, 429)

        # Student B sharing the same IP should NOT be throttled
        try:
            check_rate_limit("uid", "studentB", rate_limiter.PER_USER_EXPENSIVE_REQUEST_LIMIT, window_seconds=60)
        except rate_limiter.HTTPException:
            self.fail("Student B was throttled by Student A's usage on shared IP!")

    # Test D: Rate-limit exhaustion -> request eventually returns 429
    def test_D_rate_limit_exhaustion(self):
        for i in range(rate_limiter.PER_IP_PUBLIC_REQUEST_LIMIT):
            check_rate_limit("ip", "1.2.3.4", rate_limiter.PER_IP_PUBLIC_REQUEST_LIMIT, window_seconds=60)

        with self.assertRaises(rate_limiter.HTTPException) as ctx:
            check_rate_limit("ip", "1.2.3.4", rate_limiter.PER_IP_PUBLIC_REQUEST_LIMIT, window_seconds=60)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("Retry-After", ctx.exception.headers)

    # Test E: Lock cleanup after successful request -> user can make another request afterward
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_E_lock_cleanup_after_success(self, mock_auth):
        with ExpensiveConcurrencyGuard("uid:studentA"):
            pass  # Normal clean return

        # Second request after guard block exits should succeed without 429
        with ExpensiveConcurrencyGuard("uid:studentA"):
            self.assertTrue(True)

    # Test F: Lock cleanup after failed request/exception -> user is not permanently blocked
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_F_lock_cleanup_after_exception(self, mock_auth):
        try:
            with ExpensiveConcurrencyGuard("uid:studentA"):
                raise ValueError("Simulated unexpected business logic error inside route")
        except ValueError:
            pass

        # User must NOT be permanently locked out
        with ExpensiveConcurrencyGuard("uid:studentA"):
            self.assertTrue(True)

    # Test G: Global expensive-operation ceiling -> requests beyond global limit rejected
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_G_global_expensive_ceiling(self, mock_auth):
        guards = []
        try:
            # Fill up to ceiling limit
            for i in range(rate_limiter.GLOBAL_EXPENSIVE_CONCURRENCY_LIMIT):
                g = ExpensiveConcurrencyGuard(f"uid:user_{i}")
                g.__enter__()
                guards.append(g)

            # Extra request exceeding global ceiling should receive 429
            with self.assertRaises(rate_limiter.HTTPException) as ctx:
                with ExpensiveConcurrencyGuard("uid:extra_user"):
                    pass
            self.assertEqual(ctx.exception.status_code, 429)
            self.assertIn("Server peak capacity reached", str(ctx.exception.detail))
        finally:
            for g in guards:
                g.__exit__(None, None, None)

    # Test H: Legitimate normal request -> remains unaffected
    def test_H_legitimate_normal_request(self):
        res = client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "running")

    # Test I: Existing authentication behavior remains intact
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    @patch.dict("os.environ", {"ADMIN_UIDS": "admin_uid_123"})
    def test_I_existing_admin_auth_behavior(self, mock_auth):
        # Invalid admin token -> 403
        res = client.post("/admin/refresh-trends", headers={"Authorization": "Bearer token-wrong_uid"})
        self.assertEqual(res.status_code, 403)

        # Missing token -> 401
        res = client.post("/admin/refresh-trends")
        self.assertEqual(res.status_code, 401)


class TestFastAPIHTTPIntegration(unittest.TestCase):
    """
    HTTP Integration test verifying full FastAPI request pipeline:
    HTTP request -> identity resolution -> rate limiting -> concurrency guard -> route response / 429 formatting
    """
    def setUp(self):
        _reset_limiter_state_for_testing()

    def tearDown(self):
        _reset_limiter_state_for_testing()

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    @patch("main.validate_resume_validity_with_llm", return_value={"is_resume": True})
    @patch("main.evaluate_semantic_alignment", return_value={"score": 85})
    @patch("main.validate_and_enhance_analysis", return_value={
        "atsScore": {"overallScore": 85},
        "suggestions": [],
        "detectedSections": [],
        "missingSections": [],
        "recommendations": [],
        "learningSnapshot": None,
        "analyzedAt": "2026-09-08"
    })
    def test_http_concurrency_guard_and_429_pipeline(self, mock_enhance, mock_sbert, mock_llm_gate, mock_auth):
        payload = {
            "rawText": "John Doe Resume Software Engineer Python SQL React experience 5 years",
            "targetPosition": "Software Engineer",
            "parsedSections": {"Skills": "Python, SQL, React", "Experience": "Software Engineer for 5 years"}
        }

        # 1. Simulate an in-flight expensive operation active for studentA
        with ExpensiveConcurrencyGuard("uid:studentA"):
            # 2. Second concurrent HTTP POST to /analyze for studentA -> should return 429
            response_a = client.post(
                "/analyze",
                json=payload,
                headers={"Authorization": "Bearer token-studentA"}
            )
            self.assertEqual(response_a.status_code, 429)
            json_body = response_a.json()
            self.assertEqual(json_body.get("error"), "TOO_MANY_REQUESTS")
            self.assertIn("retryAfterSeconds", json_body)
            self.assertIn("Retry-After", response_a.headers)

            # 3. Independent concurrent HTTP POST to /analyze for studentB -> should succeed (200)
            response_b = client.post(
                "/analyze",
                json=payload,
                headers={"Authorization": "Bearer token-studentB"}
            )
            self.assertEqual(response_b.status_code, 200)
            self.assertTrue(response_b.json().get("valid"))

        # 4. After studentA's lock is released, studentA can submit a new request -> should succeed (200)
        response_a2 = client.post(
            "/analyze",
            json=payload,
            headers={"Authorization": "Bearer token-studentA"}
        )
        self.assertEqual(response_a2.status_code, 200)
        self.assertTrue(response_a2.json().get("valid"))


if __name__ == "__main__":
    unittest.main()

