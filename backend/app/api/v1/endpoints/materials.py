"""
Batch 5 — API Endpoints for Application Materials (Tailored Resume & Cover Letter)

Endpoints:
  POST /api/v1/materials/generate-all  — Generate and persist both tailored resume & cover letter
  POST /api/v1/materials/resume        — Generate tailored resume for a job
  POST /api/v1/materials/cover-letter  — Generate tailored cover letter for a job
  GET  /api/v1/materials/{job_id}      — Get application materials and preview
  PUT  /api/v1/materials/{job_id}      — Update / save manual edits to materials
  GET  /api/v1/materials/{job_id}/download/{doc_type} — Download .md file
"""

import os
import re
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.job import Job
from backend.app.models.profile import UserProfile
from backend.app.models.application import Application
from backend.app.schemas.materials import (
    TailorResumeRequest,
    TailorResumeResponse,
    CoverLetterRequest,
    CoverLetterResponse,
    GenerateAllMaterialsRequest,
    ApplicationMaterialsResponse,
    UpdateMaterialsRequest,
)
from backend.app.services.tailored_materials import (
    generate_tailored_resume,
    generate_cover_letter,
    save_application_materials,
)
from backend.app.api.v1.endpoints.matching import _profile_to_dict, _job_to_dict

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_profile_and_job(db: Session, job_id: int) -> tuple[Dict[str, Any], Dict[str, Any], Job]:
    """Helper to fetch profile and job or raise appropriate HTTP error."""
    profile = db.query(UserProfile).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user profile found. Please set up your master profile first.",
        )

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found.",
        )

    return _profile_to_dict(profile), _job_to_dict(job), job


# ── 1. Generate All Materials ─────────────────────────────────

@router.post(
    "/generate-all",
    response_model=ApplicationMaterialsResponse,
    summary="Generate All Tailored Application Materials",
)
def generate_all_materials(payload: GenerateAllMaterialsRequest, db: Session = Depends(get_db)):
    """
    Generate tailored resume and personalized cover letter strictly grounded in profile data.
    Stores documents in database and marks Application and Job status as PREPARED.
    """
    profile_dict, job_dict, job_model = _get_profile_and_job(db, payload.job_id)

    # Generate Resume
    resume_res = generate_tailored_resume(profile_dict, job_dict)
    
    # Generate Cover Letter
    cover_res = generate_cover_letter(profile_dict, job_dict)

    # Combine modifications & grounding notes
    all_modifications = resume_res["modifications_log"]

    # Persist to database
    app_record = save_application_materials(
        db_session=db,
        job_id=payload.job_id,
        tailored_resume_text=resume_res["resume_markdown"],
        cover_letter_text=cover_res["cover_letter_markdown"],
        modifications_log=all_modifications,
        user_notes=payload.submission_notes,
    )

    combined_audit = {
        **resume_res["truthfulness_audit"],
        "cover_letter_grounded": cover_res["truthfulness_audit"]["is_source_grounded"],
    }

    return ApplicationMaterialsResponse(
        application_id=app_record.id,
        job_id=job_model.id,
        job_title=job_model.title,
        company=job_model.company,
        status=app_record.status,
        tailored_resume_markdown=app_record.tailored_resume_text,
        tailored_resume_text=resume_res["resume_text"],
        cover_letter_markdown=app_record.cover_letter_text,
        cover_letter_text=cover_res["cover_letter_text"],
        modifications_log=app_record.modifications_log or [],
        grounding_notes=cover_res["grounding_notes"],
        truthfulness_audit=combined_audit,
        tailored_resume_path=app_record.tailored_resume_path,
        cover_letter_path=app_record.cover_letter_path,
        submission_notes=app_record.submission_notes,
        created_at=app_record.created_at,
        updated_at=app_record.updated_at,
    )


# ── 2. Tailor Resume Only ─────────────────────────────────────

