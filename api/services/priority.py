import math
from datetime import datetime, timezone


def compute_priority(
    urgency: int,
    cluster_size: int,
    vulnerable_group_flag: bool,
    last_complaint_at: datetime,
    decay_lambda: float = 0.01,
) -> tuple:
    vulnerability_multiplier = 1.5 if vulnerable_group_flag else 1.0
    ln_factor = math.log(1 + cluster_size)
    now = datetime.now(timezone.utc)
    if last_complaint_at.tzinfo is None:
        last_complaint_at = last_complaint_at.replace(tzinfo=timezone.utc)
    hours_since = (now - last_complaint_at).total_seconds() / 3600
    recency_decay = math.exp(-decay_lambda * hours_since)
    final_score = urgency * ln_factor * vulnerability_multiplier * recency_decay
    breakdown = {
        "urgency": urgency,
        "cluster_size": cluster_size,
        "ln_factor": round(ln_factor, 4),
        "vulnerability_multiplier": vulnerability_multiplier,
        "recency_decay": round(recency_decay, 4),
        "final_score": round(final_score, 4),
    }
    return round(final_score, 4), breakdown
