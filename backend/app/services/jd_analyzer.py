"""
Batch 4 — Job Description Analyzer

Parses job description text to extract structured requirements.
Separates REQUIRED vs PREFERRED vs INFERRED/UNCERTAIN.
Never hallucinate: only extracts what is explicitly present in the text.
"""

import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


# ============================================================
# Known skill / technology taxonomy (canonical lowercase)
# ============================================================
# This is a static, curated taxonomy — NOT AI-generated.
# It covers common software engineering, data, and business skills.
# Skills not in this list can still be extracted via contextual patterns.

KNOWN_SKILLS = {
    # Programming Languages
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "go",
    "golang", "rust", "ruby", "php", "swift", "kotlin", "scala", "r",
    "matlab", "perl", "haskell", "elixir", "dart", "lua", "objective-c",
    "assembly", "shell", "bash", "powershell", "sql", "nosql", "graphql",
    "html", "css", "sass", "less",
    # Frameworks & Libraries
    "react", "react.js", "reactjs", "angular", "vue", "vue.js", "vuejs",
    "next.js", "nextjs", "nuxt.js", "nuxtjs", "svelte", "express",
    "express.js", "django", "flask", "fastapi", "spring", "spring boot",
    "rails", "ruby on rails", "laravel", "asp.net", ".net", "node.js",
    "nodejs", "deno", "nest.js", "nestjs", "gatsby", "remix",
    # Data & ML
    "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "plotly",
    "spark", "pyspark", "hadoop", "hive", "airflow", "kafka",
    "machine learning", "deep learning", "nlp", "natural language processing",
    "computer vision", "data science", "data analysis", "data engineering",
    "statistics", "ai", "artificial intelligence", "llm",
    "large language models", "generative ai", "rag",
    # Cloud & DevOps
    "aws", "amazon web services", "azure", "gcp", "google cloud",
    "docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins",
    "ci/cd", "github actions", "gitlab ci", "circleci", "travis ci",
    "heroku", "vercel", "netlify", "cloudflare",
    # Databases
    "mysql", "postgresql", "postgres", "sqlite", "mongodb", "redis",
    "elasticsearch", "dynamodb", "cassandra", "neo4j", "firebase",
    "supabase", "oracle", "sql server", "mariadb", "cockroachdb",
    # Tools & Practices
    "git", "github", "gitlab", "bitbucket", "jira", "confluence",
    "figma", "sketch", "adobe xd", "postman", "swagger",
    "rest", "rest api", "restful", "api", "microservices", "grpc",
    "agile", "scrum", "kanban", "tdd", "bdd", "unit testing",
    "integration testing", "selenium", "cypress", "playwright",
    "webpack", "vite", "babel", "eslint", "prettier",
    # Mobile
    "android", "ios", "react native", "flutter", "xamarin",
    "swift ui", "swiftui", "jetpack compose",
    # Security
    "oauth", "jwt", "ssl", "tls", "encryption", "cybersecurity",
    "penetration testing", "soc", "siem",
    # Business / Soft Skills (selected)
    "communication", "teamwork", "leadership", "problem solving",
    "critical thinking", "project management", "product management",
    "presentation", "public speaking", "technical writing",
}

# Multi-word skills that need exact boundary matching
MULTIWORD_SKILLS = sorted(
    [s for s in KNOWN_SKILLS if " " in s or "." in s],
    key=len,
    reverse=True,  # match longest first
)

SINGLE_WORD_SKILLS = {s for s in KNOWN_SKILLS if " " not in s and "." not in s}


# ============================================================
# Education keywords
# ============================================================
DEGREE_PATTERNS = [
    r"\b(?:bachelor(?:'?s)?|b\.?s\.?|b\.?a\.?|b\.?sc\.?|b\.?tech\.?|b\.?e\.?)\b",
    r"\b(?:master(?:'?s)?|m\.?s\.?|m\.?a\.?|m\.?sc\.?|m\.?tech\.?|m\.?e\.?|mba)\b",
    r"\b(?:ph\.?d\.?|doctorate|doctoral)\b",
    r"\b(?:associate(?:'?s)?)\b",
    r"\b(?:diploma|certificate)\b",
]

EDUCATION_FIELDS = [
    "computer science", "software engineering", "information technology",
    "information systems", "electrical engineering", "electronics",
    "mechanical engineering", "mathematics", "statistics", "physics",
    "data science", "machine learning", "artificial intelligence",
    "business administration", "economics", "finance", "marketing",
    "design", "graphic design", "ux design", "ui design",
    "communications", "engineering", "science", "stem",
]


