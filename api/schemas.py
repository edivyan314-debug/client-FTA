from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    channel: str
    citizen_id: str
    lat: float
    lng: float
    consent: bool
    text: Optional[str] = None
    language: Optional[str] = "auto"


class FeedbackResponse(BaseModel):
    id: str
    tracking_id: str
    status: str
    message: str


class AnalysisResult(BaseModel):
    transcript_en: str
    original_language: str
    category: str
    sub_category: str
    sentiment: str
    urgency: int  # 1-5
    root_cause_tag: str
    location_mention: Optional[str] = None
    vulnerable_group_flag: bool
    sensitive_flag: bool
    confidence: float


class ClusterListItem(BaseModel):
    id: str
    title: str
    category: str
    ward_id: str
    size: int
    priority: float
    priority_breakdown_json: Optional[Any] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClusterDetail(ClusterListItem):
    summary: Optional[str] = None
    sample_complaints: List[dict] = []
    ticket: Optional[dict] = None
    suggested_action: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    status: str


class ResolutionCreate(BaseModel):
    action_taken: str


class CitizenConfirm(BaseModel):
    feedback_id: str
    confirmed: bool


class VisionCheckResult(BaseModel):
    location_match: bool
    defect_resolved: bool
    confidence: float
    reason: str


class PublicMetricsResponse(BaseModel):
    h3_cell: str
    department: str
    volume: int
    resolved: int
    resolution_pct: float
    median_resolution_hours: Optional[float] = None