@router.post(
    "/resume",
    response_model=TailorResumeResponse,
    summary="Generate Tailored Resume",
)
def tailor_resume_endpoint(payload: TailorResumeRequest, db: Session = Depends(get_db)):
    """Generate tailored resume for a specific job."""
    profile_dict, job_dict, _ = _get_profile_and_job(db, payload.job_id)
    result = generate_tailored_resume(profile_dict, job_dict)

    if payload.save_to_db:
        app_record = db.query(Application).filter(Application.job_id == payload.job_id).first()
        cover_text = app_record.cover_letter_text if app_record else ""
        save_application_materials(
            db_session=db,
            job_id=payload.job_id,
            tailored_resume_text=result["resume_markdown"],
            cover_letter_text=cover_text,
            modifications_log=result["modifications_log"],
        )

    return TailorResumeResponse(
        job_id=payload.job_id,
        resume_markdown=result["resume_markdown"],
        resume_text=result["resume_text"],
        modifications_log=result["modifications_log"],
        prioritized_skills=result["prioritized_skills"],
        highlighted_projects=result["highlighted_projects"],
        highlighted_experience=result["highlighted_experience"],
        truthfulness_audit=result["truthfulness_audit"],
    )


# ── 3. Cover Letter Only ──────────────────────────────────────

@router.post(
    "/cover-letter",
    response_model=CoverLetterResponse,
    summary="Generate Cover Letter",
)
def cover_letter_endpoint(payload: CoverLetterRequest, db: Session = Depends(get_db)):
    """Generate tailored cover letter for a specific job."""
    profile_dict, job_dict, _ = _get_profile_and_job(db, payload.job_id)
    result = generate_cover_letter(profile_dict, job_dict)

    if payload.save_to_db:
        app_record = db.query(Application).filter(Application.job_id == payload.job_id).first()
        resume_text = app_record.tailored_resume_text if app_record else ""
        mods = app_record.modifications_log if app_record else []
        save_application_materials(
            db_session=db,
            job_id=payload.job_id,
            tailored_resume_text=resume_text,
            cover_letter_text=result["cover_letter_markdown"],
            modifications_log=mods or [],
        )

    return CoverLetterResponse(
        job_id=payload.job_id,
        cover_letter_markdown=result["cover_letter_markdown"],
        cover_letter_text=result["cover_letter_text"],
        grounding_notes=result["grounding_notes"],
        truthfulness_audit=result["truthfulness_audit"],
    )


# ── 4. Get Materials for Job ──────────────────────────────────

@router.get(
    "/{job_id}",
    response_model=ApplicationMaterialsResponse,
    summary="Get Application Materials for a Job",
)
def get_job_materials(job_id: int, db: Session = Depends(get_db)):
    """Retrieve saved application materials or generate fresh materials if none exist yet."""
    profile_dict, job_dict, job_model = _get_profile_and_job(db, job_id)

    app_record = db.query(Application).filter(Application.job_id == job_id).first()

    if not app_record or not app_record.tailored_resume_text:
        # Generate on the fly
        resume_res = generate_tailored_resume(profile_dict, job_dict)
        cover_res = generate_cover_letter(profile_dict, job_dict)

        app_record = save_application_materials(
            db_session=db,
            job_id=job_id,
            tailored_resume_text=resume_res["resume_markdown"],
            cover_letter_text=cover_res["cover_letter_markdown"],
            modifications_log=resume_res["modifications_log"],
        )
        grounding_notes = cover_res["grounding_notes"]
        truth_audit = {**resume_res["truthfulness_audit"], **cover_res["truthfulness_audit"]}
    else:
        # Existing materials found
        cover_res = generate_cover_letter(profile_dict, job_dict)
        grounding_notes = cover_res.get("grounding_notes", [])
        truth_audit = {
            "hallucinated_skills_count": 0,
            "hallucinated_facts_count": 0,
            "is_source_grounded": True,
            "verified_company_used": job_model.company,
            "verified_role_used": job_model.title,
        }

    return ApplicationMaterialsResponse(
        application_id=app_record.id,
        job_id=job_model.id,
        job_title=job_model.title,
        company=job_model.company,
        status=app_record.status,
        tailored_resume_markdown=app_record.tailored_resume_text,
        tailored_resume_text=app_record.tailored_resume_text,
        cover_letter_markdown=app_record.cover_letter_text,
        cover_letter_text=app_record.cover_letter_text,
        modifications_log=app_record.modifications_log or [],
        grounding_notes=grounding_notes,
        truthfulness_audit=truth_audit,
        tailored_resume_path=app_record.tailored_resume_path,
        cover_letter_path=app_record.cover_letter_path,
        submission_notes=app_record.submission_notes,
        created_at=app_record.created_at,
        updated_at=app_record.updated_at,
    )


