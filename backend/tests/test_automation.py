import pytest
from unittest.mock import patch, AsyncMock
from backend.app.models.profile import UserProfile
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.services.browser_assistant import (
    classify_field,
    get_mapped_value_from_profile,
    detect_and_fill_application_form,
)
from backend.tests.conftest import TestingSessionLocal


# ============================================================
# Unit Tests: Field Classification & Profile Mapping
# ============================================================

def test_field_classification_rules():
    assert classify_field("first_name", "fname", "First Name", "Enter first name", "text") == "FIRST_NAME"
    assert classify_field("last_name", "lname", "Last Name", "Enter last name", "text") == "LAST_NAME"
    assert classify_field("applicant_name", "name", "Full Name", "Your name", "text") == "FULL_NAME"
    assert classify_field("user_email", "email", "Email Address", "name@example.com", "email") == "EMAIL"
    assert classify_field("phone_number", "phone", "Phone", "(123) 456-7890", "tel") == "PHONE"
    assert classify_field("linkedin_url", "linkedin", "LinkedIn Profile", "https://...", "url") == "LINKEDIN"
    assert classify_field("github_url", "github", "GitHub Profile", "https://...", "url") == "GITHUB"
    assert classify_field("resume_file", "resume", "Upload Resume / CV", "", "file") == "RESUME_UPLOAD"
    assert classify_field("cover_file", "cover_letter", "Cover Letter", "", "file") == "COVER_LETTER_UPLOAD"
    assert classify_field("custom_q1", "q1", "Why do you want to work at Figma?", "", "textarea") == "UNKNOWN_QUESTION"
    assert classify_field("work_auth", "auth", "Are you legally authorized to work in the US?", "", "select") == "UNKNOWN_QUESTION"


def test_profile_value_mapping_truthfulness():
    profile = {
        "name": "Maya Lin",
        "email": "maya@example.com",
        "phone": "+1-555-0192",
        "college": "Berkeley",
        "degree": "B.S.",
        "branch": "Electrical Engineering",
        "graduation_year": 2026,
        "cgpa": 3.85,
        "linkedin": "https://linkedin.com/in/mayalin",
        "github": "https://github.com/mayalin",
    }

    assert get_mapped_value_from_profile("FIRST_NAME", profile) == "Maya"
    assert get_mapped_value_from_profile("LAST_NAME", profile) == "Lin"
    assert get_mapped_value_from_profile("FULL_NAME", profile) == "Maya Lin"
    assert get_mapped_value_from_profile("EMAIL", profile) == "maya@example.com"
    assert get_mapped_value_from_profile("PHONE", profile) == "+1-555-0192"
    assert get_mapped_value_from_profile("COLLEGE", profile) == "Berkeley"
    assert get_mapped_value_from_profile("GRADUATION_YEAR", profile) == "2026"
    assert get_mapped_value_from_profile("CGPA", profile) == "3.85"

    # Missing profile fields must return None (NEVER guess)
    assert get_mapped_value_from_profile("PORTFOLIO", profile) is None
    assert get_mapped_value_from_profile("LOCATION", profile) is None


# ============================================================
# Integration Tests: Automation API Endpoints
# ============================================================

