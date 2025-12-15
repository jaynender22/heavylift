# backend/app.py

from typing import List, Optional

import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import (
    FieldInput,
    ClassifyFieldsRequest,
    ClassifyFieldsResponse,
    ClassifiedField,
    # New imports for generate-answers + live report
    GenerateAnswersRequest,
    GenerateAnswersResponse,
    FieldSuggestion,
    FieldAnswer,
    ScanReport,
)
from schema import CANONICAL_FIELDS
from embeddings import classify_field_texts
from reporting import append_scan_report  # you created this in backend/reporting.py


app = FastAPI()

# Allow calls from your extension and local pages (relaxed for dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------


def build_field_text(field: FieldInput) -> str:
    label = field.label or ""
    name = field.name or ""
    placeholder = field.placeholder or ""
    tag = field.tag or ""
    html_type = field.html_type or ""
    options = field.options or []

    opt_preview = ", ".join(options[:5])
    return (
        f"Label: {label}. "
        f"Name attribute: {name}. "
        f"Placeholder: {placeholder}. "
        f"Tag: {tag}, type: {html_type}. "
        f"Options: {opt_preview}."
    )


def lookup_source_for_key(key: str) -> str:
    """
    Map a canonical key (like 'EMAIL' or 'WORK_AUTH_US') to a source string,
    e.g. 'profile.email' or 'preferences.workAuthUS' or 'none'.
    """
    for field in CANONICAL_FIELDS:
        if field["key"] == key:
            return field.get("source", "none")
    return "none"


def is_sensitive_key(key: str) -> bool:
    """
    Check whether a canonical key is marked as sensitive in CANONICAL_FIELDS.
    """
    for field in CANONICAL_FIELDS:
        if field["key"] == key:
            return bool(field.get("sensitive", False))
    return False


