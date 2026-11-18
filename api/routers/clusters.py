from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from models import Cluster, Ticket, Feedback
from schemas import ClusterListItem, ClusterDetail
from services.privacy import redact_transcript

router = APIRouter()

SUGGESTED_ACTIONS = {
    "pothole": "Dispatch road repair crew within 48 hours. Use cold mix asphalt for temporary fix, schedule permanent repair.",
    "water": "Check pipeline for leaks, restore supply immediately. Send water tanker as emergency measure.",
    "garbage": "Schedule immediate waste collection. Increase frequency of pickups for this area.",
    "streetlight": "Dispatch BESCOM crew to inspect and replace faulty bulbs/fixtures within 24 hours.",
    "drain": "Send drainage cleaning crew with high-pressure jet machine to clear blockage.",
    "animal": "Deploy animal control team, conduct ABC (Animal Birth Control) program for the area.",
    "noise": "Dispatch enforcement officer to verify and issue notice.",
    "construction": "Inspect construction site for violations and take necessary action.",
    "other": "Review complaint and assign to appropriate department.",
}


@router.get("/clusters", response_model=List[ClusterListItem])
def list_clusters(db: Session = Depends(get_db)):
    clusters = db.query(Cluster).order_by(Cluster.priority.desc()).all()
    result = []
    for cluster in clusters:
        item = ClusterListItem(
            id=cluster.id,
            title=cluster.title,
            category=cluster.category,
            ward_id=cluster.ward_id,
            size=cluster.size,
            priority=cluster.priority,
            priority_breakdown_json=cluster.priority_breakdown_json,
            status=cluster.status,
            created_at=cluster.created_at,
            updated_at=cluster.updated_at,
        )
        result.append(item)
    return result


@router.get("/clusters/{cluster_id}", response_model=ClusterDetail)
def get_cluster(cluster_id: str, db: Session = Depends(get_db)):
    cluster = db.query(Cluster).filter(Cluster.id == cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    # Get sample complaints (up to 5, anonymized)
    feedbacks = db.query(Feedback).filter(
        Feedback.cluster_id == cluster_id
    ).limit(5).all()

    sample_complaints = []
    for fb in feedbacks:
        sample_complaints.append({
            "id": fb.id[:8] + "...",
            "transcript": redact_transcript(fb.transcript or ""),
            "channel": fb.channel,
            "language": fb.language,
            "created_at": fb.created_at.isoformat() if fb.created_at else None,
            "urgency": (fb.analysis_json or {}).get("urgency"),
        })

    # Get ticket
    ticket = db.query(Ticket).filter(Ticket.cluster_id == cluster_id).first()
    ticket_dict = None
    if ticket:
        ticket_dict = {
            "id": ticket.id,
            "department": ticket.department,
            "officer": ticket.officer,
            "sla_due": ticket.sla_due.isoformat() if ticket.sla_due else None,
            "status": ticket.status,
            "escalation_level": ticket.escalation_level,
        }

    suggested_action = SUGGESTED_ACTIONS.get(cluster.category, SUGGESTED_ACTIONS["other"])

    return ClusterDetail(
        id=cluster.id,
        title=cluster.title,
        summary=cluster.summary,
        category=cluster.category,
        ward_id=cluster.ward_id,
        size=cluster.size,
        priority=cluster.priority,
        priority_breakdown_json=cluster.priority_breakdown_json,
        status=cluster.status,
        created_at=cluster.created_at,
        updated_at=cluster.updated_at,
        sample_complaints=sample_complaints,
        ticket=ticket_dict,
        suggested_action=suggested_action,
    )
