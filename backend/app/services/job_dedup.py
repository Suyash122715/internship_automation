import re
import hashlib
from typing import Optional
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse


def normalize_string(text: Optional[str]) -> str:
    """Normalize text by converting to lower-case, stripping special characters and extra spaces."""
    if not text:
        return ""
    # Lowercase
    s = text.lower()
    # Remove common company suffixes
    s = re.sub(r'\b(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|technologies|tech|gmbh|co\.?)\b', '', s)
    # Remove special punctuation
    s = re.sub(r'[^a-z0-9\s]', ' ', s)
    # Collapse consecutive whitespace
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def clean_url(url: Optional[str]) -> str:
    """Strip tracking and session query parameters from URL for clean deduplication."""
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip())
        # Remove tracking query parameters like utm_*, ref, source, etc.
        qs = parse_qs(parsed.query)
        clean_qs = {k: v for k, v in qs.items() if not k.startswith("utm_") and k not in ["ref", "source", "trk", "gh_jid"]}
        cleaned_query = urlencode(clean_qs, doseq=True)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path.rstrip('/'), parsed.params, cleaned_query, ""))
    except Exception:
        return url.strip().rstrip('/')


def compute_job_dedup_hash(
    company: str,
    title: str,
    location: Optional[str] = None,
    application_url: Optional[str] = None
) -> str:
    """
    Computes a canonical SHA-256 deduplication hash based on normalized company name,
    title, and either clean application URL or normalized location.
    """
    norm_company = normalize_string(company)
    norm_title = normalize_string(title)
    
    # Clean URL if present
    canonical_url = clean_url(application_url)
    
    if canonical_url and len(canonical_url) > 10:
        raw_key = f"{norm_company}:::{norm_title}:::{canonical_url}"
    else:
        norm_loc = normalize_string(location)
        raw_key = f"{norm_company}:::{norm_title}:::{norm_loc}"
        
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def is_internship_posting(
    title: str,
    description: Optional[str] = None,
    employment_type: Optional[str] = None
) -> bool:
    """
    Truthful heuristic classifier to identify if a posting is an internship / student / junior position.
    Does NOT fabricate anything; only checks existing keywords in title and employment_type.
    """
    t = (title or "").lower()
    et = (employment_type or "").lower()
    
    intern_keywords = [
        "intern", "internship", "co-op", "coop", "trainee",
        "apprentice", "apprenticeship", "fellow", "fellowship",
        "working student", "student worker", "undergraduate", "graduate program",
        "summer analyst", "summer associate", "junior"
    ]
    
    for kw in intern_keywords:
        if kw in t or kw in et:
            return True
            
    # Also check beginning of description if available
    if description:
        desc_sample = description[:300].lower()
        if "internship" in desc_sample or "summer intern" in desc_sample:
            return True
            
    return False