# ============================================================
# Section header patterns — used to locate requirement blocks
# ============================================================
# These regex patterns identify section headings in JD text.
SECTION_PATTERNS = {
    "required": re.compile(
        r"(?:^|\n|(?<=[.!?])\s*)\s*(?:#{1,4}\s*)?(?:"
        r"required?\s*(?:qualifications?|skills?|experience|requirements?)"
        r"|must\s*(?:-?\s*have|possess)"
        r"|minimum\s*(?:qualifications?|requirements?)"
        r"|what\s*(?:you(?:'ll)?\s*need|we(?:'re)?\s*looking\s*for)"
        r"|basic\s*qualifications?"
        r"|requirements?"
        r"|qualifications?"
        r")\s*[:\-]?\s*",
        re.IGNORECASE,
    ),
    "preferred": re.compile(
        r"(?:^|\n|(?<=[.!?])\s*)\s*(?:#{1,4}\s*)?(?:"
        r"preferred\s*(?:qualifications?|skills?|experience|requirements?)?"
        r"|nice\s*(?:-?\s*to\s*(?:-?\s*)?have)"
        r"|bonus\s*(?:qualifications?|skills?|points?)?"
        r"|desired\s*(?:qualifications?|skills?|experience)?"
        r"|additional\s*(?:qualifications?|skills?)?"
        r"|plus(?:es)?"
        r"|good\s*to\s*have"
        r"|ideally"
        r")\s*[:\-]?\s*",
        re.IGNORECASE,
    ),
    "responsibilities": re.compile(
        r"(?:^|\n|(?<=[.!?])\s*)\s*(?:#{1,4}\s*)?(?:"
        r"responsibilities"
        r"|what\s*you(?:'ll)?\s*(?:do|be\s*doing|work\s*on)"
        r"|role\s*(?:description|overview)"
        r"|about\s*(?:the\s*)?(?:role|position|job)"
        r"|job\s*(?:description|duties|summary)"
        r"|key\s*(?:responsibilities|duties)"
        r"|day[\s-]*to[\s-]*day"
        r"|scope\s*of\s*work"
        r")\s*[:\-]?\s*",
        re.IGNORECASE,
    ),
    "education": re.compile(
        r"(?:^|\n|(?<=[.!?])\s*)\s*(?:#{1,4}\s*)?(?:"
        r"education(?:al)?\s*(?:requirements?|qualifications?|background)?"
        r"|academic\s*(?:requirements?|qualifications?|background)?"
        r"|degree\s*requirements?"
        r")\s*[:\-]?\s*",
        re.IGNORECASE,
    ),
}

# Patterns that indicate a line is a "preferred" qualifier
PREFERRED_LINE_INDICATORS = re.compile(
    r"(?:nice\s*to\s*have|preferred|bonus|ideally|advantageous"
    r"|a\s*plus|desirable|not\s*required\s*but"
    r"|familiarity\s*(?:with|in)\s*(?:is\s*)?a\s*plus"
    r"|experience\s*(?:with|in)\s*(?:is\s*)?a\s*(?:plus|bonus))",
    re.IGNORECASE,
)

REQUIRED_LINE_INDICATORS = re.compile(
    r"(?:must\s*have|required|minimum|essential|mandatory|necessary"
    r"|strong\s*(?:experience|knowledge|understanding)"
    r"|proficien(?:t|cy)\s*(?:in|with)"
    r"|expertise\s*in)",
    re.IGNORECASE,
)


# ============================================================
# Experience-level patterns
# ============================================================
EXPERIENCE_PATTERNS = re.compile(
    r"(\d+)\+?\s*(?:to\s*(\d+))?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp\.?|work(?:ing)?)?",
    re.IGNORECASE,
)


def _extract_bullet_items(text: str) -> List[str]:
    """Extract bullet-pointed or numbered list items from text."""
    items = []
    for line in text.split("\n"):
        line = line.strip()
        # Match bullets: -, *, •, ▪, >, numbered
        cleaned = re.sub(r"^[\-\*•▪>]\s*", "", line)
        cleaned = re.sub(r"^\d+[.)]\s*", "", cleaned)
        cleaned = cleaned.strip()
        if cleaned and len(cleaned) > 5:
            items.append(cleaned)
    return items