def rule_based_key(field: FieldInput) -> Optional[str]:
    """
    Very cheap, high-precision rules for the obvious stuff and
    for clearly sensitive fields. Embeddings are used as fallback.
    """
    text = " ".join(
        [
            field.label or "",
            field.name or "",
            field.placeholder or "",
        ]
    ).lower()

    # ---------- Highly sensitive IDs ----------
    if "ssn" in text or "social security" in text or "social-security" in text:
        return "SSN_OR_NATIONAL_ID"
    if "national id" in text or "national identification" in text:
        return "SSN_OR_NATIONAL_ID"
    if "passport" in text:
        return "PASSPORT_NUMBER"
    if "driver" in text and "license" in text:
        return "DRIVERS_LICENSE_NUMBER"

    # ---------- Demographics (some of these you decided to autofill) ----------
    if "date of birth" in text or "birth date" in text or "dob" in text:
        return "DATE_OF_BIRTH"
    if "race" in text or "ethnicity" in text:
        return "RACE_ETHNICITY"
    if "gender" in text:
        return "GENDER"
    if "disability" in text:
        return "DISABILITY_STATUS"
    if "veteran" in text:
        return "VETERAN_STATUS"
    if "sexual orientation" in text or "orientation" in text:
        return "SEXUAL_ORIENTATION"
    if "criminal" in text or "conviction" in text or "offense" in text:
        return "CRIMINAL_HISTORY"

    # ---------- Email / phone ----------
    if "email" in text:
        return "EMAIL"
    if "mobile" in text or "cell" in text:
        return "PHONE_MOBILE"
    if "phone" in text and "mobile" not in text and "cell" not in text:
        return "PHONE_MOBILE"

    # ---------- Online presence ----------
    if "linkedin" in text or "linked in" in text:
        return "LINKEDIN_URL"
    if "github" in text or "git hub" in text:
        return "GITHUB_URL"
    if "portfolio" in text or "website" in text or "personal site" in text:
        return "PORTFOLIO_URL"

    # ---------- Name fields (avoid company name) ----------
    if "first name" in text or "given name" in text or "forename" in text:
        return "FIRST_NAME"
    if "middle name" in text:
        return "MIDDLE_NAME"
    if "last name" in text or "family name" in text or "surname" in text:
        return "LAST_NAME"
    if "preferred name" in text or "preferred first" in text:
        return "PREFERRED_NAME"
    if "full name" in text or (
        "name" in text and "company" not in text and "employer" not in text
    ):
        return "FULL_NAME"

    # ---------- Location ----------
    if "city" in text and "current" in text:
        return "CITY"
    if "city" in text and "current" not in text and "state" not in text:
        return "CITY"
    if "state" in text or "province" in text or "region" in text:
        return "STATE"
    if "country" in text:
        return "COUNTRY"
    if "postal" in text or "zip" in text:
        return "POSTAL_CODE"
    if "current location" in text:
        return "CURRENT_LOCATION"
    if "location" in text and "preferred" not in text:
        return "CURRENT_LOCATION"
    if "preferred location" in text or "location preference" in text:
        return "PREFERRED_LOCATION"

    # ---------- Work authorization / preferences ----------
    if "authorized to work" in text or "work authorization" in text:
        if "united states" in text or "us" in text or "u.s." in text:
            return "WORK_AUTH_US"
        return "WORK_AUTH_COUNTRY"
    if "sponsorship" in text:
        return "NEED_SPONSORSHIP_FUTURE"
    if "eligible to work" in text:
        return "ELIGIBLE_TO_WORK_IN_COUNTRY_X"

    if "willing to relocate" in text or "relocate" in text:
        return "WILLING_TO_RELOCATE"
    if "on-site" in text or "onsite" in text:
        return "ON_SITE_OKAY"
    if "hybrid" in text:
        return "HYBRID_OKAY"
    if "travel" in text and "%" in text:
        return "TRAVEL_PERCENT_MAX"

    # ---------- Timing & comp ----------
    if "notice period" in text:
        return "NOTICE_PERIOD"
    if "earliest start" in text or "start date" in text:
        return "EARLIEST_START_DATE"
    if "salary expectation" in text or "desired salary" in text:
        return "SALARY_EXPECTATIONS"
    if "hourly rate" in text or "rate expectation" in text:
        return "HOURLY_RATE_EXPECTATIONS"

    # ---------- Education ----------
    if "education level" in text or "highest education" in text:
        return "HIGHEST_EDUCATION_LEVEL"
    if "field of study" in text or "major" in text:
        return "FIELD_OF_STUDY"
    if "institution" in text or "university" in text or "college" in text:
        return "INSTITUTION_NAME"
    if "graduation year" in text or "grad year" in text:
        return "GRADUATION_YEAR"

    # ---------- Long answers ----------
    if "tell us about yourself" in text:
        return "LONG_ANSWER_FREEFORM"
    if "why do you want to work here" in text or "motivation" in text:
        return "LONG_ANSWER_FREEFORM"
    if "describe a challenge" in text or "challenge you faced" in text:
        return "LONG_ANSWER_FREEFORM"

    return None


def classify_fields_core(fields: List[FieldInput]) -> List[ClassifiedField]:
    """
    Core classification logic, used by both the /classify-fields endpoint
    and internally by /generate-answers.
    """
    if not fields:
        return []

    texts = [build_field_text(f) for f in fields]
    key_conf_pairs = classify_field_texts(texts)

    results: List[ClassifiedField] = []
    for f, (emb_key, emb_conf) in zip(fields, key_conf_pairs):
        rb_key = rule_based_key(f)

        if rb_key is not None:
            key = rb_key
            # Treat rule-based matches as high confidence
            confidence = max(emb_conf, 0.99)
        else:
            key = emb_key
            confidence = emb_conf

        source = lookup_source_for_key(key)
        sensitive = is_sensitive_key(key)
        autofill_allowed = (key != "UNKNOWN") and (source != "none") and (not sensitive)

        # Debug logging so you can see behavior
        print(
            f"[classify] label='{f.label}' name='{f.name}' "
            f"-> key={key} source={source} conf={confidence:.2f} sensitive={sensitive}"
        )

        results.append(
            ClassifiedField(
                field_id=f.id,
                canonical_key=key,
                source=source,
                confidence=confidence,
                sensitive=sensitive,
                autofill_allowed=autofill_allowed,
            )
        )

    return results


