import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import settings


def hash_citizen_id(raw_id: str) -> str:
    salted = f"{settings.citizen_hash_salt}:{raw_id}"
    digest = hashlib.sha256(salted.encode()).hexdigest()[:12]
    return f"CIT-{digest}"


PHONE_RE = re.compile(r'(\+91[\-\s]?)?[6-9]\d{9}')
EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
NAME_INTRO_RE = re.compile(
    r'\b(mera naam|my name is|naam hai|I am|main hoon)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)',
    re.IGNORECASE
)


def redact_transcript(text: str) -> str:
    if not text:
        return text
    text = PHONE_RE.sub('[PHONE REDACTED]', text)
    text = EMAIL_RE.sub('[EMAIL REDACTED]', text)
    text = NAME_INTRO_RE.sub(r'\1 [NAME REDACTED]', text)
    return text
