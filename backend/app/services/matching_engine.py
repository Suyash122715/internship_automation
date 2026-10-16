"""
Batch 4 — Profile Matching Engine

Computes an explainable compatibility score between a User Profile and a Job.
Breakdown across: Skills, Education, Experience, Location, Role Relevance.

Weights are configurable.

STRICT RULES:
  - NEVER claims the user is qualified without supporting evidence.
  - NEVER invents user skills.
  - NEVER assumes the user possesses a skill not in the profile.
  - Every sub-score is reproducible from the stored profile + job data.
  - Mark uncertain information as uncertain.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple

from backend.app.services.jd_analyzer import analyze_job_description

logger = logging.getLogger(__name__)


# ============================================================
# Default scoring weights (configurable, must sum to 1.0)
# ============================================================
DEFAULT_WEIGHTS = {
    "skills": 0.40,
    "education": 0.20,
    "experience": 0.15,
    "location": 0.10,
    "role_relevance": 0.15,
}


def _normalize_skill(skill: str) -> str:
    """Canonical lower-case representation of a skill for comparison."""
    s = skill.lower().strip()
    # Normalize common aliases
    aliases = {
        "react.js": "react", "reactjs": "react",
        "vue.js": "vue", "vuejs": "vue",
        "next.js": "nextjs", "nuxt.js": "nuxtjs",
        "node.js": "nodejs", "express.js": "express",
        "nest.js": "nestjs",
        "c++": "cpp", "c#": "csharp",
        "golang": "go",
        "postgresql": "postgres",
        "amazon web services": "aws",
        "google cloud": "gcp",
        "scikit-learn": "sklearn",
        "ruby on rails": "rails",
        "spring boot": "spring",
    }
    return aliases.get(s, s)


def _build_user_skill_set(profile: Dict[str, Any]) -> set:
    """
    Build a comprehensive set of skills from the user profile.
    Sources: skills list, project tech stacks, experience tech.
    ONLY uses data that actually exists in the profile — never invents.
    """
    skills = set()

    # 1. Direct skills list
    for s in (profile.get("skills") or []):
        if isinstance(s, str):
            skills.add(_normalize_skill(s))
        elif isinstance(s, dict) and s.get("name"):
            skills.add(_normalize_skill(s["name"]))

    # 2. Skills mentioned in project descriptions
    for proj in (profile.get("projects") or []):
        for tech in (proj.get("technologies") or proj.get("tech_stack") or []):
            if isinstance(tech, str):
                skills.add(_normalize_skill(tech))
        # Also check description for skills
        desc = proj.get("description", "")
        if desc:
            from backend.app.services.jd_analyzer import _extract_skills_from_text
            for s in _extract_skills_from_text(desc):
                skills.add(_normalize_skill(s))

    # 3. Skills mentioned in experience
    for exp in (profile.get("experience") or []):
        for tech in (exp.get("technologies") or exp.get("skills") or []):
            if isinstance(tech, str):
                skills.add(_normalize_skill(tech))
        desc = exp.get("description", "")
        if desc:
            from backend.app.services.jd_analyzer import _extract_skills_from_text
            for s in _extract_skills_from_text(desc):
                skills.add(_normalize_skill(s))

    # 4. Certifications may imply skills
    for cert in (profile.get("certifications") or []):
        name = cert.get("name", "") if isinstance(cert, dict) else str(cert)
        if name:
            from backend.app.services.jd_analyzer import _extract_skills_from_text
            for s in _extract_skills_from_text(name):
                skills.add(_normalize_skill(s))

    return skills


def _score_skills(
    user_skills: set,
    required_skills: List[str],
    preferred_skills: List[str],
    inferred_skills: List[str],
) -> Tuple[float, Dict[str, Any]]:
    """
    Score skill match.
    Required skills weigh more than preferred which weigh more than inferred.
    Returns (score_0_to_100, detail_dict).
    """
    detail = {
        "matched_required": [],
        "missing_required": [],
        "matched_preferred": [],
        "missing_preferred": [],
        "matched_inferred": [],
        "missing_inferred": [],
    }

    # Normalize job skills
    req_normalized = [(_normalize_skill(s), s) for s in required_skills]
    pref_normalized = [(_normalize_skill(s), s) for s in preferred_skills]
    inf_normalized = [(_normalize_skill(s), s) for s in inferred_skills]

    for norm, orig in req_normalized:
        if norm in user_skills:
            detail["matched_required"].append(orig)
        else:
            detail["missing_required"].append(orig)

    for norm, orig in pref_normalized:
        if norm in user_skills:
            detail["matched_preferred"].append(orig)
        else:
            detail["missing_preferred"].append(orig)

    for norm, orig in inf_normalized:
        if norm in user_skills:
            detail["matched_inferred"].append(orig)
        else:
            detail["missing_inferred"].append(orig)

    # Weighted calculation:
    #   Required match: 60% weight, Preferred: 25%, Inferred: 15%
    total_req = len(req_normalized)
    total_pref = len(pref_normalized)
    total_inf = len(inf_normalized)

    if total_req + total_pref + total_inf == 0:
        # No skills extracted from JD — can't score
        return 0.0, {**detail, "note": "No skills extracted from job description — skill score unavailable."}

    req_score = (len(detail["matched_required"]) / total_req * 100) if total_req > 0 else 100.0
    pref_score = (len(detail["matched_preferred"]) / total_pref * 100) if total_pref > 0 else 100.0
    inf_score = (len(detail["matched_inferred"]) / total_inf * 100) if total_inf > 0 else 100.0

    # Dynamic weighting: if no required skills, redistribute weight
    if total_req > 0:
        w_req, w_pref, w_inf = 0.60, 0.25, 0.15
    elif total_pref > 0:
        w_req, w_pref, w_inf = 0.0, 0.70, 0.30
    else:
        w_req, w_pref, w_inf = 0.0, 0.0, 1.0

    score = req_score * w_req + pref_score * w_pref + inf_score * w_inf
    return round(score, 1), detail


def _score_education(
    profile: Dict[str, Any],
    education_reqs: List[Dict[str, str]],
) -> Tuple[float, Dict[str, Any]]:
    """
    Score education match.
    Checks user's degree/branch/college against JD education requirements.
    """
    detail = {
        "user_education": {},
        "job_requirements": education_reqs,
        "matches": [],
        "gaps": [],
    }

    user_degree = (profile.get("degree") or "").lower().strip()
    user_branch = (profile.get("branch") or "").lower().strip()
    user_college = (profile.get("college") or "").lower().strip()
    user_grad_year = profile.get("graduation_year")

    detail["user_education"] = {
        "degree": profile.get("degree") or "Not specified",
        "branch": profile.get("branch") or "Not specified",
        "college": profile.get("college") or "Not specified",
        "graduation_year": user_grad_year,
    }

    if not education_reqs:
        return 100.0, {**detail, "note": "No specific education requirements found in JD — full score by default."}

    if not user_degree and not user_branch:
        return 0.0, {**detail, "note": "User profile has no education data — cannot verify qualifications."}

    score_parts = []
    for req in education_reqs:
        req_degree = (req.get("degree") or "").lower()
        req_field = (req.get("field") or "").lower()

        # Check degree level match
        degree_match = False
        if req_degree:
            # Map degree keywords
            bachelor_kw = ["bachelor", "b.s", "bs", "ba", "b.a", "bsc", "b.sc", "btech", "b.tech", "b.e", "be"]
            master_kw = ["master", "m.s", "ms", "ma", "m.a", "msc", "m.sc", "mtech", "m.tech", "m.e", "me", "mba"]
            phd_kw = ["ph.d", "phd", "doctorate", "doctoral"]

            # Determine required level
            req_level = "unknown"
            for kw in phd_kw:
                if kw in req_degree:
                    req_level = "phd"
                    break
            if req_level == "unknown":
                for kw in master_kw:
                    if kw in req_degree:
                        req_level = "master"
                        break
            if req_level == "unknown":
                for kw in bachelor_kw:
                    if kw in req_degree:
                        req_level = "bachelor"
                        break

            # Determine user level
            user_level = "unknown"
            for kw in phd_kw:
                if kw in user_degree:
                    user_level = "phd"
                    break
            if user_level == "unknown":
                for kw in master_kw:
                    if kw in user_degree:
                        user_level = "master"
                        break
            if user_level == "unknown":
                for kw in bachelor_kw:
                    if kw in user_degree:
                        user_level = "bachelor"
                        break

            # Level hierarchy: phd > master > bachelor
            level_order = {"bachelor": 1, "master": 2, "phd": 3, "unknown": 0}
            if level_order.get(user_level, 0) >= level_order.get(req_level, 0) and user_level != "unknown":
                degree_match = True
                detail["matches"].append(f"Degree level: user has {user_level}, meets {req_level} requirement")
            else:
                detail["gaps"].append(f"Degree level: JD requires {req_degree}, user has '{profile.get('degree', 'unspecified')}'")

        # Check field match
        field_match = False
        if req_field:
            if req_field in user_branch or req_field in user_degree:
                field_match = True
                detail["matches"].append(f"Field match: '{req_field}' found in user profile")
            # Also check education_history
            for edu in (profile.get("education_history") or []):
                field_of_study = (edu.get("field") or edu.get("branch") or edu.get("major") or "").lower()
                if req_field in field_of_study:
                    field_match = True
                    detail["matches"].append(f"Field match: '{req_field}' found in education history")
                    break
            if not field_match:
                detail["gaps"].append(f"Field: JD prefers '{req_field}', not explicitly found in user profile")

        # Calculate partial score for this requirement
        if degree_match and field_match:
            score_parts.append(100)
        elif degree_match:
            score_parts.append(75)
        elif field_match:
            score_parts.append(60)
        else:
            score_parts.append(20)

    if not score_parts:
        return 100.0, {**detail, "note": "Could not parse education requirements — score defaulted."}

    avg = sum(score_parts) / len(score_parts)
    return round(avg, 1), detail


def _score_experience(
    profile: Dict[str, Any],
    experience_req: Optional[Dict[str, Any]],
) -> Tuple[float, Dict[str, Any]]:
    """
    Score experience match.
    Counts user's experience entries and compares against years required.
    """
    detail = {
        "user_experience_count": 0,
        "user_experience_entries": [],
        "job_requirement": experience_req,
    }

    user_exp = profile.get("experience") or []
    detail["user_experience_count"] = len(user_exp)
    for exp in user_exp:
        if isinstance(exp, dict):
            detail["user_experience_entries"].append({
                "role": exp.get("role") or exp.get("title") or "Unknown",
                "company": exp.get("company") or exp.get("organization") or "Unknown",
            })

    if not experience_req:
        # Internships often don't require experience
        if len(user_exp) > 0:
            return 100.0, {**detail, "note": "No experience requirement in JD. User has experience entries — full score."}
        return 80.0, {**detail, "note": "No experience requirement in JD. User has no experience entries — defaulting to 80%."}

    req_min = experience_req.get("min_years", 0)

    if req_min == 0:
        return 100.0, {**detail, "note": "JD requires 0 years — entry-level/intern friendly."}

    # For internships: having any experience entries is strong
    # We conservatively estimate each experience entry ~ 0.5-1 year
    estimated_years = len(user_exp) * 0.5  # Conservative estimate

    if estimated_years >= req_min:
        return 100.0, {**detail, "note": f"User has ~{estimated_years:.1f} estimated years, meets {req_min}+ requirement."}
    elif estimated_years >= req_min * 0.5:
        score = 60 + (estimated_years / req_min) * 40
        return round(min(score, 95), 1), {
            **detail,
            "note": f"User has ~{estimated_years:.1f} estimated years vs {req_min}+ required — partial match."
        }
    elif len(user_exp) > 0:
        return 40.0, {**detail, "note": f"User has some experience but below {req_min}+ year requirement."}
    else:
        return 15.0, {**detail, "note": f"JD requires {req_min}+ years, user has no listed experience."}


def _score_location(
    profile: Dict[str, Any],
    job_location: Optional[str],
    job_workplace_type: Optional[str],
    jd_location_reqs: List[str],
    preferences: Optional[Dict[str, Any]] = None,
) -> Tuple[float, Dict[str, Any]]:
    """
    Score location compatibility.
    Remote jobs get full score. Hybrid/on-site compared against user location and preferences.
    """
    detail = {
        "user_location": profile.get("location") or "Not specified",
        "job_location": job_location or "Not specified",
        "job_workplace_type": job_workplace_type or "Not specified",
        "jd_location_reqs": jd_location_reqs,
    }

    wt = (job_workplace_type or "").lower()

    # Remote = always compatible
    if "remote" in wt:
        return 100.0, {**detail, "note": "Remote position — location always compatible."}

    # If no location info on either side
    user_loc = (profile.get("location") or "").lower().strip()
    job_loc = (job_location or "").lower().strip()

    if not job_loc and not jd_location_reqs:
        return 85.0, {**detail, "note": "Job location not specified — defaulting to 85% (uncertain)."}

    if not user_loc:
        return 60.0, {**detail, "note": "User location not in profile — cannot determine compatibility."}

    # Simple substring matching for location
    if job_loc and (user_loc in job_loc or job_loc in user_loc):
        return 100.0, {**detail, "note": f"User location '{user_loc}' matches job location '{job_loc}'."}

    # Check preferences
    if preferences:
        pref_locations = [loc.lower() for loc in (preferences.get("preferred_locations") or [])]
        work_modes = [m.lower() for m in (preferences.get("work_modes") or [])]
        if pref_locations and job_loc:
            for pl in pref_locations:
                if pl in job_loc or job_loc in pl:
                    return 95.0, {**detail, "note": f"Job location '{job_loc}' matches user preference '{pl}'."}
        if work_modes and wt and wt not in work_modes:
            return 30.0, {**detail, "note": f"Workplace type '{wt}' not in user preferences: {work_modes}."}

    # Location doesn't match
    if "hybrid" in wt:
        return 50.0, {**detail, "note": f"Hybrid role at '{job_loc}' — partial match, may require relocation."}

    return 40.0, {**detail, "note": f"On-site role at '{job_loc}', user in '{user_loc}' — potential mismatch."}


def _score_role_relevance(
    profile: Dict[str, Any],
    job_title: str,
    job_responsibilities: List[str],
    preferences: Optional[Dict[str, Any]] = None,
) -> Tuple[float, Dict[str, Any]]:
    """
    Score how relevant the role is to the user's profile and preferences.
    Checks target roles, excluded roles, and keyword overlap.
    """
    detail = {
        "job_title": job_title,
        "matches": [],
        "concerns": [],
    }

    title_lower = job_title.lower()

    # Check exclusions
    if preferences:
        excluded_roles = [r.lower() for r in (preferences.get("excluded_roles") or [])]
        for ex in excluded_roles:
            if ex in title_lower:
                detail["concerns"].append(f"Job title contains excluded keyword: '{ex}'")
                return 0.0, {**detail, "note": "Role matches user's excluded role list."}

        # Check target roles
        target_roles = [r.lower() for r in (preferences.get("target_roles") or [])]
        if target_roles:
            for tr in target_roles:
                if tr in title_lower or title_lower in tr:
                    detail["matches"].append(f"Title matches target role: '{tr}'")
                    return 95.0, {**detail, "note": f"Job title closely matches target role '{tr}'."}

            # Partial match via keywords
            title_words = set(re.findall(r'\w+', title_lower))
            for tr in target_roles:
                tr_words = set(re.findall(r'\w+', tr))
                overlap = title_words & tr_words
                if overlap:
                    detail["matches"].append(f"Partial keyword overlap with target role '{tr}': {overlap}")

    # Check user's past experience titles for relevance
    for exp in (profile.get("experience") or []):
        exp_title = (exp.get("role") or exp.get("title") or "").lower()
        if exp_title:
            exp_words = set(re.findall(r'\w+', exp_title))
            title_words = set(re.findall(r'\w+', title_lower))
            overlap = exp_words & title_words - {"intern", "internship", "the", "a", "an", "at", "in"}
            if overlap:
                detail["matches"].append(f"Title keyword overlap with past role '{exp_title}': {overlap}")

    # Check user's project domain relevance
    user_skills = set()
    for s in (profile.get("skills") or []):
        if isinstance(s, str):
            user_skills.add(s.lower())

    # Score based on matches found
    match_count = len(detail["matches"])
    if match_count >= 2:
        return 90.0, {**detail, "note": "Strong role relevance based on multiple matching signals."}
    elif match_count == 1:
        return 75.0, {**detail, "note": "Moderate role relevance — one matching signal found."}
    else:
        # Default: check if it's at least an internship
        if any(kw in title_lower for kw in ["intern", "co-op", "trainee", "apprentice", "junior"]):
            return 65.0, {**detail, "note": "Entry-level position — generally relevant for student profile."}
        return 50.0, {**detail, "note": "No strong relevance signals — uncertain match."}


def compute_match(
    profile: Dict[str, Any],
    job: Dict[str, Any],
    preferences: Optional[Dict[str, Any]] = None,
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Compute full compatibility analysis between a user profile and a job.

    Parameters:
        profile: dict — the user's profile data (skills, education, experience, etc.)
        job: dict — the job data including description, title, location, etc.
        preferences: optional dict — InternshipPreference data
        weights: optional dict — custom scoring weights

    Returns dict:
        overall_score: float (0-100)
        breakdown: dict of sub-scores
        explanation: str — human-readable summary
        matching_details: full details per dimension
        profile_skills_used: list — which user skills were consulted (for transparency)
        method: str
    """
    w = weights or DEFAULT_WEIGHTS.copy()

    # Ensure weights sum to 1.0
    total_w = sum(w.values())
    if abs(total_w - 1.0) > 0.01:
        # Normalize
        for k in w:
            w[k] = w[k] / total_w

    # Step 1: Analyze the JD
    description = job.get("description") or ""
    jd_analysis = analyze_job_description(description)

    # Merge any pre-extracted skills from the job model
    job_required = list(set(jd_analysis.get("required_skills", []) + (job.get("required_skills") or [])))
    job_preferred = list(set(jd_analysis.get("preferred_skills", []) + (job.get("preferred_skills") or [])))
    job_inferred = jd_analysis.get("inferred_skills", [])

    # Also consider the job's top-level `skills` field
    for s in (job.get("skills") or []):
        s_norm = _normalize_skill(s)
        if s_norm not in [_normalize_skill(x) for x in job_required + job_preferred + job_inferred]:
            job_inferred.append(s)

    # Step 2: Build user skill set
    user_skills = _build_user_skill_set(profile)

    # Step 3: Score each dimension
    skills_score, skills_detail = _score_skills(user_skills, job_required, job_preferred, job_inferred)
    edu_score, edu_detail = _score_education(profile, jd_analysis.get("education", []))
    exp_score, exp_detail = _score_experience(profile, jd_analysis.get("experience"))
    loc_score, loc_detail = _score_location(
        profile,
        job.get("location"),
        job.get("workplace_type"),
        jd_analysis.get("location_requirements", []),
        preferences,
    )
    role_score, role_detail = _score_role_relevance(
        profile,
        job.get("title", ""),
        jd_analysis.get("responsibilities", []),
        preferences,
    )

    # Step 4: Weighted overall score
    overall = (
        skills_score * w["skills"]
        + edu_score * w["education"]
        + exp_score * w["experience"]
        + loc_score * w["location"]
        + role_score * w["role_relevance"]
    )
    overall = round(overall, 1)

    # Step 5: Build explanation
    explanation_parts = [
        f"Overall Match: {overall}%",
        "",
        f"  Skills:          {skills_score}% (weight: {w['skills']*100:.0f}%)",
        f"  Education:       {edu_score}% (weight: {w['education']*100:.0f}%)",
        f"  Experience:      {exp_score}% (weight: {w['experience']*100:.0f}%)",
        f"  Location:        {loc_score}% (weight: {w['location']*100:.0f}%)",
        f"  Role relevance:  {role_score}% (weight: {w['role_relevance']*100:.0f}%)",
        "",
    ]

    # Add skill match summary
    matched_req = skills_detail.get("matched_required", [])
    missing_req = skills_detail.get("missing_required", [])
    matched_pref = skills_detail.get("matched_preferred", [])
    missing_pref = skills_detail.get("missing_preferred", [])

    if matched_req:
        explanation_parts.append(f"✓ Required skills you have: {', '.join(matched_req)}")
    if missing_req:
        explanation_parts.append(f"✗ Required skills missing: {', '.join(missing_req)}")
    if matched_pref:
        explanation_parts.append(f"✓ Preferred skills you have: {', '.join(matched_pref)}")
    if missing_pref:
        explanation_parts.append(f"○ Preferred skills to develop: {', '.join(missing_pref)}")

    if edu_detail.get("gaps"):
        for gap in edu_detail["gaps"]:
            explanation_parts.append(f"△ Education: {gap}")

    explanation_parts.append("")
    explanation_parts.append(f"Analysis method: deterministic rule-based matching")
    explanation_parts.append(f"JD analysis: {jd_analysis.get('confidence_note', '')}")

    return {
        "overall_score": overall,
        "breakdown": {
            "skills": skills_score,
            "education": edu_score,
            "experience": exp_score,
            "location": loc_score,
            "role_relevance": role_score,
        },
        "weights_used": w,
        "explanation": "\n".join(explanation_parts),
        "matching_details": {
            "skills": skills_detail,
            "education": edu_detail,
            "experience": exp_detail,
            "location": loc_detail,
            "role_relevance": role_detail,
        },
        "jd_analysis": jd_analysis,
        "profile_skills_used": sorted(user_skills),
        "method": "deterministic_rule_based",
    }
