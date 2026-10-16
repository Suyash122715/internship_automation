from pydantic import BaseModel
from typing import Dict, Any, Optional


class DatabaseHealth(BaseModel):
    status: str
    database_url: str
    tables: list[str]


class DashboardStats(BaseModel):
    jobs_found: int = 0
    matching_jobs: int = 0
    applications_prepared: int = 0
    applications_submitted: int = 0
    emails_sent: int = 0
    responses: int = 0
    interviews: int = 0
    offers: int = 0


class HealthCheckResponse(BaseModel):
    status: str
    app_name: str
    app_env: str
    version: str
    timestamp: str
    database: DatabaseHealth
    stats: DashboardStats
