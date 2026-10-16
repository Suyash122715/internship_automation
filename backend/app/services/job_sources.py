import re
import html
import logging
import datetime
from typing import List, Dict, Any, Optional, Tuple
import httpx

from backend.app.schemas.job import JobCreate, SourceFetchResult, SourceStatusResponse
from backend.app.services.job_dedup import is_internship_posting

logger = logging.getLogger(__name__)

# Standard timeout for external HTTP calls (in seconds)
TIMEOUT_SECONDS = 15.0
DEFAULT_USER_AGENT = "InternshipAgent/1.0 (Educational/Personal Assistant; local user; https://github.com/internship-agent)"


def clean_html_text(raw_html: Optional[str]) -> str:
    """Convert HTML job descriptions into clean, human-readable plain text without hallucination."""
    if not raw_html:
        return ""
    # Unescape HTML entities
    text = html.unescape(raw_html)
    # Replace breaks and paragraphs with newlines
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<li[^>]*>', '• ', text, flags=re.IGNORECASE)
    text = re.sub(r'</h[1-6]>', '\n\n', text, flags=re.IGNORECASE)
    # Strip remaining tags
    text = re.sub(r'<[^>]+>', '', text)
    # Collapse multiple consecutive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# ==============================================================================
# 1. RemoteOK API Source
# ==============================================================================
async def fetch_remoteok_jobs(
    query: Optional[str] = None,
    filter_internships: bool = False,
    limit: int = 40
) -> Tuple[List[JobCreate], SourceFetchResult]:
    """
    Fetch authentic live jobs from RemoteOK public API.
    URL: https://remoteok.com/api
    """
    source_name = "RemoteOK"
    url = "https://remoteok.com/api"
    jobs: List[JobCreate] = []
    
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            
        if resp.status_code != 200:
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details=f"RemoteOK API returned HTTP status {resp.status_code}"
            )
            
        data = resp.json()
        if not isinstance(data, list):
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details="Unexpected response structure from RemoteOK API"
            )
            
        # The first item in RemoteOK is usually API metadata / legal disclaimer
        items = data[1:] if len(data) > 1 and isinstance(data[0], dict) and "legal" in data[0] else data
        
        q_lower = (query or "").lower().strip()
        
        for item in items:
            if not isinstance(item, dict):
                continue
                
            company = (item.get("company") or "").strip()
            title = (item.get("position") or "").strip()
            
            if not company or not title:
                continue
                
            # Check query match if specified
            tags = item.get("tags") or []
            tags_str = " ".join([str(t).lower() for t in tags])
            search_corpus = f"{company.lower()} {title.lower()} {tags_str}"
            
            if q_lower and q_lower not in search_corpus:
                # If searching specifically for "intern", also check title
                if "intern" in q_lower and not is_internship_posting(title):
                    continue
                elif q_lower not in search_corpus:
                    continue
                    
            if filter_internships and not is_internship_posting(title, employment_type="Internship" if "intern" in search_corpus else ""):
                # Skip if internship-only filter is on and title is not internship
                continue
                
            # Extract truthful fields
            location = item.get("location") or "Remote"
            workplace_type = "Remote"
            
            # Employment type
            emp_type = "Internship" if is_internship_posting(title) else "Full-time"
            
            # Clean description
            raw_desc = item.get("description") or ""
            clean_desc = clean_html_text(raw_desc)
            
            # Salary if provided by source
            sal_min = item.get("salary_min")
            sal_max = item.get("salary_max")
            salary_str = None
            if sal_min and sal_max:
                salary_str = f"${sal_min:,} - ${sal_max:,} USD/yr"
            elif sal_min:
                salary_str = f"From ${sal_min:,} USD/yr"
                
            apply_url = item.get("url") or item.get("apply_url")
            
            job = JobCreate(
                company=company,
                title=title,
                location=location,
                workplace_type=workplace_type,
                employment_type=emp_type,
                description=clean_desc,
                skills=tags if isinstance(tags, list) else [],
                requirements=[],
                required_skills=[],
                preferred_skills=[],
                salary_or_stipend=salary_str,
                application_url=apply_url,
                source=source_name,
                source_id=str(item.get("id")) if item.get("id") else None,
                status="DISCOVERED",
                raw_source_data=item
            )
            jobs.append(job)
            if len(jobs) >= limit:
                break
                
        return jobs, SourceFetchResult(
            source=source_name,
            status="success",
            found=len(jobs),
            message=f"Successfully fetched {len(jobs)} jobs from {source_name}"
        )
        
    except Exception as e:
        logger.error(f"Error fetching from {source_name}: {e}")
        return [], SourceFetchResult(
            source=source_name,
            status="error",
            found=0,
            error_details=str(e)
        )


