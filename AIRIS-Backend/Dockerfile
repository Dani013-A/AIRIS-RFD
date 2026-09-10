# Use the official Python 3.10 slim image
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Install system dependencies required by pypandoc and local Tesseract OCR
# Clean up apt cache to keep the image small
RUN apt-get update && apt-get install -y \
    pandoc \
    tesseract-ocr \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies using CPU-only PyTorch index to prevent downloading CUDA dependencies (~2.5 GB saved)
# Using --no-cache-dir to keep the image small
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Copy the rest of the backend application code
COPY . .

# Hugging Face Spaces strictly requires exposing port 7860
EXPOSE 7860

# Start FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
