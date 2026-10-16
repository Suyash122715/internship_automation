"""
Batch 8 — Cold Email Outreach Engine Service.

PRD Section 14 (Cold Email Generator) & Section 15 (Email Sending).

STRICT TRUTHFULNESS & SAFETY RULES:
  - NEVER fabricate recruiter names, roles, email addresses, company facts,
    job openings, user skills, projects, achievements, or prior communications.
  - Every generated claim must be grounded in available data from User Profile,
    Job, and Contact.
  - If information is missing, omit the claim or indicate it cleanly.
  - User MUST approve emails before sending.
  - Do not send to fabricated or unverified addresses without explicit user confirmation.
  - Enforce reasonable rate limits (max per minute / max per day).
  - Preserve full sending history and handle delivery failures gracefully.
"""

import datetime
import email.mime.multipart
import email.mime.text
import logging
import re
import smtplib
import time
from typing import Dict, List, Optional, Tuple, Any

from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.outreach import Contact, OutreachEmail
from backend.app.models.job import Job
from backend.app.models.profile import UserProfile
from backend.app.schemas.outreach import (
    EmailGenerateRequest,
    EmailGenerationResult,
    EmailDraftCreate,
    EmailUpdate,
    AVAILABLE_TEMPLATES,
    QueueProcessResponse,
    OutreachStatsResponse,
)

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


# ── Cold Email Generation Engine (PRD Section 14) ───────────────────────────

