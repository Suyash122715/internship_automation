"""
FastAPI router for Batch 8 — Cold Email Outreach Engine.

PRD Section 14 & Section 15.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.outreach import (
    TemplateInfo,
    EmailGenerateRequest,
    EmailGenerationResult,
    EmailDraftCreate,
    EmailUpdate,
    EmailSendRequest,
    EmailResponse,
    EmailListResponse,
    QueueProcessResponse,
    OutreachStatsResponse,
    AVAILABLE_TEMPLATES,
)
from backend.app.services import outreach_service

router = APIRouter()


def _format_email_response(item) -> EmailResponse:
    """Helper to enrich EmailResponse with contact and job metadata."""
    contact = item.contact
    job = item.job
    return EmailResponse(
        id=item.id,
        contact_id=item.contact_id,
        job_id=item.job_id,
        recipient_email=item.recipient_email or (contact.email if contact else None),
        subject=item.subject,
        body=item.body,
        template_id=item.template_id,
        user_edited=item.user_edited or 0,
        status=item.status,
        provider=item.provider or "simulated",
        retry_count=item.retry_count or 0,
        approved_at=item.approved_at,
        queued_at=item.queued_at,
        sent_at=item.sent_at,
        replied_at=item.replied_at,
        error_message=item.error_message,
        created_at=item.created_at,
        updated_at=item.updated_at,
        contact_name=contact.name if contact else None,
        contact_company=contact.company if contact else None,
        contact_role=contact.role if contact else None,
        contact_verification_status=contact.verification_status if contact else None,
        job_title=job.title if job else None,
    )


# ── Templates & Generation ───────────────────────────────────────────────────

@router.get("/templates", response_model=List[TemplateInfo], summary="List Email Templates")
def get_templates():
    """Retrieve available grounded email templates per PRD Section 14."""
    return [TemplateInfo(**t) for t in AVAILABLE_TEMPLATES]


@router.post("/generate", response_model=EmailGenerationResult, summary="Generate Grounded Cold Email")
def generate_email(
    request: EmailGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate personalized cold email content.
    Strictly grounded in truthful profile, contact, and job data.
    """
    try:
        return outreach_service.generate_cold_email(db, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Generation failed: {str(e)}")


# ── Draft & CRUD ─────────────────────────────────────────────────────────────

@router.post("/drafts", response_model=EmailResponse, status_code=status.HTTP_201_CREATED, summary="Create Email Draft")
def create_draft(
    payload: EmailDraftCreate,
    db: Session = Depends(get_db),
):
    """Save a generated or custom cold email as EMAIL DRAFTED."""
    try:
        draft = outreach_service.create_email_draft(db, payload)
        return _format_email_response(draft)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/emails", response_model=EmailListResponse, summary="List Outreach Emails")
def get_emails(
    status_filter: Optional[str] = Query(None, alias="status"),
    contact_id: Optional[int] = Query(None),
    job_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List paginated emails with filter options."""
    data = outreach_service.list_emails(
        db,
        status=status_filter,
        contact_id=contact_id,
        job_id=job_id,
        skip=skip,
        limit=limit,
    )
    formatted_items = [_format_email_response(item) for item in data["items"]]
    return EmailListResponse(
        total=data["total"],
        items=formatted_items,
        status_distribution=data["status_distribution"],
    )


@router.get("/emails/{email_id}", response_model=EmailResponse, summary="Get Email Details")
def get_email_by_id(
    email_id: int,
    db: Session = Depends(get_db),
):
    item = outreach_service.get_email(db, email_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email record not found.")
    return _format_email_response(item)


@router.put("/emails/{email_id}", response_model=EmailResponse, summary="Edit Email Draft")
def update_email_draft(
    email_id: int,
    payload: EmailUpdate,
    db: Session = Depends(get_db),
):
    """User editing of subject, body, or recipient before sending."""
    updated = outreach_service.update_email(db, email_id, payload)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email record not found.")
    return _format_email_response(updated)


@router.delete("/emails/{email_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Email")
def delete_email_record(
    email_id: int,
    db: Session = Depends(get_db),
):
    success = outreach_service.delete_email(db, email_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email record not found.")
    return None


# ── Approval & Dispatch ──────────────────────────────────────────────────────

@router.post("/emails/{email_id}/approve", response_model=EmailResponse, summary="Approve Email")
def approve_email_for_sending(
    email_id: int,
    db: Session = Depends(get_db),
):
    """Explicit human approval marking status=APPROVED."""
    try:
        approved = outreach_service.approve_email(db, email_id)
        return _format_email_response(approved)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/emails/{email_id}/send", response_model=EmailResponse, summary="Send Single Email")
def send_email(
    email_id: int,
    payload: EmailSendRequest = EmailSendRequest(),
    db: Session = Depends(get_db),
):
    """
    Dispatch an approved email via supported integration (SMTP or simulated).
    Enforces truthfulness, anti-spam, and rate-limiting rules.
    """
    try:
        sent = outreach_service.send_single_email(
            db,
            email_id,
            allow_inferred=payload.allow_inferred,
            force_approve=payload.force_approve,
            simulate=payload.simulate,
        )
        return _format_email_response(sent)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/emails/{email_id}/queue", response_model=EmailResponse, summary="Queue Approved Email")
def queue_email(
    email_id: int,
    db: Session = Depends(get_db),
):
    """Enqueue an approved email for batch or delayed dispatch."""
    try:
        queued = outreach_service.queue_email_record(db, email_id)
        return _format_email_response(queued)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/queue/process", response_model=QueueProcessResponse, summary="Process Pending Email Queue")
def process_queue(
    max_batch: int = Query(10, ge=1, le=50),
    allow_inferred: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Execute queue dispatch adhering to rate-limit constraints."""
    return outreach_service.process_email_queue(db, max_batch=max_batch, allow_inferred=allow_inferred)


@router.post("/emails/{email_id}/retry", response_model=EmailResponse, summary="Retry Failed Email")
def retry_email(
    email_id: int,
    allow_inferred: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Retry dispatch for failed or bounced emails."""
    try:
        retried = outreach_service.retry_failed_email(db, email_id, allow_inferred=allow_inferred)
        return _format_email_response(retried)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── Statistics & Diagnostics ──────────────────────────────────────────────────

@router.get("/stats", response_model=OutreachStatsResponse, summary="Outreach Engine Statistics")
def get_stats(db: Session = Depends(get_db)):
    """Retrieve queue, sent, rate-limit, and provider diagnostics."""
    return outreach_service.get_outreach_stats(db)
