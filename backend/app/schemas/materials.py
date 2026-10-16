"""
Pydantic schemas for Batch 5 — Application Materials & Tailoring.
"""

import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ModificationItem(BaseModel):
    section: str
    change_type: str
    reason: str
    details: str


class TruthfulnessAudit(BaseModel):
    hallucinated_skills_count: int = 0
    hallucinated_projects_count: int = 0
    hallucinated_experience_count: int = 0
    hallucinated_facts_count: int = 0
    is_source_grounded: bool = True
    source_profile_name: str = ""
    target_job: Optional[str] = None
    verified_company_used: Optional[str] = None
    verified_role_used: Optional[str] = None


class TailorResumeRequest(BaseModel):
    job_id: int
    save_to_db: bool = True


class TailorResumeResponse(BaseModel):
    job_id: int
    resume_markdown: str
    resume_text: str
    modifications_log: List[Dict[str, Any]] = Field(default_factory=list)
    prioritized_skills: List[str] = Field(default_factory=list)
    highlighted_projects: List[Dict[str, Any]] = Field(default_factory=list)
    highlighted_experience: List[Dict[str, Any]] = Field(default_factory=list)
    truthfulness_audit: Dict[str, Any]


class CoverLetterRequest(BaseModel):
    job_id: int
    save_to_db: bool = True


class CoverLetterResponse(BaseModel):
    job_id: int
    cover_letter_markdown: str
    cover_letter_text: str
    grounding_notes: List[str] = Field(default_factory=list)
    truthfulness_audit: Dict[str, Any]


class GenerateAllMaterialsRequest(BaseModel):
    job_id: int
    submission_notes: Optional[str] = None


class ApplicationMaterialsResponse(BaseModel):
    application_id: Optional[int] = None
    job_id: int
    job_title: str
    company: str
    status: str
    tailored_resume_markdown: Optional[str] = None
    tailored_resume_text: Optional[str] = None
    cover_letter_markdown: Optional[str] = None
    cover_letter_text: Optional[str] = None
    modifications_log: List[Dict[str, Any]] = Field(default_factory=list)
    grounding_notes: List[str] = Field(default_factory=list)
    truthfulness_audit: Dict[str, Any] = Field(default_factory=dict)
    tailored_resume_path: Optional[str] = None
    cover_letter_path: Optional[str] = None
    submission_notes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    updated_at: Optional[datetime.datetime] = None


class UpdateMaterialsRequest(BaseModel):
    tailored_resume_text: Optional[str] = None
    cover_letter_text: Optional[str] = None
    submission_notes: Optional[str] = None
