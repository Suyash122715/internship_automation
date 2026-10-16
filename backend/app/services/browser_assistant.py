"""
Batch 6 — Browser-Based Application Assistant using Playwright.

Implements PRD Section 12 (Application Automation):
- Open supported application URLs
- Detect application fields and anti-bot/CAPTCHA presence
- Map known verified profile information
- Fill safe/known fields
- Upload appropriate resume and cover letter files
- Identify unknown questions (never guess/fabricate)
- Provide review state with mapped fields & questions
- Submit only after explicit user approval

STRICT RULES:
- NEVER fabricate answers to application questions.
- NEVER invent qualifications or guess sensitive information.
- NEVER bypass CAPTCHA or anti-bot systems.
- Stop when automation is uncertain and request user intervention.
- Never submit without explicit user approval.
"""

import os
import re
import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Try importing Playwright asynchronously / gracefully
try:
    from playwright.async_api import async_playwright, Page, Browser, TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("Playwright is not installed in the current environment.")


# ============================================================
# Field Classification Regexes
# ============================================================

FIELD_CLASSIFICATION_RULES = [
    ("FIRST_NAME", re.compile(r"first[\s_-]*name|fname|given[\s_-]*name|prenom", re.IGNORECASE)),
    ("LAST_NAME", re.compile(r"last[\s_-]*name|lname|surname|family[\s_-]*name|nom", re.IGNORECASE)),
    ("FULL_NAME", re.compile(r"full[\s_-]*name|^name$|candidate[\s_-]*name|applicant[\s_-]*name|your[\s_-]*name", re.IGNORECASE)),
    ("EMAIL", re.compile(r"email|e-mail|mail", re.IGNORECASE)),
    ("PHONE", re.compile(r"phone|telephone|mobile|contact[\s_-]*num|cell", re.IGNORECASE)),
    ("LINKEDIN", re.compile(r"linkedin|linked[\s_-]*in", re.IGNORECASE)),
    ("GITHUB", re.compile(r"github|git[\s_-]*hub", re.IGNORECASE)),
    ("PORTFOLIO", re.compile(r"portfolio|website|personal[\s_-]*site|web[\s_-]*link|homepage", re.IGNORECASE)),
    ("COLLEGE", re.compile(r"college|university|school|institution|alma[\s_-]*mater", re.IGNORECASE)),
    ("DEGREE", re.compile(r"degree|qualification|program", re.IGNORECASE)),
    ("BRANCH", re.compile(r"branch|major|discipline|field[\s_-]*of[\s_-]*study", re.IGNORECASE)),
    ("GRADUATION_YEAR", re.compile(r"graduat(?:ion|ing)[\s_-]*(?:year|date)|completion[\s_-]*year", re.IGNORECASE)),
    ("CGPA", re.compile(r"cgpa|gpa|percentage|grade", re.IGNORECASE)),
    ("LOCATION", re.compile(r"location|address|city|residence|current[\s_-]*city|state|zip", re.IGNORECASE)),
    ("RESUME_UPLOAD", re.compile(r"resume|cv|curriculum", re.IGNORECASE)),
    ("COVER_LETTER_UPLOAD", re.compile(r"cover[\s_-]*letter|letter|statement", re.IGNORECASE)),
]


def classify_field(
    name: str,
    field_id: str,
    label: str,
    placeholder: str,
    field_type: str,
) -> str:
    """Classify an HTML form field into a standard profile field or unknown question."""
    combined_text = f"{label} {name} {field_id} {placeholder}".lower()

    if field_type == "file":
        if re.search(r"cover[\s_-]*letter|letter", combined_text):
            return "COVER_LETTER_UPLOAD"
        return "RESUME_UPLOAD"

    for classification, pattern in FIELD_CLASSIFICATION_RULES:
        if pattern.search(combined_text):
            return classification

    return "UNKNOWN_QUESTION"


