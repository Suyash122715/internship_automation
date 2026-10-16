import pytest
from backend.app.models.profile import UserProfile, InternshipPreference
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.services.tailored_materials import (
    generate_tailored_resume,
    generate_cover_letter,
)
from backend.tests.conftest import TestingSessionLocal


# ============================================================
# Unit Tests: Tailored Resume & Truthfulness
# ============================================================

def test_tailored_resume_strict_truthfulness():
    profile = {
        "name": "Sarah Connor",
        "email": "sarah@example.com",
        "college": "Stanford University",
        "degree": "B.S.",
        "branch": "Computer Science",
        "skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker"],
        "projects": [
            {
                "name": "E-Commerce App",
                "technologies": ["React", "CSS"],
                "description": "Built responsive frontend shopping catalog."
            },
            {
                "name": "Cloud Microservices",
                "technologies": ["Python", "FastAPI", "Docker"],
                "description": "Architected containerized REST APIs."
            }
        ],
        "experience": [
            {
                "role": "Software Engineering Intern",
                "company": "Cyberdyne Systems",
                "technologies": ["Python", "Docker"],
                "description": "Maintained backend services."
            }
        ]
    }

    # Job targeting Backend / FastAPI / Docker
    job = {
        "title": "Backend Engineering Intern",
        "company": "OpenAI",
        "description": "Requirements: Strong Python, FastAPI, and Docker required. Nice to have Kubernetes."
    }

    result = generate_tailored_resume(profile, job)

    # 1. Output structures
    assert "resume_markdown" in result
    assert "modifications_log" in result
    assert result["truthfulness_audit"]["hallucinated_skills_count"] == 0

    # 2. Never invents skills (Kubernetes must NOT be in user's prioritized skills)
    assert "Kubernetes" not in result["prioritized_skills"]
    assert "kubernetes" not in [s.lower() for s in result["prioritized_skills"]]

    # 3. Prioritizes matching skills (Python, FastAPI, Docker at the top)
    promoted = result["prioritized_skills"][:3]
    promoted_lower = [s.lower() for s in promoted]
    assert "python" in promoted_lower or "fastapi" in promoted_lower or "docker" in promoted_lower

    # 4. Reorders projects by relevance: Cloud Microservices before E-Commerce
    highlighted = result["highlighted_projects"]
    assert highlighted[0]["name"] == "Cloud Microservices"

    # 5. Truthful markdown formatting
    assert "# Sarah Connor" in result["resume_markdown"]
    assert "Stanford University" in result["resume_markdown"]


# ============================================================
# Unit Tests: Cover Letter & Grounding
# ============================================================

def test_cover_letter_grounding():
    profile = {
        "name": "Alex Chen",
        "email": "alex@mit.edu",
        "college": "MIT",
        "degree": "Bachelor of Science",
        "branch": "Artificial Intelligence",
        "skills": ["PyTorch", "Python", "Transformers"],
        "projects": [
            {
                "name": "Vision Transformer",
                "technologies": ["PyTorch", "Python"],
                "description": "Trained attention mechanisms for image classification."
            }
        ]
    }

    job = {
        "title": "AI Research Intern",
        "company": "DeepMind",
        "location": "London, UK",
        "description": "Requirements: PyTorch and Python experience. Passion for neural architectures."
    }

    result = generate_cover_letter(profile, job)

    assert "cover_letter_markdown" in result
    assert "Dear DeepMind Hiring Team" in result["cover_letter_markdown"]
    assert "AI Research Intern" in result["cover_letter_markdown"]
    assert "Alex Chen" in result["cover_letter_markdown"]
    assert "Vision Transformer" in result["cover_letter_markdown"]
    assert result["truthfulness_audit"]["is_source_grounded"] is True
    assert len(result["grounding_notes"]) > 0


# ============================================================
# Integration Tests: Materials Endpoints & Lifecycle
# ============================================================

def test_materials_endpoints_lifecycle(test_client):
    db = TestingSessionLocal()
    
    # 1. Setup Profile (single master profile)
    profile = db.query(UserProfile).first()
    if profile:
        profile.name = "Jordan Lee"
        profile.email = "jordan@example.com"
        profile.degree = "B.Tech"
        profile.branch = "Computer Science"
        profile.college = "Tech Institute"
        profile.skills = ["Python", "SQL", "Git", "React"]
        profile.projects = [{"name": "Portfolio Tracker", "technologies": ["Python", "SQL"]}]
        profile.experience = []
    else:
        profile = UserProfile(
            name="Jordan Lee",
            email="jordan@example.com",
            degree="B.Tech",
            branch="Computer Science",
            college="Tech Institute",
            skills=["Python", "SQL", "Git", "React"],
            projects=[{"name": "Portfolio Tracker", "technologies": ["Python", "SQL"]}],
        )
        db.add(profile)

    # 2. Setup Job
    job = Job(
        company="Databricks",
        title="Data Engineer Intern",
        location="San Francisco, CA",
        description="Requirements: Python and SQL expertise. Git version control.",
        status="DISCOVERED",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    job_id = job.id
    db.close()

    # 3. Test Generate All Materials Endpoint
    resp = test_client.post(
        "/api/v1/materials/generate-all",
        json={"job_id": job_id, "submission_notes": "Submitted via referral portal"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["job_id"] == job_id
    assert data["status"] == "PREPARED"
    assert "Jordan Lee" in data["tailored_resume_markdown"]
    assert "Databricks" in data["cover_letter_markdown"]
    assert len(data["modifications_log"]) > 0

    # Verify status in DB advanced to PREPARED
    db_check = TestingSessionLocal()
    job_db = db_check.query(Job).filter(Job.id == job_id).first()
    assert job_db.status == "PREPARED"
    app_row = db_check.query(Application).filter(Application.job_id == job_id).first()
    assert app_row is not None
    assert app_row.status == "PREPARED"
    db_check.close()

    # 4. Test Get Materials Endpoint
    get_resp = test_client.get(f"/api/v1/materials/{job_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["job_id"] == job_id
    assert "Jordan Lee" in get_data["tailored_resume_markdown"]

    # 5. Test Update / Edit Materials Endpoint
    custom_resume = "# Jordan Lee - Updated Resume\nCustom tailored content."
    custom_cover = "Dear Databricks Team,\nCustom cover letter."
    put_resp = test_client.put(
        f"/api/v1/materials/{job_id}",
        json={
            "tailored_resume_text": custom_resume,
            "cover_letter_text": custom_cover,
            "submission_notes": "Reviewed and finalized.",
        }
    )
    assert put_resp.status_code == 200
    updated_data = put_resp.json()
    assert updated_data["tailored_resume_markdown"] == custom_resume
    assert updated_data["cover_letter_markdown"] == custom_cover

    # 6. Test Download Endpoints
    down_resume = test_client.get(f"/api/v1/materials/{job_id}/download/resume")
    assert down_resume.status_code == 200
    assert down_resume.headers["content-type"].startswith("text/markdown")
    assert "Custom tailored content" in down_resume.text

    down_cover = test_client.get(f"/api/v1/materials/{job_id}/download/cover-letter")
    assert down_cover.status_code == 200
    assert "Custom cover letter" in down_cover.text
