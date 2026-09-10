import fitz  # pymupdf
import docx
import pypandoc
import re
from typing import Union

def get_pdf_page_count(file_bytes: bytes) -> int:
    """Return the total number of pages in a PDF document using fitz."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return len(doc)
    except Exception:
        return 1

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract raw text from a PDF file using PyMuPDF (fitz) with safe fallback."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = []
        for page in doc:
            page_text = page.get_text()
            if page_text:
                text.append(page_text)
        result = "\n".join(text).strip()
        if result:
            return result
    except Exception as e:
        print("PyMuPDF PDF extraction failed:", e)

    try:
        raw = file_bytes.decode("latin-1", errors="ignore")
        cleaned = re.sub(r"[^\x20-\x7E\n\r\t]", " ", raw)
        lines = [line.strip() for line in cleaned.splitlines() if len(line.strip()) > 3]
        return "\n".join(lines)
    except Exception:
        return file_bytes.decode(errors="ignore")

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract raw text from a DOCX/DOC file using python-docx with safe fallback."""
    try:
        from io import BytesIO
        document = docx.Document(BytesIO(file_bytes))
        paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
        result = "\n".join(paragraphs).strip()
        if result:
            return result
    except Exception as e:
        print("DOCX extraction failed:", e)

    try:
        raw = file_bytes.decode("latin-1", errors="ignore")
        cleaned = re.sub(r"[^\x20-\x7E\n\r\t]", " ", raw)
        lines = [line.strip() for line in cleaned.splitlines() if len(line.strip()) > 3]
        return "\n".join(lines)
    except Exception:
        return file_bytes.decode(errors="ignore")

def extract_text_from_rtf(file_bytes: bytes) -> str:
    """Convert RTF to plain text using pypandoc, with regex fallback if conversion fails."""
    try:
        return pypandoc.convert_text(file_bytes.decode(errors="ignore"), "plain", format="rtf")
    except Exception:
        raw = file_bytes.decode(errors="ignore")
        raw = re.sub(r"\\(line|par)\b", "\n", raw)
        raw = re.sub(r"\\[a-z]{1,32}(-?\d{1,10})?[ \n]?", " ", raw)
        raw = re.sub(r"\{|\}", "", raw)
        raw = re.sub(r"[ \t]+", " ", raw)
        return "\n".join(line.strip() for line in raw.splitlines() if line.strip())