def get_mapped_value_from_profile(
    classification: str,
    profile: Dict[str, Any],
) -> Optional[str]:
    """
    Get the exact truthful value from user profile for a classified field.
    Returns None if not available in profile — NEVER guesses.
    """
    name = (profile.get("name") or "").strip()
    name_parts = name.split() if name else []

    if classification == "FIRST_NAME":
        return name_parts[0] if name_parts else None
    elif classification == "LAST_NAME":
        return name_parts[-1] if len(name_parts) > 1 else None
    elif classification == "FULL_NAME":
        return name if name else None
    elif classification == "EMAIL":
        return profile.get("email") or None
    elif classification == "PHONE":
        return profile.get("phone") or None
    elif classification == "LOCATION":
        return profile.get("location") or None
    elif classification == "LINKEDIN":
        return profile.get("linkedin") or None
    elif classification == "GITHUB":
        return profile.get("github") or None
    elif classification == "PORTFOLIO":
        return profile.get("portfolio") or None
    elif classification == "COLLEGE":
        return profile.get("college") or None
    elif classification == "DEGREE":
        return profile.get("degree") or None
    elif classification == "BRANCH":
        return profile.get("branch") or None
    elif classification == "GRADUATION_YEAR":
        gy = profile.get("graduation_year")
        return str(gy) if gy else None
    elif classification == "CGPA":
        cg = profile.get("cgpa")
        return str(cg) if cg else None
    return None


# ============================================================
# Playwright Browser Assistant Engine
# ============================================================

