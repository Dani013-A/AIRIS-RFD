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

def extract_text(file_bytes: bytes, filename: str) -> str:
    """Dispatch to the appropriate extractor based on file extension."""
    ext = filename.lower().split('.')[-1] if '.' in filename else ""
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    if ext in ("doc", "docx"):
        return extract_text_from_docx(file_bytes)
    if ext == "rtf":
        return extract_text_from_rtf(file_bytes)
    if ext in ("txt", "md", "text", "json", "csv"):
        return extract_text_from_txt(file_bytes)

    try:
        return file_bytes.decode("utf-8")
    except Exception:
        return file_bytes.decode("latin-1", errors="ignore")