def test_automation_detect_and_fill_endpoints(test_client):
    db = TestingSessionLocal()

    # 1. Setup Profile
    profile = db.query(UserProfile).first()
    if profile:
        profile.name = "Marcus Vance"
        profile.email = "marcus@example.com"
        profile.phone = "555-987-6543"
        profile.degree = "B.S."
        profile.branch = "Computer Science"
        profile.college = "Caltech"
        profile.skills = ["Python", "Playwright", "Docker"]
    else:
        profile = UserProfile(
            name="Marcus Vance",
            email="marcus@example.com",
            phone = "555-987-6543",
            degree="B.S.",
            branch="Computer Science",
            college="Caltech",
            skills=["Python", "Playwright", "Docker"],
        )
        db.add(profile)

    # 2. Setup Job
    job = Job(
        company="Anthropic",
        title="AI Systems Intern",
        location="San Francisco, CA",
        application_url="https://example.com/apply/ai-intern",
        description="Build reliable evaluation harnesses and automated test benches.",
        status="PREPARED",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    job_id = job.id
    db.close()

    # Mock browser automation execution
    mock_automation_result = {
        "success": True,
        "status": "READY",
        "page_title": "Anthropic Careers — Application",
        "final_url": "https://example.com/apply/ai-intern",
        "captcha_detected": False,
        "captcha_notice": None,
        "detected_fields": [
            {"selector": "#first_name", "field_name": "first_name", "field_type": "text", "label": "First Name", "classification": "FIRST_NAME", "mapped_value": "Marcus", "is_required": True, "is_filled": True},
            {"selector": "#email", "field_name": "email", "field_type": "email", "label": "Email", "classification": "EMAIL", "mapped_value": "marcus@example.com", "is_required": True, "is_filled": True},
            {"selector": "#custom_why", "field_name": "why_anthropic", "field_type": "textarea", "label": "Why Anthropic?", "classification": "UNKNOWN_QUESTION", "mapped_value": None, "is_required": True, "is_filled": False},
        ],
        "filled_fields": [
            {"selector": "#first_name", "field_name": "first_name", "field_type": "text", "label": "First Name", "classification": "FIRST_NAME", "mapped_value": "Marcus", "is_required": True, "is_filled": True},
            {"selector": "#email", "field_name": "email", "field_type": "email", "label": "Email", "classification": "EMAIL", "mapped_value": "marcus@example.com", "is_required": True, "is_filled": True},
        ],
        "unknown_questions": [
            {"field_id": "why_anthropic", "selector": "#custom_why", "label": "Why Anthropic?", "field_type": "textarea", "is_required": True, "user_answer": None},
        ],
        "files_attached": [],
        "submission_ready": False,
        "confirmation_message": "Form analyzed and filled.",
        "notes": ["1 custom question requires user input."],
    }

    with patch("backend.app.api.v1.endpoints.automation.detect_and_fill_application_form", new_callable=AsyncMock) as mock_detect:
        mock_detect.return_value = mock_automation_result

        # 3. Test Detect Endpoint
        detect_resp = test_client.post(
            "/api/v1/automation/detect",
            json={"job_id": job_id}
        )
        assert detect_resp.status_code == 200
        d_data = detect_resp.json()
        assert d_data["job_id"] == job_id
        assert len(d_data["detected_fields"]) == 3
        assert len(d_data["unknown_questions"]) == 1

        # 4. Test Fill Endpoint
        fill_resp = test_client.post(
            "/api/v1/automation/fill",
            json={"job_id": job_id, "use_tailored_resume": True}
        )
        assert fill_resp.status_code == 200
        f_data = fill_resp.json()
        assert f_data["status"] == "READY"
        assert len(f_data["filled_fields"]) == 2

    # 5. Test Submission Guard (Strict PRD rule: user_approved must be True)
    bad_submit = test_client.post(
        "/api/v1/automation/submit",
        json={"job_id": job_id, "user_approved": False}
    )
    assert bad_submit.status_code == 400

    # 6. Test Authorized Submission
    mock_submit_result = {
        "success": True,
        "status": "APPLIED",
        "page_title": "Application Submitted",
        "final_url": "https://example.com/apply/success",
        "captcha_detected": False,
        "confirmation_message": "Application submitted successfully.",
        "notes": [],
    }

    with patch("backend.app.api.v1.endpoints.automation.detect_and_fill_application_form", new_callable=AsyncMock) as mock_submit:
        mock_submit.return_value = mock_submit_result

        good_submit = test_client.post(
            "/api/v1/automation/submit",
            json={
                "job_id": job_id,
                "user_approved": True,
                "custom_answers": {"why_anthropic": "I am passionate about AI safety and alignment."}
            }
        )
        assert good_submit.status_code == 200
        s_data = good_submit.json()
        assert s_data["status"] == "APPLIED"
        assert s_data["success"] is True

        # Check database status is updated to APPLIED
        db_check = TestingSessionLocal()
        job_db = db_check.query(Job).filter(Job.id == job_id).first()
        assert job_db.status == "APPLIED"
        app_db = db_check.query(Application).filter(Application.job_id == job_id).first()
        assert app_db.status == "APPLIED"
        assert app_db.applied_at is not None
        db_check.close()
