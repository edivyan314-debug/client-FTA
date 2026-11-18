import uuid
from pathlib import Path
import aiofiles
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import settings


async def save_upload(filename: str, content: bytes) -> str:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(filename).suffix or ".bin"
    new_name = f"{uuid.uuid4().hex}{ext}"
    path = upload_dir / new_name
    async with aiofiles.open(path, "wb") as f:
        await f.write(content)
    return str(path)


def get_upload_url(filepath: str) -> str:
    return f"/uploads/{Path(filepath).name}"
