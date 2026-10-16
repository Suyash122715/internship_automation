import pytest
from backend.app.models.profile import UserProfile, InternshipPreference
from backend.app.models.job import Job
from backend.app.services.jd_analyzer import analyze_job_description
from backend.app.services.matching_engine import compute_match
from backend.tests.conftest import TestingSessionLocal


# ============================================================
# Unit Tests: JD Analyzer
# ============================================================

def test_jd_analyzer_structured():
    jd_text = """
    Software Engineering Intern

    About the Role:
    Join our backend infrastructure team to build scalable services.

    Required Qualifications:
    - Bachelor's degree in Computer Science or related field
    - Strong proficiency in Python and SQL
    - Experience with Docker and Git
    - 0 to 1 years of experience

    Preferred Qualifications:
    - Experience with FastAPI or Django
    - Familiarity with Kubernetes is a plus
    - Knowledge of AWS

    Location:
    Must be located in San Francisco, CA
    """
    analysis = analyze_job_description(jd_text)

    # Required skills
    assert "python" in analysis["required_skills"]
    assert "sql" in analysis["required_skills"]
    assert "docker" in analysis["required_skills"]
    assert "git" in analysis["required_skills"]

    # Preferred skills
    assert "fastapi" in analysis["preferred_skills"] or "django" in analysis["preferred_skills"]
    assert "kubernetes" in analysis["preferred_skills"]
    assert "aws" in analysis["preferred_skills"]

    # Education
    assert len(analysis["education"]) > 0
    assert any("computer science" in e.get("field", "") for e in analysis["education"])

    # Experience
    assert analysis["experience"] is not None
    assert analysis["experience"]["min_years"] == 0

    # Location
    assert any("san francisco" in loc.lower() for loc in analysis["location_requirements"])


def test_jd_analyzer_empty():
    analysis = analyze_job_description("")
    assert analysis["required_skills"] == []
    assert analysis["preferred_skills"] == []
    assert analysis["education"] == []
    assert analysis["experience"] is None
    assert "No description" in analysis["confidence_note"]


# ============================================================
# Unit Tests: Matching Engine
# ============================================================

def test_matching_engine_reproducible_and_explainable():
    profile = {
        "name": "Jane Doe",
        "degree": "Bachelor of Technology",
        "branch": "Computer Science",
        "location": "San Francisco, CA",
        "skills": ["Python", "SQL", "Docker", "Git", "FastAPI"],
        "experience": [
            {"role": "Software Intern", "company": "Tech Corp", "skills": ["Python", "Docker"]}
        ],
        "projects": [
            {"name": "API Service", "technologies": ["FastAPI", "PostgreSQL"]}
        ]
    }

    job = {
        "title": "Software Engineering Intern",
        "location": "San Francisco, CA",
        "workplace_type": "Hybrid",
        "description": """
        Requirements:
        - Must have Python and SQL
        - Must have Docker
        Preferred:
        - FastAPI is a plus
        - Kubernetes is a bonus
        """
    }

    match = compute_match(profile, job)
    assert 0 <= match["overall_score"] <= 100
    assert "breakdown" in match
    assert match["breakdown"]["skills"] > 0
    assert match["breakdown"]["location"] == 100.0
    assert "explanation" in match
    assert "Overall Match" in match["explanation"]

    # Check matching and missing skills
    skills_detail = match["matching_details"]["skills"]
    assert "python" in skills_detail["matched_required"]
    assert "sql" in skills_detail["matched_required"]
    assert "docker" in skills_detail["matched_required"]
    assert "kubernetes" in skills_detail["missing_preferred"]


# ============================================================
# Integration Tests: Matching API Endpoints
# ============================================================

def test_matching_endpoints_flow(test_client):
    # 1. Setup profile in DB
    db = TestingSessionLocal()
    profile = db.query(UserProfile).first()
    if profile:
        profile.name = "Alex Smith"
        profile.email = "alex@example.com"
        profile.degree = "B.S."
        profile.branch = "Computer Science"
        profile.location = "Seattle, WA"
        profile.skills = ["Python", "FastAPI", "React", "PostgreSQL", "Git"]
        profile.projects = [{"name": "Web App", "technologies": ["React", "FastAPI"]}]
        profile.experience = [{"role": "Backend Intern", "company": "Startup Co"}]
    else:
        profile = UserProfile(
            name="Alex Smith",
            email="alex@example.com",
            degree="B.S.",
            branch="Computer Science",
            location="Seattle, WA",
            skills=["Python", "FastAPI", "React", "PostgreSQL", "Git"],
            projects=[{"name": "Web App", "technologies": ["React", "FastAPI"]}],
            experience=[{"role": "Backend Intern", "company": "Startup Co"}],
        )
        db.add(profile)

    pref = db.query(InternshipPreference).first()
    if pref:
        pref.target_roles = ["Software Engineer Intern", "Backend Intern"]
        pref.preferred_locations = ["Seattle, WA", "Remote"]
        pref.work_modes = ["Remote", "Hybrid"]
    else:
        pref = InternshipPreference(
            target_roles=["Software Engineer Intern", "Backend Intern"],
            preferred_locations=["Seattle, WA", "Remote"],
            work_modes=["Remote", "Hybrid"],
        )
        db.add(pref)

    # 2. Setup a job in DB
    job = Job(
        company="Stripe",
        title="Software Engineer Intern",
        location="Seattle, WA",
        workplace_type="Hybrid",
        employment_type="Internship",
        description="""
        Requirements:
        - Bachelor's in Computer Science
        - Strong Python and PostgreSQL skills
        - Git version control
        Preferred:
        - React knowledge
        - Kubernetes experience
        """,
        source="Direct",
        status="DISCOVERED",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    job_id = job.id
    db.close()

    # 3. Test analyze-jd raw text endpoint
    resp = test_client.post(
        "/api/v1/matching/analyze-jd",
        json={"description": "Requirements: Must know Python and Docker. Nice to have AWS."}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "python" in data["required_skills"]
    assert "docker" in data["required_skills"]
    assert "aws" in data["preferred_skills"]

    # 4. Test stored job analysis endpoint
    resp = test_client.get(f"/api/v1/matching/{job_id}/analyze")
    assert resp.status_code == 200
    data = resp.json()
    assert "python" in data["required_skills"]

    # 5. Test single job match endpoint
    resp = test_client.post(
        "/api/v1/matching/match",
        json={"job_id": job_id}
    )
    assert resp.status_code == 200
    match_data = resp.json()
    assert match_data["job_id"] == job_id
    assert match_data["overall_score"] > 70
    assert match_data["breakdown"]["skills"] > 0
    assert match_data["breakdown"]["location"] == 100
    assert match_data["status_updated"] is True

    # Check job status in DB is updated to ANALYZED
    db2 = TestingSessionLocal()
    updated_job = db2.query(Job).filter(Job.id == job_id).first()
    assert updated_job.status == "ANALYZED"
    assert updated_job.match_score == match_data["overall_score"]
    db2.close()

    # 6. Test batch matching endpoint
    resp = test_client.post(
        "/api/v1/matching/match/batch",
        json={"job_ids": [job_id]}
    )
    assert resp.status_code == 200
    batch_data = resp.json()
    assert batch_data["total_matched"] == 1
    assert batch_data["results"][0]["job_id"] == job_id
    assert batch_data["profile_complete"] is True
