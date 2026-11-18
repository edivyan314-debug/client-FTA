"""
Seed script for the Citizen FTA demo.
Creates 6 clusters, 40 feedback records, tickets, resolutions, and public metrics.
"""
from pathlib import Path
import sys
import uuid
import random
import hashlib
from datetime import datetime, timezone, timedelta, date

sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
from models import Feedback, Cluster, Ticket, Resolution, PublicMetrics
from services.priority import compute_priority
from services.privacy import hash_citizen_id
from services.routing import route_complaint
from services.clustering import embedding_to_blob
from services.ai_pipeline import get_demo_embedding


# Ward coordinate ranges
WARD_COORDS = {
    "ward_1": {"lat": (12.97, 12.99), "lng": (77.58, 77.60)},
    "ward_2": {"lat": (12.92, 12.95), "lng": (77.57, 77.60)},
    "ward_3": {"lat": (12.96, 12.98), "lng": (77.73, 77.76)},
    "ward_4": {"lat": (13.01, 13.04), "lng": (77.54, 77.57)},
    "ward_5": {"lat": (12.93, 12.95), "lng": (77.62, 77.65)},
    "ward_6": {"lat": (13.04, 13.07), "lng": (77.58, 77.61)},
}

LANGUAGES = ["hi", "ta", "en", "mixed"]
CHANNELS = ["web", "whatsapp", "telegram", "ivr"]

CLUSTER_CONFIGS = [
    {
        "id": "cluster-pothole-1",
        "category": "pothole",
        "ward_id": "ward_1",
        "size": 8,
        "status": "resolved",
        "title": "Road surface deterioration near KR Market",
        "summary": "Multiple potholes reported on the main road near KR Market causing traffic hazards.",
        "urgency": 4,
        "vulnerable": False,
    },
    {
        "id": "cluster-water-1",
        "category": "water",
        "ward_id": "ward_2",
        "size": 6,
        "status": "under_review",
        "title": "Water supply disruption - Jayanagar zone",
        "summary": "Persistent water supply cuts affecting Jayanagar residents for multiple days.",
        "urgency": 5,
        "vulnerable": True,
    },
    {
        "id": "cluster-garbage-1",
        "category": "garbage",
        "ward_id": "ward_3",
        "size": 7,
        "status": "action_taken",
        "title": "Garbage collection failure near school",
        "summary": "Uncollected waste near school premises creating health hazard for children.",
        "urgency": 4,
        "vulnerable": True,
    },
    {
        "id": "cluster-streetlight-1",
        "category": "streetlight",
        "ward_id": "ward_1",
        "size": 5,
        "status": "open",
        "title": "Streetlight failure causing safety hazard",
        "summary": "Multiple streetlights out near junction causing nighttime accidents.",
        "urgency": 4,
        "vulnerable": False,
    },
    {
        "id": "cluster-drain-1",
        "category": "drain",
        "ward_id": "ward_4",
        "size": 6,
        "status": "open",
        "title": "Storm drain blockage causing flooding",
        "summary": "Blocked drains causing street flooding during rain.",
        "urgency": 5,
        "vulnerable": False,
    },
    {
        "id": "cluster-animal-1",
        "category": "animal",
        "ward_id": "ward_2",
        "size": 5,
        "status": "open",
        "title": "Stray dog menace - safety risk",
        "summary": "Pack of aggressive stray dogs attacking residents and children.",
        "urgency": 5,
        "vulnerable": True,
    },
]

FEEDBACK_TEMPLATES = {
    "pothole": [
        "Huge pothole on main road causing accidents near KR Market.",
        "Road completely broken, vehicles getting damaged daily.",
        "Pothole has been here for 2 months, nobody fixed it.",
        "My bike tyre burst because of the pothole near bus stop.",
        "Several potholes near KR Market, dangerous for cyclists.",
        "Road surface has collapsed, water logging during rain.",
        "Big hole in road, children falling from bikes.",
        "Pothole causing major traffic jam every morning.",
    ],
    "water": [
        "No water supply for 3 days in our area.",
        "Water comes for only 1 hour at odd times.",
        "Pipeline broken, water wasted for days.",
        "Dirty water coming from taps, not safe to drink.",
        "Water pressure very low, cannot fill overhead tank.",
        "No water in Jayanagar for entire week.",
    ],
    "garbage": [
        "Garbage not collected for 10 days near school.",
        "Huge pile of waste creating foul smell.",
        "Garbage truck has not come for 2 weeks.",
        "Stray animals spreading garbage everywhere.",
        "Open dumping near school is health hazard.",
        "Children getting sick due to garbage nearby.",
        "Garbage pile blocking the road near market.",
    ],
    "streetlight": [
        "Streetlight broken near junction for 1 week.",
        "No light on main road causing accidents at night.",
        "Three lights in a row not working.",
        "Road accident happened due to darkness near bus stop.",
        "Women feel unsafe walking in dark street.",
    ],
    "drain": [
        "Drain completely blocked, water overflowing.",
        "Street flooding every time it rains.",
        "Drain choked with plastic waste, sewage overflow.",
        "Flooding in front of houses due to blocked drain.",
        "Cannot walk on street because of drain overflow.",
        "Drain has not been cleaned for months.",
    ],
    "animal": [
        "Pack of stray dogs attacking people near society.",
        "Three children bitten by stray dogs last week.",
        "Dogs very aggressive, chasing vehicles.",
        "Cannot let children play outside due to stray dogs.",
        "Stray dogs attacking elderly people near park.",
    ],
}

