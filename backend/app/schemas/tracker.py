"""
Pydantic schemas for Batch 9 — Application & Outreach Tracking Dashboard.

PRD Section 16 (Application Tracker), Section 17 (Outreach Tracker), and Section 18 (Dashboard).
Strict truthfulness: All numbers, statuses, and activity events derive from database tables.
"""

import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


ALLOWED_APPLICATION_STATUSES = {
    "DISCOVERED", "ANALYZED", "PREPARED", "READY", "APPLIED",
    "ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "EXPIRED",
}

ALLOWED_OUTREACH_STATUSES = {
    "CONTACT FOUND", "EMAIL DRAFTED", "APPROVED", "SENT",
    "REPLIED", "NO RESPONSE", "FOLLOW-UP", "BOUNCED",
}


# ── Statistics Schemas ────────────────────────────────────────────────────────

class ApplicationPipelineStats(BaseModel):
    discovered_jobs: int = 0
    analyzed_jobs: int = 0
    prepared_applications: int = 0
    ready_applications: int = 0
    submitted_applications: int = 0
    assessments: int = 0
    interviews: int = 0
    offers: int = 0
    rejections: int = 0
    withdrawn: int = 0
    expired: int = 0


class OutreachPipelineStats(BaseModel):
    contacts_found: int = 0
    emails_drafted: int = 0
    approved_emails: int = 0
    sent_emails: int = 0
    replies: int = 0
    follow_ups: int = 0
    no_response: int = 0
    bounced: int = 0


class DashboardSummaryResponse(BaseModel):
    application_stats: ApplicationPipelineStats
    outreach_stats: OutreachPipelineStats
    total_jobs: int = 0
    total_applications: int = 0
    total_contacts: int = 0
    total_emails: int = 0
    calculated_at: str


# ── Tracked Item Schemas ─────────────────────────────────────────────────────

class ApplicationTrackItem(BaseModel):
    id: int
    job_id: int
    company: str
    title: str
    location: Optional[str] = None
    match_score: Optional[float] = None
    status: str
    tailored_resume_path: Optional[str] = None
    cover_letter_path: Optional[str] = None
    submission_notes: Optional[str] = None
    applied_at: Optional[datetime.datetime] = None
    interview_date: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = {"from_attributes": True}


class ApplicationStatusUpdate(BaseModel):
    status: str
    submission_notes: Optional[str] = None
    interview_date: Optional[datetime.datetime] = None
    applied_at: Optional[datetime.datetime] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in ALLOWED_APPLICATION_STATUSES:
            raise ValueError(
                f"status must be one of {sorted(ALLOWED_APPLICATION_STATUSES)}. Got: {v!r}"
            )
        return v_upper


class TrackerListResponse(BaseModel):
    total: int
    items: List[ApplicationTrackItem]
    status_distribution: Dict[str, int] = Field(default_factory=dict)


# ── Activity Feed Schemas ────────────────────────────────────────────────────

class ActivityEvent(BaseModel):
    id: str
    type: str  # 'job_discovered', 'materials_prepared', 'application_submitted', 'interview_scheduled', 'email_sent', etc.
    title: str
    description: str
    timestamp: datetime.datetime
    entity_id: Optional[int] = None
    entity_type: Optional[str] = None
    badge: Optional[str] = None
    color: Optional[str] = None


class RecentActivityResponse(BaseModel):
    events: List[ActivityEvent]
    total_events: int
