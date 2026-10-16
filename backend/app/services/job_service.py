import logging
import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc, func

from backend.app.models.job import Job
from backend.app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobListResponse,
    JobDiscoveryRequest,
    JobDiscoveryResponse,
    SourceFetchResult,
    BulkImportResponse
)
from backend.app.services.job_dedup import compute_job_dedup_hash, is_internship_posting
from backend.app.services.job_sources import (
    fetch_remoteok_jobs,
    fetch_jobicy_jobs,
    fetch_arbeitnow_jobs,
    fetch_greenhouse_board_jobs,
    fetch_lever_jobs,
)

logger = logging.getLogger(__name__)


def save_or_dedup_job(db: Session, job_in: JobCreate) -> Tuple[Optional[Job], bool]:
    """
    Save a job if not duplicate.
    Returns (job, is_new: bool).
    If duplicate exists, returns (existing_job, False).
    """
    dedup_hash = compute_job_dedup_hash(
        company=job_in.company,
        title=job_in.title,
        location=job_in.location,
        application_url=job_in.application_url
    )
    
    # Check if duplicate hash exists
    existing = db.query(Job).filter(Job.dedup_hash == dedup_hash).first()
    if existing:
        return existing, False
        
    # Also check if exact application_url exists (if url provided)
    if job_in.application_url and len(job_in.application_url.strip()) > 10:
        existing_url = db.query(Job).filter(Job.application_url == job_in.application_url.strip()).first()
        if existing_url:
            return existing_url, False

    # Create new job
    job = Job(
        company=job_in.company.strip(),
        title=job_in.title.strip(),
        location=job_in.location.strip() if job_in.location else None,
        workplace_type=job_in.workplace_type,
        employment_type=job_in.employment_type,
        description=job_in.description,
        skills=job_in.skills or [],
        requirements=job_in.requirements or [],
        required_skills=job_in.required_skills or [],
        preferred_skills=job_in.preferred_skills or [],
        salary_or_stipend=job_in.salary_or_stipend,
        application_url=job_in.application_url,
        source=job_in.source or "Manual",
        source_id=job_in.source_id,
        raw_source_data=job_in.raw_source_data,
        dedup_hash=dedup_hash,
        date_found=datetime.datetime.utcnow(),
        status=job_in.status or "DISCOVERED"
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    return job, True


def get_jobs_filtered(
    db: Session,
    q: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    source: Optional[str] = None,
    status: Optional[str] = None,
    workplace_type: Optional[str] = None,
    is_internship_only: bool = False,
    sort_by: str = "date_found",
    sort_order: str = "desc",
    skip: int = 0,
    limit: int = 20
) -> JobListResponse:
    """Query jobs with rich filtering and pagination."""
    query = db.query(Job)
    
    # 1. Full-text search across multiple fields
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Job.title).like(term),
                func.lower(Job.company).like(term),
                func.lower(Job.description).like(term),
                func.lower(Job.location).like(term),
            )
        )
        
    # 2. Company filter
    if company and company.strip():
        query = query.filter(func.lower(Job.company).like(f"%{company.strip().lower()}%"))
        
    # 3. Location filter
    if location and location.strip():
        query = query.filter(func.lower(Job.location).like(f"%{location.strip().lower()}%"))
        
    # 4. Source filter
    if source and source.strip():
        query = query.filter(func.lower(Job.source).like(f"%{source.strip().lower()}%"))
        
    # 5. Status filter
    if status and status.strip():
        query = query.filter(Job.status == status.strip())
        
    # 6. Workplace type filter
    if workplace_type and workplace_type.strip():
        query = query.filter(func.lower(Job.workplace_type) == workplace_type.strip().lower())
        
    # 7. Internship-only filter
    if is_internship_only:
        query = query.filter(
            or_(
                func.lower(Job.employment_type).like("%intern%"),
                func.lower(Job.title).like("%intern%"),
                func.lower(Job.title).like("%co-op%"),
                func.lower(Job.title).like("%apprentice%"),
                func.lower(Job.title).like("%trainee%"),
                func.lower(Job.title).like("%fellow%"),
            )
        )
        
    total = query.count()
    
    # Sorting
    sort_col = getattr(Job, sort_by, Job.date_found)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))
        
    items = query.offset(skip).limit(limit).all()
    
    # Aggregated distributions for quick UI faceted filtering
    sources_dist: Dict[str, int] = {}
    for s_name, count in db.query(Job.source, func.count(Job.id)).group_by(Job.source).all():
        if s_name:
            sources_dist[s_name] = count
            
    status_dist: Dict[str, int] = {}
    for st_name, count in db.query(Job.status, func.count(Job.id)).group_by(Job.status).all():
        if st_name:
            status_dist[st_name] = count

    return JobListResponse(
        items=[JobResponse.model_validate(j) for j in items],
        total=total,
        skip=skip,
        limit=limit,
        sources_distribution=sources_dist,
        status_distribution=status_dist
    )


