"""
Telegram Bot stub for Citizen FTA.
In a real deployment, set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_URL in .env.
Run: python telegram_bot.py
"""
import asyncio, logging
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MOCK_FLOW = [
    "Welcome to Citizen FTA Bot! 🏛️",
    "Please send your complaint as a voice note, photo, or text.",
    "I received your complaint! Processing with AI... 🤖",
    "✅ Transcript: 'Large pothole on main road near KR Market.'",
    "📊 Analysis: Category: Road/Pothole | Urgency: 4/5 | Cluster: #3 (8 similar complaints)",
    "🎫 Ticket #PWD-2024-0847 created and assigned to BBMP Roads (Officer: Ravi Kumar)",
    "📍 You will be notified when the issue is resolved.",
]

async def mock_demo_flow():
    logger.info("Running mock Telegram bot demo flow...")
    for msg in MOCK_FLOW:
        logger.info(f"BOT: {msg}")
        await asyncio.sleep(1)
    logger.info("Demo flow complete. In production, configure TELEGRAM_BOT_TOKEN.")

try:
    from telegram_bot_config import TELEGRAM_BOT_TOKEN
    logger.info("Token found. Connecting to Telegram...")
except:
    logger.info("No TELEGRAM_BOT_TOKEN set. Running mock demo flow instead.")
    asyncio.run(mock_demo_flow())

