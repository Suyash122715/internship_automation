"""
Batch 7 — Test Suite: HR / Recruiter Contact Discovery & Management.

Tests cover:
  - Contact CRUD API endpoints
  - Truthfulness rules:
      * verification_status validation (never accepts unknown values)
      * email can be None (never fabricated)
      * inferred email patterns are labelled INFERRED, not VERIFIED
  - Search / filter
  - Outreach status lifecycle
"""

import pytest
from backend.app.models.outreach import Contact
from backend.app.services.contact_service import (
    create_contact,
    get_contact,
    list_contacts,
    update_contact,
    delete_contact,
    infer_email_patterns,
)
from backend.tests.conftest import TestingSessionLocal


# ─────────────────────────────────────────────────────────────────────────────
# Unit tests: service-layer truthfulness rules
# ─────────────────────────────────────────────────────────────────────────────

def test_create_contact_with_no_email(db_session):
    """Email must be storable as None — never auto-generated."""
    contact = create_contact(db_session, {
        "name": "Alice Recruiter",
        "company": "Acme Corp",
        "role": "Technical Recruiter",
        "email": None,          # explicitly unknown
        "linkedin": "https://linkedin.com/in/alice-recruiter",
        "source": "LinkedIn",
        "verification_status": "PUBLIC",
        "confidence_level": "MEDIUM",
    })
    assert contact.id is not None
    assert contact.email is None   # must be stored as None, never guessed
    assert contact.verification_status == "PUBLIC"
    assert contact.confidence_level == "MEDIUM"
    assert contact.outreach_status == "CONTACT FOUND"


def test_create_contact_verified(db_session):
    """A contact verified via an official company page."""
    contact = create_contact(db_session, {
        "name": "Bob HR",
        "company": "Stripe",
        "role": "HR Manager",
        "email": "bob.hr@stripe.com",
        "source": "Company Website",
        "source_url": "https://stripe.com/about/team",
        "verification_status": "VERIFIED",
        "confidence_level": "HIGH",
        "discovery_notes": "Listed on Stripe's official team page.",
    })
    assert contact.verification_status == "VERIFIED"
    assert contact.confidence_level == "HIGH"
    assert contact.email == "bob.hr@stripe.com"
    assert contact.discovery_notes is not None


def test_create_contact_inferred_email(db_session):
    """Inferred contacts must have INFERRED status, never VERIFIED."""
    contact = create_contact(db_session, {
        "name": "Carol Gatekeeper",
        "company": "Widgetco",
        "email": "carol.gatekeeper@widgetco.com",  # algorithmically guessed
        "source": "Email Pattern Inference",
        "verification_status": "INFERRED",
        "confidence_level": "LOW",
    })
    assert contact.verification_status == "INFERRED"
    assert contact.confidence_level == "LOW"


def test_invalid_verification_status_defaults_to_unknown(db_session):
    """Invalid verification_status must be coerced to UNKNOWN at the service layer."""
    contact = create_contact(db_session, {
        "name": "Dave X",
        "company": "TestCo",
        "verification_status": "DEFINITELY_REAL",  # invalid value
        "confidence_level": "UNKNOWN",
    })
    assert contact.verification_status == "UNKNOWN"


def test_email_inference_always_inferred():
    """infer_email_patterns must always return INFERRED + LOW confidence + a warning."""
    patterns = infer_email_patterns("Jane", "Smith", "example.com")
    assert len(patterns) > 0
    for p in patterns:
        assert p["verification_status"] == "INFERRED", "Inferred emails must NEVER be marked as verified"
        assert p["confidence_level"] == "LOW"
        assert "INFERRED" in p["warning"]
        assert "@example.com" in p["address"]


def test_email_inference_missing_parts():
    """infer_email_patterns with empty inputs must return empty list."""
    assert infer_email_patterns("", "Smith", "example.com") == []
    assert infer_email_patterns("Jane", "", "example.com") == []
    assert infer_email_patterns("Jane", "Smith", "") == []


def test_update_outreach_status(db_session):
    """Outreach status can be advanced through the PRD Section 17 lifecycle."""
    contact = create_contact(db_session, {
        "name": "Eve Recruiter",
        "company": "Openai",
        "verification_status": "PUBLIC",
        "confidence_level": "MEDIUM",
    })
    assert contact.outreach_status == "CONTACT FOUND"

    updated = update_contact(db_session, contact.id, {"outreach_status": "EMAIL DRAFTED"})
    assert updated.outreach_status == "EMAIL DRAFTED"

    updated = update_contact(db_session, contact.id, {"outreach_status": "SENT"})
    assert updated.outreach_status == "SENT"


