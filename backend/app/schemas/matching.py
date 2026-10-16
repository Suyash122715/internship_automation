"""Pydantic schemas for Batch 4 — JD Analysis & Profile Matching."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ── JD Analysis ───────────────────────────────────────────────

class JDAnalysisRequest(BaseModel):
    """Request to analyze a job description text."""
    description: str = Field(..., min_length=1, description="Raw job description text to analyze")


class JDAnalysisResponse(BaseModel):
    """Structured output from JD analysis."""
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    inferred_skills: List[str] = Field(default_factory=list, description="Skills found but could not be classified — marked UNCERTAIN")
    education: List[Dict[str, str]] = Field(default_factory=list)
    experience: Optional[Dict[str, Any]] = None
    responsibilities: List[str] = Field(default_factory=list)
    requirements_raw: List[Dict[str, str]] = Field(default_factory=list, description="[{text, classification}]")
    location_requirements: List[str] = Field(default_factory=list)
    other_requirements: List[str] = Field(default_factory=list)
    analysis_method: str = "deterministic_rule_based"
    confidence_note: str = ""


# ── Matching ──────────────────────────────────────────────────

class MatchRequest(BaseModel):
    """Request to match a specific job against the user's profile."""
    job_id: int
    custom_weights: Optional[Dict[str, float]] = Field(
        None,
        description="Optional custom weights: {skills, education, experience, location, role_relevance}. Must sum to ~1.0.",
    )


class MatchBreakdown(BaseModel):
    skills: float
    education: float
    experience: float
    location: float
    role_relevance: float


class MatchResponse(BaseModel):
    job_id: int
    overall_score: float = Field(..., description="0-100 compatibility score")
    breakdown: MatchBreakdown
    weights_used: Dict[str, float]
    explanation: str = Field(..., description="Human-readable multi-line explanation")
    matching_details: Dict[str, Any] = Field(default_factory=dict, description="Detailed per-dimension evidence")
    jd_analysis: JDAnalysisResponse
    profile_skills_used: List[str] = Field(default_factory=list, description="Skills from user profile that were considered")
    method: str = "deterministic_rule_based"
    status_updated: bool = Field(False, description="True if job status was advanced to ANALYZED")


class BatchMatchRequest(BaseModel):
    """Request to match multiple jobs in one call."""
    job_ids: List[int] = Field(..., min_length=1, max_length=50)
    custom_weights: Optional[Dict[str, float]] = None


class BatchMatchSummary(BaseModel):
    job_id: int
    title: str
    company: str
    overall_score: float
    breakdown: MatchBreakdown
    status_updated: bool = False


class BatchMatchResponse(BaseModel):
    total_matched: int
    results: List[BatchMatchSummary]
    profile_complete: bool = Field(..., description="Whether the user profile had enough data to match meaningfully")
    method: str = "deterministic_rule_based"
