import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from backend.app.db.session import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(255), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    location = Column(String(255), nullable=True)
    workplace_type = Column(String(50), nullable=True)  # Remote, Hybrid, On-site
    employment_type = Column(String(50), nullable=True)  # Internship, Full-time, Part-time, Apprenticeship
    description = Column(Text, nullable=True)
    
    # Skills and requirements
    skills = Column(JSON, default=list)  # list of tags / skills
    requirements = Column(JSON, default=list)  # extracted requirements
    required_skills = Column(JSON, default=list)
    preferred_skills = Column(JSON, default=list)
    
    # Compensation if reported by source
    salary_or_stipend = Column(String(255), nullable=True)
    
    # Source and external links
    application_url = Column(String(1000), nullable=True)
    source = Column(String(100), nullable=True, index=True)  # e.g., RemoteOK, Jobicy, Arbeitnow, Greenhouse, Lever, Manual
    source_id = Column(String(255), nullable=True)  # ID from the source provider
    raw_source_data = Column(JSON, nullable=True)  # Verbatim source response for full truthfulness & auditability
    dedup_hash = Column(String(64), nullable=True, index=True)  # Normalized deduplication hash
    
    date_found = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # Status: e.g., DISCOVERED, ANALYZED, APPLIED, ARCHIVED
    status = Column(String(50), default="DISCOVERED", index=True)
    
    # Match score details (populated by Matching Engine in Batch 4)
    match_score = Column(Float, nullable=True)
    match_breakdown = Column(JSON, nullable=True)
    match_explanation = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
