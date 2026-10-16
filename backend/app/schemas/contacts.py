"""
Pydantic schemas for Batch 7 — HR / Recruiter Contact Discovery & Management.

PRD Section 13 requirements:
  Contact fields: name, company, role, email, linkedin, source, confidence/status.

Strict truthfulness rules enforced here:
  - verification_status must be one of: VERIFIED, PUBLIC, INFERRED, UNKNOWN
  - email is optional; NEVER auto-generated or inferred and presented as verified
  - confidence_level must be one of: HIGH, MEDIUM, LOW, UNKNOWN
  - All fields that are absent are explicitly None, never guessed
"""

import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ── Allowed value sets (PRD-mandated) ─────────────────────────────────────────

ALLOWED_VERIFICATION_STATUSES = {"VERIFIED", "PUBLIC", "INFERRED", "UNKNOWN"}
ALLOWED_CONFIDENCE_LEVELS = {"HIGH", "MEDIUM", "LOW", "UNKNOWN"}
ALLOWED_OUTREACH_STATUSES = {
    "CONTACT FOUND", "EMAIL DRAFTED", "APPROVED", "SENT",
    "REPLIED", "NO RESPONSE", "FOLLOW-UP", "BOUNCED",
}


# ── Create / Update schemas ────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    """
    Request body for creating a new contact record.
    All contact information must come from real, citable sources — never fabricated.
    """
    name: str = Field(..., min_length=1, max_length=255, description="Full name of the recruiter/HR contact")
    company: str = Field(..., min_length=1, max_length=255, description="Company the contact works for")
    role: Optional[str] = Field(None, max_length=255, description="Job title/role (e.g. Technical Recruiter, HR Manager)")

    # Contact channels — all optional; presence does not imply verification
    email: Optional[str] = Field(
        None,
        description=(
            "Email address IF known from a public source. "
            "NEVER provide an inferred/guessed email without setting verification_status=INFERRED."
        ),
    )
    linkedin: Optional[str] = Field(None, max_length=500, description="LinkedIn profile URL (public)")
    profile_url: Optional[str] = Field(None, max_length=1000, description="Any other public profile or company directory URL")

    # Provenance
    source: Optional[str] = Field(None, max_length=100, description="Where was this contact found: LinkedIn, Company Website, Manual, etc.")
    source_url: Optional[str] = Field(None, max_length=1000, description="URL of the page where the contact was found")

    # Trust level — required, must be explicit
    verification_status: str = Field(
        "UNKNOWN",
        description="VERIFIED | PUBLIC | INFERRED | UNKNOWN. NEVER set to VERIFIED without real evidence.",
    )
    confidence_level: str = Field(
        "UNKNOWN",
        description="HIGH | MEDIUM | LOW | UNKNOWN",
    )

    # Optional context
    job_id: Optional[int] = Field(None, description="Job that triggered this contact discovery (optional)")
    discovery_notes: Optional[str] = Field(None, description="Human-readable notes about how/where this contact was found")

    @field_validator("verification_status")
    @classmethod
    def validate_verification_status(cls, v: str) -> str:
        v = v.upper().strip()
        if v not in ALLOWED_VERIFICATION_STATUSES:
            raise ValueError(
                f"verification_status must be one of {sorted(ALLOWED_VERIFICATION_STATUSES)}. "
                f"Got: {v!r}. NEVER fabricate verification."
            )
        return v

    @field_validator("confidence_level")
    @classmethod
    def validate_confidence_level(cls, v: str) -> str:
        v = v.upper().strip()
        if v not in ALLOWED_CONFIDENCE_LEVELS:
            raise ValueError(
                f"confidence_level must be one of {sorted(ALLOWED_CONFIDENCE_LEVELS)}. Got: {v!r}."
            )
        return v


class ContactUpdate(BaseModel):
    """Partial update — all fields optional. Only updates fields explicitly provided."""
    name: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None)
    linkedin: Optional[str] = Field(None, max_length=500)
    profile_url: Optional[str] = Field(None, max_length=1000)
    source: Optional[str] = Field(None, max_length=100)
    source_url: Optional[str] = Field(None, max_length=1000)
    verification_status: Optional[str] = Field(None)
    confidence_level: Optional[str] = Field(None)
    job_id: Optional[int] = Field(None)
    discovery_notes: Optional[str] = Field(None)
    outreach_status: Optional[str] = Field(None)

    @field_validator("verification_status")
    @classmethod
    def validate_verification_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.upper().strip()
        if v not in ALLOWED_VERIFICATION_STATUSES:
            raise ValueError(f"verification_status must be one of {sorted(ALLOWED_VERIFICATION_STATUSES)}. Got: {v!r}.")
        return v

    @field_validator("confidence_level")
    @classmethod
    def validate_confidence_level(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.upper().strip()
        if v not in ALLOWED_CONFIDENCE_LEVELS:
            raise ValueError(f"confidence_level must be one of {sorted(ALLOWED_CONFIDENCE_LEVELS)}. Got: {v!r}.")
        return v

    @field_validator("outreach_status")
    @classmethod
    def validate_outreach_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_upper = v.upper().strip()
        if v_upper not in ALLOWED_OUTREACH_STATUSES:
            raise ValueError(f"outreach_status must be one of {sorted(ALLOWED_OUTREACH_STATUSES)}. Got: {v!r}.")
        return v_upper


# ── Response schemas ───────────────────────────────────────────────────────────

class ContactResponse(BaseModel):
    """Full contact record returned from the API."""
    id: int
    name: str
    company: str
    role: Optional[str]

    # Contact channels — explicitly None when unavailable, never guessed
    email: Optional[str]
    linkedin: Optional[str]
    profile_url: Optional[str]

    # Provenance
    source: Optional[str]
    source_url: Optional[str]

    # Trust classification
    verification_status: str
    confidence_level: str

    # Context
    job_id: Optional[int]
    discovery_notes: Optional[str]
    outreach_status: str

    created_at: datetime.datetime
    updated_at: datetime.datetime

    # Human-readable label for the UI
    @property
    def trust_label(self) -> str:
        """Returns a human-readable trust description per PRD Section 13."""
        labels = {
            "VERIFIED": "Verified Contact",
            "PUBLIC": "Publicly Listed Contact",
            "INFERRED": "Inferred / Unverified Contact",
            "UNKNOWN": "Unknown Source",
        }
        return labels.get(self.verification_status, "Unknown Source")

    model_config = {"from_attributes": True}


class ContactListResponse(BaseModel):
    """Paginated list of contact records."""
    total: int
    items: List[ContactResponse]
    company_distribution: dict = Field(default_factory=dict)
    status_distribution: dict = Field(default_factory=dict)


class ContactSearchRequest(BaseModel):
    """Search/filter request for contacts."""
    q: Optional[str] = Field(None, description="Free-text search across name, company, role")
    company: Optional[str] = Field(None)
    verification_status: Optional[str] = Field(None)
    outreach_status: Optional[str] = Field(None)
    job_id: Optional[int] = Field(None)
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=200)
