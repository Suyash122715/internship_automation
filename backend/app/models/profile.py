import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from backend.app.db.session import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, default="")
    email = Column(String(255), nullable=False, default="")
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Primary Education fields
    college = Column(String(255), nullable=True)
    degree = Column(String(255), nullable=True)
    branch = Column(String(255), nullable=True)
    graduation_year = Column(Integer, nullable=True)
    cgpa = Column(Float, nullable=True)
    
    # Detailed structured history (lists of dicts)
    education_history = Column(JSON, default=list)
    skills = Column(JSON, default=list)  # list of strings or skill dicts
    projects = Column(JSON, default=list)  # list of project dicts
    experience = Column(JSON, default=list)  # list of experience dicts
    certifications = Column(JSON, default=list)  # list of certification dicts
    
    # Social & Portfolio links
    github = Column(String(255), nullable=True)
    linkedin = Column(String(255), nullable=True)
    portfolio = Column(String(255), nullable=True)
    other_links = Column(JSON, default=list)  # list of {label, url}
    
    # Master Resume storage & metadata
    master_resume_path = Column(String(500), nullable=True)
    master_resume_text = Column(Text, nullable=True)
    resume_filename = Column(String(255), nullable=True)
    resume_original_name = Column(String(255), nullable=True)
    resume_file_size = Column(Integer, nullable=True)  # in bytes
    resume_mime_type = Column(String(100), nullable=True)
    resume_uploaded_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class InternshipPreference(Base):
    __tablename__ = "internship_preferences"

    id = Column(Integer, primary_key=True, index=True)
    target_roles = Column(JSON, default=list)  # list of strings
    preferred_locations = Column(JSON, default=list)  # list of strings
    work_modes = Column(JSON, default=lambda: ["remote", "hybrid", "on-site"])
    skills = Column(JSON, default=list)
    minimum_match_score = Column(Float, default=70.0)
    internship_duration = Column(String(100), nullable=True)
    stipend_preference = Column(String(100), nullable=True)
    company_preferences = Column(JSON, default=list)
    excluded_roles = Column(JSON, default=list)
    excluded_companies = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
