"""
Pydantic schemas for Batch 6 — Browser-Based Application Automation & Assistant.
"""

import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DetectedField(BaseModel):
    selector: str
    field_name: str
    field_type: str = "text"
    label: str = ""
    classification: str = "UNKNOWN_FIELD"  # e.g., FIRST_NAME, EMAIL, RESUME, CUSTOM_QUESTION
    mapped_value: Optional[str] = None
    is_required: bool = False
    is_filled: bool = False
    options: Optional[List[str]] = None


class UnknownQuestion(BaseModel):
    field_id: str
    selector: str
    label: str
    field_type: str = "text"
    is_required: bool = False
    options: Optional[List[str]] = None
    current_value: Optional[str] = None
    user_answer: Optional[str] = None
    help_text: Optional[str] = None


class DetectFieldsRequest(BaseModel):
    job_id: int
    application_url: Optional[str] = None
    headless: bool = True


class FillFormRequest(BaseModel):
    job_id: int
    application_url: Optional[str] = None
    use_tailored_resume: bool = True
    use_cover_letter: bool = True
    custom_answers: Optional[Dict[str, str]] = Field(default_factory=dict, description="Answers to unknown/custom questions")
    headless: bool = True


class FormSessionResponse(BaseModel):
    job_id: int
    job_title: str
    company: str
    application_url: str
    page_title: str = ""
    status: str = "PREPARED"  # PREPARED, READY, NEEDS_INPUT, BLOCKED_CAPTCHA, APPLIED
    captcha_detected: bool = False
    captcha_notice: Optional[str] = None
    detected_fields: List[DetectedField] = Field(default_factory=list)
    filled_fields: List[DetectedField] = Field(default_factory=list)
    unknown_questions: List[UnknownQuestion] = Field(default_factory=list)
    files_attached: List[Dict[str, str]] = Field(default_factory=list)
    submission_ready: bool = False
    notes: List[str] = Field(default_factory=list)


class SubmitApplicationRequest(BaseModel):
    job_id: int
    user_approved: bool = Field(..., description="Explicit user approval is strictly required before submission")
    application_url: Optional[str] = None
    custom_answers: Optional[Dict[str, str]] = Field(default_factory=dict)
    headless: bool = True


class SubmitApplicationResponse(BaseModel):
    job_id: int
    status: str
    success: bool
    applied_at: Optional[str] = None
    confirmation_message: str
    final_url: str = ""
    notes: List[str] = Field(default_factory=list)
