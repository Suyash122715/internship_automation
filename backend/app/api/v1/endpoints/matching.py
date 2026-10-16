"""
Batch 4 — API Endpoints for JD Analysis & Profile Matching

Endpoints:
  POST /analyze-jd          — Analyze raw JD text
  GET  /{job_id}/analyze    — Analyze a stored job's description + persist results
  POST /match               — Match a single job against user profile
  POST /match/batch         — Match multiple jobs against user profile
"""

import logging
import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.job import Job
from backend.app.models.profile import UserProfile, InternshipPreference
from backend.app.schemas.matching import (
    JDAnalysisRequest,
    JDAnalysisResponse,
    MatchRequest,
    MatchResponse,
    MatchBreakdown,
    BatchMatchRequest,
    BatchMatchResponse,
    BatchMatchSummary,
)
from backend.app.services.jd_analyzer import analyze_job_description
from backend.app.services.matching_engine import compute_match

logger = logging.getLogger(__name__)

router = APIRouter()


def _profile_to_dict(profile: UserProfile) -> Dict[str, Any]:
    """Convert SQLAlchemy UserProfile to plain dict for matching engine."""
    return {
        "name": profile.name,
        "email": profile.email,
        "phone": profile.phone,
        "location": profile.location,
        "bio": profile.bio,
        "college": profile.college,
        "degree": profile.degree,
        "branch": profile.branch,
        "graduation_year": profile.graduation_year,
        "cgpa": profile.cgpa,
        "education_history": profile.education_history or [],
        "skills": profile.skills or [],
        "projects": profile.projects or [],
        "experience": profile.experience or [],
        "certifications": profile.certifications or [],
        "github": profile.github,
        "linkedin": profile.linkedin,
        "portfolio": profile.portfolio,
        "master_resume_text": profile.master_resume_text,
    }


def _preferences_to_dict(pref: Optional[InternshipPreference]) -> Optional[Dict[str, Any]]:
    if not pref:
        return None
    return {
        "target_roles": pref.target_roles or [],
        "preferred_locations": pref.preferred_locations or [],
        "work_modes": pref.work_modes or [],
        "skills": pref.skills or [],
        "minimum_match_score": pref.minimum_match_score,
        "excluded_roles": pref.excluded_roles or [],
        "excluded_companies": pref.excluded_companies or [],
    }


def _job_to_dict(job: Job) -> Dict[str, Any]:
    """Convert SQLAlchemy Job to plain dict for matching engine."""
    return {
        "id": job.id,
        "company": job.company,
        "title": job.title,
        "location": job.location,
        "workplace_type": job.workplace_type,
        "employment_type": job.employment_type,
        "description": job.description,
        "skills": job.skills or [],
        "requirements": job.requirements or [],
        "required_skills": job.required_skills or [],
        "preferred_skills": job.preferred_skills or [],
        "salary_or_stipend": job.salary_or_stipend,
        "application_url": job.application_url,
        "source": job.source,
        "status": job.status,
    }


def _get_profile_or_error(db: Session) -> UserProfile:
    """Load user profile or raise 404."""
    profile = db.query(UserProfile).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user profile found. Please create your profile first (Profile tab) before running match analysis.",
        )
    # Check if profile has minimum data
    has_skills = bool(profile.skills and len(profile.skills) > 0)
    has_name = bool(profile.name and profile.name.strip())
    if not has_name and not has_skills:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="User profile is too sparse for meaningful matching. Please add at least your name and skills.",
        )
    return profile


# ── Endpoint: Analyze raw JD text ─────────────────────────────

@router.post(
    "/analyze-jd",
    response_model=JDAnalysisResponse,
    summary="Analyze Job Description Text",
)
def analyze_jd_text(payload: JDAnalysisRequest):
    """
    Parse a raw job description and extract structured requirements.
    Separates REQUIRED vs PREFERRED vs INFERRED/UNCERTAIN.
    Uses deterministic rule-based analysis — no hallucination.
    """
    result = analyze_job_description(payload.description)
    return JDAnalysisResponse(**result)


# ── Endpoint: Analyze a stored job ────────────────────────────

