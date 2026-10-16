"""
Batch 9 — Test Suite: Application & Outreach Tracking Dashboard.

Verifies:
  - Exact SQL calculation for all pipeline statistics (never fabricated)
  - Application pipeline stages: DISCOVERED, ANALYZED, PREPARED, READY, APPLIED,
    ASSESSMENT, INTERVIEW, OFFER, REJECTED, WITHDRAWN, EXPIRED
  - Outreach pipeline stages: CONTACT FOUND, EMAIL DRAFTED, APPROVED, SENT,
    REPLIED, NO RESPONSE, FOLLOW-UP, BOUNCED
  - Filtering applications by status, company, search keyword
  - Application status transitions with parent Job synchronization
  - Strict rejection of invalid/invented statuses
  - Chronological activity stream derived only from real database actions
  - Full API endpoints integration
"""

import datetime
import pytest
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.models.outreach import Contact, OutreachEmail
from backend.app.models.profile import UserProfile
from backend.app.schemas.tracker import ApplicationStatusUpdate
from backend.app.services import tracker_service


@pytest.fixture(autouse=True)
def clean_tracker_db(db_session):
    """Ensure a clean state across tables for each tracker test."""
    db_session.query(OutreachEmail).delete()
    db_session.query(Contact).delete()
    db_session.query(Application).delete()
    db_session.query(Job).delete()
    db_session.commit()


def test_dashboard_summary_empty(db_session):
    """Summary should report exact zeroes when no records exist (no hallucination)."""
    summary = tracker_service.get_dashboard_summary(db_session)
    assert summary.total_jobs == 0
    assert summary.total_applications == 0
    assert summary.total_contacts == 0
    assert summary.total_emails == 0
    assert summary.application_stats.discovered_jobs == 0
    assert summary.application_stats.submitted_applications == 0
    assert summary.outreach_stats.contacts_found == 0
    assert summary.outreach_stats.sent_emails == 0


def test_dashboard_summary_populated(db_session):
    """All pipeline stats must match exact counts from SQL database."""
    # 1. Seed jobs
    j1 = Job(id=101, title="AI Research Intern", company="OpenCorp", source="linkedin", status="ANALYZED", match_score=88.5)
    j2 = Job(id=102, title="Backend Intern", company="CloudNet", source="greenhouse", status="APPLIED", match_score=75.0)
    j3 = Job(id=103, title="Frontend Intern", company="DesignHub", source="manual", status="DISCOVERED")
    db_session.add_all([j1, j2, j3])
    db_session.commit()

    # 2. Seed applications
    app1 = Application(id=201, job_id=101, status="READY", tailored_resume_path="/resumes/101.pdf")
    app2 = Application(id=202, job_id=102, status="APPLIED", applied_at=datetime.datetime.utcnow())
    db_session.add_all([app1, app2])
    db_session.commit()

    # 3. Seed contacts
    c1 = Contact(id=301, name="Alice Recruiter", company="OpenCorp", email="alice@opencorp.com", verification_status="VERIFIED", outreach_status="SENT")
    c2 = Contact(id=302, name="Bob Talent", company="CloudNet", email="bob@cloudnet.com", verification_status="PUBLIC", outreach_status="REPLIED")
    db_session.add_all([c1, c2])
    db_session.commit()

    # 4. Seed emails
    e1 = OutreachEmail(id=401, contact_id=301, subject="Intro", body="Hello", status="SENT", sent_at=datetime.datetime.utcnow())
    e2 = OutreachEmail(id=402, contact_id=302, subject="Inquiry", body="Hi", status="EMAIL DRAFTED")
    db_session.add_all([e1, e2])
    db_session.commit()

    summary = tracker_service.get_dashboard_summary(db_session)
    assert summary.total_jobs == 3
    assert summary.total_applications == 2
    assert summary.total_contacts == 2
    assert summary.total_emails == 2

    # App pipeline
    assert summary.application_stats.ready_applications == 1
    assert summary.application_stats.submitted_applications == 1
    assert summary.application_stats.analyzed_jobs >= 1

    # Outreach pipeline
    assert summary.outreach_stats.contacts_found == 2
    assert summary.outreach_stats.emails_drafted == 1
    assert summary.outreach_stats.sent_emails == 1
    assert summary.outreach_stats.replies == 1


def test_list_applications_tracker_filtering(db_session):
    """Tracker listings should filter accurately by status, company, and search term."""
    j1 = Job(id=11, title="Machine Learning Intern", company="DeepAI", source="linkedin", status="READY")
    j2 = Job(id=12, title="Full Stack Intern", company="Acme Corp", source="greenhouse", status="INTERVIEW")
    db_session.add_all([j1, j2])
    db_session.commit()

    app1 = Application(id=51, job_id=11, status="READY")
    app2 = Application(id=52, job_id=12, status="INTERVIEW", interview_date=datetime.datetime.utcnow())
    db_session.add_all([app1, app2])
    db_session.commit()

    # All items
    res_all = tracker_service.list_applications_tracker(db_session)
    assert res_all["total"] == 2
    assert res_all["status_distribution"].get("READY") == 1
    assert res_all["status_distribution"].get("INTERVIEW") == 1

    # Filter by status
    res_interview = tracker_service.list_applications_tracker(db_session, status="INTERVIEW")
    assert res_interview["total"] == 1
    assert res_interview["items"][0].company == "Acme Corp"

    # Filter by company
    res_company = tracker_service.list_applications_tracker(db_session, company="DeepAI")
    assert res_company["total"] == 1
    assert res_company["items"][0].title == "Machine Learning Intern"

    # Filter by search
    res_search = tracker_service.list_applications_tracker(db_session, search="machine")
    assert res_search["total"] == 1
    assert res_search["items"][0].company == "DeepAI"


