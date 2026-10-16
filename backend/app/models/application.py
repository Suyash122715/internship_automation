import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    
    # Status lifecycle from PRD Section 16:
    # DISCOVERED -> ANALYZED -> PREPARED -> READY -> APPLIED -> ASSESSMENT -> INTERVIEW -> OFFER
    # Terminal: REJECTED, WITHDRAWN, EXPIRED
    status = Column(String(50), default="PREPARED", index=True)
    
    # Material references
    tailored_resume_path = Column(String(500), nullable=True)
    tailored_resume_text = Column(Text, nullable=True)
    cover_letter_path = Column(String(500), nullable=True)
    cover_letter_text = Column(Text, nullable=True)
    modifications_log = Column(JSON, default=list)  # structured list of {section, change_type, reason, details}
    
    # Submission notes & tracking
    submission_notes = Column(Text, nullable=True)
    applied_at = Column(DateTime, nullable=True)
    interview_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    job = relationship("Job", backref="applications")