def _extract_skills_from_text(text: str) -> List[str]:
    """
    Extract skills from a block of text using the known taxonomy.
    Only returns skills that are explicitly present in the text.
    """
    found = []
    text_lower = text.lower()

    # 1. Check multi-word skills first (longest match)
    for skill in MULTIWORD_SKILLS:
        # Use word-boundary-like matching for multi-word
        pattern = re.compile(r"(?<![a-zA-Z])" + re.escape(skill) + r"(?![a-zA-Z])", re.IGNORECASE)
        if pattern.search(text_lower):
            found.append(skill)

    # 2. Check single-word skills with word boundaries
    for skill in SINGLE_WORD_SKILLS:
        if len(skill) <= 2:
            # Very short skills (C, R, AI) need stricter matching
            pattern = re.compile(r"(?<![a-zA-Z])" + re.escape(skill) + r"(?![a-zA-Z])", re.IGNORECASE)
        else:
            pattern = re.compile(r"\b" + re.escape(skill) + r"\b", re.IGNORECASE)
        if pattern.search(text_lower):
            # Avoid duplicates from multi-word entries
            if skill not in found:
                found.append(skill)

    return found


def _extract_education(text: str) -> List[Dict[str, str]]:
    """Extract education requirements from text."""
    results = []
    text_lower = text.lower()

    for pattern_str in DEGREE_PATTERNS:
        for m in re.finditer(pattern_str, text_lower):
            degree = m.group(0).strip()
            # Try to find the field near the degree mention
            start = max(0, m.start() - 20)
            end = min(len(text_lower), m.end() + 120)
            context = text_lower[start:end]

            field = None
            for f in EDUCATION_FIELDS:
                if f in context:
                    field = f
                    break

            entry = {"degree": degree, "confidence": "EXTRACTED"}
            if field:
                entry["field"] = field
            results.append(entry)

    return results


def _extract_experience_years(text: str) -> Optional[Dict[str, Any]]:
    """Extract experience-year requirements."""
    match = EXPERIENCE_PATTERNS.search(text)
    if match:
        min_years = int(match.group(1))
        max_years = int(match.group(2)) if match.group(2) else None
        return {
            "min_years": min_years,
            "max_years": max_years,
            "raw_text": match.group(0).strip(),
            "confidence": "EXTRACTED",
        }
    return None


def _classify_section(text: str) -> str:
    """Classify a text block as 'required', 'preferred', or 'uncertain'."""
    if REQUIRED_LINE_INDICATORS.search(text):
        return "REQUIRED"
    if PREFERRED_LINE_INDICATORS.search(text):
        return "PREFERRED"
    return "UNCERTAIN"


