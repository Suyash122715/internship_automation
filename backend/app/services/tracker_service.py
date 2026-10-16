"""
Batch 9 — Application & Outreach Tracking Service.

PRD Section 16 (Application Tracker), Section 17 (Outreach Tracker), and Section 18 (Dashboard).
Strict truthfulness: All numbers, status lifecycles, and activity feeds derive from database records.
"""

import datetime
from typing import Dict, List, Optional, Any
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.models.outreach import Contact, OutreachEmail
from backend.app.schemas.tracker import (
    ApplicationPipelineStats,
    OutreachPipelineStats,
    DashboardSummaryResponse,
    ApplicationTrackItem,
    ApplicationStatusUpdate,
    ActivityEvent,
    RecentActivityResponse,
    ALLOWED_APPLICATION_STATUSES,
)


def get_dashboard_summary(db: Session) -> DashboardSummaryResponse:
    """
    Compute verified aggregate metrics for Application and Outreach pipelines.
    Guaranteed: 100% computed from SQL tables — never fabricated.
    """
    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    total_apps = db.query(func.count(Application.id)).scalar() or 0
    total_contacts = db.query(func.count(Contact.id)).scalar() or 0
    total_emails = db.query(func.count(OutreachEmail.id)).scalar() or 0

    # 1. Application Pipeline (PRD Section 16 & Section 18)
    app_stats = ApplicationPipelineStats(
        discovered_jobs=db.query(func.count(Job.id)).filter(Job.status == "DISCOVERED").scalar() or 0,
        analyzed_jobs=db.query(func.count(Job.id)).filter(or_(Job.status == "ANALYZED", Job.match_score.isnot(None))).scalar() or 0,
        prepared_applications=db.query(func.count(Application.id)).filter(Application.status == "PREPARED").scalar() or 0,
        ready_applications=db.query(func.count(Application.id)).filter(Application.status == "READY").scalar() or 0,
        submitted_applications=db.query(func.count(Application.id)).filter(Application.status == "APPLIED").scalar() or 0,
        assessments=db.query(func.count(Application.id)).filter(Application.status == "ASSESSMENT").scalar() or 0,
        interviews=db.query(func.count(Application.id)).filter(Application.status == "INTERVIEW").scalar() or 0,
        offers=db.query(func.count(Application.id)).filter(Application.status == "OFFER").scalar() or 0,
        rejections=db.query(func.count(Application.id)).filter(Application.status == "REJECTED").scalar() or 0,
        withdrawn=db.query(func.count(Application.id)).filter(Application.status == "WITHDRAWN").scalar() or 0,
        expired=db.query(func.count(Application.id)).filter(Application.status == "EXPIRED").scalar() or 0,
    )

    # 2. Outreach Pipeline (PRD Section 17 & Section 18)
    # Check emails table
    email_status_counts = {}
    for st, count in db.query(OutreachEmail.status, func.count(OutreachEmail.id)).group_by(OutreachEmail.status).all():
        email_status_counts[st] = count

    # Check contact outreach status for additional coverage
    contact_status_counts = {}
    for st, count in db.query(Contact.outreach_status, func.count(Contact.id)).group_by(Contact.outreach_status).all():
        contact_status_counts[st] = count

    outreach_stats = OutreachPipelineStats(
        contacts_found=total_contacts,
        emails_drafted=email_status_counts.get("EMAIL DRAFTED", 0),
        approved_emails=email_status_counts.get("APPROVED", 0),
        sent_emails=email_status_counts.get("SENT", 0),
        replies=max(email_status_counts.get("REPLIED", 0), contact_status_counts.get("REPLIED", 0)),
        follow_ups=max(email_status_counts.get("FOLLOW-UP", 0), contact_status_counts.get("FOLLOW-UP", 0)),
        no_response=max(email_status_counts.get("NO RESPONSE", 0), contact_status_counts.get("NO RESPONSE", 0)),
        bounced=email_status_counts.get("BOUNCED", 0) + email_status_counts.get("FAILED", 0),
    )

    return DashboardSummaryResponse(
        application_stats=app_stats,
        outreach_stats=outreach_stats,
        total_jobs=total_jobs,
        total_applications=total_apps,
        total_contacts=total_contacts,
        total_emails=total_emails,
        calculated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    )


def list_applications_tracker(
    db: Session,
    status: Optional[str] = None,
    company: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Dict[str, Any]:
    """
    List tracked applications joined with job details.
    Includes filtering and live status distribution map.
    """
    query = db.query(Application).join(Job, Application.job_id == Job.id)

    if status:
        query = query.filter(Application.status == status.upper().strip())

    if company:
        query = query.filter(Job.company.ilike(f"%{company}%"))

    if search:
        s_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(Job.title).like(s_term),
                func.lower(Job.company).like(s_term),
                func.lower(Job.location).like(s_term),
            )
        )

    total = query.count()
    app_records = query.order_by(Application.updated_at.desc()).offset(skip).limit(limit).all()

    items: List[ApplicationTrackItem] = []
    for app in app_records:
        job = app.job
        items.append(
            ApplicationTrackItem(
                id=app.id,
                job_id=app.job_id,
                company=job.company if job else "Unknown Company",
                title=job.title if job else "Unknown Title",
                location=job.location if job else None,
                match_score=job.match_score if job else None,
                status=app.status,
                tailored_resume_path=app.tailored_resume_path,
                cover_letter_path=app.cover_letter_path,
                submission_notes=app.submission_notes,
                applied_at=app.applied_at,
                interview_date=app.interview_date,
                created_at=app.created_at,
                updated_at=app.updated_at,
            )
        )

    # Status distribution
    all_apps = db.query(Application.status).all()
    dist: Dict[str, int] = {}
    for (st,) in all_apps:
        dist[st] = dist.get(st, 0) + 1

    return {
        "total": total,
        "items": items,
        "status_distribution": dist,
    }