@router.get(
    "/{job_id}/analyze",
    response_model=JDAnalysisResponse,
    summary="Analyze Stored Job Description",
)
def analyze_stored_job(job_id: int, db: Session = Depends(get_db)):
    """
    Analyze a stored job's description and persist extracted requirements
    back onto the Job record (required_skills, preferred_skills, requirements).
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found.",
        )

    if not job.description or not job.description.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This job has no description text to analyze.",
        )

    result = analyze_job_description(job.description)

    # Persist extracted data back to the Job row
    # Merge with any pre-existing skills (from source import)
    existing_required = set(job.required_skills or [])
    existing_preferred = set(job.preferred_skills or [])
    existing_reqs = set(job.requirements or [])

    job.required_skills = sorted(existing_required | set(result["required_skills"]))
    job.preferred_skills = sorted(existing_preferred | set(result["preferred_skills"]))

    # Store raw requirements as strings
    new_reqs = [r["text"] for r in result.get("requirements_raw", [])]
    job.requirements = sorted(existing_reqs | set(new_reqs))

    job.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(job)

    return JDAnalysisResponse(**result)


# ── Endpoint: Single job match ────────────────────────────────

@router.post(
    "/match",
    response_model=MatchResponse,
    summary="Match Job Against Profile",
)
def match_job(payload: MatchRequest, db: Session = Depends(get_db)):
    """
    Compute compatibility score between a job and the user's stored profile.
    Produces an explainable, reproducible, source-grounded result.
    NEVER claims qualification without evidence.
    """
    # 1. Load profile
    profile = _get_profile_or_error(db)
    profile_dict = _profile_to_dict(profile)

    # 2. Load preferences (optional)
    pref = db.query(InternshipPreference).first()
    pref_dict = _preferences_to_dict(pref)

    # 3. Load job
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {payload.job_id} not found.",
        )

    job_dict = _job_to_dict(job)

    # 4. Run matching
    result = compute_match(
        profile=profile_dict,
        job=job_dict,
        preferences=pref_dict,
        weights=payload.custom_weights,
    )

    # 5. Persist results back to the Job record
    job.match_score = result["overall_score"]
    job.match_breakdown = result["breakdown"]
    job.match_explanation = result["explanation"]

    # Also persist any newly extracted skills from JD analysis
    jd = result.get("jd_analysis", {})
    existing_required = set(job.required_skills or [])
    existing_preferred = set(job.preferred_skills or [])
    job.required_skills = sorted(existing_required | set(jd.get("required_skills", [])))
    job.preferred_skills = sorted(existing_preferred | set(jd.get("preferred_skills", [])))

    # Advance status to ANALYZED if currently DISCOVERED
    status_updated = False
    if job.status == "DISCOVERED":
        job.status = "ANALYZED"
        status_updated = True

    job.updated_at = datetime.datetime.utcnow()
    db.commit()

    return MatchResponse(
        job_id=payload.job_id,
        overall_score=result["overall_score"],
        breakdown=MatchBreakdown(**result["breakdown"]),
        weights_used=result["weights_used"],
        explanation=result["explanation"],
        matching_details=result["matching_details"],
        jd_analysis=JDAnalysisResponse(**result["jd_analysis"]),
        profile_skills_used=result["profile_skills_used"],
        method=result["method"],
        status_updated=status_updated,
    )


# ── Endpoint: Batch match ────────────────────────────────────

@router.post(
    "/match/batch",
    response_model=BatchMatchResponse,
    summary="Batch Match Multiple Jobs",
)
def batch_match(payload: BatchMatchRequest, db: Session = Depends(get_db)):
    """
    Match multiple jobs against the user's profile in one call.
    Returns summary scores for each job.
    """
    profile = _get_profile_or_error(db)
    profile_dict = _profile_to_dict(profile)

    pref = db.query(InternshipPreference).first()
    pref_dict = _preferences_to_dict(pref)

    # Check profile completeness
    profile_complete = bool(
        profile.name and profile.skills and len(profile.skills) > 0
    )

    results = []
    for job_id in payload.job_ids:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.warning(f"Batch match: Job {job_id} not found, skipping.")
            continue

        job_dict = _job_to_dict(job)

        try:
            match_result = compute_match(
                profile=profile_dict,
                job=job_dict,
                preferences=pref_dict,
                weights=payload.custom_weights,
            )
        except Exception as e:
            logger.error(f"Matching failed for job {job_id}: {e}")
            continue

        # Persist
        job.match_score = match_result["overall_score"]
        job.match_breakdown = match_result["breakdown"]
        job.match_explanation = match_result["explanation"]

        status_updated = False
        if job.status == "DISCOVERED":
            job.status = "ANALYZED"
            status_updated = True

        job.updated_at = datetime.datetime.utcnow()

        results.append(BatchMatchSummary(
            job_id=job.id,
            title=job.title,
            company=job.company,
            overall_score=match_result["overall_score"],
            breakdown=MatchBreakdown(**match_result["breakdown"]),
            status_updated=status_updated,
        ))

    db.commit()

    return BatchMatchResponse(
        total_matched=len(results),
        results=sorted(results, key=lambda r: r.overall_score, reverse=True),
        profile_complete=profile_complete,
        method="deterministic_rule_based",
    )
