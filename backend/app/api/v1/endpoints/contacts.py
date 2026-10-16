"""
Batch 7 — API Endpoints for HR / Recruiter Contact Discovery & Management.

PRD Section 13: The system should maintain contact records with clear
distinction between VERIFIED, PUBLIC, INFERRED, and UNKNOWN contact data.

Endpoints:
  POST   /api/v1/contacts              — Create a contact (user-supplied real data)
  GET    /api/v1/contacts              — List / search contacts
  GET    /api/v1/contacts/{id}         — Get a single contact
  PUT    /api/v1/contacts/{id}         — Update a contact
  DELETE /api/v1/contacts/{id}         — Delete a contact
  POST   /api/v1/contacts/{id}/infer-email — Generate INFERRED email patterns (clearly labelled, NOT email sending)

STRICT RULES (enforced at this layer):
  - Email addresses are NEVER fabricated or auto-generated and presented as real.
  - Inferred email patterns are explicitly labelled INFERRED + carry a warning.
  - No email sending in Batch 7 (that is Batch 8).
"""

import datetime
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.contacts import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactListResponse,
)
from backend.app.services.contact_service import (
    create_contact,
    get_contact,
    list_contacts,
    update_contact,
    delete_contact,
    infer_email_patterns,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _contact_to_response(contact) -> ContactResponse:
    return ContactResponse(
        id=contact.id,
        name=contact.name,
        company=contact.company,
        role=contact.role,
        email=contact.email,
        linkedin=contact.linkedin,
        profile_url=contact.profile_url,
        source=contact.source,
        source_url=contact.source_url,
        verification_status=contact.verification_status,
        confidence_level=contact.confidence_level,
        job_id=contact.job_id,
        discovery_notes=contact.discovery_notes,
        outreach_status=contact.outreach_status,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


# ── 1. Create Contact ─────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new recruiter/HR contact (real data only)",
)
def create_contact_endpoint(
    payload: ContactCreate,
    db: Session = Depends(get_db),
):
    """
    Add a recruiter or HR contact.

    Truthfulness contract:
    - All fields must come from a real, publicly available source.
    - If email is unknown, omit it or pass null — do NOT guess.
    - Set verification_status accurately: VERIFIED / PUBLIC / INFERRED / UNKNOWN.
    - The system never auto-generates email addresses for you.
    """
    data = payload.model_dump()
    contact = create_contact(db, data)
    return _contact_to_response(contact)


# ── 2. List / Search Contacts ─────────────────────────────────────────────────

@router.get(
    "",
    response_model=ContactListResponse,
    summary="List and search recruiter contacts",
)
def list_contacts_endpoint(
    q: Optional[str] = Query(None, description="Search across name, company, role"),
    company: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None, description="VERIFIED | PUBLIC | INFERRED | UNKNOWN"),
    outreach_status: Optional[str] = Query(None),
    job_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    result = list_contacts(
        db=db,
        q=q,
        company=company,
        verification_status=verification_status,
        outreach_status=outreach_status,
        job_id=job_id,
        skip=skip,
        limit=limit,
    )
    return ContactListResponse(
        total=result["total"],
        items=[_contact_to_response(c) for c in result["items"]],
        company_distribution=result["company_distribution"],
        status_distribution=result["status_distribution"],
    )


# ── 3. Get Single Contact ─────────────────────────────────────────────────────

@router.get(
    "/{contact_id}",
    response_model=ContactResponse,
    summary="Get a single recruiter contact by ID",
)
def get_contact_endpoint(
    contact_id: int,
    db: Session = Depends(get_db),
):
    contact = get_contact(db, contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID {contact_id} not found.",
        )
    return _contact_to_response(contact)


# ── 4. Update Contact ─────────────────────────────────────────────────────────

@router.put(
    "/{contact_id}",
    response_model=ContactResponse,
    summary="Update a recruiter/HR contact record",
)
def update_contact_endpoint(
    contact_id: int,
    payload: ContactUpdate,
    db: Session = Depends(get_db),
):
    """
    Partially update a contact record.
    Truthfulness rules still apply — if updating email, set verification_status
    accurately (INFERRED if guessed, not VERIFIED).
    """
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    contact = update_contact(db, contact_id, data)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID {contact_id} not found.",
        )
    return _contact_to_response(contact)


# ── 5. Delete Contact ─────────────────────────────────────────────────────────

@router.delete(
    "/{contact_id}",
    summary="Delete a recruiter contact record",
)
def delete_contact_endpoint(
    contact_id: int,
    db: Session = Depends(get_db),
):
    deleted = delete_contact(db, contact_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID {contact_id} not found.",
        )
    return {"success": True, "message": f"Contact {contact_id} deleted successfully."}


# ── 6. Infer Email Patterns (Explicit INFERRED label — Batch 7 helper) ────────

@router.post(
    "/{contact_id}/infer-email",
    summary="Generate INFERRED email patterns (NOT verified — clearly labelled)",
)
def infer_email_endpoint(
    contact_id: int,
    company_domain: str = Query(..., description="Company domain (e.g. stripe.com)"),
    db: Session = Depends(get_db),
):
    """
    Generate a list of algorithmically inferred email address patterns for a contact.

    IMPORTANT TRUTHFULNESS NOTICE (PRD Section 13 & 20):
    - These patterns are GUESSES based on common company email formats.
    - They are NEVER verified or confirmed.
    - They are explicitly labelled 'INFERRED' with a prominent warning.
    - Do NOT use these as real email addresses without independent verification.
    - Batch 8 (Cold Email) will handle actual sending — not this endpoint.
    - This endpoint does NOT send any emails.
    """
    contact = get_contact(db, contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contact with ID {contact_id} not found.",
        )

    # Split name into first/last for pattern generation
    name_parts = contact.name.strip().split()
    if len(name_parts) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Cannot infer email patterns: contact name must contain at least "
                "a first and last name (e.g. 'Jane Smith')."
            ),
        )

    first_name = name_parts[0]
    last_name = name_parts[-1]

    patterns = infer_email_patterns(first_name, last_name, company_domain)

    return {
        "contact_id": contact_id,
        "contact_name": contact.name,
        "company": contact.company,
        "company_domain": company_domain,
        "truthfulness_notice": (
            "ALL patterns below are INFERRED — algorithmically generated guesses. "
            "None have been verified. Do NOT treat these as real email addresses. "
            "PRD Rule: The system never fabricates or presents inferred addresses as verified."
        ),
        "verification_status": "INFERRED",
        "confidence_level": "LOW",
        "patterns": patterns,
        "pattern_count": len(patterns),
    }


# ── 7. Bulk Statistics ────────────────────────────────────────────────────────

@router.get(
    "/stats/summary",
    summary="Get aggregate contact statistics",
)
def contact_stats_endpoint(db: Session = Depends(get_db)):
    """Returns counts by verification status and outreach status for the dashboard."""
    from backend.app.models.outreach import Contact as ContactModel
    all_contacts = db.query(ContactModel).all()

    verification_dist: Dict[str, int] = {}
    outreach_dist: Dict[str, int] = {}
    company_dist: Dict[str, int] = {}

    for c in all_contacts:
        verification_dist[c.verification_status] = verification_dist.get(c.verification_status, 0) + 1
        outreach_dist[c.outreach_status] = outreach_dist.get(c.outreach_status, 0) + 1
        company_dist[c.company] = company_dist.get(c.company, 0) + 1

    return {
        "total_contacts": len(all_contacts),
        "verification_distribution": verification_dist,
        "outreach_distribution": outreach_dist,
        "company_distribution": company_dist,
    }
