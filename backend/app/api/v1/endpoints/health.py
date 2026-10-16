import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import inspect, func
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.db.session import get_db, engine
from backend.app.schemas.health import HealthCheckResponse, DatabaseHealth, DashboardStats
from backend.app.models.job import Job
from backend.app.models.application import Application
from backend.app.models.outreach import OutreachEmail

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse, summary="Health Check and System Status")
def get_health(db: Session = Depends(get_db)):
    """Check system health, database connection, and retrieve initial dashboard counters."""
    db_status = "connected"
    table_names = []
    
    try:
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    # Safely query initial stats if tables are present
    stats = DashboardStats()
    try:
        if "jobs" in table_names:
            stats.jobs_found = db.query(func.count(Job.id)).scalar() or 0
            stats.matching_jobs = db.query(func.count(Job.id)).filter(Job.match_score >= 70.0).scalar() or 0
        if "applications" in table_names:
            stats.applications_prepared = db.query(func.count(Application.id)).filter(Application.status == "PREPARED").scalar() or 0
            stats.applications_submitted = db.query(func.count(Application.id)).filter(Application.status == "APPLIED").scalar() or 0
            stats.interviews = db.query(func.count(Application.id)).filter(Application.status == "INTERVIEW").scalar() or 0
            stats.offers = db.query(func.count(Application.id)).filter(Application.status == "OFFER").scalar() or 0
        if "outreach_emails" in table_names:
            stats.emails_sent = db.query(func.count(OutreachEmail.id)).filter(OutreachEmail.status == "SENT").scalar() or 0
            stats.responses = db.query(func.count(OutreachEmail.id)).filter(OutreachEmail.status == "REPLIED").scalar() or 0
    except Exception:
        # Fallback to zero stats on fresh db
        pass

    return HealthCheckResponse(
        status="healthy" if db_status == "connected" else "degraded",
        app_name=settings.APP_NAME,
        app_env=settings.APP_ENV,
        version="0.1.0",
        timestamp=datetime.datetime.utcnow().isoformat() + "Z",
        database=DatabaseHealth(
            status=db_status,
            database_url=settings.DATABASE_URL.split("///")[-1],  # hide protocol details
            tables=table_names,
        ),
        stats=stats
    )
