"""
Batch 7 — HR / Recruiter Contact Service.

PRD Section 13 & Section 20 Strict Rules:
  - NEVER fabricate a recruiter name, email address, or any contact detail.
  - NEVER infer an email address and present it as VERIFIED or PUBLIC.
  - If a contact detail is unavailable, store None — never guess.
  - Clearly separate VERIFIED / PUBLIC / INFERRED / UNKNOWN contacts.
  - Source every piece of contact information to a real, citable origin.
"""

import datetime
import logging
import re
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session

from backend.app.models.outreach import Contact

logger = logging.getLogger(__name__)


# ── Allowed classification values ─────────────────────────────────────────────

VERIFICATION_STATUSES = {"VERIFIED", "PUBLIC", "INFERRED", "UNKNOWN"}
CONFIDENCE_LEVELS = {"HIGH", "MEDIUM", "LOW", "UNKNOWN"}
OUTREACH_STATUSES = {
    "CONTACT FOUND", "EMAIL DRAFTED", "APPROVED", "SENT",
    "REPLIED", "NO RESPONSE", "FOLLOW-UP", "BOUNCED",
}


# ── CRUD operations ───────────────────────────────────────────────────────────

def create_contact(db: Session, data: Dict[str, Any]) -> Contact:
    """
    Create a new contact record from user-supplied (and user-verified) data.

    CRITICAL: This function does NOT generate, infer, or validate email addresses.
    The caller is responsible for providing only real, sourced contact information.
    If email is unknown, pass email=None — never pass a guessed value.
    """
    verification_status = (data.get("verification_status") or "UNKNOWN").upper().strip()
    confidence_level = (data.get("confidence_level") or "UNKNOWN").upper().strip()

    if verification_status not in VERIFICATION_STATUSES:
        verification_status = "UNKNOWN"
    if confidence_level not in CONFIDENCE_LEVELS:
        confidence_level = "UNKNOWN"

    contact = Contact(
        name=data["name"].strip(),
        company=data["company"].strip(),
        role=data.get("role"),
        email=data.get("email"),          # None if unknown — NEVER fabricated
        linkedin=data.get("linkedin"),
        profile_url=data.get("profile_url"),
        source=data.get("source"),
        source_url=data.get("source_url"),
        verification_status=verification_status,
        confidence_level=confidence_level,
        confidence_status=verification_status.lower(),  # backward-compat alias
        job_id=data.get("job_id"),
        discovery_notes=data.get("discovery_notes"),
        outreach_status="CONTACT FOUND",
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    logger.info(
        "Created contact id=%d name=%r company=%r verification=%s",
        contact.id, contact.name, contact.company, contact.verification_status,
    )
    return contact


def get_contact(db: Session, contact_id: int) -> Optional[Contact]:
    return db.query(Contact).filter(Contact.id == contact_id).first()


def list_contacts(
    db: Session,
    q: Optional[str] = None,
    company: Optional[str] = None,
    verification_status: Optional[str] = None,
    outreach_status: Optional[str] = None,
    job_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> Dict[str, Any]:
    """
    Return a paginated, filtered list of contacts.
    Includes company_distribution and status_distribution for the UI.
    """
    query = db.query(Contact)

    if q:
        term = f"%{q.lower()}%"
        from sqlalchemy import or_, func
        query = query.filter(
            or_(
                func.lower(Contact.name).like(term),
                func.lower(Contact.company).like(term),
                func.lower(Contact.role).like(term),
            )
        )

    if company:
        query = query.filter(Contact.company.ilike(f"%{company}%"))

    if verification_status:
        query = query.filter(
            Contact.verification_status == verification_status.upper().strip()
        )

    if outreach_status:
        query = query.filter(
            Contact.outreach_status == outreach_status.upper().strip()
        )

    if job_id is not None:
        query = query.filter(Contact.job_id == job_id)

    total = query.count()
    contacts = (
        query.order_by(Contact.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Distribution maps for UI filtering chips
    all_contacts = db.query(Contact).all()
    company_dist: Dict[str, int] = {}
    status_dist: Dict[str, int] = {}
    for c in all_contacts:
        company_dist[c.company] = company_dist.get(c.company, 0) + 1
        status_dist[c.verification_status] = status_dist.get(c.verification_status, 0) + 1

    return {
        "total": total,
        "items": contacts,
        "company_distribution": company_dist,
        "status_distribution": status_dist,
    }


def update_contact(db: Session, contact_id: int, data: Dict[str, Any]) -> Optional[Contact]:
    """
    Partial update a contact. Returns None if the contact is not found.
    Truthfulness rules still apply: never allow setting email without proper
    verification_status (caller must set INFERRED if the email was guessed).
    """
    contact = get_contact(db, contact_id)
    if not contact:
        return None

    updatable_fields = [
        "name", "company", "role", "email", "linkedin", "profile_url",
        "source", "source_url", "discovery_notes", "job_id",
    ]
    for field in updatable_fields:
        if field in data and data[field] is not None:
            setattr(contact, field, data[field])

    # Strictly validated fields
    if "verification_status" in data and data["verification_status"]:
        vs = data["verification_status"].upper().strip()
        if vs in VERIFICATION_STATUSES:
            contact.verification_status = vs
            contact.confidence_status = vs.lower()  # keep alias in sync

    if "confidence_level" in data and data["confidence_level"]:
        cl = data["confidence_level"].upper().strip()
        if cl in CONFIDENCE_LEVELS:
            contact.confidence_level = cl

    if "outreach_status" in data and data["outreach_status"]:
        os_val = data["outreach_status"].upper().strip()
        if os_val in OUTREACH_STATUSES:
            contact.outreach_status = os_val

    contact.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: int) -> bool:
    """Delete a contact. Returns True if deleted, False if not found."""
    contact = get_contact(db, contact_id)
    if not contact:
        return False
    db.delete(contact)
    db.commit()
    return True


# ── Email inference helper (INFERRED only — never presented as real) ──────────

# Common public email patterns used by some companies.
# These are WELL-KNOWN public patterns only — NOT guaranteed to be valid.
# Results must always be stored with verification_status=INFERRED.
_COMMON_PATTERNS = [
    "{first}@{domain}",
    "{first}.{last}@{domain}",
    "{first}{last}@{domain}",
    "{f}{last}@{domain}",
]


def infer_email_patterns(
    first_name: str,
    last_name: str,
    company_domain: str,
) -> List[Dict[str, str]]:
    """
    Generate a list of *possible* email patterns based on common formats.

    IMPORTANT:
        - These are GUESSES — they are NEVER verified.
        - They MUST be stored with verification_status='INFERRED'.
        - The caller (API layer) is responsible for making this clear to the user.
        - Never present these to the user as real email addresses.

    Returns a list of dicts: [{pattern, address, warning}]
    """
    if not first_name or not last_name or not company_domain:
        return []

    first = re.sub(r"[^a-z]", "", first_name.lower())
    last = re.sub(r"[^a-z]", "", last_name.lower())
    f = first[0] if first else ""
    domain = company_domain.lower().strip().lstrip("@")

    results = []
    for pattern in _COMMON_PATTERNS:
        try:
            address = pattern.format(first=first, last=last, f=f, domain=domain)
            results.append({
                "pattern": pattern,
                "address": address,
                "warning": (
                    "INFERRED — This address was algorithmically generated from a common pattern. "
                    "It has NOT been verified and may be incorrect. "
                    "Do NOT present this as a real or verified email address."
                ),
                "verification_status": "INFERRED",
                "confidence_level": "LOW",
            })
        except KeyError:
            continue

    return results
