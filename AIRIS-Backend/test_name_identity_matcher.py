import unittest
import io
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app
from ai_validator import validate_resume_name_match, _parse_name_structure, _compare_name_structures

client = TestClient(app)

def mock_verify_id_token(token, *args, **kwargs):
    if token.startswith("token-"):
        uid = token.replace("token-", "")
        return {"uid": uid, "email": f"{uid}@tip.edu.ph", "email_verified": True}
    raise Exception("Invalid token")

class TestGeneralizedNameIdentityMatcher(unittest.TestCase):
    def setUp(self):
        # Isolate name verification from account-state storage and external providers.
        for target, kwargs in [
            ("main.assert_active_student", {}),
            ("main.validate_resume_validity_with_llm", {"return_value": {"is_resume": True}}),
            ("ai_service.generate_learning_snapshot", {"return_value": {}}),
        ]:
            mocked = patch(target, **kwargs)
            mocked.start()
            self.addCleanup(mocked.stop)

    # -------------------------------------------------------------
    # 1. SPECIFIC REGRESSION TEST (PROVING GENERALIZED FIX)
    # -------------------------------------------------------------
    def test_user_reported_regression_daniel_tan_espela(self):
        """
        User-reported regression test:
        Account: "Daniel Tan Espela"
        Resume:  "DANIEL AARON T. ESPELA"
        Must return MATCHED (is_valid=True), without any hardcoded rules.
        """
        res = validate_resume_name_match(
            account_name="Daniel Tan Espela",
            raw_text="DANIEL AARON T. ESPELA\nSoftware Engineer\nManila, Philippines"
        )
        self.assertTrue(res["is_valid"], f"Expected valid match, got: {res}")
        self.assertEqual(res["status"], "MATCHED")

    # -------------------------------------------------------------
    # 2. GENERALIZED VALID MATCH SCENARIOS
    # -------------------------------------------------------------
    def test_valid_match_1_abbreviated_account(self):
        res = validate_resume_name_match("Daniel Espela", "Daniel Aaron Espela\nSoftware Engineer")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_2_multiword_surname_abbreviated(self):
        res = validate_resume_name_match("Daniel Aaron Dela Cruz", "Daniel Dela Cruz\nFrontend Developer")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_3_maria_santos_expanded(self):
        res = validate_resume_name_match("Maria Santos", "Maria Anne Santos\nProject Manager")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_4_maria_anne_santos_abbreviated(self):
        res = validate_resume_name_match("Maria Anne Santos", "Maria Santos\nProject Manager")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_5_case_insensitivity(self):
        res = validate_resume_name_match("ALEXANDER HAMILTON", "alexander hamilton\nTreasury Secretary")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_6_middle_initial_vs_full_name(self):
        res = validate_resume_name_match("Benjamin F. Franklin", "Benjamin Benjamin Franklin\nDiplomat")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_7_punctuation_and_spacing(self):
        res = validate_resume_name_match("John-Paul Jones", "JOHN PAUL JONES\nNaval Commander")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_8_suffix_variation(self):
        res = validate_resume_name_match("Robert Downey Jr.", "Robert Downey\nActor & Producer")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_9_diacritic_normalization(self):
        res = validate_resume_name_match("José María Santos", "Jose Maria Santos\nArchitect")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_10_last_name_first_formatting(self):
        res = validate_resume_name_match("Daniel Aaron Espela", "Espela, Daniel Aaron\nSoftware Engineer")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_11_multiple_middle_initials(self):
        res = validate_resume_name_match("George R. R. Martin", "George Raymond Richard Martin\nAuthor")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    def test_valid_match_12_ocr_single_char_spacing_artifacts(self):
        res = validate_resume_name_match("Daniel Espela", "D A N I E L   E S P E L A\nSoftware Engineer")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "MATCHED")

    # -------------------------------------------------------------
    # 3. GENERALIZED INVALID MATCH / CONFLICT SCENARIOS
    # -------------------------------------------------------------
    def test_invalid_match_1_first_name_mismatch(self):
        res = validate_resume_name_match("John Smith", "Michael Smith\nSoftware Engineer")
        self.assertFalse(res["is_valid"])
        self.assertEqual(res["status"], "CONFLICT")

    def test_invalid_match_2_surname_mismatch(self):
        res = validate_resume_name_match("John Smith", "John Jones\nData Analyst")
        self.assertFalse(res["is_valid"])
        self.assertEqual(res["status"], "CONFLICT")

    def test_invalid_match_3_maria_santiago_conflict(self):
        res = validate_resume_name_match("Maria Santos", "Maria Santiago\nAccountant")
        self.assertFalse(res["is_valid"])
        self.assertEqual(res["status"], "CONFLICT")

    def test_invalid_match_4_smith_vs_smithson(self):
        res = validate_resume_name_match("John Smith", "John Smithson\nDevOps Engineer")
        self.assertFalse(res["is_valid"])
        self.assertEqual(res["status"], "CONFLICT")

    def test_invalid_match_5_cruz_vs_de_cruz(self):
        res = validate_resume_name_match("John Cruz", "John De Cruz\nSystems Administrator")
        self.assertFalse(res["is_valid"])
        self.assertEqual(res["status"], "CONFLICT")

    def test_invalid_match_6_sharing_only_first_name(self):
        res = validate_resume_name_match("John Adams", "John Baker\nArchitect")
        self.assertFalse(res["is_valid"])
        self.assertEqual(res["status"], "CONFLICT")

    def test_invalid_match_7_sharing_only_surname(self):
        res = validate_resume_name_match("Alice Smith", "Bob Smith\nConsultant")
        self.assertFalse(res["is_valid"])
        self.assertEqual(res["status"], "CONFLICT")

    def test_invalid_match_8_conflicting_single_middle_name(self):
        res = validate_resume_name_match("John Robert Smith", "John David Smith\nEngineer")
        self.assertFalse(res["is_valid"])
        self.assertEqual(res["status"], "CONFLICT")

    # -------------------------------------------------------------
    # 4. EDGE CASE & SAFE UNABLE_TO_VERIFY SCENARIOS
    # -------------------------------------------------------------
    def test_edge_case_empty_account_name(self):
        res = validate_resume_name_match("", "Daniel Espela\nSoftware Engineer")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "UNABLE_TO_VERIFY")

    def test_edge_case_empty_raw_text(self):
        res = validate_resume_name_match("Daniel Espela", "")
        self.assertTrue(res["is_valid"])
        self.assertEqual(res["status"], "UNABLE_TO_VERIFY")

    # -------------------------------------------------------------
    # 5. FASTAPI /upload ENDPOINT INTEGRATION TEST
    # -------------------------------------------------------------
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_upload_endpoint_accepts_valid_expanded_name(self, mock_auth):
        """
        Integration test verifying that POST /upload accepts the reported valid user name
        (Daniel Tan Espela vs DANIEL AARON T. ESPELA) and proceeds with analysis instead of 400.
        """
        resume_text = (
            "DANIEL AARON T. ESPELA\n"
            "Software Engineer\n"
            "daniel@example.com | +63 917 123 4567\n\n"
            "OBJECTIVE\n"
            "Seeking a position in software development.\n\n"
            "SKILLS\n"
            "Python, SQL, React, FastAPI, Node.js\n\n"
            "EDUCATION\n"
            "BS Computer Science, Technological Institute of the Philippines\n"
        )

        response = client.post(
            "/upload",
            headers={"Authorization": "Bearer token-student-daniel"},
            files={"file": ("resume.txt", io.BytesIO(resume_text.encode("utf-8")), "text/plain")},
            data={"targetPosition": "Software Engineer", "accountName": "Daniel Tan Espela"}
        )

        self.assertEqual(response.status_code, 200, f"Expected 200 OK, got: {response.text}")
        data = response.json()
        self.assertTrue(data.get("valid"), f"Expected valid upload response, got: {data}")
        self.assertIn("atsScore", data)

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_upload_endpoint_rejects_genuinely_conflicting_name(self, mock_auth):
        """
        Integration test verifying that POST /upload rejects a genuinely conflicting name
        (John Smith vs Michael Jones) with HTTP 400 Bad Request.
        """
        resume_text = (
            "Michael Jones\n"
            "Senior Accountant\n"
            "michael@example.com\n\n"
            "EXPERIENCE\n"
            "Financial Analyst at Deloitte\n"
        )

        response = client.post(
            "/upload",
            headers={"Authorization": "Bearer token-student-john"},
            files={"file": ("resume.txt", io.BytesIO(resume_text.encode("utf-8")), "text/plain")},
            data={"targetPosition": "Software Engineer", "accountName": "John Smith"}
        )

        self.assertEqual(response.status_code, 400)
        detail = response.json().get("detail", "")
        self.assertIn("different individual", detail)

if __name__ == "__main__":
    unittest.main()
