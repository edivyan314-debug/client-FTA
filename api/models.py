import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Date,
    ForeignKey, LargeBinary
)
from sqlalchemy.types import JSON
from database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    channel = Column(String)
    citizen_hash = Column(String)
    media_urls = Column(JSON, default=[])
    transcript = Column(String, nullable=True)
    language = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    h3_cell = Column(String, nullable=True)
    ward_id = Column(String, nullable=True)
    analysis_json = Column(JSON, nullable=True)
    cluster_id = Column(String, ForeignKey("cluster.id"), nullable=True)
    consent_flags = Column(JSON, default={})
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Cluster(Base):
    __tablename__ = "cluster"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String)
    summary = Column(String, nullable=True)
    category = Column(String)
    ward_id = Column(String)
    h3_cell = Column(String, nullable=True)
    size = Column(Integer, default=1)
    priority = Column(Float, default=0.0)
    priority_breakdown_json = Column(JSON, nullable=True)
    status = Column(String, default="open")
    embedding = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Ticket(Base):
    __tablename__ = "ticket"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    cluster_id = Column(String, ForeignKey("cluster.id"))
    department = Column(String)
    officer = Column(String)
    sla_due = Column(DateTime)
    status = Column(String, default="Received")
    escalation_level = Column(Integer, default=0)
    history_json = Column(JSON, default=[])


class Resolution(Base):
    __tablename__ = "resolution"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String, ForeignKey("ticket.id"))
    action_taken = Column(String, nullable=True)
    after_media_url = Column(String, nullable=True)
    vision_check_json = Column(JSON, nullable=True)
    confirmations_yes = Column(Integer, default=0)
    confirmations_no = Column(Integer, default=0)
    reopened_bool = Column(Boolean, default=False)


class PublicMetrics(Base):
    __tablename__ = "public_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(Date)
    department = Column(String)
    h3_cell = Column(String)
    volume = Column(Integer, default=0)
    resolved = Column(Integer, default=0)
    median_resolution_hours = Column(Float, nullable=True)