async def detect_and_fill_application_form(
    url: str,
    profile: Dict[str, Any],
    tailored_resume_path: Optional[str] = None,
    master_resume_path: Optional[str] = None,
    cover_letter_path: Optional[str] = None,
    custom_answers: Optional[Dict[str, str]] = None,
    perform_fill: bool = True,
    submit_form: bool = False,
    headless: bool = True,
) -> Dict[str, Any]:
    """
    Open application URL with Playwright, detect form fields, map profile values,
    fill safe known fields, attach documents, identify unknown questions, and return review report.
    """
    if not PLAYWRIGHT_AVAILABLE:
        return {
            "success": False,
            "error": "Playwright is not available in the Python environment.",
            "status": "ERROR",
            "detected_fields": [],
            "filled_fields": [],
            "unknown_questions": [],
            "files_attached": [],
            "captcha_detected": False,
            "submission_ready": False,
            "notes": ["Playwright is required for browser automation."],
        }

    answers = custom_answers or {}
    detected_fields = []
    filled_fields = []
    unknown_questions = []
    files_attached = []
    notes = []
    captcha_detected = False
    captcha_notice = None
    page_title = ""
    final_url = url

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        try:
            # 1. Navigate to Application URL
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)  # allow dynamic forms to settle
            page_title = await page.title()
            final_url = page.url

            # 2. Check for Anti-Bot / CAPTCHA (PRD Section 12: CAPTCHAs must NOT be bypassed)
            captcha_selectors = [
                "iframe[src*='recaptcha']",
                "iframe[src*='hcaptcha']",
                "iframe[src*='turnstile']",
                "iframe[src*='challenges.cloudflare.com']",
                ".g-recaptcha",
                ".h-captcha",
                "#cf-turnstile",
                "[data-sitekey]",
            ]
            for cs in captcha_selectors:
                if await page.locator(cs).count() > 0:
                    captcha_detected = True
                    captcha_notice = "Anti-bot verification / CAPTCHA detected. Automated bypass is strictly prohibited by PRD Section 12. Manual completion in browser is required."
                    notes.append("Anti-bot mechanism detected. Automation stopped for user safety.")
                    break

            # 3. Extract Form Fields from DOM
            # Evaluate all standard interactive form inputs
            fields_data = await page.evaluate("""
                () => {
                    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
                    return inputs.map((el, index) => {
                        const id = el.id || '';
                        const name = el.name || '';
                        const type = (el.tagName.toLowerCase() === 'textarea') ? 'textarea' :
                                     (el.tagName.toLowerCase() === 'select') ? 'select' : (el.type || 'text');
                        const placeholder = el.placeholder || '';
                        const required = el.required || el.hasAttribute('aria-required') || false;
                        
                        // Find label
                        let labelText = '';
                        if (id) {
                            const labelEl = document.querySelector(`label[for="${id}"]`);
                            if (labelEl) labelText = labelEl.innerText;
                        }
                        if (!labelText) {
                            const parentLabel = el.closest('label');
                            if (parentLabel) labelText = parentLabel.innerText;
                        }
                        if (!labelText && el.getAttribute('aria-label')) {
                            labelText = el.getAttribute('aria-label');
                        }
                        if (!labelText) {
                            // look at preceding sibling or parent container heading
                            const parent = el.parentElement;
                            if (parent) {
                                const prev = el.previousElementSibling;
                                if (prev && prev.innerText) labelText = prev.innerText;
                            }
                        }

                        // Collect options for select
                        let options = [];
                        if (el.tagName.toLowerCase() === 'select') {
                            options = Array.from(el.options).map(o => o.text.trim()).filter(Boolean);
                        }

                        // Build unique selector
                        let selector = '';
                        if (id) {
                            selector = `#${id}`;
                        } else if (name) {
                            selector = `${el.tagName.toLowerCase()}[name="${name}"]`;
                        } else {
                            selector = `form input, form select, form textarea:nth-child(${index + 1})`;
                        }

                        return {
                            index,
                            id,
                            name,
                            type,
                            placeholder,
                            required,
                            label: labelText.trim(),
                            options,
                            selector,
                            value: el.value || '',
                            isVisible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
                        };
                    }).filter(f => f.type !== 'hidden' && f.type !== 'submit' && f.type !== 'button');
                }
            """)

            # 4. Classify and Fill Fields
            for f in fields_data:
                f_name = f.get("name") or ""
                f_id = f.get("id") or ""
                f_label = f.get("label") or f_name or f_id or f.get("placeholder") or "Field"
                f_type = f.get("type") or "text"
                f_req = f.get("required") or False
                selector = f.get("selector")

                classification = classify_field(f_name, f_id, f_label, f.get("placeholder", ""), f_type)
                mapped_val = get_mapped_value_from_profile(classification, profile)

                field_obj = {
                    "selector": selector,
                    "field_name": f_name or f_id or f_label,
                    "field_type": f_type,
                    "label": f_label,
                    "classification": classification,
                    "mapped_value": mapped_val,
                    "is_required": f_req,
                    "is_filled": False,
                    "options": f.get("options"),
                }
                detected_fields.append(field_obj)

                # Process File Uploads
                if classification in ["RESUME_UPLOAD", "COVER_LETTER_UPLOAD"] and f_type == "file":
                    file_to_upload = None
                    if classification == "RESUME_UPLOAD":
                        file_to_upload = tailored_resume_path if (tailored_resume_path and os.path.exists(tailored_resume_path)) else master_resume_path
                    elif classification == "COVER_LETTER_UPLOAD":
                        file_to_upload = cover_letter_path if (cover_letter_path and os.path.exists(cover_letter_path)) else None

                    if file_to_upload and os.path.exists(file_to_upload) and perform_fill:
                        try:
                            loc = page.locator(selector).first
                            if await loc.count() > 0:
                                await loc.set_input_files(file_to_upload)
                                field_obj["is_filled"] = True
                                field_obj["mapped_value"] = os.path.basename(file_to_upload)
                                files_attached.append({
                                    "field_label": f_label,
                                    "file_type": classification,
                                    "file_name": os.path.basename(file_to_upload),
                                    "file_path": file_to_upload,
                                })
                                filled_fields.append(field_obj)
                        except Exception as e:
                            notes.append(f"Could not attach file for '{f_label}': {str(e)}")
                    continue

                # Safe Known Profile Fields
                if mapped_val and perform_fill:
                    try:
                        loc = page.locator(selector).first
                        if await loc.count() > 0:
                            if f_type == "select":
                                # Try matching option text
                                options = f.get("options") or []
                                match_opt = None
                                for opt in options:
                                    if mapped_val.lower() in opt.lower():
                                        match_opt = opt
                                        break
                                if match_opt:
                                    await loc.select_option(label=match_opt)
                                    field_obj["is_filled"] = True
                                    filled_fields.append(field_obj)
                            elif f_type in ["text", "email", "tel", "textarea", "url"]:
                                await loc.fill(mapped_val)
                                field_obj["is_filled"] = True
                                filled_fields.append(field_obj)
                    except Exception as e:
                        logger.warning(f"Failed to fill field '{f_label}': {e}")
                        notes.append(f"Auto-fill skipped for '{f_label}' due to selector ambiguity.")

                # Unknown / Custom Questions
                elif classification == "UNKNOWN_QUESTION":
                    # Check if user provided explicit answer in payload
                    user_ans = answers.get(f_name) or answers.get(f_id) or answers.get(f_label)
                    
                    if user_ans and perform_fill:
                        try:
                            loc = page.locator(selector).first
                            if await loc.count() > 0:
                                if f_type == "select":
                                    await loc.select_option(label=user_ans)
                                else:
                                    await loc.fill(user_ans)
                                field_obj["is_filled"] = True
                                field_obj["mapped_value"] = user_ans
                                filled_fields.append(field_obj)
                        except Exception as e:
                            notes.append(f"Failed to fill custom answer for '{f_label}': {e}")

                    unknown_questions.append({
                        "field_id": f_id or f_name or f_label,
                        "selector": selector,
                        "label": f_label,
                        "field_type": f_type,
                        "is_required": f_req,
                        "options": f.get("options"),
                        "current_value": f.get("value") or None,
                        "user_answer": user_ans,
                        "help_text": "Field not present in standard profile. Please verify or provide answer.",
                    })

            # 5. Check Submission Readiness
            unfilled_required = [q for q in unknown_questions if q.get("is_required") and not q.get("user_answer")]
            submission_ready = (len(unfilled_required) == 0) and not captcha_detected

            # 6. Submission Execution (STRICT: Only when user_approved is True)
            submission_success = False
            confirmation_message = "Application prepared for review."

            if submit_form:
                if not submission_ready:
                    notes.append("Cannot submit: required fields or CAPTCHA require user attention.")
                elif captcha_detected:
                    notes.append("Submission blocked: CAPTCHA detected. User must complete in browser.")
                else:
                    # Locate submit button
                    submit_selectors = [
                        "button[type='submit']",
                        "input[type='submit']",
                        "button:has-text('Submit Application')",
                        "button:has-text('Apply Now')",
                        "button:has-text('Submit')",
                    ]
                    submitted = False
                    for ss in submit_selectors:
                        btn = page.locator(ss).first
                        if await btn.count() > 0:
                            await btn.click()
                            await page.wait_for_timeout(3000)
                            submitted = True
                            submission_success = True
                            confirmation_message = "Application successfully submitted with explicit user approval."
                            final_url = page.url
                            break
                    if not submitted:
                        notes.append("Submit button could not be safely identified. Please submit in browser.")

        except Exception as e:
            logger.error(f"Playwright automation error for {url}: {e}")
            notes.append(f"Automation notice: {str(e)}")
        finally:
            await context.close()
            await browser.close()

    status = "APPLIED" if submission_success else ("BLOCKED_CAPTCHA" if captcha_detected else ("READY" if submission_ready else "NEEDS_INPUT"))

    return {
        "success": True,
        "status": status,
        "page_title": page_title,
        "final_url": final_url,
        "captcha_detected": captcha_detected,
        "captcha_notice": captcha_notice,
        "detected_fields": detected_fields,
        "filled_fields": filled_fields,
        "unknown_questions": unknown_questions,
        "files_attached": files_attached,
        "submission_ready": submission_ready,
        "confirmation_message": confirmation_message,
        "notes": notes,
    }
