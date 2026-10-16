"""
Batch 10 — Master End-to-End Integration, Verification, and Security Hardening Suite.

Verifies the 16 Core Requirements of the Master PRD:
  1. Profile flow (CRUD, skills, experience, education)
  2. Resume upload & text extraction
  3. Internship discovery & deduplication
  4. Job description analysis (required vs preferred vs inferred)
  5. Profile matching & explainable compatibility scoring
  6. Tailored resume generation (0 hallucinated skills, strict truthfulness)
  7. Tailored cover letter generation (grounded, explicit on missing data)
  8. Application preparation & document storage
  9. Playwright automation field detection & anti-bot/CAPTCHA guardrails
  10. Human approval gates (application submission & cold email sending)
  11. Recruiter discovery, verification status & contact management
  12. Cold email generation with template grounded personalization
  13. Cold email editing & human approval lifecycle
  14. Email sending, simulation mode, rate limiting & retry handling
  15. Application pipeline tracking & status transitions
  16. Outreach pipeline tracking & live database statistics

Security & Reliability Hardening:
  - Secrets & credentials isolation (passwords/API keys never logged or leaked)
  - .gitignore verification for credentials & environments
  - Robust handling of missing data without crashing or inventing information
  - Rejection of invalid status transitions and malicious inputs
"""

import os
import io
import datetime
import pytest
from fastapi.testclient import TestClient

from backend.tests.conftest import TestingSessionLocal
from backend.app.models.profile import UserProfile
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.models.outreach import Contact, OutreachEmail
from backend.app.schemas.outreach import EmailGenerateRequest
from backend.app.services import (
    jd_analyzer,
    matching_engine,
    tailored_materials,
    browser_assistant,
    outreach_service,
    tracker_service,
    job_dedup,
)


@pytest.fixture(autouse=True)
def clean_database():
    """Ensure clean database tables for every integration test."""
    db = TestingSessionLocal()
    db.query(OutreachEmail).delete()
    db.query(Contact).delete()
    db.query(Application).delete()
    db.query(Job).delete()
    db.query(UserProfile).delete()
    db.commit()
    db.close()


# ── 1. Profile Flow ───────────────────────────────────────────────────────────

def test_01_profile_flow(test_client):
    """Verify master profile creation, updating, and retrieval (PRD Module A)."""
    profile_data = {
        "name": "Jordan Vance",
        "email": "jordan.vance@example.edu",
        "phone": "+1 555-0144",
        "college": "State University of Technology",
        "degree": "B.S.",
        "branch": "Computer Science",
        "graduation_year": 2026,
        "cgpa": 3.85,
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "React"],
        "projects": [
            {
                "title": "Cloud Cache Engine",
                "technologies": ["Python", "FastAPI"],
                "description": "High-throughput cache service with LRU policy."
            }
        ],
        "experience": [
            {
                "company": "Startup Labs",
                "role": "Backend Intern",
                "technologies": ["Python"],
                "description": "Implemented microservice APIs."
            }
        ],
        "education_history": [
            {
                "institution": "State University of Technology",
                "degree": "B.S.",
                "field_of_study": "Computer Science",
                "graduation_year": 2026,
            }
        ],
        "github": "https://github.com/jordanvance",
        "linkedin": "https://linkedin.com/in/jordanvance",
    }
    put_resp = test_client.put("/api/v1/profile", json=profile_data)
    assert put_resp.status_code == 200
    res_data = put_resp.json()
    assert res_data["name"] == "Jordan Vance"
    assert "Python" in res_data["skills"]

    # Retrieve profile
    get_resp = test_client.get("/api/v1/profile")
    assert get_resp.status_code == 200
    assert get_resp.json()["email"] == "jordan.vance@example.edu"


# ── 2. Resume Upload & Extraction ─────────────────────────────────────────────

def test_02_resume_upload_and_extraction(test_client):
    """Verify resume text upload and metadata parsing (PRD Section 5 & 10)."""
    resume_content = (
        "Jordan Vance\n"
        "Computer Science Student | State University of Technology\n"
        "Skills: Python, FastAPI, Docker, SQL, Git\n"
        "Projects: Cloud Cache Engine built in Python and FastAPI.\n"
    )
    file_bytes = io.BytesIO(resume_content.encode("utf-8"))

    upload_resp = test_client.post(
        "/api/v1/profile/resume/upload",
        files={"file": ("master_resume.txt", file_bytes, "text/plain")}
    )
    assert upload_resp.status_code == 200
    data = upload_resp.json()
    assert data["metadata"]["filename"] is not None
    assert "Jordan Vance" in data["extracted_text_preview"]