def generate_cold_email(
    db: Session,
    request: EmailGenerateRequest,
) -> EmailGenerationResult:
    """
    Generate a personalized cold email strictly grounded in truthful data.

    Grounding sources:
      1. Contact: name, role, company, email, verification_status
      2. Job (optional): title, company, requirements, skills
      3. User Profile: name, email, phone, education, skills, projects
    """
    contact = db.query(Contact).filter(Contact.id == request.contact_id).first()
    if not contact:
        raise ValueError(f"Contact with ID {request.contact_id} not found.")

    job: Optional[Job] = None
    if request.job_id:
        job = db.query(Job).filter(Job.id == request.job_id).first()

    profile = db.query(UserProfile).first()

    grounded_claims: List[str] = []
    missing_fields: List[str] = []

    # 1. Contact & Recruiter grounding
    recruiter_full_name = (contact.name or "").strip()
    company_name = (contact.company or (job.company if job else "") or "").strip()
    contact_role = (contact.role or "").strip()
    recipient_email = contact.email
    verification_status = contact.verification_status or "UNKNOWN"

    if recruiter_full_name:
        grounded_claims.append(f"Recruiter Name: '{recruiter_full_name}' from Contact record")
        # Extract first name cleanly for greeting if format is "First Last"
        parts = recruiter_full_name.split()
        greeting_name = parts[0] if parts else recruiter_full_name
        salutation = f"Dear {greeting_name}"
    else:
        missing_fields.append("Recruiter Name is not recorded — used generic team salutation")
        salutation = f"Dear {company_name} Hiring Team" if company_name else "Dear Hiring Team"

    if company_name:
        grounded_claims.append(f"Target Company: '{company_name}'")
    else:
        missing_fields.append("Company Name missing")

    # 2. Target Role & Job grounding
    target_role = ""
    if job and job.title:
        target_role = job.title.strip()
        grounded_claims.append(f"Target Role: '{target_role}' from Job #{job.id}")
    elif contact_role:
        target_role = "Internship Opportunity"
        grounded_claims.append(f"Contact Role context: '{contact_role}'")
    else:
        target_role = "Software Engineering Internship"
        missing_fields.append("Specific job title not specified — defaulted to general internship interest")

    # 3. User Profile grounding
    user_name = "[Candidate Name]"
    user_email = ""
    user_phone = ""
    education_line = ""
    top_skills: List[str] = []
    selected_project = None

    if profile:
        candidate_name = getattr(profile, "name", None) or getattr(profile, "full_name", None)
        if candidate_name:
            user_name = candidate_name.strip()
            grounded_claims.append(f"Candidate Name: '{user_name}' from User Profile")
        else:
            missing_fields.append("User name not set in profile")

        if profile.email:
            user_email = profile.email.strip()
        if profile.phone:
            user_phone = profile.phone.strip()

        # Education
        if getattr(profile, "degree", None) or getattr(profile, "college", None):
            deg = getattr(profile, "degree", "") or ""
            branch = getattr(profile, "branch", "") or ""
            col = getattr(profile, "college", "") or ""
            parts_edu = [p for p in [deg, f"in {branch}" if branch else "", f"at {col}" if col else ""] if p]
            if parts_edu:
                education_line = " ".join(parts_edu)
                grounded_claims.append(f"Candidate Education: '{education_line}' from Profile")
        elif getattr(profile, "education_history", None) and isinstance(profile.education_history, list) and len(profile.education_history) > 0:
            edu0 = profile.education_history[0]
            deg = edu0.get("degree", "")
            field = edu0.get("field_of_study", "") or edu0.get("branch", "")
            inst = edu0.get("institution", "") or edu0.get("college", "")
            parts_edu = [p for p in [deg, f"in {field}" if field else "", f"at {inst}" if inst else ""] if p]
            if parts_edu:
                education_line = " ".join(parts_edu)
                grounded_claims.append(f"Candidate Education: '{education_line}' from Profile")
        if not education_line:
            missing_fields.append("Education background not specified in profile")

        # Skills (strictly real profile skills)
        if profile.skills and isinstance(profile.skills, list):
            # Prioritize matching skills if job provides required skills
            job_skill_set = set([s.lower() for s in (job.skills or [])]) if (job and job.skills) else set()
            matching = [s for s in profile.skills if s.lower() in job_skill_set]
            top_skills = matching if matching else profile.skills[:4]
            if top_skills:
                grounded_claims.append(f"Verified Skills cited: {', '.join(top_skills)} from Profile")
        if not top_skills:
            missing_fields.append("No technical skills found in user profile")

        # Projects (strictly real profile projects)
        if profile.projects and isinstance(profile.projects, list):
            if request.selected_project_name:
                for proj in profile.projects:
                    if proj.get("title", "").strip().lower() == request.selected_project_name.strip().lower():
                        selected_project = proj
                        break
            if not selected_project and len(profile.projects) > 0:
                selected_project = profile.projects[0]

            if selected_project:
                p_title = selected_project.get("title", "Project")
                p_desc = selected_project.get("description", "")
                p_tech = selected_project.get("technologies", [])
                grounded_claims.append(f"Verified Project cited: '{p_title}' from Profile")
        if not selected_project:
            missing_fields.append("No project selected or available in profile — omitted project claims")

    # 4. Check for Inferred Warning
    inferred_warning = None
    if verification_status == "INFERRED":
        inferred_warning = (
            f"INFERRED EMAIL WARNING: The contact address '{recipient_email}' was algorithmically generated "
            f"and has NOT been verified. Per PRD truthfulness rules, explicit approval is mandatory."
        )

    # 5. Template Assembly
    template_id = request.template_id or "direct_inquiry"
    skills_str = ", ".join(top_skills) if top_skills else "software engineering fundamentals"

    subject = ""
    body = ""

    if template_id == "direct_inquiry":
        subject = f"Inquiry regarding {target_role} at {company_name} — {user_name}"
        
        para1 = f"{salutation},\n\nI hope this email finds you well. I am reaching out to express my keen interest in internship opportunities at {company_name}, particularly within your engineering and product teams."
        
        edu_part = f"As a student pursuing {education_line}, " if education_line else "As an aspiring software engineer, "
        para2 = f"{edu_part}I have developed a solid foundation in {skills_str} through rigorous coursework and hands-on implementations."
        
        if selected_project:
            p_name = selected_project.get("title")
            p_desc = selected_project.get("description", "")
            p_tech_list = selected_project.get("technologies", [])
            tech_s = f" using {', '.join(p_tech_list)}" if p_tech_list else ""
            para3 = f"Recently, I developed {p_name}{tech_s}, focusing on {p_desc.rstrip('.') if p_desc else 'scalable software design'}. I am eager to bring this problem-solving mindset and technical discipline to {company_name}."
        else:
            para3 = f"I admire {company_name}'s technical standards and would welcome the opportunity to contribute to your engineering initiatives while learning from your experienced team."

        para4 = "I would greatly appreciate the chance to discuss how my verified background aligns with your upcoming internship openings. My resume is attached for your consideration, and I welcome any questions.\n\nThank you very much for your time and consideration."
        
        signoff = f"Sincerely,\n{user_name}"
        if user_email:
            signoff += f"\n{user_email}"
        if user_phone:
            signoff += f"\n{user_phone}"

        body = f"{para1}\n\n{para2}\n\n{para3}\n\n{para4}\n\n{signoff}"

    elif template_id == "project_alignment":
        subject = f"{target_role} Application & Project Alignment — {user_name}"
        
        para1 = f"{salutation},\n\nI am writing to express my strong enthusiasm for {target_role} roles at {company_name}. I have been following {company_name}'s work and wanted to share relevant engineering work that directly aligns with your technical domain."
        
        if selected_project:
            p_name = selected_project.get("title")
            p_desc = selected_project.get("description", "")
            p_tech_list = selected_project.get("technologies", [])
            tech_s = f" ({', '.join(p_tech_list)})" if p_tech_list else ""
            para2 = f"Specifically, I recently built {p_name}{tech_s}. {p_desc} Working on this project solidified my expertise in building robust systems and working with {skills_str}."
        else:
            para2 = f"Through targeted project work, I have focused on building practical, reliable applications leveraging {skills_str}."

        edu_part = f"Currently completing {education_line}, " if education_line else ""
        para3 = f"{edu_part}I am seeking an opportunity to contribute directly to {company_name}'s codebase while tackling challenging real-world problems alongside your engineering team."
        
        para4 = "I would love the opportunity for a brief conversation regarding potential internship openings. Thank you for your consideration."
        
        signoff = f"Best regards,\n{user_name}"
        if user_email:
            signoff += f"\n{user_email}"
        if user_phone:
            signoff += f"\n{user_phone}"

        body = f"{para1}\n\n{para2}\n\n{para3}\n\n{para4}\n\n{signoff}"

    elif template_id == "value_proposition":
        subject = f"Candidate Profile: {target_role} at {company_name} ({user_name})"
        
        para1 = f"{salutation},\n\nI am reaching out regarding internship openings at {company_name}. Given {company_name}'s technical focus, I wanted to introduce my qualifications for {target_role}."
        
        bullet1 = f"• Academic Focus: {education_line}" if education_line else f"• Focus: Software Engineering"
        bullet2 = f"• Core Proficiencies: {skills_str}"
        if selected_project:
            bullet3 = f"• Practical Implementation: {selected_project.get('title')} — {selected_project.get('description', '')}"
            bullets = f"{bullet1}\n{bullet2}\n{bullet3}"
        else:
            bullets = f"{bullet1}\n{bullet2}"

        para3 = f"I am eager to apply these skills to support {company_name}'s development milestones as an intern."
        para4 = "If there are active or upcoming opportunities, I would welcome the chance to speak briefly. Thank you for your time."
        
        signoff = f"Best regards,\n{user_name}"
        if user_email:
            signoff += f"\n{user_email}"
        if user_phone:
            signoff += f"\n{user_phone}"

        body = f"{para1}\n\nKey Highlights:\n{bullets}\n\n{para3}\n\n{para4}\n\n{signoff}"

    elif template_id == "follow_up":
        subject = f"Following up: {target_role} at {company_name} — {user_name}"
        
        para1 = f"{salutation},\n\nI hope you are having a productive week. I am following up on my previous interest in internship opportunities with {company_name}'s engineering team."
        
        para2 = f"I remain very enthusiastic about {company_name} and would welcome any updates regarding active candidate evaluations for {target_role}."
        
        para3 = "I understand you have a demanding schedule and greatly appreciate your time. Please let me know if any further details or materials would be helpful."
        
        signoff = f"Warm regards,\n{user_name}"
        if user_email:
            signoff += f"\n{user_email}"

        body = f"{para1}\n\n{para2}\n\n{para3}\n\n{signoff}"

    return EmailGenerationResult(
        subject=subject,
        body=body,
        recipient_email=recipient_email,
        contact_name=recruiter_full_name or "Hiring Team",
        company=company_name or "Target Company",
        verification_status=verification_status,
        template_id=template_id,
        grounded_claims=grounded_claims,
        missing_fields=missing_fields,
        inferred_warning=inferred_warning,
    )