SUGGESTED_ACTIONS = {
    "pothole": "Dispatch road repair crew within 48 hours. Use cold mix asphalt for temporary fix, schedule permanent repair.",
    "water": "Check pipeline for leaks, restore supply immediately. Send water tanker as emergency measure.",
    "garbage": "Schedule immediate waste collection. Increase frequency of pickups for this area.",
    "streetlight": "Dispatch BESCOM crew to inspect and replace faulty bulbs/fixtures within 24 hours.",
    "drain": "Send drainage cleaning crew with high-pressure jet machine to clear blockage.",
    "animal": "Deploy animal control team, conduct ABC (Animal Birth Control) program for the area.",
}


def rand_coord(ward_id):
    coords = WARD_COORDS[ward_id]
    lat = random.uniform(*coords["lat"])
    lng = random.uniform(*coords["lng"])
    return round(lat, 6), round(lng, 6)


def make_h3_cell(lat, lng):
    try:
        import h3 as h3lib
        if hasattr(h3lib, "latlng_to_cell"):
            return h3lib.latlng_to_cell(lat, lng, 8)
        return h3lib.geo_to_h3(lat, lng, 8)
    except Exception:
        return f"h3_{int(lat*100)}_{int(lng*100)}"


async def run_seed(db):
    # Clear existing data
    db.query(Resolution).delete()
    db.query(Ticket).delete()
    db.query(Feedback).delete()
    db.query(PublicMetrics).delete()
    db.query(Cluster).delete()
    db.commit()

    now = datetime.now(timezone.utc)

    # Create clusters
    cluster_objects = {}
    ticket_objects = {}

    for cfg in CLUSTER_CONFIGS:
        ward_id = cfg["ward_id"]
        lat, lng = rand_coord(ward_id)
        h3_cell = make_h3_cell(lat, lng)

        created_at = now - timedelta(days=random.randint(1, 7))
        updated_at = now - timedelta(hours=random.randint(1, 12))

        # Compute priority
        score, breakdown = compute_priority(
            urgency=cfg["urgency"],
            cluster_size=cfg["size"],
            vulnerable_group_flag=cfg["vulnerable"],
            last_complaint_at=updated_at,
        )

        # Build a representative embedding from cluster title
        emb = embedding_to_blob(get_demo_embedding(cfg["title"]))

        cluster = Cluster(
            id=cfg["id"],
            title=cfg["title"],
            summary=cfg["summary"],
            category=cfg["category"],
            ward_id=ward_id,
            h3_cell=h3_cell,
            size=cfg["size"],
            priority=score,
            priority_breakdown_json=breakdown,
            status=cfg["status"],
            embedding=emb,
            created_at=created_at,
            updated_at=updated_at,
        )
        db.add(cluster)
        cluster_objects[cfg["id"]] = cluster

    db.commit()

    # Create feedback records (40 total, distributed across clusters)
    feedback_per_cluster = {
        "cluster-pothole-1": 8,
        "cluster-water-1": 6,
        "cluster-garbage-1": 7,
        "cluster-streetlight-1": 5,
        "cluster-drain-1": 6,
        "cluster-animal-1": 5,
        # Extra 3 unassigned
    }
    # Pad to 40 total
    extras = 40 - sum(feedback_per_cluster.values())

    feedback_idx = 0
    for cluster_id, count in feedback_per_cluster.items():
        cfg = next(c for c in CLUSTER_CONFIGS if c["id"] == cluster_id)
        category = cfg["category"]
        ward_id = cfg["ward_id"]
        templates = FEEDBACK_TEMPLATES.get(category, ["Civic issue reported."])

        for i in range(count):
            lat, lng = rand_coord(ward_id)
            h3_cell = make_h3_cell(lat, lng)
            lang = random.choice(LANGUAGES)
            channel = random.choice(CHANNELS)
            text = templates[i % len(templates)]

            feedback = Feedback(
                id=str(uuid.uuid4()),
                channel=channel,
                citizen_hash=hash_citizen_id(f"citizen_{feedback_idx}"),
                media_urls=[],
                transcript=text,
                language=lang,
                lat=lat,
                lng=lng,
                h3_cell=h3_cell,
                ward_id=ward_id,
                analysis_json={
                    "transcript_en": text,
                    "original_language": lang,
                    "category": category,
                    "sub_category": f"{category}_issue",
                    "sentiment": "negative",
                    "urgency": cfg["urgency"],
                    "root_cause_tag": cfg["title"],
                    "location_mention": ward_id,
                    "vulnerable_group_flag": cfg["vulnerable"],
                    "sensitive_flag": False,
                    "confidence": round(random.uniform(0.80, 0.97), 2),
                },
                cluster_id=cluster_id,
                consent_flags={"data_sharing": True},
                created_at=datetime.now(timezone.utc) - timedelta(
                    hours=random.randint(1, 168)
                ),
            )
            db.add(feedback)
            feedback_idx += 1

    # Extra unassigned feedbacks
    for i in range(extras):
        cfg = random.choice(CLUSTER_CONFIGS)
        lat, lng = rand_coord(cfg["ward_id"])
        h3_cell = make_h3_cell(lat, lng)
        feedback = Feedback(
            id=str(uuid.uuid4()),
            channel=random.choice(CHANNELS),
            citizen_hash=hash_citizen_id(f"citizen_{feedback_idx}"),
            media_urls=[],
            transcript="General civic complaint",
            language="en",
            lat=lat,
            lng=lng,
            h3_cell=h3_cell,
            ward_id=cfg["ward_id"],
            analysis_json=None,
            cluster_id=None,
            consent_flags={"data_sharing": True},
            created_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48)),
        )
        db.add(feedback)
        feedback_idx += 1

    db.commit()

    # Create tickets for each cluster
    for cfg in CLUSTER_CONFIGS:
        assignment = route_complaint(cfg["category"], cfg["ward_id"])
        sla_days = 3 if cfg["urgency"] >= 4 else 7
        sla_due = datetime.now(timezone.utc) + timedelta(days=sla_days)

        # Map cluster status to ticket status
        status_map = {
            "open": "Received",
            "under_review": "In Progress",
            "action_taken": "Action Taken",
            "resolved": "Closed",
        }
        ticket_status = status_map.get(cfg["status"], "Received")

        ticket = Ticket(
            id=str(uuid.uuid4()),
            cluster_id=cfg["id"],
            department=assignment["dept"],
            officer=assignment["officer"],
            sla_due=sla_due,
            status=ticket_status,
            escalation_level=0,
            history_json=[
                {
                    "status": "Received",
                    "timestamp": (now - timedelta(days=5)).isoformat(),
                    "note": "Ticket created from cluster",
                },
                {
                    "status": ticket_status,
                    "timestamp": now.isoformat(),
                    "note": "Status updated",
                },
            ],
        )
        db.add(ticket)
        ticket_objects[cfg["id"]] = ticket

    db.commit()

    # Create Resolution for Cluster A (pothole-1 - resolved)
    pothole_ticket = ticket_objects["cluster-pothole-1"]
    resolution = Resolution(
        id=str(uuid.uuid4()),
        ticket_id=pothole_ticket.id,
        action_taken="Road repair crew dispatched. Pothole filled with asphalt. Surface leveled and marked.",
        after_media_url=None,
        vision_check_json={
            "location_match": True,
            "defect_resolved": True,
            "confidence": 0.91,
            "reason": "Road surface appears repaired in after photo. Fresh asphalt patch visible at same location.",
        },
        confirmations_yes=6,
        confirmations_no=1,
        reopened_bool=False,
    )
    db.add(resolution)
    db.commit()

    # Create PublicMetrics for last 7 days
    departments = ["BBMP Roads", "BWSSB", "BBMP SWM", "BESCOM", "BBMP Drainage", "BBMP Veterinary"]
    h3_cells = []
    for ward_id in WARD_COORDS:
        lat, lng = rand_coord(ward_id)
        h3_cells.append(make_h3_cell(lat, lng))

    for day_offset in range(7):
        metric_date = (now - timedelta(days=day_offset)).date()
        for dept in departments:
            for h3_cell in h3_cells[:3]:  # 3 hex cells per dept per day
                vol = random.randint(5, 30)
                res = random.randint(2, vol)
                db.add(PublicMetrics(
                    id=str(uuid.uuid4()),
                    date=metric_date,
                    department=dept,
                    h3_cell=h3_cell,
                    volume=vol,
                    resolved=res,
                    median_resolution_hours=round(random.uniform(12, 72), 1),
                ))

    db.commit()

    # Return counts
    counts = {
        "clusters": db.query(Cluster).count(),
        "feedbacks": db.query(Feedback).count(),
        "tickets": db.query(Ticket).count(),
        "resolutions": db.query(Resolution).count(),
        "public_metrics": db.query(PublicMetrics).count(),
    }
    return counts
