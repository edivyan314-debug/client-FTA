from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import sys
import logging

sys.path.insert(0, str(Path(__file__).parent))
from config import settings
from database import create_tables, get_db, SessionLocal
from routers import ingest, clusters, tickets, citizen, demo, public

logger = logging.getLogger(__name__)

app = FastAPI(title="Citizen FTA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(ingest.router, prefix="", tags=["ingest"])
app.include_router(clusters.router, prefix="", tags=["clusters"])
app.include_router(tickets.router, prefix="", tags=["tickets"])
app.include_router(citizen.router, prefix="", tags=["citizen"])
app.include_router(demo.router, prefix="", tags=["demo"])
app.include_router(public.router, prefix="", tags=["public"])


async def _register_telegram_webhook():
    """Register Telegram webhook if token and public URL are configured."""
    if not settings.telegram_bot_token or not settings.public_base_url:
        logger.info("Telegram webhook not configured (missing token or PUBLIC_BASE_URL).")
        return
    import httpx
    webhook_url = f"{settings.public_base_url.rstrip('/')}/telegram/webhook"
    tg_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/setWebhook"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(tg_url, json={"url": webhook_url})
            data = resp.json()
            if data.get("ok"):
                logger.info(f"Telegram webhook registered: {webhook_url}")
            else:
                logger.warning(f"Telegram webhook registration failed: {data}")
    except Exception as e:
        logger.warning(f"Could not register Telegram webhook: {e}")


async def _auto_seed():
    """Seed demo data on boot if DEMO_SEED_ON_BOOT=true and DB is empty."""
    if not settings.demo_seed_on_boot:
        return
    from models import Feedback
    db = SessionLocal()
    try:
        count = db.query(Feedback).count()
        if count == 0:
            logger.info("DB is empty and DEMO_SEED_ON_BOOT=true — seeding demo data...")
            from demo.seed_data import run_seed
            import asyncio
            counts = await run_seed(db)
            logger.info(f"Demo seed complete: {counts}")
        else:
            logger.info(f"DB already has {count} feedback entries, skipping seed.")
    except Exception as e:
        logger.error(f"Auto-seed failed: {e}")
    finally:
        db.close()


@app.on_event("startup")
async def startup():
    create_tables()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    await _auto_seed()
    await _register_telegram_webhook()


@app.get("/health")
def health():
    return {"status": "ok", "demo_mode": settings.demo_mode}


@app.get("/")
def root():
    return {"message": "Citizen FTA API", "docs": "/docs", "demo_mode": settings.demo_mode}
