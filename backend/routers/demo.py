import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from models import Cluster, Feedback, Ticket, Resolution, PublicMetrics
from demo.seed_data import run_seed
from config import settings

router = APIRouter()


@router.post("/demo/seed")
async def seed_demo(db: Session = Depends(get_db)):
    counts = await run_seed(db)
    return {
        "message": "Demo data seeded successfully",
        "counts": counts,
    }


@router.post("/demo/simulate-reopen")
def simulate_reopen(db: Session = Depends(get_db)):
    # Find first open Resolution
    resolution = db.query(Resolution).filter(
        Resolution.reopened_bool == False
    ).first()
    if not resolution:
        raise HTTPException(status_code=404, detail="No open resolution found")

    # Add enough "no" votes to trigger reopen (need >25% and total >= 3)
    # Set yes=1, no=3 -> 75% rejection, well above threshold
    resolution.confirmations_yes = 1
    resolution.confirmations_no = 3

    # Trigger the reopen
    ticket = db.query(Ticket).filter(Ticket.id == resolution.ticket_id).first()
    if ticket:
        resolution.reopened_bool = True
        ticket.status = "Reopened"
        ticket.escalation_level = (ticket.escalation_level or 0) + 1
        cluster = db.query(Cluster).filter(Cluster.id == ticket.cluster_id).first()
        if cluster:
            cluster.status = "open"
        from datetime import datetime, timezone
        history = ticket.history_json or []
        history.append({
            "status": "Reopened",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Simulated reopen: 3/4 citizens rejected resolution",
        })
        ticket.history_json = history

    db.commit()

    return {
        "message": "Reopen simulated successfully",
        "resolution_id": resolution.id,
        "ticket_id": resolution.ticket_id,
        "confirmations_yes": resolution.confirmations_yes,
        "confirmations_no": resolution.confirmations_no,
    }
