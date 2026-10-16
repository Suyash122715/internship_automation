import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Contact(Base):
    """
    Recruiter/HR contact record — PRD Section 13.

    verification_status choices (PRD-mandated, never fabricated):
        VERIFIED    — confirmed via official public company page or direct communication
        PUBLIC      — listed on a publicly accessible source (LinkedIn public profile, company site)
        INFERRED    — derived algorithmically (e.g. common email pattern); NEVER presented as verified
        UNKNOWN     — source unknown or unclassifiable

    confidence_level:
        HIGH   — strong evidence (official page, personal confirmation)
        MEDIUM — reasonable evidence (LinkedIn public profile, press release)
        LOW    — weak evidence (inferred pattern, third-party aggregator)
        UNKNOWN
    """
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)

    # Core identity — PRD Section 13
    name = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False, index=True)
    role = Column(String(255), nullable=True)

    # Contact channels — may be None; NEVER fabricated
    email = Column(String(255), nullable=True, index=True)
    linkedin = Column(String(500), nullable=True)   # LinkedIn profile URL
    profile_url = Column(String(1000), nullable=True)  # any other public profile URL

    # Provenance — where was this contact found/entered?
    source = Column(String(100), nullable=True)          # e.g. LinkedIn, Company Website, Manual
    source_url = Column(String(1000), nullable=True)     # URL of the page where found

    # PRD-required trust classification
    # "verified contact | publicly listed contact | inferred/unverified contact"
    verification_status = Column(
        String(50),
        default="UNKNOWN",
        index=True,
        nullable=False,
    )  # VERIFIED | PUBLIC | INFERRED | UNKNOWN

    confidence_level = Column(
        String(50),
        default="UNKNOWN",
        nullable=False,
    )  # HIGH | MEDIUM | LOW | UNKNOWN

    # Legacy column kept for backward-compatibility; mirrors verification_status
    confidence_status = Column(String(50), default="unverified")

    # Optional: which job triggered this contact discovery
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)

    # Human-readable discovery notes (e.g. "Found via LinkedIn search for Stripe HR")
    discovery_notes = Column(Text, nullable=True)

    # Outreach tracker status (PRD Section 17)
    outreach_status = Column(
        String(50),
        default="CONTACT FOUND",
        index=True,
    )  # CONTACT FOUND | EMAIL DRAFTED | APPROVED | SENT | REPLIED | NO RESPONSE | FOLLOW-UP | BOUNCED

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    job = relationship("Job", backref="contacts")


class OutreachEmail(Base):
    __tablename__ = "outreach_emails"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True)
    
    recipient_email = Column(String(255), nullable=True)  # Destination address
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    template_id = Column(String(100), nullable=True)      # e.g. 'direct_inquiry', 'project_alignment'
    user_edited = Column(Integer, default=0)              # 1 if edited by user
    
    # Status lifecycle from PRD Section 17 & Section 15:
    # EMAIL DRAFTED -> APPROVED -> QUEUED -> SENT -> REPLIED
    # Alternatives / failure: FAILED, NO RESPONSE, FOLLOW-UP, BOUNCED
    status = Column(String(50), default="EMAIL DRAFTED", index=True)
    
    provider = Column(String(50), default="simulated")    # 'smtp' or 'simulated'
    retry_count = Column(Integer, default=0)
    
    approved_at = Column(DateTime, nullable=True)
    queued_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    contact = relationship("Contact", backref="emails")
    job = relationship("Job", backref="outreach_emails")
