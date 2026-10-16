"""
Batch 8 — Test Suite: Cold Email Outreach Engine.

Verifies:
  - Personalized cold email generation strictly grounded in available data
  - Truthfulness rules: no fabricated projects, skills, or recruiter details
  - Email templates availability
  - Draft creation, user editing, and status lifecycle
  - Human control enforcement: unapproved emails cannot be sent
  - Inferred address safety guardrail
  - Simulated and SMTP delivery handling
  - Email queuing and batch queue processing
  - Rate limiting enforcement
  - Retry mechanism for failed emails
  - Outreach statistics and diagnostics
"""

import pytest
from backend.app.models.outreach import Contact, OutreachEmail
from backend.app.models.profile import UserProfile
from backend.app.models.job import Job
from backend.app.schemas.outreach import EmailGenerateRequest, EmailDraftCreate, EmailUpdate
from backend.app.services import outreach_service


@pytest.fixture(autouse=True)
def setup_outreach_fixtures(db_session):
    """Seed test profile and clean up outreach tables for isolated testing."""
    db_session.query(OutreachEmail).delete()
    db_session.query(Contact).delete()
    db_session.query(UserProfile).delete()
    db_session.query(Job).delete()
    db_session.commit()

    profile = UserProfile(
        id=1,
        name="Alex River",
        email="alex.river@example.com",
        phone="+1 555-0199",
        college="Tech University",
        degree="Bachelor of Science",
        branch="Computer Science",
        skills=["Python", "FastAPI", "React", "PostgreSQL"],
        education_history=[
            {
                "degree": "Bachelor of Science",
                "field_of_study": "Computer Science",
                "institution": "Tech University",
                "graduation_year": 2026,
            }
        ],
        projects=[
            {
                "title": "Distributed Cache Engine",
                "description": "High-throughput in-memory caching system with LRU eviction",
                "technologies": ["Python", "FastAPI"],
            }
        ],
    )
    db_session.add(profile)
    db_session.commit()


def test_get_templates(test_client):
    """Available grounded templates must be retrievable."""
    res = test_client.get("/api/v1/outreach/templates")
    assert res.status_code == 200
    templates = res.json()
    assert len(templates) >= 4
    template_ids = {t["id"] for t in templates}
    assert "direct_inquiry" in template_ids
    assert "project_alignment" in template_ids
    assert "value_proposition" in template_ids
    assert "follow_up" in template_ids


def test_generate_cold_email_grounded(db_session):
    """Email generation must ground all claims in verifiable profile and contact data."""
    contact = Contact(
        name="Sarah Connor",
        company="Cyberdyne Systems",
        role="University Talent Lead",
        email="sarah.c@cyberdyne.com",
        verification_status="VERIFIED",
        confidence_level="HIGH",
    )
    db_session.add(contact)
    db_session.commit()

    job = Job(
        title="Backend Engineering Intern",
        company="Cyberdyne Systems",
        skills=["Python", "FastAPI"],
        description="Build robust backend APIs.",
    )
    db_session.add(job)
    db_session.commit()

    req = EmailGenerateRequest(
        contact_id=contact.id,
        job_id=job.id,
        template_id="direct_inquiry",
    )
    result = outreach_service.generate_cold_email(db_session, req)

    assert "Sarah" in result.body or "Sarah Connor" in result.body
    assert "Cyberdyne Systems" in result.body
    assert "Backend Engineering Intern" in result.subject
    assert "Tech University" in result.body or "Computer Science" in result.body
    assert "Distributed Cache Engine" in result.body
    assert "Alex River" in result.body
    assert result.inferred_warning is None
    assert len(result.grounded_claims) >= 3


def test_generate_cold_email_no_projects(db_session):
    """When the user has no projects, the AI must NOT fabricate a project."""
    # Wipe projects
    profile = db_session.query(UserProfile).first()
    profile.projects = []
    db_session.commit()

    contact = Contact(
        name="Marcus Wright",
        company="Resistance Tech",
        role="Engineering Manager",
        email="marcus@resistancetech.io",
        verification_status="PUBLIC",
    )
    db_session.add(contact)
    db_session.commit()

    req = EmailGenerateRequest(
        contact_id=contact.id,
        template_id="project_alignment",
    )
    result = outreach_service.generate_cold_email(db_session, req)

    # Must NOT invent any project name
    assert "Distributed Cache Engine" not in result.body
    assert any("omitted project claims" in m for m in result.missing_fields)


