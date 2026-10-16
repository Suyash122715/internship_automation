import os
import shutil
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.profile import UserProfile
from backend.app.schemas.profile import (
    UserProfileResponse,
    UserProfileUpdate,
    ResumeMetadata,
    ResumeUploadResponse,
    ResumeTextUpdate,
)
from backend.app.services.resume_parser import extract_text_from_file

router = APIRouter()

# Directory for storing uploaded resumes
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "resumes")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_or_create_profile(db: Session) -> UserProfile:
    """Helper to ensure a single authoritative master profile exists."""
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile(
            name="",
            email="",
            skills=[],
            projects=[],
            experience=[],
            certifications=[],
            education_history=[],
            other_links=[],
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def build_profile_response(profile: UserProfile) -> UserProfileResponse:
    has_file = bool(profile.master_resume_path and os.path.exists(profile.master_resume_path))
    metadata = ResumeMetadata(
        filename=profile.resume_filename,
        original_name=profile.resume_original_name,
        file_size=profile.resume_file_size,
        mime_type=profile.resume_mime_type,
        uploaded_at=profile.resume_uploaded_at,
        has_file=has_file,
        text_length=len(profile.master_resume_text or "")
    )
    
    return UserProfileResponse(
        id=profile.id,
        name=profile.name or "",
        email=profile.email or "",
        phone=profile.phone,
        location=profile.location,
        bio=profile.bio,
        college=profile.college,
        degree=profile.degree,
        branch=profile.branch,
        graduation_year=profile.graduation_year,
        cgpa=profile.cgpa,
        education_history=profile.education_history or [],
        skills=profile.skills or [],
        projects=profile.projects or [],
        experience=profile.experience or [],
        certifications=profile.certifications or [],
        github=profile.github,
        linkedin=profile.linkedin,
        portfolio=profile.portfolio,
        other_links=profile.other_links or [],
        master_resume_path=profile.master_resume_path,
        master_resume_text=profile.master_resume_text,
        resume_metadata=metadata,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("", response_model=UserProfileResponse, summary="Get User Master Profile")
def get_user_profile(db: Session = Depends(get_db)):
    """Retrieve the authoritative User Profile and Master Resume metadata."""
    profile = get_or_create_profile(db)
    return build_profile_response(profile)


@router.put("", response_model=UserProfileResponse, summary="Update User Master Profile")
def update_user_profile(payload: UserProfileUpdate, db: Session = Depends(get_db)):
    """Update profile fields (contact, education, skills, projects, experience, links)."""
    profile = get_or_create_profile(db)
    
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
        
    profile.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return build_profile_response(profile)


@router.post("/resume/upload", response_model=ResumeUploadResponse, summary="Upload Master Resume")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and parse master resume file (.pdf, .docx, .txt). Extracts truthful raw text without hallucination."""
    allowed_extensions = [".pdf", ".docx", ".doc", ".txt", ".md"]
    _, ext = os.path.splitext(file.filename.lower())
    
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(allowed_extensions)}"
        )

    # Generate unique filename for storage
    unique_filename = f"resume_{uuid.uuid4().hex[:10]}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file contents to disk
    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save resume file: {str(e)}"
        )

    file_size = os.path.getsize(saved_path)

    # Extract raw text strictly without fabrication
    try:
        extracted_text = extract_text_from_file(saved_path)
    except Exception as e:
        extracted_text = ""

    # Update profile in DB
    profile = get_or_create_profile(db)
    profile.master_resume_path = saved_path
    profile.master_resume_text = extracted_text
    profile.resume_filename = unique_filename
    profile.resume_original_name = file.filename
    profile.resume_file_size = file_size
    profile.resume_mime_type = file.content_type or "application/octet-stream"
    profile.resume_uploaded_at = datetime.datetime.utcnow()
    profile.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(profile)

    metadata = ResumeMetadata(
        filename=unique_filename,
        original_name=file.filename,
        file_size=file_size,
        mime_type=file.content_type,
        uploaded_at=profile.resume_uploaded_at,
        has_file=True,
        text_length=len(extracted_text)
    )

    return ResumeUploadResponse(
        message="Master resume uploaded and parsed successfully.",
        metadata=metadata,
        extracted_text_preview=extracted_text[:1000] if extracted_text else "No extractable text found."
    )


@router.get("/resume/download", summary="Download Master Resume File")
def download_resume(db: Session = Depends(get_db)):
    """Download the current master resume file."""
    profile = get_or_create_profile(db)
    if not profile.master_resume_path or not os.path.exists(profile.master_resume_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No master resume file uploaded."
        )

    return FileResponse(
        path=profile.master_resume_path,
        filename=profile.resume_original_name or "master_resume.pdf",
        media_type=profile.resume_mime_type or "application/octet-stream"
    )


@router.delete("/resume", response_model=UserProfileResponse, summary="Delete Master Resume File")
def delete_resume(db: Session = Depends(get_db)):
    """Remove master resume file and clear resume metadata."""
    profile = get_or_create_profile(db)
    
    if profile.master_resume_path and os.path.exists(profile.master_resume_path):
        try:
            os.remove(profile.master_resume_path)
        except Exception:
            pass
            
    profile.master_resume_path = None
    profile.master_resume_text = None
    profile.resume_filename = None
    profile.resume_original_name = None
    profile.resume_file_size = None
    profile.resume_mime_type = None
    profile.resume_uploaded_at = None
    profile.updated_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(profile)
    return build_profile_response(profile)


@router.put("/resume/text", response_model=UserProfileResponse, summary="Edit Master Resume Text")
def update_resume_text(payload: ResumeTextUpdate, db: Session = Depends(get_db)):
    """Directly update or edit the extracted master resume text."""
    profile = get_or_create_profile(db)
    profile.master_resume_text = payload.text
    profile.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return build_profile_response(profile)
