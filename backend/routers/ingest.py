import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Form, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from models import Feedback, Cluster, Ticket
from services.privacy import hash_citizen_id, redact_transcript
from services.geo import latlng_to_h3, get_ward_for_point
from services.routing import route_complaint
from services.clustering import assign_cluster, embedding_to_blob
from services.priority import compute_priority
from services.storage import save_upload, get_upload_url
from services.ai_pipeline import transcribe_audio, analyze_text, get_embedding
from config import settings

router = APIRouter()

# SSE queues: feedback_id -> asyncio.Queue
_sse_queues: dict[str, asyncio.Queue] = {}


async def _emit(feedback_id: str, event: dict):
    if feedback_id in _sse_queues:
        await _sse_queues[feedback_id].put(event)


async def process_feedback(feedback_id: str, db: Session):
    """Background task: run AI pipeline and update feedback record."""
    try:
        feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
        if not feedback:
            return

        await _emit(feedback_id, {"stage": "started", "message": "Processing your complaint..."})

        # Step 1: transcribe audio if present
        transcript = feedback.transcript or ""
        if feedback.media_urls:
            audio_urls = [u for u in (feedback.media_urls or []) if u.endswith((".ogg", ".wav", ".mp3", ".webm", ".m4a"))]
            if audio_urls:
                await _emit(feedback_id, {"stage": "transcribing", "message": "Transcribing audio..."})
                # In real usage, read audio bytes from storage; in demo, use placeholder
                transcription = await transcribe_audio(b"", audio_urls[0])
                transcript = transcription.get("transcript_en", transcript)
                feedback.transcript = transcript
                feedback.language = transcription.get("original_language", "en")

        # Step 2: analyze text
        await _emit(feedback_id, {"stage": "analyzing", "message": "Analyzing complaint..."})
        analysis = await analyze_text(transcript)
        feedback.analysis_json = analysis

        # Step 3: get embedding
        await _emit(feedback_id, {"stage": "embedding", "message": "Generating embedding..."})
        embedding = await get_embedding(transcript)

        # Step 4: assign cluster
        await _emit(feedback_id, {"stage": "clustering", "message": "Finding similar complaints..."})
        cluster, is_new = assign_cluster(db, feedback, embedding, threshold=settings.cluster_threshold)
        feedback.cluster_id = cluster.id

        # Step 5: compute priority and update cluster
        score, breakdown = compute_priority(
            urgency=analysis.get("urgency", 3),
            cluster_size=cluster.size,
            vulnerable_group_flag=analysis.get("vulnerable_group_flag", False),
            last_complaint_at=datetime.now(timezone.utc),
        )
        cluster.priority = score
        cluster.priority_breakdown_json = breakdown

        # Step 6: create or update ticket
        existing_ticket = db.query(Ticket).filter(Ticket.cluster_id == cluster.id).first()
        if not existing_ticket:
            assignment = route_complaint(analysis.get("category", "other"), feedback.ward_id or "ward_unknown")
            sla_days = 3 if analysis.get("urgency", 3) >= 4 else 7
            ticket = Ticket(
                id=str(uuid.uuid4()),
                cluster_id=cluster.id,
                department=assignment["dept"],
                officer=assignment["officer"],
                sla_due=datetime.now(timezone.utc) + timedelta(days=sla_days),
                status="Received",
                escalation_level=0,
                history_json=[{
                    "status": "Received",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": "Auto-created from complaint cluster",
                }],
            )
            db.add(ticket)

        db.commit()

        await _emit(feedback_id, {
            "stage": "complete",
            "message": "Processing complete",
            "cluster_id": cluster.id,
            "category": analysis.get("category"),
            "urgency": analysis.get("urgency"),
            "is_new_cluster": is_new,
        })

    except Exception as e:
        await _emit(feedback_id, {"stage": "error", "message": str(e)})
    finally:
        # Signal end of stream
        if feedback_id in _sse_queues:
            await _sse_queues[feedback_id].put(None)


@router.post("/ingest")
async def ingest_complaint(
    background_tasks: BackgroundTasks,
    citizen_id: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    consent: bool = Form(...),
    text: Optional[str] = Form(None),
    language: Optional[str] = Form("auto"),
    channel: Optional[str] = Form("web"),
    audio: Optional[UploadFile] = File(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    if not consent:
        raise HTTPException(status_code=400, detail="Consent required to process complaint")

    citizen_hash = hash_citizen_id(citizen_id)
    h3_cell = latlng_to_h3(lat, lng)
    ward_id = get_ward_for_point(lat, lng)

    media_urls = []

    # Save audio if provided
    if audio:
        content = await audio.read()
        if len(content) > settings.max_audio_mb * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"Audio file too large (max {settings.max_audio_mb}MB)")
        path = await save_upload(audio.filename, content)
        media_urls.append(get_upload_url(path))

    # Save photo if provided
    if photo:
        content = await photo.read()
        path = await save_upload(photo.filename, content)
        media_urls.append(get_upload_url(path))

    feedback_id = str(uuid.uuid4())
    tracking_id = f"TRK-{feedback_id[:8].upper()}"

    feedback = Feedback(
        id=feedback_id,
        channel=channel,
        citizen_hash=citizen_hash,
        media_urls=media_urls,
        transcript=text,
        language=language,
        lat=lat,
        lng=lng,
        h3_cell=h3_cell,
        ward_id=ward_id,
        consent_flags={"data_sharing": consent},
        created_at=datetime.now(timezone.utc),
    )
    db.add(feedback)
    db.commit()

    # Set up SSE queue
    _sse_queues[feedback_id] = asyncio.Queue()

    # Schedule background processing
    background_tasks.add_task(process_feedback, feedback_id, db)

    return {
        "feedback_id": feedback_id,
        "tracking_id": tracking_id,
        "status": "processing",
        "message": "Your complaint has been received and is being processed.",
    }


@router.get("/ingest/status/{feedback_id}")
async def feedback_status_stream(feedback_id: str):
    """SSE endpoint that streams processing stages."""

    async def event_generator():
        queue = _sse_queues.get(feedback_id)
        if queue is None:
            # Check if already processed
            yield f"data: {{'stage': 'not_found', 'message': 'No active processing for this ID'}}\n\n"
            return

        while True:
            event = await queue.get()
            if event is None:
                # Processing complete
                yield "data: [DONE]\n\n"
                # Clean up
                _sse_queues.pop(feedback_id, None)
                break
            import json
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