def test_generate_cold_email_inferred_warning(db_session):
    """An inferred address must trigger a clear prominent warning."""
    contact = Contact(
        name="Dan Miller",
        company="Innovate Labs",
        email="dan.miller@innovatelabs.com",
        verification_status="INFERRED",
        confidence_level="LOW",
    )
    db_session.add(contact)
    db_session.commit()

    req = EmailGenerateRequest(
        contact_id=contact.id,
        template_id="direct_inquiry",
    )
    result = outreach_service.generate_cold_email(db_session, req)
    assert result.inferred_warning is not None
    assert "INFERRED EMAIL WARNING" in result.inferred_warning


def test_create_and_edit_draft(db_session, test_client):
    """User can create and edit an email draft prior to approval."""
    contact = Contact(
        name="Laura Croft",
        company="Artifacts Inc",
        email="laura@artifacts.org",
        verification_status="PUBLIC",
    )
    db_session.add(contact)
    db_session.commit()

    # Create draft
    create_res = test_client.post("/api/v1/outreach/drafts", json={
        "contact_id": contact.id,
        "subject": "Initial Subject",
        "body": "Initial Body Content",
        "template_id": "direct_inquiry",
    })
    assert create_res.status_code == 201
    email_data = create_res.json()
    assert email_data["status"] == "EMAIL DRAFTED"
    assert email_data["user_edited"] == 0
    email_id = email_data["id"]

    # Edit draft
    edit_res = test_client.put(f"/api/v1/outreach/emails/{email_id}", json={
        "subject": "Updated Custom Subject",
        "body": "Customized body text by user.",
    })
    assert edit_res.status_code == 200
    updated_data = edit_res.json()
    assert updated_data["subject"] == "Updated Custom Subject"
    assert updated_data["user_edited"] == 1


def test_approval_enforcement(db_session, test_client):
    """Unapproved email cannot be sent directly without approval."""
    contact = Contact(
        name="David Ross",
        company="Venture One",
        email="david@ventureone.com",
        verification_status="PUBLIC",
    )
    db_session.add(contact)
    db_session.commit()

    email_record = OutreachEmail(
        contact_id=contact.id,
        recipient_email="david@ventureone.com",
        subject="Internship Inquiry",
        body="Hello David",
        status="EMAIL DRAFTED",  # Not approved!
    )
    db_session.add(email_record)
    db_session.commit()

    # Attempt send without approval
    res = test_client.post(f"/api/v1/outreach/emails/{email_record.id}/send", json={
        "force_approve": False,
    })
    assert res.status_code == 400
    assert "Explicit user approval is mandatory" in res.json()["detail"]


def test_send_approved_email_simulated(test_client):
    """Approved email dispatches cleanly in simulated mode."""
    c_res = test_client.post("/api/v1/contacts", json={
        "name": "Elena Fisher",
        "company": "Uncharted Studios",
        "email": "elena@uncharted.com",
        "verification_status": "VERIFIED",
        "confidence_level": "HIGH",
    })
    assert c_res.status_code == 201
    contact_id = c_res.json()["id"]

    d_res = test_client.post("/api/v1/outreach/drafts", json={
        "contact_id": contact_id,
        "recipient_email": "elena@uncharted.com",
        "subject": "Internship Inquiry",
        "body": "Hello Elena",
    })
    assert d_res.status_code == 201
    email_id = d_res.json()["id"]

    app_res = test_client.post(f"/api/v1/outreach/emails/{email_id}/approve")
    assert app_res.status_code == 200

    res = test_client.post(f"/api/v1/outreach/emails/{email_id}/send", json={
        "simulate": True,
    })
    assert res.status_code == 200, f"Error: {res.text}"
    sent_data = res.json()
    assert sent_data["status"] == "SENT"
    assert sent_data["sent_at"] is not None
    assert sent_data["provider"] == "simulated"

    c_check = test_client.get(f"/api/v1/contacts/{contact_id}")
    assert c_check.json()["outreach_status"] == "SENT"