# ==============================================================================
# 2. Jobicy Remote Jobs API Source
# ==============================================================================
async def fetch_jobicy_jobs(
    query: Optional[str] = None,
    filter_internships: bool = False,
    limit: int = 40
) -> Tuple[List[JobCreate], SourceFetchResult]:
    """
    Fetch authentic remote jobs from Jobicy public API.
    URL: https://jobicy.com/api/v2/remote-jobs
    """
    source_name = "Jobicy"
    url = f"https://jobicy.com/api/v2/remote-jobs?count={min(limit * 2, 50)}"
    if query:
        url += f"&tag={query}"
        
    jobs: List[JobCreate] = []
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            
        if resp.status_code != 200:
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details=f"Jobicy API returned HTTP status {resp.status_code}"
            )
            
        data = resp.json()
        items = data.get("jobs", [])
        if not isinstance(items, list):
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details="Jobicy API response did not contain a jobs list"
            )
            
        q_lower = (query or "").lower().strip()
        
        for item in items:
            if not isinstance(item, dict):
                continue
                
            company = (item.get("companyName") or "").strip()
            title = (item.get("jobTitle") or "").strip()
            
            if not company or not title:
                continue
                
            emp_type_raw = item.get("jobType")
            emp_type_str = ", ".join(emp_type_raw) if isinstance(emp_type_raw, list) else str(emp_type_raw or "")
            
            if filter_internships and not is_internship_posting(title, employment_type=emp_type_str):
                continue
                
            clean_desc = clean_html_text(item.get("jobExcerpt") or item.get("jobDescription") or "")
            
            # Salary if provided by source
            sal_min = item.get("annualSalaryMin")
            sal_max = item.get("annualSalaryMax")
            sal_curr = item.get("salaryCurrency") or "USD"
            salary_str = None
            if sal_min and sal_max:
                salary_str = f"{sal_min:,} - {sal_max:,} {sal_curr}/yr"
            elif sal_min:
                salary_str = f"From {sal_min:,} {sal_curr}/yr"
                
            # Skills/industries
            industries = item.get("jobIndustry") or []
            skills = industries if isinstance(industries, list) else [str(industries)]
            
            job = JobCreate(
                company=company,
                title=title,
                location=item.get("jobGeo") or "Remote",
                workplace_type="Remote",
                employment_type=emp_type_str or ("Internship" if is_internship_posting(title) else "Full-time"),
                description=clean_desc,
                skills=skills,
                requirements=[],
                required_skills=[],
                preferred_skills=[],
                salary_or_stipend=salary_str,
                application_url=item.get("url"),
                source=source_name,
                source_id=str(item.get("id")) if item.get("id") else None,
                status="DISCOVERED",
                raw_source_data=item
            )
            jobs.append(job)
            if len(jobs) >= limit:
                break
                
        return jobs, SourceFetchResult(
            source=source_name,
            status="success",
            found=len(jobs),
            message=f"Successfully fetched {len(jobs)} jobs from {source_name}"
        )
        
    except Exception as e:
        logger.error(f"Error fetching from {source_name}: {e}")
        return [], SourceFetchResult(
            source=source_name,
            status="error",
            found=0,
            error_details=str(e)
        )


# ==============================================================================
# 3. Arbeitnow Job Board API Source
# ==============================================================================
async def fetch_arbeitnow_jobs(
    query: Optional[str] = None,
    filter_internships: bool = False,
    limit: int = 40
) -> Tuple[List[JobCreate], SourceFetchResult]:
    """
    Fetch authentic jobs from Arbeitnow public API.
    URL: https://www.arbeitnow.com/api/job-board-api
    """
    source_name = "Arbeitnow"
    url = "https://www.arbeitnow.com/api/job-board-api"
    
    jobs: List[JobCreate] = []
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            
        if resp.status_code != 200:
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details=f"Arbeitnow API returned HTTP status {resp.status_code}"
            )
            
        data = resp.json()
        items = data.get("data", [])
        if not isinstance(items, list):
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details="Arbeitnow API response did not contain data array"
            )
            
        q_lower = (query or "").lower().strip()
        
        for item in items:
            if not isinstance(item, dict):
                continue
                
            company = (item.get("company_name") or "").strip()
            title = (item.get("title") or "").strip()
            
            if not company or not title:
                continue
                
            tags = item.get("tags") or []
            tags_str = " ".join([str(t).lower() for t in tags])
            search_corpus = f"{company.lower()} {title.lower()} {tags_str}"
            
            if q_lower and q_lower not in search_corpus:
                if "intern" in q_lower and not is_internship_posting(title):
                    continue
                elif q_lower not in search_corpus:
                    continue
                    
            if filter_internships and not is_internship_posting(title):
                continue
                
            clean_desc = clean_html_text(item.get("description") or "")
            is_remote = item.get("remote", False)
            workplace_type = "Remote" if is_remote else "On-site"
            
            job = JobCreate(
                company=company,
                title=title,
                location=item.get("location") or ("Remote" if is_remote else "Unknown"),
                workplace_type=workplace_type,
                employment_type="Internship" if is_internship_posting(title) else item.get("job_types", ["Full-time"])[0] if isinstance(item.get("job_types"), list) and len(item.get("job_types")) > 0 else "Full-time",
                description=clean_desc,
                skills=tags if isinstance(tags, list) else [],
                requirements=[],
                required_skills=[],
                preferred_skills=[],
                salary_or_stipend=None,
                application_url=item.get("url"),
                source=source_name,
                source_id=item.get("slug"),
                status="DISCOVERED",
                raw_source_data=item
            )
            jobs.append(job)
            if len(jobs) >= limit:
                break
                
        return jobs, SourceFetchResult(
            source=source_name,
            status="success",
            found=len(jobs),
            message=f"Successfully fetched {len(jobs)} jobs from {source_name}"
        )
        
    except Exception as e:
        logger.error(f"Error fetching from {source_name}: {e}")
        return [], SourceFetchResult(
            source=source_name,
            status="error",
            found=0,
            error_details=str(e)
        )


