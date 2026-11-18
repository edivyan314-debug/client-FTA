from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_db
from models import PublicMetrics, Cluster, Ticket
from services.geo import h3_to_latlng

router = APIRouter()


@router.get("/public/metrics")
def public_metrics(db: Session = Depends(get_db)):
    # Aggregate from PublicMetrics table
    metrics = db.query(PublicMetrics).all()

    total_volume = sum(m.volume for m in metrics)
    total_resolved = sum(m.resolved for m in metrics)
    resolution_pct = (total_resolved / total_volume * 100) if total_volume > 0 else 0.0

    # Median resolution hours
    hours_list = [m.median_resolution_hours for m in metrics if m.median_resolution_hours is not None]
    median_hours = None
    if hours_list:
        sorted_hours = sorted(hours_list)
        mid = len(sorted_hours) // 2
        if len(sorted_hours) % 2 == 0:
            median_hours = (sorted_hours[mid - 1] + sorted_hours[mid]) / 2
        else:
            median_hours = sorted_hours[mid]

    # Top categories from live clusters
    clusters = db.query(Cluster).all()
    category_counts = {}
    for c in clusters:
        category_counts[c.category] = category_counts.get(c.category, 0) + c.size
    top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_categories = [{"category": k, "count": v} for k, v in top_categories]

    # Hex aggregation
    hex_data = {}
    for m in metrics:
        h3 = m.h3_cell
        if h3 not in hex_data:
            hex_data[h3] = {"volume": 0, "resolved": 0}
        hex_data[h3]["volume"] += m.volume
        hex_data[h3]["resolved"] += m.resolved

    hexes = []
    for h3_cell, data in hex_data.items():
        vol = data["volume"]
        res = data["resolved"]
        lat_lng = h3_to_latlng(h3_cell)
        hexes.append({
            "h3_cell": h3_cell,
            "volume": vol,
            "resolved": res,
            "resolution_pct": round(res / vol * 100, 1) if vol > 0 else 0.0,
            "lat": lat_lng[0] if lat_lng else None,
            "lng": lat_lng[1] if lat_lng else None,
        })

    # Department aggregation
    dept_data = {}
    for m in metrics:
        d = m.department
        if d not in dept_data:
            dept_data[d] = {"volume": 0, "resolved": 0}
        dept_data[d]["volume"] += m.volume
        dept_data[d]["resolved"] += m.resolved

    departments = []
    for dept, data in dept_data.items():
        vol = data["volume"]
        res = data["resolved"]
        departments.append({
            "department": dept,
            "volume": vol,
            "resolved": res,
            "resolution_pct": round(res / vol * 100, 1) if vol > 0 else 0.0,
        })

    departments.sort(key=lambda x: x["volume"], reverse=True)

    return {
        "summary": {
            "total_volume": total_volume,
            "resolution_pct": round(resolution_pct, 1),
            "median_resolution_hours": round(median_hours, 1) if median_hours else None,
            "top_categories": top_categories,
        },
        "hexes": hexes,
        "departments": departments,
    }