# ---------- Endpoints ----------


@app.post("/classify-fields", response_model=ClassifyFieldsResponse)
async def classify_fields(payload: ClassifyFieldsRequest) -> ClassifyFieldsResponse:
    fields: List[FieldInput] = payload.fields
    results = classify_fields_core(fields)
    return ClassifyFieldsResponse(results=results)


@app.post("/generate-answers", response_model=GenerateAnswersResponse)
async def generate_answers(payload: GenerateAnswersRequest) -> GenerateAnswersResponse:
    """
    Main endpoint the extension calls when user clicks 'Fill from saved info'.

    Flow:
      1) Classify fields -> canonical keys, sources, sensitivity.
      2) For each field, try to pull a value from profile/preferences.
      3) Optionally (later) use Gemini/ML for remaining 'unknown' fields.
      4) Build a ScanReport and log it.
      5) Return minimal fill instructions + full report.
    """
    fields: List[FieldInput] = payload.fields or []
    profile = payload.profile or {}
    preferences = payload.preferences or {}

    # Handy debug if you want to see what preferences look like:
    # print("[profile]", profile)
    # print("[preferences]", preferences)

    # 1) Classification (reuse core logic)
    classified = classify_fields_core(fields)

    field_suggestions: List[FieldSuggestion] = []

    for cf in classified:
        # Find original field metadata
        field = next((f for f in fields if f.id == cf.field_id), None)
        if not field:
            continue

        suggested_value: Optional[str] = None
        source_label = "none"
        confidence = cf.confidence
        reason = ""

        if not cf.autofill_allowed:
            # Sensitive or unknown source -> we don't autofill
            reason = "Autofill not allowed (sensitive or no source mapping)"
        else:
            # Example simple mapping: cf.source like "profile.firstName"
            # or "preferences.workAuthUS"
            if cf.source.startswith("profile."):
                key = cf.source.split(".", 1)[1]
                raw = profile.get(key)
                if isinstance(raw, str) and raw.strip():
                    suggested_value = raw.strip()
                    source_label = "profile"
                    reason = f"Filled from profile.{key}"
                else:
                    reason = f"No value found in profile for key '{key}'"
            elif cf.source.startswith("preferences."):
                key = cf.source.split(".", 1)[1]
                raw = preferences.get(key)
                if isinstance(raw, str) and raw.strip():
                    # For yes/no or coded values we’ll improve this logic later
                    suggested_value = raw.strip()
                    source_label = "preferences"
                    reason = f"Filled from preferences.{key}"
                else:
                    reason = f"No value found in preferences for key '{key}'"
            else:
                reason = "No matching profile/preference source"

        fs = FieldSuggestion(
            field_id=cf.field_id,
            suggested_value=suggested_value,
            canonical_key=cf.canonical_key,
            source=source_label,
            confidence=confidence,
            reason=reason,
        )
        field_suggestions.append(fs)

    # 2) TODO (future): Gemini/ML second pass

    # 3) Build minimal suggestions list for the extension
    suggestions: List[FieldAnswer] = [
        FieldAnswer(field_id=fs.field_id, value=fs.suggested_value)
        for fs in field_suggestions
        if fs.suggested_value is not None
    ]

    # 4) Build ScanReport object
    job_info = payload.job_info
    report = ScanReport(
        job_url=job_info.url if job_info else None,
        company=job_info.company if job_info else None,
        role=job_info.role if job_info else None,
        timestamp=time.time(),
        fields=field_suggestions,
    )

    # 5) Persist to live-report log
    append_scan_report(report)

    # 6) Return suggestions + report to the extension
    return GenerateAnswersResponse(
        suggestions=suggestions,
        report=report,
    )