def extract_text_from_txt(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode("utf-8")
    except Exception:
        return file_bytes.decode("latin-1", errors="ignore")

def normalize_ocr_text(raw_text: str) -> str:
    """
    Universal text normalizer for text extracted from image OCR or documents.
    Removes common OCR and encoding artifacts (broken whitespace, hyphenated line wraps,
    inconsistent unicode dashes/bullets) without altering genuine resume content or programming tokens.
    """
    if not raw_text:
        return ""

    # Normalize line breaks and tabs
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # Normalize unicode quotes and dashes
    text = text.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    text = re.sub(r'[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]', '-', text)

    # Fix broken word wrapping across line breaks (e.g., "experi-\nence" -> "experience")
    text = re.sub(r'(\b[a-zA-Z]{2,})-\s*\n\s*([a-zA-Z]{2,}\b)', r'\1\2', text)

    # Replace multiple consecutive horizontal whitespace with a single space
    text = re.sub(r'[ \t]+', ' ', text)

    # Normalize common OCR confusion symbols at bullet starts
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        # Convert OCR pipe/symbol artifacts at start of line into bullets if they look like list items
        stripped = re.sub(r'^[|I▪•\-*·]\s+', '• ', stripped)
        lines.append(stripped)

    return "\n".join(lines).strip()

def extract_text_from_image(file_bytes: bytes, filename: str) -> str:
    """
    Extract raw text from supported image files (PNG, JPG, JPEG, WEBP, HEIC) via 3-tier OCR:
      Tier 1: Gemini Multimodal Vision OCR (gemini-3.6-flash)
      Tier 2: Groq Multimodal Vision OCR (qwen/qwen3.6-27b)
      Tier 3: Local Offline Tesseract OCR (pytesseract)
    """
    ext = filename.lower().split('.')[-1] if '.' in filename else "png"
    if ext == "jpg":
        ext = "jpeg"

    # 0. Try PyMuPDF vector/text extraction if image has embedded text streams
    try:
        doc = fitz.open(stream=file_bytes, filetype=ext)
        text_list = []
        for page in doc:
            page_text = page.get_text()
            if page_text:
                text_list.append(page_text)
        result = "\n".join(text_list).strip()
        if result and len(result) >= 30:
            print(f"[OCR Tier 0] PyMuPDF vector text extraction succeeded for {filename}")
            return normalize_ocr_text(result)
    except Exception as e:
        print(f"[OCR Tier 0] PyMuPDF image extraction skipped for {filename}: {e}")

    prompt = "Perform verbatim OCR text extraction on this resume image. Output all text, headers, skills, and experience exactly as written on the document. Do not summarize or add commentary."

    # Tier 1: Gemini Multimodal Vision OCR
    try:
        import os
        import concurrent.futures
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        if api_key:
            if hasattr(genai, "configure"):
                genai.configure(api_key=api_key)
            model = genai.GenerativeModel(gemini_model_name)
            mime = f"image/{ext}" if ext in ("png", "jpeg", "webp") else "image/png"

            def _do_gemini_vision():
                return model.generate_content([
                    prompt,
                    {"mime_type": mime, "data": file_bytes}
                ])

            from ai_service import _gemini_executor
            future = _gemini_executor.submit(_do_gemini_vision)
            response = future.result(timeout=10.0)
            ocr_text = response.text.strip() if response and response.text else ""
            if ocr_text and len(ocr_text) >= 10:
                print(f"[OCR Tier 1] Gemini Vision ({gemini_model_name}) succeeded for {filename}")
                return normalize_ocr_text(ocr_text)
    except Exception as ocr_err:
        print(f"[OCR Tier 1] Gemini Vision failed for {filename}: {ocr_err}")

    # Tier 2: Groq Multimodal Vision OCR
    try:
        import os
        import base64
        import requests
        import re
        groq_api_key = os.getenv("GROQ_API_KEY")
        groq_vision_model = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.6-27b")
        if groq_api_key:
            b64_data = base64.b64encode(file_bytes).decode("utf-8")
            mime = f"image/{ext}" if ext in ("png", "jpeg", "webp") else "image/png"
            payload = {
                "model": groq_vision_model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64_data}"}}
                        ]
                    }
                ],
                "temperature": 0.1
            }
            headers = {
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            }
            res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=20.0)
            if res.status_code == 200:
                res_data = res.json()
                raw_groq_text = res_data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                cleaned_groq_text = re.sub(r'<think>[\s\S]*?</think>', '', raw_groq_text).strip()
                if cleaned_groq_text and len(cleaned_groq_text) >= 10:
                    print(f"[OCR Tier 2] Groq Vision ({groq_vision_model}) succeeded for {filename}")
                    return normalize_ocr_text(cleaned_groq_text)
            else:
                print(f"[OCR Tier 2] Groq Vision HTTP {res.status_code} failed for {filename}")
    except Exception as groq_err:
        print(f"[OCR Tier 2] Groq Vision failed for {filename}: {groq_err}")

    # Tier 3: Local Offline Tesseract OCR
    try:
        import io
        import pytesseract
        from PIL import Image
        img = Image.open(io.BytesIO(file_bytes))
        tesseract_text = pytesseract.image_to_string(img).strip()
        if tesseract_text and len(tesseract_text) >= 10:
            print(f"[OCR Tier 3] Local Tesseract OCR succeeded for {filename}")
            return normalize_ocr_text(tesseract_text)
    except Exception as tess_err:
        print(f"[OCR Tier 3] Local Tesseract OCR failed for {filename}: {tess_err}")

    return ""

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Dispatch to the appropriate extractor based on file extension and apply universal normalization."""
    ext = filename.lower().split('.')[-1] if '.' in filename else ""
    raw = ""
    if ext == "pdf":
        raw = extract_text_from_pdf(file_bytes)
    elif ext in ("doc", "docx"):
        raw = extract_text_from_docx(file_bytes)
    elif ext == "rtf":
        raw = extract_text_from_rtf(file_bytes)
    elif ext in ("txt", "md", "text", "json", "csv"):
        raw = extract_text_from_txt(file_bytes)
    elif ext in ("png", "jpg", "jpeg", "webp", "heic"):
        raw = extract_text_from_image(file_bytes, filename)
    else:
        # Strict rejection for non-supported file formats (PPT, PPTX, XLS, ZIP, EXE, etc.)
        raise ValueError(f"Unsupported file format '.{ext}'. Supported formats are PDF, DOCX, DOC, RTF, TXT, and Image (PNG, JPG, JPEG, WEBP, HEIC).")

    return normalize_ocr_text(raw)
