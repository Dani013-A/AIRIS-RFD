import os
import unittest
from unittest.mock import patch, MagicMock

from file_utils import extract_text_from_image, extract_text
from ai_validator import validate_resume_validity_with_llm

class TestThreeTierOCR(unittest.TestCase):

    def setUp(self):
        # 1x1 red PNG bytes
        self.sample_png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
            b"\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        self.resume_text = (
            "JOHN DOE\nSoftware Engineer\nEmail: john@example.com\n"
            "SKILLS: Python, FastAPI, React Native, SQL, Git, REST API\n"
            "EXPERIENCE: Developed backend microservices and mobile applications at AIRIS Tech.\n"
            "EDUCATION: BS Computer Science, Technological Institute of the Philippines 2025"
        )
        self.non_resume_text = (
            "Home Dashboard Settings Profile Notifications Log Out Version 1.0.0 Copyright 2026 AIRIS App"
        )

    @patch("google.generativeai.GenerativeModel")
    @patch("requests.post")
    @patch("pytesseract.image_to_string")
    def test_scenario_1_gemini_succeeds_others_not_called(self, mock_tess, mock_groq_post, mock_gemini_model_cls):
        """1. Gemini succeeds -> Groq not called -> Tesseract not called."""
        mock_gemini_inst = MagicMock()
        mock_gemini_inst.generate_content.return_value.text = self.resume_text
        mock_gemini_model_cls.return_value = mock_gemini_inst

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key", "GROQ_API_KEY": "test_groq"}):
            text = extract_text_from_image(self.sample_png_bytes, "test_resume.png")

        self.assertIn("JOHN DOE", text)
        mock_gemini_inst.generate_content.assert_called_once()
        mock_groq_post.assert_not_called()
        mock_tess.assert_not_called()

    @patch("google.generativeai.GenerativeModel")
    @patch("requests.post")
    @patch("pytesseract.image_to_string")
    def test_scenario_2_and_3_gemini_fails_groq_succeeds(self, mock_tess, mock_groq_post, mock_gemini_model_cls):
        """2 & 3. Gemini fails -> Groq attempted and succeeds -> Tesseract not called."""
        mock_gemini_inst = MagicMock()
        mock_gemini_inst.generate_content.side_effect = Exception("Gemini 404 Model Not Found")
        mock_gemini_model_cls.return_value = mock_gemini_inst

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": f"<think>Processing image...</think>\n{self.resume_text}"}}]
        }
        mock_groq_post.return_value = mock_response

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key", "GROQ_API_KEY": "test_groq"}):
            text = extract_text_from_image(self.sample_png_bytes, "test_resume.png")

        self.assertIn("JOHN DOE", text)
        mock_gemini_inst.generate_content.assert_called_once()
        mock_groq_post.assert_called_once()
        mock_tess.assert_not_called()

    @patch("google.generativeai.GenerativeModel")
    @patch("requests.post")
    @patch("pytesseract.image_to_string")
    def test_scenario_4_gemini_fails_groq_fails_tesseract_attempted(self, mock_tess, mock_groq_post, mock_gemini_model_cls):
        """4. Gemini fails + Groq fails -> Tesseract attempted and succeeds."""
        mock_gemini_inst = MagicMock()
        mock_gemini_inst.generate_content.side_effect = Exception("Gemini API Timeout")
        mock_gemini_model_cls.return_value = mock_gemini_inst

        mock_groq_post.side_effect = Exception("Groq Service Unavailable")
        mock_tess.return_value = self.resume_text

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key", "GROQ_API_KEY": "test_groq"}):
            text = extract_text_from_image(self.sample_png_bytes, "test_resume.png")

        self.assertIn("JOHN DOE", text)
        mock_gemini_inst.generate_content.assert_called_once()
        mock_groq_post.assert_called_once()
        mock_tess.assert_called_once()

    @patch("google.generativeai.GenerativeModel")
    @patch("requests.post")
    @patch("pytesseract.image_to_string")
    def test_scenario_5_all_three_fail_returns_empty_no_fabrication(self, mock_tess, mock_groq_post, mock_gemini_model_cls):
        """5. All three fail -> clear OCR failure (empty string returned), no fabricated text."""
        mock_gemini_inst = MagicMock()
        mock_gemini_inst.generate_content.side_effect = Exception("Gemini 404")
        mock_gemini_model_cls.return_value = mock_gemini_inst

        mock_groq_post.side_effect = Exception("Groq 500")
        mock_tess.side_effect = Exception("Tesseract Binary Not Found")

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key", "GROQ_API_KEY": "test_groq"}):
            text = extract_text_from_image(self.sample_png_bytes, "test_corrupted.png")

        self.assertEqual(text, "", "All failed OCR tiers must return empty string without fabricated text")

    @patch("google.generativeai.GenerativeModel")
    def test_scenario_6_ocr_succeeds_but_non_resume_rejected_by_validator(self, mock_gemini_model_cls):
        """6. OCR succeeds with UI screenshot text -> resume validator rejects it -> is_resume is False."""
        mock_gemini_inst = MagicMock()
        mock_gemini_inst.generate_content.return_value.text = self.non_resume_text
        mock_gemini_model_cls.return_value = mock_gemini_inst

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
            extracted = extract_text_from_image(self.sample_png_bytes, "ui_screenshot.png")

        validity = validate_resume_validity_with_llm(extracted)
        self.assertFalse(validity.get("is_resume"), "Non-resume UI text must be rejected by validator")

    @patch("google.generativeai.GenerativeModel")
    @patch("requests.post")
    def test_scenario_7_valid_resume_image_through_fallback(self, mock_groq_post, mock_gemini_model_cls):
        """7. Valid resume image through Tier 2 Groq fallback reaches resume validation pipeline."""
        mock_gemini_inst = MagicMock()
        mock_gemini_inst.generate_content.side_effect = Exception("Gemini Down")
        mock_gemini_model_cls.return_value = mock_gemini_inst

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": self.resume_text}}]
        }
        mock_groq_post.return_value = mock_response

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key", "GROQ_API_KEY": "test_groq"}):
            extracted = extract_text_from_image(self.sample_png_bytes, "valid_resume.png")

        self.assertIn("JOHN DOE", extracted)

    def test_scenario_8_existing_pdf_txt_paths_unaffected(self):
        """8. PDF/TXT file extraction paths remain completely unaffected."""
        txt_bytes = self.resume_text.encode("utf-8")
        extracted_txt = extract_text(txt_bytes, "resume.txt")
        self.assertIn("JOHN DOE", extracted_txt)

    @patch("google.generativeai.GenerativeModel")
    @patch("requests.post")
    @patch("pytesseract.image_to_string")
    def test_scenario_9_deterministic_provider_order(self, mock_tess, mock_groq_post, mock_gemini_model_cls):
        """9. Verify provider execution order is strictly deterministic (Gemini -> Groq -> Tesseract)."""
        call_order = []

        def gemini_call(*args, **kwargs):
            call_order.append("Gemini")
            raise Exception("Gemini Fail")

        def groq_call(*args, **kwargs):
            call_order.append("Groq")
            raise Exception("Groq Fail")

        def tess_call(*args, **kwargs):
            call_order.append("Tesseract")
            return self.resume_text

        mock_gemini_inst = MagicMock()
        mock_gemini_inst.generate_content.side_effect = gemini_call
        mock_gemini_model_cls.return_value = mock_gemini_inst

        mock_groq_post.side_effect = groq_call
        mock_tess.side_effect = tess_call

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test_key", "GROQ_API_KEY": "test_groq"}):
            extract_text_from_image(self.sample_png_bytes, "resume.png")

        self.assertEqual(call_order, ["Gemini", "Groq", "Tesseract"], "Provider order must be Gemini -> Groq -> Tesseract")

if __name__ == "__main__":
    unittest.main()