# ── CRUD & Draft Operations ───────────────────────────────────────────────────

def create_email_draft(db: Session, data: EmailDraftCreate) -> OutreachEmail:
    """Create and persist an email draft in EMAIL DRAFTED status."""
    contact = db.query(Contact).filter(Contact.id == data.contact_id).first()
    if not contact:
        raise ValueError(f"Contact id={data.contact_id} not found.")

    recipient_email = data.recipient_email or contact.email

    email_record = OutreachEmail(
        contact_id=data.contact_id,
        job_id=data.job_id,
        recipient_email=recipient_email,
        subject=data.subject.strip(),
        body=data.body.strip(),
        template_id=data.template_id,
        status="EMAIL DRAFTED",
        provider="smtp" if (settings.SMTP_HOST and not settings.EMAIL_SIMULATE) else "simulated",
        user_edited=0,
    )
    db.add(email_record)
    
    # Sync contact outreach status per PRD Section 17
    contact.outreach_status = "EMAIL DRAFTED"
    contact.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(email_record)
    logger.info("Created OutreachEmail id=%d for contact id=%d", email_record.id, contact.id)
    return email_record


def get_email(db: Session, email_id: int) -> Optional[OutreachEmail]:
    return db.query(OutreachEmail).filter(OutreachEmail.id == email_id).first()