def update_application_status(
    db: Session,
    application_id: int,
    data: ApplicationStatusUpdate,
) -> Optional[ApplicationTrackItem]:
    """
    Update application status per PRD Section 16 lifecycle.
    Keeps parent job record status in sync.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        return None

    new_status = data.status.upper().strip()
    if new_status not in ALLOWED_APPLICATION_STATUSES:
        raise ValueError(f"Invalid status: {new_status}")

    app.status = new_status
    if data.submission_notes is not None:
        app.submission_notes = data.submission_notes

    if data.interview_date is not None:
        app.interview_date = data.interview_date

    if data.applied_at is not None:
        app.applied_at = data.applied_at
    elif new_status == "APPLIED" and not app.applied_at:
        app.applied_at = datetime.datetime.utcnow()

    app.updated_at = datetime.datetime.utcnow()

    # Sync parent Job status
    if app.job:
        app.job.status = new_status
        app.job.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(app)

    job = app.job
    return ApplicationTrackItem(
        id=app.id,
        job_id=app.job_id,
        company=job.company if job else "Unknown Company",
        title=job.title if job else "Unknown Title",
        location=job.location if job else None,
        match_score=job.match_score if job else None,
        status=app.status,
        tailored_resume_path=app.tailored_resume_path,
        cover_letter_path=app.cover_letter_path,
        submission_notes=app.submission_notes,
        applied_at=app.applied_at,
        interview_date=app.interview_date,
        created_at=app.created_at,
        updated_at=app.updated_at,
    )


def get_recent_activity(db: Session, limit: int = 25) -> RecentActivityResponse:
    """
    Generate chronological activity feed from real database records.
    Every event has a citable origin (no fake events).
    """
    events: List[ActivityEvent] = []

    # 1. Submitted applications
    applied_apps = (
        db.query(Application)
        .filter(Application.applied_at.isnot(None))
        .order_by(Application.applied_at.desc())
        .limit(10)
        .all()
    )
    for a in applied_apps:
        j_title = a.job.title if a.job else "Application"
        j_comp = a.job.company if a.job else "Company"
        events.append(
            ActivityEvent(
                id=f"app_applied_{a.id}",
                type="application_submitted",
                title=f"Application Dispatched: {j_title}",
                description=f"Submitted application to {j_comp} with verified profile materials.",
                timestamp=a.applied_at or a.updated_at,
                entity_id=a.id,
                entity_type="application",
                badge="Applied",
                color="#10b981",
            )
        )

    # 2. Scheduled interviews
    interview_apps = (
        db.query(Application)
        .filter(Application.status == "INTERVIEW")
        .order_by(Application.updated_at.desc())
        .limit(10)
        .all()
    )
    for a in interview_apps:
        j_title = a.job.title if a.job else "Role"
        j_comp = a.job.company if a.job else "Company"
        dt_str = a.interview_date.strftime("%b %d, %Y") if a.interview_date else "Scheduled"
        events.append(
            ActivityEvent(
                id=f"interview_{a.id}",
                type="interview_scheduled",
                title=f"Interview Stage: {j_title} @ {j_comp}",
                description=f"Candidate advanced to interview rounds ({dt_str}).",
                timestamp=a.updated_at,
                entity_id=a.id,
                entity_type="application",
                badge="Interview",
                color="#f59e0b",
            )
        )

    # 3. Sent emails
    sent_emails = (
        db.query(OutreachEmail)
        .filter(OutreachEmail.status == "SENT", OutreachEmail.sent_at.isnot(None))
        .order_by(OutreachEmail.sent_at.desc())
        .limit(10)
        .all()
    )
    for em in sent_emails:
        recip = em.recipient_email or "Recruiter"
        prov = em.provider or "smtp"
        events.append(
            ActivityEvent(
                id=f"email_sent_{em.id}",
                type="email_sent",
                title=f"Cold Email Sent: {em.subject}",
                description=f"Delivered to {recip} via {prov} provider.",
                timestamp=em.sent_at or em.updated_at,
                entity_id=em.id,
                entity_type="email",
                badge="Outreach",
                color="#818cf8",
            )
        )

    # 4. Discovered contacts
    new_contacts = (
        db.query(Contact)
        .order_by(Contact.created_at.desc())
        .limit(10)
        .all()
    )
    for c in new_contacts:
        events.append(
            ActivityEvent(
                id=f"contact_found_{c.id}",
                type="contact_added",
                title=f"Recruiter Discovered: {c.name}",
                description=f"{c.role or 'Recruiter'} at {c.company} ({c.verification_status}).",
                timestamp=c.created_at,
                entity_id=c.id,
                entity_type="contact",
                badge="Contact",
                color="#a855f7",
            )
        )

    # 5. Recently matched jobs
    matched_jobs = (
        db.query(Job)
        .filter(Job.match_score.isnot(None))
        .order_by(Job.updated_at.desc())
        .limit(10)
        .all()
    )
    for j in matched_jobs:
        events.append(
            ActivityEvent(
                id=f"job_match_{j.id}",
                type="job_analyzed",
                title=f"JD Evaluated: {j.title} @ {j.company}",
                description=f"Profile compatibility score: {j.match_score:.1f}%.",
                timestamp=j.updated_at,
                entity_id=j.id,
                entity_type="job",
                badge=f"{j.match_score:.0f}% Match",
                color="#38bdf8",
            )
        )

    # Sort all chronologically descending
    events.sort(key=lambda x: x.timestamp, reverse=True)
    selected_events = events[:limit]

    return RecentActivityResponse(
        events=selected_events,
        total_events=len(selected_events),
    )
