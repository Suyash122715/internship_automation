"""
FastAPI router for Batch 9 — Application & Outreach Tracking Dashboard.

PRD Section 16 (Application Tracker), Section 17 (Outreach Tracker), and Section 18 (Dashboard).
Strict truthfulness: All metrics and status transitions derive from database records.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.tracker import (
    DashboardSummaryResponse,
    TrackerListResponse,
    ApplicationTrackItem,
    ApplicationStatusUpdate,
    RecentActivityResponse,
)
from backend.app.services import tracker_service

router = APIRouter()


@router.get("/dashboard", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Get live aggregate pipeline counts across both Application and Outreach funnels.
    Strictly queries database records (no mocked or fabricated statistics).
    """
    return tracker_service.get_dashboard_summary(db)


@router.get("/applications", response_model=TrackerListResponse)
def list_applications_tracker(
    status: Optional[str] = Query(None, description="Filter by application status (e.g. APPLIED, INTERVIEW, OFFER)"),
    company: Optional[str] = Query(None, description="Filter by company name substring"),
    search: Optional[str] = Query(None, description="Search across job title, company, or location"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    List applications in tracking table with job associations and live stage metrics.
    """
    return tracker_service.list_applications_tracker(
        db=db,
        status=status,
        company=company,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.put("/applications/{application_id}/status", response_model=ApplicationTrackItem)
def update_application_status(
    application_id: int,
    data: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Update the status of an application according to PRD Section 16 lifecycle.
    Keeps parent Job record status in sync.
    """
    try:
        updated = tracker_service.update_application_status(
            db=db,
            application_id=application_id,
            data=data,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application with ID {application_id} not found."
        )

    return updated


@router.get("/activity", response_model=RecentActivityResponse)
def get_recent_activity(
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Retrieve real, chronological activity stream composed of actual database actions
    (applied applications, scheduled interviews, dispatched emails, contacts added, jobs analyzed).
    """
    return tracker_service.get_recent_activity(db=db, limit=limit)
