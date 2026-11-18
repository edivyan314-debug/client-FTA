import numpy as np
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def embedding_to_blob(vec: np.ndarray) -> bytes:
    return vec.astype(np.float32).tobytes()


def blob_to_embedding(blob: bytes) -> np.ndarray:
    return np.frombuffer(blob, dtype=np.float32)


def assign_cluster(db: Session, feedback, embedding: np.ndarray, threshold: float = 0.78):
    from models import Cluster
    from services.priority import compute_priority

    analysis = feedback.analysis_json or {}
    category = analysis.get("category", "general")
    ward_id = feedback.ward_id or "ward_unknown"

    since = datetime.now(timezone.utc) - timedelta(days=7)
    candidates = db.query(Cluster).filter(
        Cluster.category == category,
        Cluster.ward_id == ward_id,
        Cluster.created_at >= since,
        Cluster.status.in_(["open", "under_review"]),
    ).all()

    best_cluster = None
    best_sim = 0.0
    for cluster in candidates:
        if cluster.embedding is None:
            continue
        cluster_vec = blob_to_embedding(cluster.embedding)
        sim = cosine_similarity(embedding, cluster_vec)
        if sim >= threshold and sim > best_sim:
            best_sim = sim
            best_cluster = cluster

    if best_cluster:
        old_size = best_cluster.size
        best_cluster.size = old_size + 1
        best_cluster.updated_at = datetime.now(timezone.utc)
        old_vec = blob_to_embedding(best_cluster.embedding)
        new_vec = (old_vec * old_size + embedding) / best_cluster.size
        best_cluster.embedding = embedding_to_blob(new_vec)
        db.commit()
        db.refresh(best_cluster)
        return best_cluster, False  # False = not new cluster
    else:
        cluster = Cluster(
            id=str(uuid.uuid4()),
            title=analysis.get("root_cause_tag", f"New {category} cluster"),
            category=category,
            ward_id=ward_id,
            h3_cell=feedback.h3_cell,
            size=1,
            priority=0.0,
            status="open",
            embedding=embedding_to_blob(embedding),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(cluster)
        db.commit()
        db.refresh(cluster)
        return cluster, True  # True = new cluster