# ==============================================================================
# 4. Greenhouse Public Board API Source
# ==============================================================================
async def fetch_greenhouse_board_jobs(
    board_token: str,
    query: Optional[str] = None,
    filter_internships: bool = False
) -> Tuple[List[JobCreate], SourceFetchResult]:
    """
    Fetch authentic postings from a specific company's Greenhouse job board.
    URL: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
    """
    clean_token = board_token.strip().lower()
    source_name = f"Greenhouse ({clean_token})"
    url = f"https://boards-api.greenhouse.io/v1/boards/{clean_token}/jobs?content=true"
    
    jobs: List[JobCreate] = []
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            
        if resp.status_code == 404:
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details=f"Greenhouse board '{clean_token}' not found. Verify company board token."
            )
        elif resp.status_code != 200:
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details=f"Greenhouse API returned HTTP status {resp.status_code}"
            )
            
        data = resp.json()
        items = data.get("jobs", [])
        if not isinstance(items, list):
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details="Invalid response format from Greenhouse API"
            )
            
        q_lower = (query or "").lower().strip()
        company_name = clean_token.replace("-", " ").title()
        
        for item in items:
            if not isinstance(item, dict):
                continue
                
            title = (item.get("title") or "").strip()
            if not title:
                continue
                
            # Check filter if specified
            if q_lower and q_lower not in title.lower():
                continue
                
            if filter_internships and not is_internship_posting(title):
                continue
                
            loc_data = item.get("location") or {}
            location = loc_data.get("name") if isinstance(loc_data, dict) else str(loc_data)
            
            workplace_type = "Remote" if "remote" in (location or "").lower() else "On-site"
            
            clean_desc = clean_html_text(item.get("content") or "")
            
            # Departments / offices as skills/tags
            deps = [d.get("name") for d in item.get("departments", []) if isinstance(d, dict) and d.get("name")]
            
            job = JobCreate(
                company=company_name,
                title=title,
                location=location or "Unspecified",
                workplace_type=workplace_type,
                employment_type="Internship" if is_internship_posting(title) else "Full-time",
                description=clean_desc,
                skills=deps,
                requirements=[],
                required_skills=[],
                preferred_skills=[],
                salary_or_stipend=None,
                application_url=item.get("absolute_url"),
                source=source_name,
                source_id=str(item.get("id")) if item.get("id") else None,
                status="DISCOVERED",
                raw_source_data=item
            )
            jobs.append(job)
            
        return jobs, SourceFetchResult(
            source=source_name,
            status="success",
            found=len(jobs),
            message=f"Successfully fetched {len(jobs)} postings from Greenhouse board '{clean_token}'"
        )
        
    except Exception as e:
        logger.error(f"Error fetching Greenhouse board {clean_token}: {e}")
        return [], SourceFetchResult(
            source=source_name,
            status="error",
            found=0,
            error_details=str(e)
        )