def analyze_job_description(description: str) -> Dict[str, Any]:
    """
    Parse a job description and extract structured requirements.

    Returns a dict with:
        - required_skills: list of str  (explicitly required)
        - preferred_skills: list of str  (nice-to-have)
        - inferred_skills: list of str  (found in text but section unclear)
        - education: list of dicts  (degree requirements)
        - experience: dict or None  (years of experience)
        - responsibilities: list of str  (extracted responsibilities)
        - requirements_raw: list of dicts  [{text, classification}]
        - location_requirements: list of str
        - other_requirements: list of str
        - analysis_method: str  (always "deterministic_rule_based")
        - confidence_note: str

    NEVER invents data. Every field is grounded in the source text.
    """
    if not description or not description.strip():
        return {
            "required_skills": [],
            "preferred_skills": [],
            "inferred_skills": [],
            "education": [],
            "experience": None,
            "responsibilities": [],
            "requirements_raw": [],
            "location_requirements": [],
            "other_requirements": [],
            "analysis_method": "deterministic_rule_based",
            "confidence_note": "No description text provided — nothing to analyze.",
        }

    result = {
        "required_skills": [],
        "preferred_skills": [],
        "inferred_skills": [],
        "education": [],
        "experience": None,
        "responsibilities": [],
        "requirements_raw": [],
        "location_requirements": [],
        "other_requirements": [],
        "analysis_method": "deterministic_rule_based",
        "confidence_note": "",
    }

    text = description.strip()

    # ── 1. Locate named sections ──────────────────────────────
    section_spans = []  # (start, end, section_type)
    for sec_type, pattern in SECTION_PATTERNS.items():
        for m in pattern.finditer(text):
            section_spans.append((m.start(), m.end(), sec_type))

    # Sort by match start position
    section_spans.sort(key=lambda x: x[0])

    # Build section text blocks
    section_blocks: Dict[str, str] = {}
    for i, (m_start, m_end, sec_type) in enumerate(section_spans):
        content_start = m_end
        content_end = section_spans[i + 1][0] if i + 1 < len(section_spans) else len(text)
        block = text[content_start:content_end].strip()
        if sec_type in section_blocks:
            section_blocks[sec_type] += "\n" + block
        else:
            section_blocks[sec_type] = block

    # ── 2. Extract skills per section ─────────────────────────
    required_skills_set = set()
    preferred_skills_set = set()

    if "required" in section_blocks:
        req_text = section_blocks["required"]
        # Check line by line or sentence by sentence in required block
        for line in req_text.split("\n"):
            line_str = line.strip()
            if not line_str:
                continue
            line_skills = _extract_skills_from_text(line_str)
            if PREFERRED_LINE_INDICATORS.search(line_str):
                for s in line_skills:
                    preferred_skills_set.add(s)
            else:
                for s in line_skills:
                    required_skills_set.add(s)
        # Extract bullet items as raw requirements
        for item in _extract_bullet_items(section_blocks["required"]):
            if PREFERRED_LINE_INDICATORS.search(item):
                result["requirements_raw"].append({"text": item, "classification": "PREFERRED"})
            else:
                result["requirements_raw"].append({"text": item, "classification": "REQUIRED"})

    if "preferred" in section_blocks:
        for s in _extract_skills_from_text(section_blocks["preferred"]):
            preferred_skills_set.add(s)
        for item in _extract_bullet_items(section_blocks["preferred"]):
            result["requirements_raw"].append({"text": item, "classification": "PREFERRED"})

    # ── 3. Extract responsibilities ───────────────────────────
    if "responsibilities" in section_blocks:
        result["responsibilities"] = _extract_bullet_items(section_blocks["responsibilities"])

    # ── 4. Whole-text skill extraction (for unstructured JDs) ─
    all_text_skills = set(_extract_skills_from_text(text))

    # Classify skills not in a named section as inferred
    inferred = all_text_skills - required_skills_set - preferred_skills_set

    # If no sections were detected at all, try per-line classification
    if not section_blocks:
        for line in text.split("\n"):
            line_stripped = line.strip()
            if not line_stripped or len(line_stripped) < 8:
                continue
            line_skills = _extract_skills_from_text(line_stripped)
            classification = _classify_section(line_stripped)
            for s in line_skills:
                if classification == "REQUIRED":
                    required_skills_set.add(s)
                    inferred.discard(s)
                elif classification == "PREFERRED":
                    preferred_skills_set.add(s)
                    inferred.discard(s)

    result["required_skills"] = sorted(required_skills_set)
    result["preferred_skills"] = sorted(preferred_skills_set - required_skills_set)
    result["inferred_skills"] = sorted(inferred)

    # ── 5. Education extraction ───────────────────────────────
    edu_source = section_blocks.get("education", text)
    result["education"] = _extract_education(edu_source)

    # ── 6. Experience extraction ──────────────────────────────
    result["experience"] = _extract_experience_years(text)

    # ── 7. Location requirements ──────────────────────────────
    loc_patterns = [
        re.compile(r"(?:must\s*be\s*(?:located|based)\s*(?:in|near))\s+([^\n.]+)", re.IGNORECASE),
        re.compile(r"(?:location|office)\s*:\s*([^\n]+)", re.IGNORECASE),
        re.compile(r"(?:this\s*(?:role|position)\s*is\s*(?:based|located)\s*(?:in|at))\s+([^\n.]+)", re.IGNORECASE),
    ]
    for lp in loc_patterns:
        for m in lp.finditer(text):
            loc = m.group(1).strip().rstrip(".")
            if loc and loc not in result["location_requirements"]:
                result["location_requirements"].append(loc)

    # ── 8. Confidence note ────────────────────────────────────
    has_sections = bool(section_blocks)
    total_skills = len(result["required_skills"]) + len(result["preferred_skills"]) + len(result["inferred_skills"])

    notes = []
    if has_sections:
        notes.append("Structured sections detected — classification confidence is HIGH.")
    else:
        notes.append("No clear section headings found — per-line heuristic used, classification confidence is MODERATE.")
    if result["inferred_skills"]:
        notes.append(
            f"{len(result['inferred_skills'])} skill(s) found in text but could not be classified as required/preferred — marked UNCERTAIN."
        )
    if total_skills == 0:
        notes.append("No recognized skills were extracted. The JD may use non-standard terminology.")

    result["confidence_note"] = " ".join(notes)

    return result