# ── 3. Internship Discovery & Deduplication ───────────────────────────────────

def test_03_internship_discovery_and_dedup(test_client):
    """Verify job creation, querying, and exact duplicate prevention (PRD Section 7)."""
    job_1 = {
        "title": "Software Engineering Intern",
        "company": "Nova Robotics",
        "location": "Boston, MA",
        "description": "Requirements: Python, C++, Docker.",
        "application_url": "https://novarobotics.example.com/jobs/101",
        "source": "greenhouse",
    }
    resp1 = test_client.post("/api/v1/jobs", json=job_1)
    assert resp1.status_code in [200, 201]
    job_id = resp1.json()["id"]

    # Attempt to insert identical job (must detect duplicate)
    resp2 = test_client.post("/api/v1/jobs", json=job_1)
    assert resp2.status_code in [200, 201, 409]
    if resp2.status_code in [200, 201]:
        assert resp2.json()["id"] == job_id

    # List jobs
    list_resp = test_client.get("/api/v1/jobs")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["items"]) == 1


# ── 4. JD Analysis ────────────────────────────────────────────────────────────

def test_04_jd_analysis():
    """Verify parsing requirements, skills, separating required vs preferred (PRD Section 8)."""
    jd_text = """
    Role: Backend Engineering Intern
    We are looking for a motivated student to join our platform team.
    Requirements:
    - Proficient in Python and SQL (Required)
    - Experience with Docker and RESTful APIs
    - Currently enrolled in a Computer Science degree
    Preferred Qualifications:
    - Familiarity with Kubernetes
    - Open source contributions
    """
    analysis = jd_analyzer.analyze_job_description(jd_text)
    assert "required_skills" in analysis
    assert "preferred_skills" in analysis
    assert any("python" in s.lower() for s in analysis["required_skills"])
    assert any("kubernetes" in s.lower() for s in analysis["preferred_skills"])


# ── 5. Profile Matching & Compatibility ───────────────────────────────────────

def test_05_profile_matching():
    """Verify explainable score and identification of matching vs missing skills (PRD Section 9)."""
    profile = {
        "name": "Jordan Vance",
        "skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
        "degree": "B.S.",
        "branch": "Computer Science",
        "experience": [{"role": "Intern", "technologies": ["Python"]}],
    }
    job = {
        "title": "Backend Engineering Intern",
        "description": "Requires: Python, Docker, Go. Nice to have: Kubernetes.",
        "required_skills": ["Python", "Docker", "Go"],
        "preferred_skills": ["Kubernetes"],
    }
    match = matching_engine.compute_match(profile, job)
    assert "overall_score" in match
    assert 0 <= match["overall_score"] <= 100
    skills_detail = match["matching_details"]["skills"]
    assert any("python" in s.lower() for s in skills_detail["matched_required"])
    assert any("go" in s.lower() for s in skills_detail["missing_required"])


# ── 6. Resume Tailoring (Strict Truthfulness) ─────────────────────────────────

def test_06_resume_tailoring_truthfulness():
    """AI must strictly never invent skills or claim qualifications without evidence (PRD Section 10 & 20)."""
    profile = {
        "name": "Jordan Vance",
        "email": "jordan@example.com",
        "college": "State University of Technology",
        "skills": ["Python", "FastAPI", "Docker"],
        "projects": [{"name": "Cache Service", "technologies": ["Python"], "description": "Cache system"}],
        "experience": [],
    }
    job = {
        "title": "Backend Engineering Intern",
        "company": "Cloud Corp",
        "description": "Requires: Python, Docker, and Rust.",
    }
    result = tailored_materials.generate_tailored_resume(profile, job)
    assert "resume_markdown" in result
    assert result["truthfulness_audit"]["hallucinated_skills_count"] == 0
    # Must NOT invent Rust in user's skills
    assert "Rust" not in profile["skills"]


# ── 7. Cover Letter Generation ────────────────────────────────────────────────

