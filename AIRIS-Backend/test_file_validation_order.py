import unittest
import io
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app
from file_utils import normalize_ocr_text, extract_text_from_image, extract_text

client = TestClient(app)

def mock_verify_id_token(token, *args, **kwargs):
    if token.startswith("token-"):
        uid = token.replace("token-", "")
        return {"uid": uid, "email": f"{uid}@tip.edu.ph", "email_verified": True}
    raise Exception("Invalid token")

class TestFileValidationOrder(unittest.TestCase):
    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_unsupported_file_types_rejected_at_step_one(self, mock_auth):
        """
        Invariant: Unsupported file formats (.ppt, .pptx, .xls, .xlsx, .exe, .zip) MUST be
        rejected immediately at step 1 file-type validation BEFORE reaching identity or OCR analysis.
        """
        unsupported_files = [
            ("presentation.ppt", "application/vnd.ms-powerpoint"),
            ("deck.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            ("data.xls", "application/vnd.ms-excel"),
            ("sheets.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            ("installer.exe", "application/octet-stream"),
            ("archive.zip", "application/zip"),
        ]

        for i, (filename, mime) in enumerate(unsupported_files):
            dummy_bytes = b"\x00\x01\x02\x03\x04\x05FakeBinaryData"
            response = client.post(
                "/upload",
                headers={"Authorization": f"Bearer token-student{i}"},
                files={"file": (filename, io.BytesIO(dummy_bytes), mime)},
                data={"targetPosition": "Software Engineer", "accountName": "Juan Dela Cruz"}
            )
            self.assertEqual(response.status_code, 400, f"Failed for {filename}")
            detail = response.json()["detail"]
            self.assertIn("Invalid file format", detail, f"Failed for {filename}")
            self.assertNotIn("different individual", detail, f"Failed for {filename}")

    @patch("firebase_admin.auth.verify_id_token", side_effect=mock_verify_id_token)
    def test_corrupt_unreadable_file_rejection(self, mock_auth):
        """
        Verifies that a supported-looking text file with corrupted binary noise is rejected as unreadable,
        NEVER as a name/identity mismatch.
        """
        binary_corrupt_bytes = b"\x00\x00\x00\x00\x00\x00\x00\x00"
        response = client.post(
            "/upload",
            headers={"Authorization": "Bearer token-student123"},
            files={"file": ("corrupt.txt", io.BytesIO(binary_corrupt_bytes), "text/plain")},
            data={"targetPosition": "Software Engineer", "accountName": "Juan Dela Cruz"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["valid"])
        self.assertIn("Unable to extract readable text", data["message"])

    def test_ocr_normalization_artifacts(self):
        """
        Verifies that OCR text normalization cleans broken whitespace, hyphens, and bullet artifacts
        without altering genuine resume content.
        """
        raw_ocr = "Software Engi-\nneer\n• Python   |   Java   |   SQL   \n| Docker | AWS"
        normalized = normalize_ocr_text(raw_ocr)
        self.assertIn("Software Engineer", normalized)
        self.assertIn("Python | Java | SQL", normalized)
        self.assertGreater(len(normalized), 0)

    def test_extract_text_unsupported_extension_exception(self):
        """
        Verifies extract_text raises ValueError on unsupported extensions instead of fallthrough latin-1.
        """
        with self.assertRaises(ValueError) as cm:
            extract_text(b"some content", "file.pptx")
        self.assertIn("Unsupported file format '.pptx'", str(cm.exception))

if __name__ == "__main__":
    unittest.main()