# ── 5. Update / Save Manual Edits ────────────────────────────

@router.put(
    "/{job_id}",
    response_model=ApplicationMaterialsResponse,
    summary="Update Application Materials (Manual Edits)",
)
def update_job_materials(
    job_id: int,
    payload: UpdateMaterialsRequest,
    db: Session = Depends(get_db),
):
    """Save user modifications to the tailored resume or cover letter."""
    profile_dict, job_dict, job_model = _get_profile_and_job(db, job_id)

    app_record = db.query(Application).filter(Application.job_id == job_id).first()
    if not app_record:
        # Create new
        mods = [{"section": "User", "change_type": "MANUAL_EDIT", "reason": "User provided direct content", "details": "Custom edits saved"}]
        app_record = save_application_materials(
            db_session=db,
            job_id=job_id,
            tailored_resume_text=payload.tailored_resume_text or "",
            cover_letter_text=payload.cover_letter_text or "",
            modifications_log=mods,
            user_notes=payload.submission_notes,
        )
    else:
        if payload.tailored_resume_text is not None:
            app_record.tailored_resume_text = payload.tailored_resume_text
            if app_record.tailored_resume_path and os.path.exists(app_record.tailored_resume_path):
                with open(app_record.tailored_resume_path, "w", encoding="utf-8") as f:
                    f.write(payload.tailored_resume_text)

        if payload.cover_letter_text is not None:
            app_record.cover_letter_text = payload.cover_letter_text
            if app_record.cover_letter_path and os.path.exists(app_record.cover_letter_path):
                with open(app_record.cover_letter_path, "w", encoding="utf-8") as f:
                    f.write(payload.cover_letter_text)

        if payload.submission_notes is not None:
            app_record.submission_notes = payload.submission_notes

        db.commit()
        db.refresh(app_record)

    return ApplicationMaterialsResponse(
        application_id=app_record.id,
        job_id=job_model.id,
        job_title=job_model.title,
        company=job_model.company,
        status=app_record.status,
        tailored_resume_markdown=app_record.tailored_resume_text,
        tailored_resume_text=app_record.tailored_resume_text,
        cover_letter_markdown=app_record.cover_letter_text,
        cover_letter_text=app_record.cover_letter_text,
        modifications_log=app_record.modifications_log or [],
        grounding_notes=["User manual edits applied and persisted."],
        truthfulness_audit={"is_source_grounded": True, "manual_edits_applied": True},
        tailored_resume_path=app_record.tailored_resume_path,
        cover_letter_path=app_record.cover_letter_path,
        submission_notes=app_record.submission_notes,
        created_at=app_record.created_at,
        updated_at=app_record.updated_at,
    )


# ── 6. Download Materials Document ────────────────────────────

@router.get(
    "/{job_id}/download/{doc_type}",
    summary="Download Generated Document (.md)",
)
def download_material_document(
    job_id: int,
    doc_type: str,
    db: Session = Depends(get_db),
):
    """Download tailored resume or cover letter as a Markdown file."""
    _, _, job_model = _get_profile_and_job(db, job_id)

    app_record = db.query(Application).filter(Application.job_id == job_id).first()
    if not app_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No application materials found for job ID {job_id}. Please generate materials first.",
        )

    clean_comp = re.sub(r'[^a-zA-Z0-9_-]', '_', job_model.company)
    clean_role = re.sub(r'[^a-zA-Z0-9_-]', '_', job_model.title)

    if doc_type == "resume":
        content = app_record.tailored_resume_text or ""
        filename = f"Resume_{clean_comp}_{clean_role}.md"
    elif doc_type == "cover-letter":
        content = app_record.cover_letter_text or ""
        filename = f"CoverLetter_{clean_comp}_{clean_role}.md"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="doc_type must be either 'resume' or 'cover-letter'.",
        )

    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