async def run_job_discovery(
    db: Session,
    request: JobDiscoveryRequest
) -> JobDiscoveryResponse:
    """
    Execute discovery across selected authentic job sources with deduplication.
    Never fabricates data.
    """
    total_found = 0
    new_imported = 0
    duplicates_skipped = 0
    sources_results: List[SourceFetchResult] = []
    
    query = request.query
    filter_internships = request.filter_internships_only
    limit = request.limit_per_source
    
    selected_sources = [s.lower() for s in request.sources]
    
    # 1. RemoteOK
    if "remoteok" in selected_sources:
        jobs, res = await fetch_remoteok_jobs(query=query, filter_internships=filter_internships, limit=limit)
        src_new = 0
        src_dups = 0
        for j in jobs:
            _, is_new = save_or_dedup_job(db, j)
            if is_new:
                src_new += 1
            else:
                src_dups += 1
        res.new_imported = src_new
        res.duplicates_skipped = src_dups
        sources_results.append(res)
        total_found += len(jobs)
        new_imported += src_new
        duplicates_skipped += src_dups

    # 2. Jobicy
    if "jobicy" in selected_sources:
        jobs, res = await fetch_jobicy_jobs(query=query, filter_internships=filter_internships, limit=limit)
        src_new = 0
        src_dups = 0
        for j in jobs:
            _, is_new = save_or_dedup_job(db, j)
            if is_new:
                src_new += 1
            else:
                src_dups += 1
        res.new_imported = src_new
        res.duplicates_skipped = src_dups
        sources_results.append(res)
        total_found += len(jobs)
        new_imported += src_new
        duplicates_skipped += src_dups

    # 3. Arbeitnow
    if "arbeitnow" in selected_sources:
        jobs, res = await fetch_arbeitnow_jobs(query=query, filter_internships=filter_internships, limit=limit)
        src_new = 0
        src_dups = 0
        for j in jobs:
            _, is_new = save_or_dedup_job(db, j)
            if is_new:
                src_new += 1
            else:
                src_dups += 1
        res.new_imported = src_new
        res.duplicates_skipped = src_dups
        sources_results.append(res)
        total_found += len(jobs)
        new_imported += src_new
        duplicates_skipped += src_dups

    return JobDiscoveryResponse(
        message=f"Discovery completed. Found {total_found} authentic opportunities ({new_imported} new, {duplicates_skipped} duplicates skipped).",
        total_found=total_found,
        new_imported=new_imported,
        duplicates_skipped=duplicates_skipped,
        sources_results=sources_results
    )


def bulk_import_jobs(db: Session, jobs_in: List[JobCreate]) -> BulkImportResponse:
    """Import multiple jobs with deduplication."""
    new_imported = 0
    duplicates_skipped = 0
    imported_ids = []
    
    for job_in in jobs_in:
        job, is_new = save_or_dedup_job(db, job_in)
        if is_new and job:
            new_imported += 1
            imported_ids.append(job.id)
        else:
            duplicates_skipped += 1
            
    return BulkImportResponse(
        total_provided=len(jobs_in),
        new_imported=new_imported,
        duplicates_skipped=duplicates_skipped,
        imported_ids=imported_ids
    )