def test_update_application_status_lifecycle(db_session):
    """Updating status transitions the application and syncs parent job status."""
    job = Job(id=99, title="Systems Intern", company="OS Lab", source="direct", status="READY")
    db_session.add(job)
    db_session.commit()

    app = Application(id=88, job_id=99, status="READY")
    db_session.add(app)
    db_session.commit()

    # Move to APPLIED
    update_data = ApplicationStatusUpdate(
        status="APPLIED",
        submission_notes="Submitted via portal"
    )
    res = tracker_service.update_application_status(db_session, 88, update_data)
    assert res.status == "APPLIED"
    assert res.submission_notes == "Submitted via portal"
    assert res.applied_at is not None

    # Check parent Job status updated too
    db_session.refresh(job)
    assert job.status == "APPLIED"

    # Move to INTERVIEW
    interview_time = datetime.datetime.utcnow() + datetime.timedelta(days=3)
    update_data_2 = ApplicationStatusUpdate(
        status="INTERVIEW",
        interview_date=interview_time,
    )
    res_2 = tracker_service.update_application_status(db_session, 88, update_data_2)
    assert res_2.status == "INTERVIEW"
    assert res_2.interview_date is not None

    db_session.refresh(job)
    assert job.status == "INTERVIEW"


def test_update_application_invalid_status_rejection(db_session):
    """Reject invented or hallucinated statuses."""
    with pytest.raises(ValueError):
        ApplicationStatusUpdate(status="MAYBE_ACCEPTED")


def test_recent_activity_chronological(db_session):
    """Activity feed should capture real events in descending order."""
    now = datetime.datetime.utcnow()

    job = Job(id=1, title="Cloud Intern", company="SkyBase", source="web", status="ANALYZED", match_score=92.0, updated_at=now - datetime.timedelta(hours=5))
    contact = Contact(id=1, name="Sarah recruiter", company="SkyBase", email="sarah@skybase.com", verification_status="VERIFIED", created_at=now - datetime.timedelta(hours=4))
    email = OutreachEmail(id=1, contact_id=1, subject="Intro", body="Hey", status="SENT", sent_at=now - datetime.timedelta(hours=3), updated_at=now - datetime.timedelta(hours=3))
    app = Application(id=1, job_id=1, status="APPLIED", applied_at=now - datetime.timedelta(hours=1), updated_at=now - datetime.timedelta(hours=1))

    db_session.add_all([job, contact, email, app])
    db_session.commit()

    feed = tracker_service.get_recent_activity(db_session, limit=10)
    assert feed.total_events >= 4
    # Most recent should be applied application
    assert feed.events[0].type == "application_submitted"
    assert "SkyBase" in feed.events[0].description


def test_tracker_api_endpoints(test_client):
    """Verify HTTP API endpoints for dashboard, applications, status update, and activity."""
    from backend.tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    db.query(OutreachEmail).delete()
    db.query(Contact).delete()
    db.query(Application).delete()
    db.query(Job).delete()
    db.commit()

    j = Job(title="Platform Intern", company="InnoTech", source="manual", status="PREPARED")
    db.add(j)
    db.commit()
    db.refresh(j)
    job_id = j.id

    app = Application(job_id=job_id, status="PREPARED")
    db.add(app)
    db.commit()
    db.refresh(app)
    app_id = app.id
    db.close()

    # 1. GET /dashboard
    resp_dash = test_client.get("/api/v1/tracker/dashboard")
    assert resp_dash.status_code == 200
    data_dash = resp_dash.json()
    assert "application_stats" in data_dash
    assert "outreach_stats" in data_dash
    assert data_dash["total_jobs"] >= 1

    # 2. GET /applications
    resp_apps = test_client.get("/api/v1/tracker/applications")
    assert resp_apps.status_code == 200
    data_apps = resp_apps.json()
    assert data_apps["total"] >= 1
    assert any(a["id"] == app_id for a in data_apps["items"])

    # 3. PUT /applications/{id}/status
    resp_update = test_client.put(
        f"/api/v1/tracker/applications/{app_id}/status",
        json={"status": "APPLIED", "submission_notes": "Applied directly on ATS"}
    )
    assert resp_update.status_code == 200
    assert resp_update.json()["status"] == "APPLIED"

    # 4. Invalid status update
    resp_bad = test_client.put(
        f"/api/v1/tracker/applications/{app_id}/status",
        json={"status": "FABRICATED_STATUS"}
    )
    assert resp_bad.status_code == 422  # Pydantic validation error

    # 5. GET /activity
    resp_act = test_client.get("/api/v1/tracker/activity?limit=10")
    assert resp_act.status_code == 200
    data_act = resp_act.json()
    assert "events" in data_act
    assert isinstance(data_act["events"], list)