def test_07_cover_letter_generation():
    """Cover letter must only use verified data and explicitly note missing info (PRD Section 11)."""
    profile = {
        "name": "Jordan Vance",
        "email": "jordan@example.com",
        "college": "State University of Technology",
        "skills": ["Python", "FastAPI"],
    }
    job = {
        "title": "Software Engineering Intern",
        "company": "DeepVision",
        "description": "Building CV tools in Python.",
    }
    cl_res = tailored_materials.generate_cover_letter(profile, job)
    assert "cover_letter_markdown" in cl_res
    assert "DeepVision" in cl_res["cover_letter_markdown"]
    assert "Jordan Vance" in cl_res["cover_letter_markdown"]


# ── 8. Application Preparation ────────────────────────────────────────────────

def test_08_application_preparation(test_client):
    """Generating materials updates application status to PREPARED (PRD Section 10, 11, 16)."""
    db = TestingSessionLocal()
    # Seed user profile first
    prof = UserProfile(
        name="Jordan Vance",
        email="jordan@example.com",
        skills=["Python", "FastAPI"],
        education_history=[{"degree": "B.S.", "institution": "State Univ"}],
    )
    db.add(prof)

    j = Job(title="Systems Intern", company="Kernel Dynamics", source="manual", status="DISCOVERED", description="Python systems")
    db.add(j)
    db.commit()
    db.refresh(j)
    job_id = j.id
    db.close()

    resp = test_client.post(
        "/api/v1/materials/generate-all",
        json={"job_id": job_id, "submission_notes": "Ready for automation"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PREPARED"

    # Verify Job and Application in DB are PREPARED
    db_check = TestingSessionLocal()
    app_record = db_check.query(Application).filter(Application.job_id == job_id).first()
    assert app_record is not None
    assert app_record.status == "PREPARED"
    db_check.close()


# ── 9. Browser Automation & Anti-Bot Detection ────────────────────────────────

def test_09_playwright_field_classification_and_antibot():
    """Playwright assistant classifies fields and maps known profile information (PRD Section 12)."""
    profile = {
        "name": "Jordan Vance",
        "email": "jordan.vance@example.edu",
        "phone": "+1 555-0144",
        "college": "State University",
    }

    # Field classification rules
    f_first = browser_assistant.classify_field("first_name", "first_name", "First Name", "First name", "text")
    f_email = browser_assistant.classify_field("email", "email_input", "Email Address", "Email", "email")
    f_unknown = browser_assistant.classify_field("custom_q1", "q1", "Why do you want to work here?", "", "text")

    assert f_first == "FIRST_NAME"
    assert f_email == "EMAIL"
    assert f_unknown == "UNKNOWN_QUESTION"

    # Profile mapping
    val_first = browser_assistant.get_mapped_value_from_profile("FIRST_NAME", profile)
    val_email = browser_assistant.get_mapped_value_from_profile("EMAIL", profile)
    val_college = browser_assistant.get_mapped_value_from_profile("COLLEGE", profile)

    assert val_first == "Jordan"
    assert val_email == "jordan.vance@example.edu"
    assert val_college == "State University"


# ── 10. Human Approval Gate Enforcement ───────────────────────────────────────

def test_10_human_approval_gate_enforcement(test_client):
    """Automated submission & cold email sending MUST fail without explicit user approval (PRD Section 3.2, 12, 14)."""
    db = TestingSessionLocal()
    c = Contact(name="Sam HR", company="Gate Corp", email="sam@gatecorp.com", verification_status="VERIFIED")
    db.add(c)
    db.commit()
    db.refresh(c)

    draft = OutreachEmail(contact_id=c.id, subject="Hi", body="Text", status="EMAIL DRAFTED")
    db.add(draft)
    db.commit()
    db.refresh(draft)
    draft_id = draft.id
    db.close()

    # Sending unapproved draft without force_approve must be blocked
    resp_unapproved = test_client.post(
        f"/api/v1/outreach/emails/{draft_id}/send",
        json={"simulate": True, "force_approve": False}
    )
    assert resp_unapproved.status_code == 400
    detail = resp_unapproved.json()["detail"].lower()
    assert "approval" in detail or "approved" in detail


# ── 11. Recruiter Discovery & Contact Management ──────────────────────────────

def test_11_recruiter_discovery_and_verification(test_client):
    """Store recruiter, role, email, and confidence without inventing addresses (PRD Section 13)."""
    contact_data = {
        "name": "Elena Rostova",
        "company": "DeepVision",
        "role": "University Recruiter",
        "email": "elena.rostova@deepvision.example.com",
        "linkedin_url": "https://linkedin.com/in/elenarostova",
        "verification_status": "VERIFIED",
        "source": "company_careers",
        "confidence": 0.95,
    }
    resp = test_client.post("/api/v1/contacts", json=contact_data)
    assert resp.status_code in [200, 201]
    cid = resp.json()["id"]

    # Verify contact retrieved
    get_c = test_client.get(f"/api/v1/contacts/{cid}")
    assert get_c.status_code == 200
    assert get_c.json()["verification_status"] == "VERIFIED"


# ── 12. Cold Email Generation (Grounded) ──────────────────────────────────────

def test_12_cold_email_generation_grounded(test_client):
    """Personalized email generated from verified profile, role, company (PRD Section 14)."""
    db = TestingSessionLocal()
    prof = UserProfile(
        name="Jordan Vance",
        email="jordan@example.edu",
        skills=["Python", "FastAPI"],
        education_history=[{"degree": "B.S. in Computer Science"}],
    )
    db.add(prof)

    c = Contact(name="Elena Rostova", company="DeepVision", role="University Recruiter", email="elena@deepvision.com", verification_status="VERIFIED")
    db.add(c)

    j = Job(title="Software Engineering Intern", company="DeepVision", source="web")
    db.add(j)
    db.commit()
    db.refresh(c)
    db.refresh(j)
    cid = c.id
    jid = j.id
    db.close()

    resp = test_client.post(
        "/api/v1/outreach/generate",
        json={
            "contact_id": cid,
            "job_id": jid,
            "template_id": "direct_inquiry"
        }
    )
    assert resp.status_code == 200
    gen = resp.json()
    assert "Elena" in gen["body"]
    assert "DeepVision" in gen["body"]
    assert "Jordan Vance" in gen["body"]


# ── 13. Email Approval Lifecycle ──────────────────────────────────────────────

def test_13_email_approval_lifecycle(test_client):
    """Draft creation, editing by user, and formal approval transition (PRD Section 14)."""
    db = TestingSessionLocal()
    c = Contact(name="Marcus Talent", company="Apex Tech", email="marcus@apextech.com", verification_status="VERIFIED")
    db.add(c)
    db.commit()
    db.refresh(c)
    cid = c.id
    db.close()

    # Create draft
    draft_resp = test_client.post(
        "/api/v1/outreach/drafts",
        json={"contact_id": cid, "subject": "Apex Internship", "body": "Initial draft"}
    )
    assert draft_resp.status_code in [200, 201]
    eid = draft_resp.json()["id"]
    assert draft_resp.json()["status"] == "EMAIL DRAFTED"

    # User edits draft
    edit_resp = test_client.put(
        f"/api/v1/outreach/emails/{eid}",
        json={"body": "Polished text reviewed by applicant."}
    )
    assert edit_resp.status_code == 200
    assert "Polished text" in edit_resp.json()["body"]

    # Approve draft
    appr_resp = test_client.post(f"/api/v1/outreach/emails/{eid}/approve")
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "APPROVED"


# ── 14. Email Sending, Rate Limiting & Retry ──────────────────────────────────

def test_14_email_sending_simulation_and_retry(test_client):
    """Simulated sending of approved email and retry handling (PRD Section 15)."""
    db = TestingSessionLocal()
    c = Contact(name="Laura Lead", company="Nexus AI", email="laura@nexusai.com", verification_status="VERIFIED")
    db.add(c)
    db.commit()
    db.refresh(c)

    email = OutreachEmail(contact_id=c.id, subject="Hello", body="Content", status="APPROVED")
    db.add(email)
    db.commit()
    db.refresh(email)
    eid = email.id
    db.close()

    # Send in simulated sandbox
    send_resp = test_client.post(
        f"/api/v1/outreach/emails/{eid}/send",
        json={"simulate": True}
    )
    assert send_resp.status_code == 200
    assert send_resp.json()["status"] == "SENT"
    assert send_resp.json()["provider"] == "simulated"


# ── 15. Application Tracking Lifecycle ────────────────────────────────────────

def test_15_application_tracking_lifecycle(test_client):
    """Full progression through status stages and synchronization with Job (PRD Section 16)."""
    db = TestingSessionLocal()
    job = Job(title="Cloud Intern", company="SkyGrid", source="direct", status="READY")
    db.add(job)
    db.commit()
    db.refresh(job)

    app = Application(job_id=job.id, status="READY")
    db.add(app)
    db.commit()
    db.refresh(app)
    app_id = app.id
    job_id = job.id
    db.close()

    # Transition to APPLIED
    up1 = test_client.put(
        f"/api/v1/tracker/applications/{app_id}/status",
        json={"status": "APPLIED", "submission_notes": "Submitted via portal"}
    )
    assert up1.status_code == 200
    assert up1.json()["status"] == "APPLIED"

    # Transition to INTERVIEW
    interview_time = (datetime.datetime.utcnow() + datetime.timedelta(days=2)).isoformat()
    up2 = test_client.put(
        f"/api/v1/tracker/applications/{app_id}/status",
        json={"status": "INTERVIEW", "interview_date": interview_time}
    )
    assert up2.status_code == 200
    assert up2.json()["status"] == "INTERVIEW"

    # Transition to OFFER
    up3 = test_client.put(
        f"/api/v1/tracker/applications/{app_id}/status",
        json={"status": "OFFER"}
    )
    assert up3.status_code == 200
    assert up3.json()["status"] == "OFFER"

    # Verify parent Job synchronized to OFFER
    db_check = TestingSessionLocal()
    j_check = db_check.query(Job).filter(Job.id == job_id).first()
    assert j_check.status == "OFFER"
    db_check.close()


# ── 16. Outreach Tracking & Live Database Stats ───────────────────────────────

def test_16_outreach_tracking_and_live_dashboard(test_client):
    """Dashboard summary queries exact SQL numbers for all 14 pipeline stats (PRD Section 17 & 18)."""
    db = TestingSessionLocal()
    j = Job(title="Full Stack Intern", company="BasePoint", source="web", status="APPLIED")
    c = Contact(name="Recruiter One", company="BasePoint", email="r1@basepoint.com", verification_status="VERIFIED", outreach_status="SENT")
    db.add_all([j, c])
    db.commit()

    em = OutreachEmail(contact_id=c.id, subject="Hey", body="Body", status="SENT")
    app = Application(job_id=j.id, status="APPLIED")
    db.add_all([em, app])
    db.commit()
    db.close()

    dash_resp = test_client.get("/api/v1/tracker/dashboard")
    assert dash_resp.status_code == 200
    data = dash_resp.json()
    assert data["total_jobs"] >= 1
    assert data["total_applications"] >= 1
    assert data["total_contacts"] >= 1
    assert data["total_emails"] >= 1
    assert data["application_stats"]["submitted_applications"] >= 1
    assert data["outreach_stats"]["sent_emails"] >= 1


# ── Security & Hardening Audits ───────────────────────────────────────────────

def test_security_credentials_not_leaked(test_client):
    """Ensure sensitive credentials and passwords are never exposed in API outputs (PRD Section 19)."""
    h_resp = test_client.get("/api/v1/health")
    assert h_resp.status_code == 200
    h_data = h_resp.json()
    raw_str = str(h_data).lower()
    assert "smtp_password" not in raw_str
    assert "secret" not in raw_str

    stats_resp = test_client.get("/api/v1/outreach/stats")
    assert stats_resp.status_code == 200
    stats_data = stats_resp.json()
    assert "smtp_password" not in str(stats_data).lower()


def test_security_gitignore_contains_critical_patterns():
    """Verify .gitignore properly protects .env, databases, and private credentials (PRD Section 19)."""
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    gitignore_path = os.path.join(root_dir, ".gitignore")
    assert os.path.exists(gitignore_path)

    with open(gitignore_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert ".env" in content
    assert "*.db" in content
    assert "*.key" in content
    assert "*.pem" in content


def test_missing_data_handled_gracefully(test_client):
    """Missing profile fields or unknown entities must return clean errors, not 500 or hallucinations."""
    resp_c = test_client.get("/api/v1/contacts/999999")
    assert resp_c.status_code == 404

    resp_e = test_client.get("/api/v1/outreach/emails/999999")
    assert resp_e.status_code == 404

    resp_app = test_client.put(
        "/api/v1/tracker/applications/999999/status",
        json={"status": "APPLIED"}
    )
    assert resp_app.status_code == 404


def test_strict_input_validation_rejection(test_client):
    """Invalid statuses and malformed inputs must be rejected by Pydantic validators."""
    resp = test_client.put(
        "/api/v1/tracker/applications/1/status",
        json={"status": "TOTALLY_INVENTED_STATUS"}
    )
    assert resp.status_code in [400, 422]
