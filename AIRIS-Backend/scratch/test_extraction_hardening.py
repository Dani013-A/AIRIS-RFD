import os
import re
from dotenv import load_dotenv
load_dotenv('.env')

from file_utils import extract_text_from_pdf, normalize_ocr_text
from resume_parser import parse_resume
import pytesseract
from PIL import Image

# Read files
with open('/Users/danieltan/Desktop/Sample Resume/IT Resume.pdf', 'rb') as f:
    pdf_bytes = f.read()

with open('/Users/danieltan/Desktop/Sample Resume/IT Resume PIC.png', 'rb') as f:
    png_bytes = f.read()

# Force Tesseract for PNG to test offline fallback
import io
img = Image.open(io.BytesIO(png_bytes))
raw_png_text = pytesseract.image_to_string(img)
raw_pdf_text = extract_text_from_pdf(pdf_bytes)

print(f"Raw PDF length: {len(raw_pdf_text)}, Raw PNG length: {len(raw_png_text)}")
