import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from datetime import datetime, timezone, timedelta
from services.priority import compute_priority


def _now():
    return datetime.now(timezone.utc)


def test_high_priority():
    """urgency=5, size=7, vulnerable=True -> score should be > 10."""
    score, breakdown = compute_priority(
        urgency=5,
        cluster_size=7,
        vulnerable_group_flag=True,
        last_complaint_at=_now() - timedelta(minutes=5),
    )
    assert score > 10, f"Expected score > 10, got {score}"


def test_low_priority():
    """urgency=1, size=1, vulnerable=False -> score should be < 1."""
    score, breakdown = compute_priority(
        urgency=1,
        cluster_size=1,
        vulnerable_group_flag=False,
        last_complaint_at=_now() - timedelta(minutes=5),
    )
    assert score < 1, f"Expected score < 1, got {score}"


def test_vulnerability_multiplier():
    """Same params with vulnerable=True should be 1.5x higher than False."""
    t = _now() - timedelta(minutes=5)
    score_vuln, _ = compute_priority(5, 3, True, t)
    score_normal, _ = compute_priority(5, 3, False, t)
    ratio = score_vuln / score_normal
    assert abs(ratio - 1.5) < 0.01, f"Expected ratio 1.5, got {ratio}"


def test_breakdown_keys():
    """Breakdown dict must have all required keys."""
    score, breakdown = compute_priority(
        urgency=3,
        cluster_size=5,
        vulnerable_group_flag=False,
        last_complaint_at=_now(),
    )
    required_keys = {"urgency", "cluster_size", "ln_factor", "vulnerability_multiplier", "recency_decay", "final_score"}
    assert required_keys.issubset(set(breakdown.keys())), f"Missing keys: {required_keys - set(breakdown.keys())}"


def test_recency_decay():
    """Complaint 100 hours ago has lower score than 1 hour ago."""
    score_recent, _ = compute_priority(4, 5, False, _now() - timedelta(hours=1))
    score_old, _ = compute_priority(4, 5, False, _now() - timedelta(hours=100))
    assert score_old < score_recent, f"Expected old score {score_old} < recent {score_recent}"
