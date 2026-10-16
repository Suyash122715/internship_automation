"""
Batch 6 — API Endpoints for Browser-Based Application Automation (Playwright)

Endpoints:
  POST /api/v1/automation/detect   — Detect fields on application page
  POST /api/v1/automation/fill     — Fill known profile fields & attach documents
  POST /api/v1/automation/submit   — Submit application with explicit user approval
  GET  /api/v1/automation/status/{job_id} — Get automation review state for job
"""

import os
import datetime
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.job import Job
from backend.app.models.profile import UserProfile
from backend.app.models.application import Application
from backend.app.schemas.automation import (
    DetectFieldsRequest,
    FillFormRequest,
    FormSessionResponse,
    SubmitApplicationRequest,
    SubmitApplicationResponse,
    DetectedField,
    UnknownQuestion,
)
from backend.app.services.browser_assistant import detect_and_fill_application_form
from backend.app.api.v1.endpoints.matching import _profile_to_dict

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_profile_and_job_and_app(db: Session, job_id: int):
    profile = db.query(UserProfile).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user profile found. Please complete your profile before automating applications.",
        )

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found.",
        )

    app_record = db.query(Application).filter(Application.job_id == job_id).first()

    return _profile_to_dict(profile), job, app_record, profile


# ── 1. Detect Fields Only ─────────────────────────────────────

@router.post(
    "/detect",
    response_model=FormSessionResponse,
    summary="Detect Application Fields (Dry-Run)",
)
async def detect_fields_endpoint(
    payload: DetectFieldsRequest,
    db: Session = Depends(get_db),
):
    """
    Open application URL with Playwright, analyze DOM, classify fields, and detect CAPTCHAs.
    Does not modify the page.
    """
    profile_dict, job, app_record, _ = _get_profile_and_job_and_app(db, payload.job_id)
    url = payload.application_url or job.application_url

    if not url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Job has no application URL specified.",
        )

    result = await detect_and_fill_application_form(
        url=url,
        profile=profile_dict,
        perform_fill=False,
        submit_form=False,
        headless=payload.headless,
    )

    detected = [DetectedField(**f) for f in result.get("detected_fields", [])]
    unknown = [UnknownQuestion(**q) for q in result.get("unknown_questions", [])]

    return FormSessionResponse(
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        application_url=url,
        page_title=result.get("page_title", ""),
        status=result.get("status", "PREPARED"),
        captcha_detected=result.get("captcha_detected", False),
        captcha_notice=result.get("captcha_notice"),
        detected_fields=detected,
        filled_fields=[],
        unknown_questions=unknown,
        files_attached=[],
        submission_ready=result.get("submission_ready", False),
        notes=result.get("notes", []),
    )


# ── 2. Fill Form & Prepare Review ─────────────────────────────

@router.post(
    "/fill",
    response_model=FormSessionResponse,
    summary="Auto-Fill Known Fields & Attach Documents",
)
async def fill_form_endpoint(
    payload: FillFormRequest,
    db: Session = Depends(get_db),
):
    """
    Open application URL, auto-fill known profile values, attach tailored resume
    and cover letter, identify unknown questions, and produce a review screen report.
    Advances status to READY if all required fields are satisfied.
    """
    profile_dict, job, app_record, user_profile = _get_profile_and_job_and_app(db, payload.job_id)
    url = payload.application_url or job.application_url

    if not url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Job has no application URL specified.",
        )

    # Document paths
    tailored_resume = app_record.tailored_resume_path if (app_record and payload.use_tailored_resume) else None
    master_resume = user_profile.master_resume_path
    cover_letter = app_record.cover_letter_path if (app_record and payload.use_cover_letter) else None

    result = await detect_and_fill_application_form(
        url=url,
        profile=profile_dict,
        tailored_resume_path=tailored_resume,
        master_resume_path=master_resume,
        cover_letter_path=cover_letter,
        custom_answers=payload.custom_answers,
        perform_fill=True,
        submit_form=False,
        headless=payload.headless,
    )

    # Update Application record status in DB
    new_status = result.get("status", "READY")
    if not app_record:
        app_record = Application(
            job_id=job.id,
            status=new_status,
            tailored_resume_path=tailored_resume,
            cover_letter_path=cover_letter,
        )
        db.add(app_record)
    else:
        app_record.status = new_status
        app_record.updated_at = datetime.datetime.utcnow()

    # Update Job status
    if new_status in ["READY", "PREPARED"]:
        job.status = new_status
        job.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(app_record)

    detected = [DetectedField(**f) for f in result.get("detected_fields", [])]
    filled = [DetectedField(**f) for f in result.get("filled_fields", [])]
    unknown = [UnknownQuestion(**q) for q in result.get("unknown_questions", [])]

    return FormSessionResponse(
        job_id=job.id,
        job_title=job.title,
        company=job.company,
        application_url=url,
        page_title=result.get("page_title", ""),
        status=app_record.status,
        captcha_detected=result.get("captcha_detected", False),
        captcha_notice=result.get("captcha_notice"),
        detected_fields=detected,
        filled_fields=filled,
        unknown_questions=unknown,
        files_attached=result.get("files_attached", []),
        submission_ready=result.get("submission_ready", False),
        notes=result.get("notes", []),
    )


# ── 3. Submit Application (Explicit User Approval Guard) ──────

@router.post(
    "/submit",
    response_model=SubmitApplicationResponse,
    summary="Submit Application (Explicit Approval Required)",
)
async def submit_application_endpoint(
    payload: SubmitApplicationRequest,
    db: Session = Depends(get_db),
):
    """
    Submits the application only after explicit user approval.
    PRD Rule: Never submits without user approval.
    Advances Application and Job status to APPLIED.
    """
    if not payload.user_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application submission aborted: user_approved must be True. Automation will never submit without explicit approval.",
        )

    profile_dict, job, app_record, user_profile = _get_profile_and_job_and_app(db, payload.job_id)
    url = payload.application_url or job.application_url

    if not url:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Job has no application URL specified.",
        )

    tailored_resume = app_record.tailored_resume_path if app_record else None
    master_resume = user_profile.master_resume_path
    cover_letter = app_record.cover_letter_path if app_record else None

    result = await detect_and_fill_application_form(
        url=url,
        profile=profile_dict,
        tailored_resume_path=tailored_resume,
        master_resume_path=master_resume,
        cover_letter_path=cover_letter,
        custom_answers=payload.custom_answers,
        perform_fill=True,
        submit_form=True,
        headless=payload.headless,
    )

    if result.get("captcha_detected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission stopped: Anti-bot / CAPTCHA detected. User must complete in browser.",
        )

    applied_time = datetime.datetime.utcnow()

    # Update database records
    if not app_record:
        app_record = Application(
            job_id=job.id,
            status="APPLIED",
            applied_at=applied_time,
        )
        db.add(app_record)
    else:
        app_record.status = "APPLIED"
        app_record.applied_at = applied_time
        app_record.updated_at = applied_time

    job.status = "APPLIED"
    job.updated_at = applied_time

    db.commit()
    db.refresh(app_record)

    return SubmitApplicationResponse(
        job_id=job.id,
        status="APPLIED",
        success=True,
        applied_at=applied_time.isoformat() + "Z",
        confirmation_message=result.get("confirmation_message", "Application submitted successfully."),
        final_url=result.get("final_url", url),
        notes=result.get("notes", []),
    )
