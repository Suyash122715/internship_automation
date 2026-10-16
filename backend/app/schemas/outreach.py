"""
Pydantic schemas for Batch 8 — Cold Email Outreach Engine.

PRD Section 14 (Cold Email Generator) & Section 15 (Email Sending):
  - Personalized cold email generation grounded in Contact, Job, and Profile.
  - Email templates, company/recruiter personalization, and live preview.
  - Explicit user approval required prior to sending.
  - Safe email dispatch (SMTP or simulated), queue processing, and rate limiting.
  - Truthfulness rules: NEVER fabricate names, roles, addresses, skills, or projects.
"""

import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


# ── Allowed Lifecycles & Templates ───────────────────────────────────────────

ALLOWED_EMAIL_STATUSES = {
    "EMAIL DRAFTED", "APPROVED", "QUEUED", "SENT",
    "REPLIED", "NO RESPONSE", "FOLLOW-UP", "BOUNCED", "FAILED",
}

AVAILABLE_TEMPLATES = [
    {
        "id": "direct_inquiry",
        "name": "Direct Internship Inquiry",
        "description": "Professional, direct introduction stating target role interest and highlighting matching verified skills and education.",
        "suitable_for": "General recruiter outreach when an open internship is known or targeted.",
    },
    {
        "id": "project_alignment",
        "name": "Project & Technical Alignment",
        "description": "Deep-dives into 1-2 verified portfolio projects that directly align with the company's tech stack or domain.",
        "suitable_for": "Engineering and technical recruiters where project evidence carries high weight.",
    },
    {
        "id": "value_proposition",
        "name": "Targeted Value & Skill Match",
        "description": "Succinctly maps user's top technical proficiencies to role requirements with verifiable credentials.",
        "suitable_for": "Fast-paced hiring managers and senior recruiters seeking high signal-to-noise ratio.",
    },
    {
        "id": "follow_up",
        "name": "Polite Follow-up / Check-in",
        "description": "Brief, respectful check-in referencing earlier expression of interest without inventing prior conversations.",
        "suitable_for": "Re-engaging a contact after 5-7 days of no response.",
    },
]


# ── Template & Generation Schemas ────────────────────────────────────────────

class TemplateInfo(BaseModel):
    id: str
    name: str
    description: str
    suitable_for: str


class EmailGenerateRequest(BaseModel):
    contact_id: int = Field(..., description="ID of the recipient contact record")
    job_id: Optional[int] = Field(None, description="Optional job ID to ground specific role/company claims")
    template_id: str = Field("direct_inquiry", description="Template to utilize")
    custom_tone: Optional[str] = Field("professional", description="Tone style: professional, concise, enthusiastic")
    selected_project_name: Optional[str] = Field(None, description="Specific truthful project name from profile to highlight")

    @field_validator("template_id")
    @classmethod
    def validate_template_id(cls, v: str) -> str:
        valid_ids = {t["id"] for t in AVAILABLE_TEMPLATES}
        if v not in valid_ids:
            raise ValueError(f"template_id must be one of {sorted(valid_ids)}. Got: {v!r}")
        return v


class EmailGenerationResult(BaseModel):
    subject: str
    body: str
    recipient_email: Optional[str] = None
    contact_name: str
    company: str
    verification_status: str
    template_id: str
    grounded_claims: List[str] = Field(default_factory=list, description="Explicit list of truthful facts sourced from profile/job")
    missing_fields: List[str] = Field(default_factory=list, description="Fields omitted or marked missing due to lack of verified data")
    inferred_warning: Optional[str] = None


# ── Create, Update, Send Schemas ─────────────────────────────────────────────

class EmailDraftCreate(BaseModel):
    contact_id: int
    job_id: Optional[int] = None
    recipient_email: Optional[str] = None
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=1)
    template_id: Optional[str] = "direct_inquiry"


class EmailUpdate(BaseModel):
    subject: Optional[str] = Field(None, max_length=500)
    body: Optional[str] = None
    recipient_email: Optional[str] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_upper = v.upper().strip()
        if v_upper not in ALLOWED_EMAIL_STATUSES:
            raise ValueError(f"status must be one of {sorted(ALLOWED_EMAIL_STATUSES)}. Got: {v!r}")
        return v_upper


class EmailSendRequest(BaseModel):
    allow_inferred: bool = Field(
        False,
        description="Explicit user confirmation required if sending to an address with INFERRED verification status",
    )
    force_approve: bool = Field(
        False,
        description="Automatically approve and send in a single user confirmation step",
    )
    simulate: Optional[bool] = Field(
        None,
        description="Override system simulation flag (e.g. for testing)",
    )


# ── Response Schemas ─────────────────────────────────────────────────────────

class EmailResponse(BaseModel):
    id: int
    contact_id: int
    job_id: Optional[int] = None
    recipient_email: Optional[str] = None
    subject: str
    body: str
    template_id: Optional[str] = None
    user_edited: int = 0
    status: str
    provider: str = "simulated"
    retry_count: int = 0
    approved_at: Optional[datetime.datetime] = None
    queued_at: Optional[datetime.datetime] = None
    sent_at: Optional[datetime.datetime] = None
    replied_at: Optional[datetime.datetime] = None
    error_message: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    # Embedded contact/job context for convenient UI display
    contact_name: Optional[str] = None
    contact_company: Optional[str] = None
    contact_role: Optional[str] = None
    contact_verification_status: Optional[str] = None
    job_title: Optional[str] = None

    model_config = {"from_attributes": True}


class EmailListResponse(BaseModel):
    total: int
    items: List[EmailResponse]
    status_distribution: Dict[str, int] = Field(default_factory=dict)


class QueueProcessResponse(BaseModel):
    processed: int
    sent: int
    failed: int
    rate_limited: int
    remaining_queued: int
    details: List[Dict[str, Any]] = Field(default_factory=list)


class OutreachStatsResponse(BaseModel):
    emails_drafted: int = 0
    emails_approved: int = 0
    emails_queued: int = 0
    emails_sent: int = 0
    emails_replied: int = 0
    emails_failed: int = 0
    emails_bounced: int = 0
    rate_limit: Dict[str, Any] = Field(default_factory=dict)
    provider_status: Dict[str, Any] = Field(default_factory=dict)
