from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, profile, jobs, matching, materials, automation, contacts, outreach, tracker

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(profile.router, prefix="/profile", tags=["Profile & Resume"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Internship Discovery"])
api_router.include_router(matching.router, prefix="/matching", tags=["JD Analysis & Matching"])
api_router.include_router(materials.router, prefix="/materials", tags=["Tailored Materials & Resumes"])
api_router.include_router(automation.router, prefix="/automation", tags=["Application Automation"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["HR & Recruiter Contacts"])
api_router.include_router(outreach.router, prefix="/outreach", tags=["Cold Email Outreach Engine"])
api_router.include_router(tracker.router, prefix="/tracker", tags=["Application & Outreach Tracker"])