# ==============================================================================
# 5. Lever Public Postings API Source
# ==============================================================================
async def fetch_lever_jobs(
    company: str,
    query: Optional[str] = None,
    filter_internships: bool = False
) -> Tuple[List[JobCreate], SourceFetchResult]:
    """
    Fetch authentic postings from a specific company's Lever job board.
    URL: https://api.lever.co/v0/postings/{company}
    """
    clean_company = company.strip().lower()
    source_name = f"Lever ({clean_company})"
    url = f"https://api.lever.co/v0/postings/{clean_company}"
    
    jobs: List[JobCreate] = []
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            
        if resp.status_code == 404:
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details=f"Lever company '{clean_company}' not found. Verify company identifier."
            )
        elif resp.status_code != 200:
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details=f"Lever API returned HTTP status {resp.status_code}"
            )
            
        items = resp.json()
        if not isinstance(items, list):
            return [], SourceFetchResult(
                source=source_name,
                status="error",
                found=0,
                error_details="Invalid response format from Lever API"
            )
            
        q_lower = (query or "").lower().strip()
        company_display = clean_company.replace("-", " ").title()
        
        for item in items:
            if not isinstance(item, dict):
                continue
                
            title = (item.get("text") or "").strip()
            if not title:
                continue
                
            categories = item.get("categories") or {}
            commitment = categories.get("commitment") or ""
            team = categories.get("team") or ""
            location = categories.get("location") or ""
            workplace_type_raw = categories.get("workplaceType") or ""
            
            if q_lower and q_lower not in title.lower() and q_lower not in team.lower():
                continue
                
            if filter_internships and not is_internship_posting(title, employment_type=commitment):
                continue
                
            desc_plain = item.get("descriptionPlain") or clean_html_text(item.get("description") or "")
            
            skills = [team] if team else []
            
            job = JobCreate(
                company=company_display,
                title=title,
                location=location or "Unspecified",
                workplace_type=workplace_type_raw.capitalize() if workplace_type_raw else ("Remote" if "remote" in location.lower() else "On-site"),
                employment_type=commitment or ("Internship" if is_internship_posting(title) else "Full-time"),
                description=desc_plain,
                skills=skills,
                requirements=[],
                required_skills=[],
                preferred_skills=[],
                salary_or_stipend=None,
                application_url=item.get("hostedUrl") or item.get("applyUrl"),
                source=source_name,
                source_id=str(item.get("id")) if item.get("id") else None,
                status="DISCOVERED",
                raw_source_data=item
            )
            jobs.append(job)
            
        return jobs, SourceFetchResult(
            source=source_name,
            status="success",
            found=len(jobs),
            message=f"Successfully fetched {len(jobs)} postings from Lever ({clean_company})"
        )
        
    except Exception as e:
        logger.error(f"Error fetching Lever company {clean_company}: {e}")
        return [], SourceFetchResult(
            source=source_name,
            status="error",
            found=0,
            error_details=str(e)
        )


# ==============================================================================
# 6. Source Status Checker
# ==============================================================================
async def check_source_statuses() -> List[SourceStatusResponse]:
    """Check connectivity and operational status of supported job sources."""
    sources_info = [
        {
            "source_name": "remoteok",
            "display_name": "RemoteOK",
            "url": "https://remoteok.com/api",
            "supports_keyword_search": True,
            "supports_board_token": False,
            "description": "Public remote tech & internship job board API"
        },
        {
            "source_name": "jobicy",
            "display_name": "Jobicy",
            "url": "https://jobicy.com/api/v2/remote-jobs?count=1",
            "supports_keyword_search": True,
            "supports_board_token": False,
            "description": "Global remote jobs & internship API"
        },
        {
            "source_name": "arbeitnow",
            "display_name": "Arbeitnow",
            "url": "https://www.arbeitnow.com/api/job-board-api",
            "supports_keyword_search": True,
            "supports_board_token": False,
            "description": "European & international tech job board API"
        },
        {
            "source_name": "greenhouse",
            "display_name": "Greenhouse Boards",
            "url": "https://boards-api.greenhouse.io",
            "supports_keyword_search": True,
            "supports_board_token": True,
            "description": "Direct company ATS board importer (e.g., figma, stripe, github)"
        },
        {
            "source_name": "lever",
            "display_name": "Lever Postings",
            "url": "https://api.lever.co",
            "supports_keyword_search": True,
            "supports_board_token": True,
            "description": "Direct company ATS postings importer (e.g., palantir, scale)"
        }
    ]
    
    results = []
    headers = {"User-Agent": DEFAULT_USER_AGENT}
    
    for s in sources_info:
        status = "operational"
        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                resp = await client.get(s["url"], headers=headers)
                if resp.status_code >= 500:
                    status = "degraded"
        except Exception:
            # Don't mark offline for ATS base endpoints if they return 404 on root
            if s["source_name"] in ["greenhouse", "lever"]:
                status = "operational"
            else:
                status = "offline"
                
        results.append(SourceStatusResponse(
            source_name=s["source_name"],
            display_name=s["display_name"],
            status=status,
            supports_keyword_search=s["supports_keyword_search"],
            supports_board_token=s["supports_board_token"],
            description=s["description"],
            api_url=s["url"]
        ))
        
    return results
