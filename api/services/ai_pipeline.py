"""
AI Pipeline using Gemini API (single provider).
All functions check settings.demo_mode first and return cached responses.
"""
import json
import hashlib
import base64
import asyncio
from pathlib import Path
import numpy as np
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import settings

DEMO_ANALYSIS_TEMPLATES = {
    "pothole": {
        "transcript_en": "There is a large pothole on the main road near KR Market. It has been there for weeks and is causing accidents.",
        "original_language": "hi",
        "category": "pothole",
        "sub_category": "road_damage",
        "sentiment": "negative",
        "urgency": 4,
        "root_cause_tag": "Road surface deterioration near KR Market",
        "location_mention": "KR Market main road",
        "vulnerable_group_flag": False,
        "sensitive_flag": False,
        "confidence": 0.92,
    },
    "water": {
        "transcript_en": "Water supply has been cut for 3 days in our area. We have no water for cooking or drinking. Please send a tanker.",
        "original_language": "ta",
        "category": "water",
        "sub_category": "supply_disruption",
        "sentiment": "negative",
        "urgency": 5,
        "root_cause_tag": "Water supply disruption - Jayanagar zone",
        "location_mention": "Jayanagar 4th block",
        "vulnerable_group_flag": True,
        "sensitive_flag": False,
        "confidence": 0.95,
    },
    "garbage": {
        "transcript_en": "There is a huge garbage pile near the school. It smells very bad and children are getting sick. Nobody has collected it for 10 days.",
        "original_language": "hi",
        "category": "garbage",
        "sub_category": "uncollected_waste",
        "sentiment": "negative",
        "urgency": 4,
        "root_cause_tag": "Garbage collection failure near school",
        "location_mention": "Near government school",
        "vulnerable_group_flag": True,
        "sensitive_flag": False,
        "confidence": 0.91,
    },
    "streetlight": {
        "transcript_en": "The streetlight near the junction has been broken for a week. Last night there was a road accident because of darkness. Very dangerous.",
        "original_language": "en",
        "category": "streetlight",
        "sub_category": "light_outage",
        "sentiment": "negative",
        "urgency": 4,
        "root_cause_tag": "Streetlight failure causing safety hazard",
        "location_mention": "Junction near bus stop",
        "vulnerable_group_flag": False,
        "sensitive_flag": False,
        "confidence": 0.88,
    },
    "drain": {
        "transcript_en": "The drain is completely blocked and water is overflowing onto the road. The whole street is flooded and we cannot walk.",
        "original_language": "ta",
        "category": "drain",
        "sub_category": "drain_overflow",
        "sentiment": "negative",
        "urgency": 5,
        "root_cause_tag": "Storm drain blockage causing flooding",
        "location_mention": "Main drain near junction",
        "vulnerable_group_flag": False,
        "sensitive_flag": False,
        "confidence": 0.90,
    },
    "animal": {
        "transcript_en": "There are many stray dogs attacking people in our area. Three children were bitten last week. Please take action urgently.",
        "original_language": "mixed",
        "category": "animal",
        "sub_category": "stray_dog_menace",
        "sentiment": "negative",
        "urgency": 5,
        "root_cause_tag": "Stray dog menace - safety risk",
        "location_mention": "Residential area",
        "vulnerable_group_flag": True,
        "sensitive_flag": False,
        "confidence": 0.93,
    },
}

DEMO_VISION_CHECK = {
    "location_match": True,
    "defect_resolved": True,
    "confidence": 0.87,
    "reason": "Road surface appears repaired in after photo. Fresh asphalt patch visible at same location.",
}


def get_demo_embedding(text: str) -> np.ndarray:
    """Deterministic 768-d embedding seeded by text hash."""
    seed = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
    rng = np.random.RandomState(seed)
    vec = rng.randn(768).astype(np.float32)
    return vec / np.linalg.norm(vec)


def get_demo_analysis(text: str = "", category_hint: str = "") -> dict:
    for key in DEMO_ANALYSIS_TEMPLATES:
        if key in text.lower() or key == category_hint:
            return DEMO_ANALYSIS_TEMPLATES[key].copy()
    return DEMO_ANALYSIS_TEMPLATES["pothole"].copy()


async def transcribe_audio(audio_bytes: bytes, filename: str, language_hint: str = "auto") -> dict:
    if settings.demo_mode or not settings.gemini_api_key:
        return {
            "transcript_en": "Demo mode: There is a large pothole on the main road causing accidents.",
            "original_language": "hi",
            "confidence": 0.95,
        }
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    ext = Path(filename).suffix.lower()
    mime_map = {
        ".ogg": "audio/ogg",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".webm": "audio/webm",
        ".m4a": "audio/mp4",
    }
    mime_type = mime_map.get(ext, "audio/wav")
    audio_part = {"mime_type": mime_type, "data": base64.b64encode(audio_bytes).decode()}
    prompt = """Transcribe this audio. It may be in Hindi, Tamil, English, or code-mixed.
Return JSON: {"transcript_en": "<english translation>", "original_language": "<hi|ta|en|mixed>", "confidence": <0-1>}"""
    response = model.generate_content([prompt, audio_part])
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


async def analyze_text(transcript: str, location_mention: str = "") -> dict:
    if settings.demo_mode or not settings.gemini_api_key:
        return get_demo_analysis(transcript)
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    prompt = f"""Analyze this civic complaint from an Indian city.
Text: "{transcript}"

Return ONLY valid JSON matching this schema exactly:
{{
  "transcript_en": "english translation or original if already english",
  "original_language": "hi|ta|en|mixed",
  "category": "pothole|water|garbage|streetlight|drain|animal|noise|construction|other",
  "sub_category": "specific sub-issue",
  "sentiment": "negative|neutral|positive",
  "urgency": 1-5,
  "root_cause_tag": "brief root cause phrase",
  "location_mention": "location if mentioned or null",
  "vulnerable_group_flag": true/false,
  "sensitive_flag": true/false,
  "confidence": 0.0-1.0
}}"""
    response = model.generate_content(prompt)
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


async def get_embedding(text: str) -> np.ndarray:
    if settings.demo_mode or not settings.gemini_api_key:
        return get_demo_embedding(text)
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    result = genai.embed_content(
        model=settings.embedding_model,
        content=text,
        task_type="SEMANTIC_SIMILARITY",
    )
    return np.array(result["embedding"], dtype=np.float32)


async def check_before_after(
    before_urls: list,
    after_url: str,
    location: str = "",
    timestamp: str = "",
) -> dict:
    if settings.demo_mode or not settings.gemini_api_key:
        return DEMO_VISION_CHECK.copy()
    import google.generativeai as genai
    from PIL import Image
    import io
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    prompt = f"""Compare these before and after photos of a civic complaint resolution.
Location: {location}
Timestamp: {timestamp}
Analyze: 1) Do the photos show the same location? 2) Has the reported defect been resolved?
Return JSON: {{"location_match": bool, "defect_resolved": bool, "confidence": 0-1, "reason": "brief explanation"}}"""
    response = model.generate_content([prompt])
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())
