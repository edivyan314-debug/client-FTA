from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from models import Feedback, Cluster, Ticket, Resolution
from schemas import CitizenConfirm
from config import settings

router = APIRouter()


@router.post("/citizen/confirm")
def citizen_confirm(body: CitizenConfirm, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == body.feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    if not feedback.cluster_id:
        raise HTTPException(status_code=400, detail="Feedback not yet assigned to a cluster")

    cluster = db.query(Cluster).filter(Cluster.id == feedback.cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    # Find ticket for this cluster
    ticket = db.query(Ticket).filter(Ticket.cluster_id == cluster.id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Find resolution
    resolution = db.query(Resolution).filter(Resolution.ticket_id == ticket.id).first()
    if not resolution:
        raise HTTPException(status_code=404, detail="No resolution found for this ticket")

    # Update confirmation counts
    if body.confirmed:
        resolution.confirmations_yes = (resolution.confirmations_yes or 0) + 1
    else:
        resolution.confirmations_no = (resolution.confirmations_no or 0) + 1

    yes = resolution.confirmations_yes
    no = resolution.confirmations_no
    total = yes + no
    reopened = False

    # Check reopen rule
    if total >= 3:
        rejection_pct = no / total
        if rejection_pct > settings.reopen_rejection_pct and not resolution.reopened_bool:
            resolution.reopened_bool = True
            ticket.status = "Reopened"
            ticket.escalation_level = (ticket.escalation_level or 0) + 1
            cluster.status = "open"

            history = ticket.history_json or []
            history.append({
                "status": "Reopened",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "note": f"Reopened due to citizen rejection ({no}/{total} = {rejection_pct:.0%})",
            })
            ticket.history_json = history
            reopened = True

    db.commit()

    return {
        "status": "confirmed" if body.confirmed else "rejected",
        "reopened": reopened,
        "confirmations_yes": yes,
        "confirmations_no": no,
        "message": (
            "Thank you for confirming the resolution!"
            if body.confirmed
            else ("Ticket has been reopened for further action." if reopened else "Thank you for your feedback. Your concern has been noted.")
        ),
    }
