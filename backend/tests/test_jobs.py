import pytest
from backend.app.services.job_dedup import compute_job_dedup_hash, is_internship_posting
from backend.tests.conftest import TestingSessionLocal


# ============================================================
# Unit Tests — no DB, no network
# ============================================================

def test_dedup_hash_logic():
    """Same job, different UTM tracking params → same dedup hash."""
    h1 = compute_job_dedup_hash(
        "Google LLC", "Software Engineer Intern", "Mountain View, CA",
        "https://careers.google.com/jobs/123?utm_source=linkedin"
    )
    h2 = compute_job_dedup_hash(
        "google", "software engineer intern", "Mountain View, CA",
        "https://careers.google.com/jobs/123"
    )
    assert h1 == h2

    # Different role → different hash
    h3 = compute_job_dedup_hash(
        "Google", "Data Science Intern", "Mountain View, CA",
        "https://careers.google.com/jobs/456"
    )
    assert h1 != h3


def test_is_internship_posting():
    assert is_internship_posting("Software Engineering Intern - Summer 2026") is True
    assert is_internship_posting("Data Science Co-Op") is True
    assert is_internship_posting("Graduate Apprentice - AI/ML") is True
    assert is_internship_posting("Junior Frontend Developer") is True
    assert is_internship_posting("Principal Software Architect") is False
    assert is_internship_posting("Senior Director of Engineering") is False


# ============================================================
# Integration Tests — in-memory DB via TestClient
# ============================================================

def test_create_and_dedup_job_api(test_client):
    job_payload = {
        "company": "Figma",
        "title": "Software Engineering Intern",
        "location": "San Francisco, CA",
        "workplace_type": "Hybrid",
        "employment_type": "Internship",
        "description": "Figma summer 2026 internship posting",
        "skills": ["TypeScript", "React", "Rust"],
        "salary_or_stipend": "$55/hr",
        "application_url": "https://boards.greenhouse.io/figma/jobs/987654",
        "source": "Greenhouse",
        "status": "DISCOVERED",
    }

    # 1. Create Job
    r = test_client.post("/api/v1/jobs", json=job_payload)
    assert r.status_code == 201, f"Got {r.status_code}: {r.text}"
    data = r.json()
    assert data["company"] == "Figma"
    assert data["title"] == "Software Engineering Intern"
    assert data["status"] == "DISCOVERED"
    job_id = data["id"]

    # 2. Duplicate → 409
    dup = test_client.post("/api/v1/jobs", json=job_payload)
    assert dup.status_code == 409

    # 3. Detail
    detail = test_client.get(f"/api/v1/jobs/{job_id}")
    assert detail.status_code == 200
    d = detail.json()
    assert d["salary_or_stipend"] == "$55/hr"
    assert "TypeScript" in d["skills"]

    # 4. Filter
    ls = test_client.get("/api/v1/jobs?q=Figma")
    assert ls.status_code == 200
    ls_data = ls.json()
    assert ls_data["total"] >= 1
    assert any(j["id"] == job_id for j in ls_data["items"])

    # 5. Status update
    upd = test_client.put(f"/api/v1/jobs/{job_id}", json={"status": "ANALYZED"})
    assert upd.status_code == 200
    assert upd.json()["status"] == "ANALYZED"

    # 6. Delete
    assert test_client.delete(f"/api/v1/jobs/{job_id}").status_code == 200

    # 7. Gone → 404
    assert test_client.get(f"/api/v1/jobs/{job_id}").status_code == 404


def test_sources_status_endpoint(test_client):
    r = test_client.get("/api/v1/jobs/sources/status")
    assert r.status_code == 200
    sources = r.json()
    assert isinstance(sources, list)
    assert len(sources) >= 3
    names = [s["source_name"] for s in sources]
    assert "remoteok" in names
    assert "jobicy" in names
    assert "arbeitnow" in names
