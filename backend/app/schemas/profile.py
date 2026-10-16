import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class EducationItem(BaseModel):
    institution: str = ""
    degree: str = ""
    field_of_study: Optional[str] = ""
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    grade: Optional[str] = ""
    activities: Optional[str] = ""


class ProjectItem(BaseModel):
    id: Optional[str] = None
    title: str = ""
    role: Optional[str] = ""
    description: str = ""
    technologies: List[str] = Field(default_factory=list)
    github_url: Optional[str] = ""
    live_url: Optional[str] = ""
    duration: Optional[str] = ""
    bullet_points: List[str] = Field(default_factory=list)


class ExperienceItem(BaseModel):
    id: Optional[str] = None
    company: str = ""
    role: str = ""
    location: Optional[str] = ""
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    is_current: bool = False
    description: Optional[str] = ""
    bullet_points: List[str] = Field(default_factory=list)


class CertificationItem(BaseModel):
    id: Optional[str] = None
    name: str = ""
    issuer: str = ""
    issue_date: Optional[str] = ""
    credential_url: Optional[str] = ""


class LinkItem(BaseModel):
    label: str = ""
    url: str = ""


class ResumeMetadata(BaseModel):
    filename: Optional[str] = None
    original_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_at: Optional[datetime.datetime] = None
    has_file: bool = False
    text_length: int = 0


class UserProfileBase(BaseModel):
    name: str = ""
    email: str = ""
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    
    # Primary Education
    college: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    
    # Detailed structured history
    education_history: List[EducationItem] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    certifications: List[CertificationItem] = Field(default_factory=list)
    
    # Links
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    other_links: List[LinkItem] = Field(default_factory=list)


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    
    college: Optional[str] = None
    degree: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = None
    
    education_history: Optional[List[EducationItem]] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[ProjectItem]] = None
    experience: Optional[List[ExperienceItem]] = None
    certifications: Optional[List[CertificationItem]] = None
    
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    other_links: Optional[List[LinkItem]] = None


class UserProfileResponse(UserProfileBase):
    id: int
    master_resume_path: Optional[str] = None
    master_resume_text: Optional[str] = None
    resume_metadata: ResumeMetadata
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class ResumeTextUpdate(BaseModel):
    text: str


class ResumeUploadResponse(BaseModel):
    message: str
    metadata: ResumeMetadata
    extracted_text_preview: str
