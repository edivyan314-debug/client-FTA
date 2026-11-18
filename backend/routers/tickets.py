from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from models import Ticket, Resolution, Cluster, Feedback
from schemas import TicketStatusUpdate
from services.storage import save_upload, get_upload_url
from services.ai_pipeline import check_before_after

router = APIRouter()


@router.post("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: str,
    body: TicketStatusUpdate,
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.status
    ticket.status = body.status

    history = ticket.history_json or []
    history.append({
        "status": body.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": f"Status changed from {old_status} to {body.status}",
    })
    ticket.history_json = history
    db.commit()

    return {"ticket_id": ticket_id, "status": ticket.status, "message": "Status updated"}


@router.post("/tickets/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: str,
    action_taken: str = Form(...),
    after_photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    after_media_url = None
    if after_photo:
        content = await after_photo.read()
        path = await save_upload(after_photo.filename, content)
        after_media_url = get_upload_url(path)

    # Get before media urls from the cluster's feedbacks
    cluster = db.query(Cluster).filter(Cluster.id == ticket.cluster_id).first()
    before_urls = []
    if cluster:
        feedbacks = db.query(Feedback).filter(Feedback.cluster_id == cluster.id).all()
        for fb in feedbacks:
            before_urls.extend(fb.media_urls or [])

    # Run vision check
    vision_check = await check_before_after(
        before_urls=before_urls[:3],
        after_url=after_media_url or "",
        location=cluster.ward_id if cluster else "",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    # Create or update resolution
    existing = db.query(Resolution).filter(Resolution.ticket_id == ticket_id).first()
    if existing:
        existing.action_taken = action_taken
        existing.after_media_url = after_media_url
        existing.vision_check_json = vision_check
    else:
        resolution = Resolution(
            ticket_id=ticket_id,
            action_taken=action_taken,
            after_media_url=after_media_url,
            vision_check_json=vision_check,
            confirmations_yes=0,
            confirmations_no=0,
            reopened_bool=False,
        )
        db.add(resolution)

    # Update ticket status
    ticket.status = "Action Taken"
    history = ticket.history_json or []
    history.append({
        "status": "Action Taken",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": action_taken,
    })
    ticket.history_json = history

    # Update cluster status
    if cluster:
        cluster.status = "action_taken"

    db.commit()

    return {
        "ticket_id": ticket_id,
        "status": "Action Taken",
        "vision_check": vision_check,
        "message": "Resolution recorded successfully",
    }