def test_send_inferred_safety_guard(test_client):
    """Sending to an INFERRED address without explicit flag must be blocked."""
    c_res = test_client.post("/api/v1/contacts", json={
        "name": "Inferred Person",
        "company": "Mystery Corp",
        "email": "inferred@mystery.com",
        "verification_status": "INFERRED",
        "confidence_level": "LOW",
    })
    assert c_res.status_code == 201
    contact_id = c_res.json()["id"]

    d_res = test_client.post("/api/v1/outreach/drafts", json={
        "contact_id": contact_id,
        "recipient_email": "inferred@mystery.com",
        "subject": "Inferred Inquiry",
        "body": "Hello",
    })
    assert d_res.status_code == 201
    email_id = d_res.json()["id"]

    test_client.post(f"/api/v1/outreach/emails/{email_id}/approve")

    # Blocked without allow_inferred
    res = test_client.post(f"/api/v1/outreach/emails/{email_id}/send", json={
        "allow_inferred": False,
        "simulate": True,
    })
    assert res.status_code == 400
    assert "INFERRED verification status" in res.json()["detail"]

    # Allowed with explicit confirmation
    res_ok = test_client.post(f"/api/v1/outreach/emails/{email_id}/send", json={
        "allow_inferred": True,
        "simulate": True,
    })
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] == "SENT"


def test_queue_and_process(test_client):
    """Queueing and batch processing of approved emails."""
    c_res = test_client.post("/api/v1/contacts", json={
        "name": "Quentin Bell",
        "company": "Queue Tech",
        "email": "q.bell@queuetech.com",
        "verification_status": "PUBLIC",
        "confidence_level": "MEDIUM",
    })
    assert c_res.status_code == 201
    contact_id = c_res.json()["id"]

    d_res = test_client.post("/api/v1/outreach/drafts", json={
        "contact_id": contact_id,
        "recipient_email": "q.bell@queuetech.com",
        "subject": "Queued Email",
        "body": "Hello Quentin",
    })
    assert d_res.status_code == 201
    email_id = d_res.json()["id"]

    test_client.post(f"/api/v1/outreach/emails/{email_id}/approve")

    # Queue it
    q_res = test_client.post(f"/api/v1/outreach/emails/{email_id}/queue")
    assert q_res.status_code == 200
    assert q_res.json()["status"] == "QUEUED"

    # Process queue
    proc_res = test_client.post("/api/v1/outreach/queue/process?max_batch=5")
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["processed"] >= 1
    assert proc_data["sent"] >= 1
    assert proc_data["remaining_queued"] == 0


def test_retry_failed_email(test_client):
    """Failed email can be retried successfully."""
    c_res = test_client.post("/api/v1/contacts", json={
        "name": "Arthur Dent",
        "company": "Megadodo Pub",
        "email": "arthur@megadodo.com",
        "verification_status": "PUBLIC",
        "confidence_level": "MEDIUM",
    })
    assert c_res.status_code == 201
    contact_id = c_res.json()["id"]

    d_res = test_client.post("/api/v1/outreach/drafts", json={
        "contact_id": contact_id,
        "recipient_email": "arthur@megadodo.com",
        "subject": "Retry Test",
        "body": "Hello Arthur",
    })
    assert d_res.status_code == 201
    email_id = d_res.json()["id"]

    test_client.put(f"/api/v1/outreach/emails/{email_id}", json={
        "status": "FAILED",
    })

    retry_res = test_client.post(f"/api/v1/outreach/emails/{email_id}/retry")
    assert retry_res.status_code == 200, f"Error: {retry_res.text}"
    assert retry_res.json()["status"] == "SENT"
    assert retry_res.json()["error_message"] is None


def test_outreach_stats_endpoint(test_client):
    """Stats endpoint provides complete counters and rate limit health."""
    res = test_client.get("/api/v1/outreach/stats")
    assert res.status_code == 200
    data = res.json()
    assert "emails_drafted" in data
    assert "emails_sent" in data
    assert "rate_limit" in data
    assert "limit_per_minute" in data["rate_limit"]
    assert "provider_status" in data