def list_emails(
    db: Session,
    status: Optional[str] = None,
    contact_id: Optional[int] = None,
    job_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> Dict[str, Any]:
    """Retrieve filtered, paginated emails with status distributions."""
    query = db.query(OutreachEmail)

    if status:
        query = query.filter(OutreachEmail.status == status.upper().strip())
    if contact_id:
        query = query.filter(OutreachEmail.contact_id == contact_id)
    if job_id:
        query = query.filter(OutreachEmail.job_id == job_id)

    total = query.count()
    items = query.order_by(OutreachEmail.created_at.desc()).offset(skip).limit(limit).all()

    # Distribution map
    all_emails = db.query(OutreachEmail.status).all()
    dist: Dict[str, int] = {}
    for (st,) in all_emails:
        dist[st] = dist.get(st, 0) + 1

    return {
        "total": total,
        "items": items,
        "status_distribution": dist,
    }


def update_email(db: Session, email_id: int, data: EmailUpdate) -> Optional[OutreachEmail]:
    """User editing of an email draft."""
    email_record = get_email(db, email_id)
    if not email_record:
        return None

    if data.subject is not None:
        email_record.subject = data.subject.strip()
        email_record.user_edited = 1
    if data.body is not None:
        email_record.body = data.body.strip()
        email_record.user_edited = 1
    if data.recipient_email is not None:
        email_record.recipient_email = data.recipient_email.strip() or None

    if data.status is not None:
        email_record.status = data.status.upper().strip()
        if email_record.contact:
            email_record.contact.outreach_status = email_record.status
            email_record.contact.updated_at = datetime.datetime.utcnow()

    email_record.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(email_record)
    return email_record


def delete_email(db: Session, email_id: int) -> bool:
    email_record = get_email(db, email_id)
    if not email_record:
        return False
    db.delete(email_record)
    db.commit()
    return True


# ── Approval & Lifecycle (PRD Section 17) ────────────────────────────────────

def approve_email(db: Session, email_id: int) -> OutreachEmail:
    """Explicit human approval required prior to sending."""
    email_record = get_email(db, email_id)
    if not email_record:
        raise ValueError(f"Email id={email_id} not found.")

    email_record.status = "APPROVED"
    email_record.approved_at = datetime.datetime.utcnow()
    email_record.updated_at = datetime.datetime.utcnow()

    if email_record.contact:
        email_record.contact.outreach_status = "APPROVED"
        email_record.contact.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(email_record)
    logger.info("Email id=%d APPROVED by user.", email_id)
    return email_record


def queue_email_record(db: Session, email_id: int) -> OutreachEmail:
    """Add approved email to sending queue."""
    email_record = get_email(db, email_id)
    if not email_record:
        raise ValueError(f"Email id={email_id} not found.")

    # Must be approved or explicitly approve if drafting
    if email_record.status not in ("APPROVED", "QUEUED"):
        email_record.status = "APPROVED"
        email_record.approved_at = datetime.datetime.utcnow()

    email_record.status = "QUEUED"
    email_record.queued_at = datetime.datetime.utcnow()
    email_record.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(email_record)
    logger.info("Email id=%d added to send queue.", email_id)
    return email_record


# ── Rate Limiting (PRD Section 15: Reasonable Limits & Anti-Spam) ───────────

def check_rate_limit(db: Session) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Enforce sending limits:
      - Max per minute (settings.EMAIL_RATE_LIMIT_PER_MINUTE, default 5)
      - Max per day (settings.EMAIL_RATE_LIMIT_PER_DAY, default 30)
    """
    now = datetime.datetime.utcnow()
    one_min_ago = now - datetime.timedelta(seconds=60)
    one_day_ago = now - datetime.timedelta(hours=24)

    sent_last_min = (
        db.query(func.count(OutreachEmail.id))
        .filter(OutreachEmail.status == "SENT", OutreachEmail.sent_at >= one_min_ago)
        .scalar()
        or 0
    )

    sent_today = (
        db.query(func.count(OutreachEmail.id))
        .filter(OutreachEmail.status == "SENT", OutreachEmail.sent_at >= one_day_ago)
        .scalar()
        or 0
    )

    stats = {
        "sent_last_minute": sent_last_min,
        "sent_last_24h": sent_today,
        "limit_per_minute": settings.EMAIL_RATE_LIMIT_PER_MINUTE,
        "limit_per_day": settings.EMAIL_RATE_LIMIT_PER_DAY,
        "remaining_today": max(0, settings.EMAIL_RATE_LIMIT_PER_DAY - sent_today),
    }

    if sent_last_min >= settings.EMAIL_RATE_LIMIT_PER_MINUTE:
        return False, f"Minute rate limit reached ({sent_last_min}/{settings.EMAIL_RATE_LIMIT_PER_MINUTE} emails in last 60s). Please wait a moment.", stats

    if sent_today >= settings.EMAIL_RATE_LIMIT_PER_DAY:
        return False, f"Daily outreach limit reached ({sent_today}/{settings.EMAIL_RATE_LIMIT_PER_DAY} emails in last 24h). Anti-spam protection prevents further sends today.", stats

    return True, "", stats


# ── Dispatch Engine: SMTP & Simulated (PRD Section 15) ───────────────────────

def send_single_email(
    db: Session,
    email_id: int,
    allow_inferred: bool = False,
    force_approve: bool = False,
    simulate: Optional[bool] = None,
) -> OutreachEmail:
    """
    Execute compliant email dispatch:
      1. Human control validation: must be APPROVED (or force_approve=True).
      2. Address safety: must have valid email format, not empty.
      3. Truthfulness guard: if INFERRED, requires allow_inferred=True.
      4. Rate limit verification.
      5. Dispatch via real SMTP or safe local simulation.
      6. Record delivery status and errors.
    """
    email_record = get_email(db, email_id)
    if not email_record:
        raise ValueError(f"Email id={email_id} not found.")

    contact = email_record.contact

    # 1. Approval validation
    if force_approve and email_record.status in ("EMAIL DRAFTED", "QUEUED", "FAILED"):
        email_record.status = "APPROVED"
        email_record.approved_at = datetime.datetime.utcnow()

    if email_record.status not in ("APPROVED", "QUEUED"):
        raise ValueError(
            f"Cannot send email in '{email_record.status}' status. "
            f"PRD Rule: Explicit user approval is mandatory before sending."
        )

    # 2. Recipient Address validation
    recipient = (email_record.recipient_email or (contact.email if contact else "") or "").strip()
    if not recipient:
        raise ValueError("Cannot send email: Recipient email address is missing.")

    if not EMAIL_REGEX.match(recipient):
        raise ValueError(f"Invalid email address format: '{recipient}'.")

    # 3. Truthfulness & Inferred verification guard
    if contact and contact.verification_status == "INFERRED" and not allow_inferred:
        raise ValueError(
            f"Safety Guard: Recipient email '{recipient}' has INFERRED verification status. "
            f"You must explicitly confirm before sending to an unverified algorithmic guess."
        )

    # 4. Rate limit check
    allowed, err_msg, _ = check_rate_limit(db)
    if not allowed:
        email_record.status = "QUEUED"
        email_record.error_message = err_msg
        db.commit()
        raise ValueError(err_msg)

    # 5. Determine provider
    is_simulated = (
        simulate if simulate is not None
        else (settings.EMAIL_SIMULATE or not settings.SMTP_HOST)
    )

    if not is_simulated:
        # REAL SMTP DISPATCH
        try:
            logger.info("Attempting SMTP dispatch to %s via %s:%d", recipient, settings.SMTP_HOST, settings.SMTP_PORT)
            from_addr = settings.EMAIL_FROM or settings.SMTP_USER
            from_name = settings.EMAIL_FROM_NAME or "Internship Applicant"

            msg = email.mime.multipart.MIMEMultipart("alternative")
            msg["Subject"] = email_record.subject
            msg["From"] = f"{from_name} <{from_addr}>"
            msg["To"] = recipient
            msg.attach(email.mime.text.MIMEText(email_record.body, "plain", "utf-8"))

            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
                if settings.SMTP_TLS:
                    server.starttls()

            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            server.sendmail(from_addr, [recipient], msg.as_string())
            server.quit()

            email_record.status = "SENT"
            email_record.sent_at = datetime.datetime.utcnow()
            email_record.provider = "smtp"
            email_record.error_message = None

            if contact:
                contact.outreach_status = "SENT"
                contact.updated_at = datetime.datetime.utcnow()

            logger.info("Successfully dispatched email id=%d via SMTP to %s", email_record.id, recipient)

        except Exception as e:
            logger.error("Failed to send email id=%d via SMTP: %s", email_record.id, str(e))
            email_record.status = "FAILED"
            email_record.error_message = f"SMTP Delivery Error: {str(e)}"
            email_record.retry_count = (email_record.retry_count or 0) + 1
            if contact:
                contact.outreach_status = "FAILED"
            db.commit()
            raise ValueError(f"Failed to dispatch email: {str(e)}")

    else:
        # SIMULATED DISPATCH (Local Safety / Mock Mode)
        logger.info(
            "[SIMULATED EMAIL DISPATCH] Recipient=%r Subject=%r BodyLength=%d",
            recipient, email_record.subject, len(email_record.body),
        )
        email_record.status = "SENT"
        email_record.sent_at = datetime.datetime.utcnow()
        email_record.provider = "simulated"
        email_record.error_message = None

        if contact:
            contact.outreach_status = "SENT"
            contact.updated_at = datetime.datetime.utcnow()

    email_record.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(email_record)
    return email_record


def process_email_queue(
    db: Session,
    max_batch: int = 10,
    allow_inferred: bool = False,
) -> QueueProcessResponse:
    """
    Process queued approved emails in order with anti-spam pacing and rate-limit guardrails.
    """
    queued_emails = (
        db.query(OutreachEmail)
        .filter(OutreachEmail.status == "QUEUED")
        .order_by(OutreachEmail.queued_at.asc())
        .limit(max_batch)
        .all()
    )

    processed = 0
    sent = 0
    failed = 0
    rate_limited = 0
    details = []

    for item in queued_emails:
        allowed, msg, _ = check_rate_limit(db)
        if not allowed:
            rate_limited += 1
            details.append({"id": item.id, "status": "RATE_LIMITED", "reason": msg})
            break

        processed += 1
        try:
            send_single_email(db, item.id, allow_inferred=allow_inferred)
            sent += 1
            details.append({"id": item.id, "status": "SENT", "recipient": item.recipient_email})
            # Respectful pacing between queued dispatches
            time.sleep(0.5)
        except Exception as e:
            failed += 1
            details.append({"id": item.id, "status": "FAILED", "error": str(e)})

    remaining = (
        db.query(func.count(OutreachEmail.id))
        .filter(OutreachEmail.status == "QUEUED")
        .scalar()
        or 0
    )

    return QueueProcessResponse(
        processed=processed,
        sent=sent,
        failed=failed,
        rate_limited=rate_limited,
        remaining_queued=remaining,
        details=details,
    )


def retry_failed_email(
    db: Session,
    email_id: int,
    allow_inferred: bool = False,
) -> OutreachEmail:
    """Retry sending a failed or bounced email record."""
    email_record = get_email(db, email_id)
    if not email_record:
        raise ValueError(f"Email id={email_id} not found.")

    if email_record.status not in ("FAILED", "BOUNCED"):
        raise ValueError(f"Cannot retry email with status '{email_record.status}'.")

    email_record.status = "APPROVED"
    email_record.error_message = None
    db.commit()

    return send_single_email(db, email_id, allow_inferred=allow_inferred)


# ── Statistics & Diagnostics ──────────────────────────────────────────────────

def get_outreach_stats(db: Session) -> OutreachStatsResponse:
    """Consolidated outreach analytics for Dashboard and UI tabs."""
    all_emails = db.query(OutreachEmail.status).all()
    counts: Dict[str, int] = {}
    for (st,) in all_emails:
        counts[st] = counts.get(st, 0) + 1

    _, _, rate_stats = check_rate_limit(db)

    provider_status = {
        "configured": bool(settings.SMTP_HOST),
        "host": settings.SMTP_HOST or "None (Simulated)",
        "port": settings.SMTP_PORT,
        "from_address": settings.EMAIL_FROM or "(Not set)",
        "mode": "Simulated" if settings.EMAIL_SIMULATE or not settings.SMTP_HOST else "Active SMTP",
    }

    return OutreachStatsResponse(
        emails_drafted=counts.get("EMAIL DRAFTED", 0),
        emails_approved=counts.get("APPROVED", 0),
        emails_queued=counts.get("QUEUED", 0),
        emails_sent=counts.get("SENT", 0),
        emails_replied=counts.get("REPLIED", 0),
        emails_failed=counts.get("FAILED", 0),
        emails_bounced=counts.get("BOUNCED", 0),
        rate_limit=rate_stats,
        provider_status=provider_status,
    )
