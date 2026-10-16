import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class JobBase(BaseModel):
    company: str
    title: str
    location: Optional[str] = None
    workplace_type: Optional[str] = None  # Remote, Hybrid, On-site
    employment_type: Optional[str] = None  # Internship, Full-time, Part-time, Apprenticeship
    description: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    salary_or_stipend: Optional[str] = None
    application_url: Optional[str] = None
    source: Optional[str] = "Manual"
    source_id: Optional[str] = None
    status: Optional[str] = "DISCOVERED"


class JobCreate(JobBase):
    raw_source_data: Optional[Dict[str, Any]] = None


class JobUpdate(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    workplace_type: Optional[str] = None
    employment_type: Optional[str] = None
    description: Optional[str] = None
    skills: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    salary_or_stipend: Optional[str] = None
    application_url: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None


class JobResponse(JobBase):
    id: int
    dedup_hash: Optional[str] = None
    raw_source_data: Optional[Dict[str, Any]] = None
    match_score: Optional[float] = None
    match_breakdown: Optional[Dict[str, Any]] = None
    match_explanation: Optional[str] = None
    date_found: datetime.datetime
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class JobListResponse(BaseModel):
    items: List[JobResponse]
    total: int
    skip: int
    limit: int
    sources_distribution: Dict[str, int] = Field(default_factory=dict)
    status_distribution: Dict[str, int] = Field(default_factory=dict)


class SourceFetchResult(BaseModel):
    source: str
    status: str  # "success", "error", "skipped"
    found: int = 0
    new_imported: int = 0
    duplicates_skipped: int = 0
    message: Optional[str] = None
    error_details: Optional[str] = None


class JobDiscoveryRequest(BaseModel):
    query: Optional[str] = "intern"  # Search keyword e.g. "intern", "software engineer intern", "developer intern"
    sources: List[str] = Field(default_factory=lambda: ["remoteok", "jobicy", "arbeitnow"])
    filter_internships_only: bool = True
    limit_per_source: int = 30


class JobDiscoveryResponse(BaseModel):
    message: str
    total_found: int
    new_imported: int
    duplicates_skipped: int
    sources_results: List[SourceFetchResult]


class GreenhouseImportRequest(BaseModel):
    board_token: str  # e.g., "figma", "stripe", "github", "reddit", "airbnb"
    filter_query: Optional[str] = None


class LeverImportRequest(BaseModel):
    company: str  # e.g., "netflix", "palantir", "scale"
    filter_query: Optional[str] = None


class BulkJobImportRequest(BaseModel):
    jobs: List[JobCreate]


class BulkImportResponse(BaseModel):
    total_provided: int
    new_imported: int
    duplicates_skipped: int
    imported_ids: List[int]


class BatchJobActionRequest(BaseModel):
    job_ids: List[int]
    action: str  # e.g. "status_update", "delete"
    status: Optional[str] = None  # for status_update


class SourceStatusResponse(BaseModel):
    source_name: str
    display_name: str
    status: str  # "operational", "degraded", "offline"
    supports_keyword_search: bool
    supports_board_token: bool
    description: str
    api_url: Optional[str] = None