def test_delete_contact(db_session):
    """Contact can be deleted; subsequent lookup returns None."""
    contact = create_contact(db_session, {
        "name": "Frank Temp",
        "company": "TempCo",
        "verification_status": "UNKNOWN",
        "confidence_level": "UNKNOWN",
    })
    cid = contact.id
    assert delete_contact(db_session, cid) is True
    assert get_contact(db_session, cid) is None
    assert delete_contact(db_session, cid) is False  # already deleted


# ─────────────────────────────────────────────────────────────────────────────
# Integration tests: API endpoints
# ─────────────────────────────────────────────────────────────────────────────

def test_contacts_crud_lifecycle(test_client):
    """Full CRUD lifecycle: create → get → list → update → delete."""

    # 1. Create
    resp = test_client.post("/api/v1/contacts", json={
        "name": "Grace Liu",
        "company": "DeepMind",
        "role": "University Recruiter",
        "email": None,
        "linkedin": "https://linkedin.com/in/grace-liu",
        "source": "LinkedIn",
        "verification_status": "PUBLIC",
        "confidence_level": "MEDIUM",
        "discovery_notes": "Found via LinkedIn search for DeepMind University Recruiter.",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Grace Liu"
    assert data["email"] is None          # must be preserved as None
    assert data["verification_status"] == "PUBLIC"
    contact_id = data["id"]

    # 2. Get by ID
    get_resp = test_client.get(f"/api/v1/contacts/{contact_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == contact_id

    # 3. List with search
    list_resp = test_client.get("/api/v1/contacts?q=DeepMind")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] >= 1
    found = [c for c in list_data["items"] if c["id"] == contact_id]
    assert len(found) == 1

    # 4. Filter by verification_status
    pub_resp = test_client.get("/api/v1/contacts?verification_status=PUBLIC")
    assert pub_resp.status_code == 200
    pub_ids = [c["id"] for c in pub_resp.json()["items"]]
    assert contact_id in pub_ids

    # 5. Update — add an email (user found it on the company site)
    upd_resp = test_client.put(f"/api/v1/contacts/{contact_id}", json={
        "email": "grace.liu@deepmind.com",
        "source": "Company Website",
        "verification_status": "VERIFIED",
        "confidence_level": "HIGH",
    })
    assert upd_resp.status_code == 200
    upd_data = upd_resp.json()
    assert upd_data["email"] == "grace.liu@deepmind.com"
    assert upd_data["verification_status"] == "VERIFIED"

    # 6. Delete
    del_resp = test_client.delete(f"/api/v1/contacts/{contact_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # 7. Confirm 404 after deletion
    gone = test_client.get(f"/api/v1/contacts/{contact_id}")
    assert gone.status_code == 404


def test_invalid_verification_status_rejected_by_api(test_client):
    """API must reject invalid verification_status values."""
    resp = test_client.post("/api/v1/contacts", json={
        "name": "Hank Test",
        "company": "TestCo",
        "verification_status": "MADE_UP_VALUE",
        "confidence_level": "UNKNOWN",
    })
    assert resp.status_code == 422  # Pydantic validation error


def test_infer_email_endpoint_labelled_inferred(test_client):
    """The infer-email endpoint must return patterns marked INFERRED with warnings."""
    # First create a contact
    c_resp = test_client.post("/api/v1/contacts", json={
        "name": "Ivy Chen",
        "company": "Anthropic",
        "verification_status": "PUBLIC",
        "confidence_level": "MEDIUM",
    })
    assert c_resp.status_code == 201
    cid = c_resp.json()["id"]

    # Request inferred email patterns
    infer_resp = test_client.post(
        f"/api/v1/contacts/{cid}/infer-email",
        params={"company_domain": "anthropic.com"},
    )
    assert infer_resp.status_code == 200
    infer_data = infer_resp.json()

    assert infer_data["verification_status"] == "INFERRED"
    assert infer_data["confidence_level"] == "LOW"
    assert "INFERRED" in infer_data["truthfulness_notice"]
    assert len(infer_data["patterns"]) > 0
    for p in infer_data["patterns"]:
        assert p["verification_status"] == "INFERRED"
        assert "INFERRED" in p["warning"]


def test_contacts_stats_endpoint(test_client):
    """Stats endpoint returns aggregate counts."""
    resp = test_client.get("/api/v1/contacts/stats/summary")
    assert resp.status_code == 200
    stats = resp.json()
    assert "total_contacts" in stats
    assert "verification_distribution" in stats
    assert "outreach_distribution" in stats
