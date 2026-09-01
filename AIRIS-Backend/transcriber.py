import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

def calculate_audio_pause_metrics(segments: list) -> dict:
    """
    Computes authoritative pause and silence metrics from audio segment timestamps.
    Only silence BETWEEN active spoken segments is counted.
    Pre-speech silence and post-speech recording delay are strictly excluded.
    Rule: 1.00 second of silence = 1.00 pausePeriodEquivalent.
    """
    if not segments or len(segments) <= 1:
        return {
            "totalPauseDuration": 0.0,
            "pauseCount": 0,
            "pausePeriodEquivalent": 0.0,
            "longestPause": 0.0,
            "averagePauseDuration": 0.0,
        }

    valid_segments = []
    for seg in segments:
        if isinstance(seg, dict) and "start" in seg and "end" in seg:
            try:
                start = float(seg["start"])
                end = float(seg["end"])
                if end > start:
                    valid_segments.append({"start": start, "end": end})
            except (ValueError, TypeError):
                continue

    valid_segments.sort(key=lambda x: x["start"])

    if len(valid_segments) <= 1:
        return {
            "totalPauseDuration": 0.0,
            "pauseCount": 0,
            "pausePeriodEquivalent": 0.0,
            "longestPause": 0.0,
            "averagePauseDuration": 0.0,
        }

    pause_durations = []
    prev_end = valid_segments[0]["end"]

    for seg in valid_segments[1:]:
        curr_start = seg["start"]
        curr_end = seg["end"]

        if curr_start > prev_end:
            gap = curr_start - prev_end
            if gap >= 0.25:
                pause_durations.append(round(gap, 2))
            prev_end = max(prev_end, curr_end)
        else:
            prev_end = max(prev_end, curr_end)

    if not pause_durations:
        return {
            "totalPauseDuration": 0.0,
            "pauseCount": 0,
            "pausePeriodEquivalent": 0.0,
            "longestPause": 0.0,
            "averagePauseDuration": 0.0,
        }

    total_pause = round(sum(pause_durations), 2)
    pause_count = len(pause_durations)
    longest_pause = round(max(pause_durations), 2)
    avg_pause = round(total_pause / pause_count, 2) if pause_count > 0 else 0.0

    return {
        "totalPauseDuration": total_pause,
        "pauseCount": pause_count,
        "pausePeriodEquivalent": total_pause,
        "longestPause": longest_pause,
        "averagePauseDuration": avg_pause,
    }


def call_groq_whisper(file_bytes: bytes, mime_type: str) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    ext = ".m4a" if "m4a" in mime_type else ".webm"
    files = {
        "file": (f"audio{ext}", file_bytes, mime_type)
    }
    data = {
        "model": "whisper-large-v3-turbo",
        "response_format": "verbose_json",
        "prompt": "Umm, let me think like, hmm... okay, here's what I'm, like, thinking. Uh, yeah."
    }

    res = requests.post(url, headers=headers, files=files, data=data, timeout=15)
    res.raise_for_status()
    json_data = res.json()
    text = json_data.get("text", "").strip()
    segments = json_data.get("segments", [])
    pause_metrics = calculate_audio_pause_metrics(segments)

    return {
        "text": text,
        "pauseMetrics": pause_metrics
    }


def call_gemini_audio(file_bytes: bytes, mime_type: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = (
        "Please accurately transcribe the following spoken audio. Output strictly the text transcription with no extra conversational text. "
        "IMPORTANT: Transcribe EVERYTHING exactly as spoken. Do not clean up the text. Include all filler words (umm, uh, hm, like), "
        "stuttering, mispronunciations, and repeated words. Keep it absolutely verbatim."
    )

    response = model.generate_content([
        prompt,
        {"mime_type": mime_type, "data": file_bytes}
    ])
    text = response.text.strip()
    default_metrics = calculate_audio_pause_metrics([])

    return {
        "text": text,
        "pauseMetrics": default_metrics
    }


def transcribe_audio(file_bytes: bytes, mime_type: str) -> dict:
    errors = []

    has_groq = bool(os.getenv("GROQ_API_KEY"))
    if has_groq:
        try:
            print("Executing transcriber: Groq Whisper ...")
            return call_groq_whisper(file_bytes, mime_type)
        except Exception as e:
            print("Groq Whisper error:", e)
            errors.append(str(e))

    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    if has_gemini:
        try:
            print("Executing transcriber: Gemini Fallback ...")
            return call_gemini_audio(file_bytes, mime_type)
        except Exception as e:
            print("Gemini Audio error:", e)
            errors.append(str(e))

    raise RuntimeError(f"All transcription providers failed: {'; '.join(errors)}")

