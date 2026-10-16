import logging
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.job import Job
from backend.app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobListResponse,
    JobDiscoveryRequest,
    JobDiscoveryResponse,
    GreenhouseImportRequest,
    LeverImportRequest,
    BulkJobImportRequest,
    BulkImportResponse,
    BatchJobActionRequest,
    SourceStatusResponse,
)
from backend.app.services.job_service import (
    save_or_dedup_job,
    get_jobs_filtered,
    run_job_discovery,
    bulk_import_jobs,
)
from backend.app.services.job_sources import (
    fetch_greenhouse_board_jobs,
    fetch_lever_jobs,
    check_source_statuses,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=JobListResponse, summary="List & Filter Jobs")
def list_jobs(
    q: Optional[str] = Query(None, description="Search across title, company, description, location"),
    company: Optional[str] = Query(None, description="Filter by company name"),
    location: Optional[str] = Query(None, description="Filter by location"),
    source: Optional[str] = Query(None, description="Filter by source board"),
    status: Optional[str] = Query(None, description="Filter by status (DISCOVERED, ANALYZED, ARCHIVED)"),
    workplace_type: Optional[str] = Query(None, description="Filter by Remote, Hybrid, On-site"),
    is_internship_only: bool = Query(False, description="Filter strictly for internship/trainee roles"),
    sort_by: str = Query("date_found", description="Sort field: date_found, company, title, created_at"),
    sort_order: str = Query("desc", description="Sort direction: desc or asc"),
    skip: int = Query(0, ge=0, description="Pagination skip"),
    limit: int = Query(20, ge=1, le=100, description="Pagination limit"),
    db: Session = Depends(get_db)
):
    """Retrieve filtered, sorted, and paginated job opportunities."""
    return get_jobs_filtered(
        db=db,
        q=q,
        company=company,
        location=location,
        source=source,
        status=status,
        workplace_type=workplace_type,
        is_internship_only=is_internship_only,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=limit
    )


@router.post("/discover", response_model=JobDiscoveryResponse, summary="Run Live Job Discovery")
async def discover_jobs(
    payload: JobDiscoveryRequest,
    db: Session = Depends(get_db)
):
    """
    Trigger live, authentic job discovery across supported sources (RemoteOK, Jobicy, Arbeitnow).
    All postings are source-grounded and deduplicated.
    """
    return await run_job_discovery(db=db, request=payload)


@router.get("/sources/status", response_model=List[SourceStatusResponse], summary="Check Sources Connectivity")
async def get_sources_status():
    """Check connectivity and operational status of all supported job sources."""
    return await check_source_statuses()


@router.post("/import/greenhouse", response_model=JobDiscoveryResponse, summary="Import from Greenhouse Board")
async def import_greenhouse(
    payload: GreenhouseImportRequest,
    db: Session = Depends(get_db)
):
    """
    Import live job postings directly from a company's Greenhouse public board.
    e.g., board_token: 'stripe', 'figma', 'github', 'reddit', 'airbnb'.
    """
    jobs, res = await fetch_greenhouse_board_jobs(
        board_token=payload.board_token,
        query=payload.filter_query,
        filter_internships=False
    )
    
    new_count = 0
    dup_count = 0
    for j in jobs:
        _, is_new = save_or_dedup_job(db, j)
        if is_new:
            new_count += 1
        else:
            dup_count += 1
            
    res.new_imported = new_count
    res.duplicates_skipped = dup_count
    
    return JobDiscoveryResponse(
        message=f"Imported from Greenhouse '{payload.board_token}': {len(jobs)} found, {new_count} new, {dup_count} duplicates.",
        total_found=len(jobs),
        new_imported=new_count,
        duplicates_skipped=dup_count,
        sources_results=[res]
    )


@router.post("/import/lever", response_model=JobDiscoveryResponse, summary="Import from Lever Board")
async def import_lever(
    payload: LeverImportRequest,
    db: Session = Depends(get_db)
):
    """
    Import live job postings directly from a company's Lever public board.
    e.g., company: 'palantir', 'netflix', 'scale'.
    """
    jobs, res = await fetch_lever_jobs(
        company=payload.company,
        query=payload.filter_query,
        filter_internships=False
    )
    
    new_count = 0
    dup_count = 0
    for j in jobs:
        _, is_new = save_or_dedup_job(db, j)
        if is_new:
            new_count += 1
        else:
            dup_count += 1
            
    res.new_imported = new_count
    res.duplicates_skipped = dup_count
    
    return JobDiscoveryResponse(
        message=f"Imported from Lever '{payload.company}': {len(jobs)} found, {new_count} new, {dup_count} duplicates.",
        total_found=len(jobs),
        new_imported=new_count,
        duplicates_skipped=dup_count,
        sources_results=[res]
    )


@router.post("/import/bulk", response_model=BulkImportResponse, summary="Bulk Import Jobs")
def import_bulk(
    payload: BulkJobImportRequest,
    db: Session = Depends(get_db)
):
    """Import a list of genuine job postings with automatic deduplication."""
    return bulk_import_jobs(db, payload.jobs)


@router.post("/batch/status", summary="Batch Update Job Status")
def batch_update_status(
    payload: BatchJobActionRequest,
    db: Session = Depends(get_db)
):
    """Update status for multiple jobs simultaneously."""
    if not payload.status:
        raise HTTPException(status_code=400, detail="Status must be provided")
        
    updated = db.query(Job).filter(Job.id.in_(payload.job_ids)).update(
        {"status": payload.status, "updated_at": datetime.datetime.utcnow()},
        synchronize_session=False
    )
    db.commit()
    return {"message": f"Updated status for {updated} jobs", "count": updated}


@router.post("/batch/delete", summary="Batch Delete Jobs")
def batch_delete(
    payload: BatchJobActionRequest,
    db: Session = Depends(get_db)
):
    """Delete multiple jobs by ID."""
    deleted = db.query(Job).filter(Job.id.in_(payload.job_ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {deleted} jobs", "count": deleted}


@router.get("/{job_id}", response_model=JobResponse, summary="Get Job Details")
def get_job_detail(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Get complete job details, description, extracted requirements, and raw source audit data."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found."
        )
    return JobResponse.model_validate(job)


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED, summary="Create/Add Job Manually")
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db)
):
    """Manually add an authentic job opportunity with automatic deduplication."""
    job, is_new = save_or_dedup_job(db, payload)
    if not is_new:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This job from '{payload.company}' is already in your database (ID: {job.id})."
        )
    return JobResponse.model_validate(job)


@router.put("/{job_id}", response_model=JobResponse, summary="Update Job")
def update_job(
    job_id: int,
    payload: JobUpdate,
    db: Session = Depends(get_db)
):
    """Update job attributes or user notes."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found."
        )
        
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(job, k, v)
        
    job.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(job)
    return JobResponse.model_validate(job)


@router.delete("/{job_id}", summary="Delete Job")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Delete a job opportunity from the database."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found."
        )
        
    db.delete(job)
    db.commit()
    return {"message": f"Job {job_id} ('{job.title}' at '{job.company}') deleted successfully."}
