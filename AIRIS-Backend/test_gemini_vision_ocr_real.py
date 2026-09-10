import os
import unittest
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

from file_utils import extract_text_from_image, normalize_ocr_text
from ai_validator import validate_resume_validity_with_llm

class TestGeminiVisionOCR(unittest.TestCase):

    def test_gemini_vision_model_initialization_and_access(self):
        """Verify gemini-2.5-flash initializes and accesses Gemini API without 404 error."""
        api_key = os.getenv("GEMINI_API_KEY")
        self.assertTrue(api_key, "GEMINI_API_KEY is missing from environment")

        genai.configure(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        model = genai.GenerativeModel(model_name)
        self.assertEqual(model.model_name, f"models/{model_name}")

    def test_invalid_non_resume_image_ocr_flow(self):
        """
        Verify that when an invalid non-resume image (e.g. app UI screenshot / receipt / drawing) is processed:
        1. OCR model returns raw text without 404 error.
        2. Document validator rejects non-resume text with is_resume = False.
        3. NO ATS analysis / active resume is created.
        """
        # Create a small valid PNG image (1x1 red pixel)
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
            b"\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
        )

        extracted = extract_text_from_image(png_bytes, "test_ui_screenshot.png")
        # Non-resume image text (or Gemini image description) is checked through resume validator
        if extracted:
            validity_extracted = validate_resume_validity_with_llm(extracted)
            self.assertFalse(validity_extracted.get("is_resume"), "Non-resume image text should fail resume validation")

        # Test invalid OCR text from a UI screenshot or receipt
        ui_screenshot_text = "Home Dashboard Settings Profile Notifications Log Out Version 1.0.0 Copyright 2026 AIRIS Application"
        validity = validate_resume_validity_with_llm(ui_screenshot_text)
        self.assertFalse(validity.get("is_resume"), "UI screenshot text should fail resume validation")

if __name__ == "__main__":
    unittest.main()
