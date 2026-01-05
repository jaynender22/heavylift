# backend/app.py
from resume_search import search_resume, extract_gpa
from typing import List, Optional
import json
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import hashlib
from models import (
    FieldInput,
    ClassifyFieldsRequest,
    ClassifyFieldsResponse,
    ClassifiedField,
    GenerateAnswersRequest,
    GenerateAnswersResponse,
    FieldSuggestion,
    FieldAnswer,
    ScanReport,
    CorrectionIn,
    CorrectionsBulkIn,
    CorrectionsBulkOut,
)
from schema import CANONICAL_FIELDS
from embeddings import classify_field_texts
from reporting import append_scan_report  # you created this in backend/reporting.py
from fastapi import UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
import hashlib
from pathlib import Path
from db import engine, DATA_DIR, get_db
from db_models import Base, Resume, Profile, ProfileVersion, FieldCorrection
from resume_index import build_index_for_resume
from rag_config import (
    MIN_CONFIDENCE_TO_AUTOFILL,
    MIN_CONFIDENCE_TO_RETURN_VALUE,
    CANONICAL_CONFIDENCE_STRONG,
    MAX_FACTS_TO_SEND,
    MAX_CHUNKS_TO_SEND,
)
from profile_facts import build_facts
from fact_retrieval import retrieve_top_facts
from resume_index import search_resume
from gemini_decider import decide_value
from reporting import append_rag_trace
import re
from sqlalchemy.orm import Session
from urllib.parse import urlparse

app = FastAPI()

# Allow calls from your extension and local pages (relaxed for dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_credentials=True,
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


def _norm(s: str | None) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _sha1(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def make_field_fingerprint(
    domain: str,
    label: str,
    name: str,
    placeholder: str,
    field_type: str,
    html_type: str,
) -> str:
    material = "|".join(
        [
            _norm(domain),
            "label:" + _norm(label),
            "name:" + _norm(name),
            "ph:" + _norm(placeholder),
            "ft:" + _norm(field_type),
            "ht:" + _norm(html_type),
        ]
    )
    return _sha1(material)


def make_options_hash(options: list[str] | None) -> str:
    clean = [_norm(o) for o in (options or []) if _norm(o)]
    material = json.dumps(clean, ensure_ascii=False)
    return _sha1(material)


def _domain_from_payload(payload: GenerateAnswersRequest) -> str:
    if payload.domain:
        return payload.domain
    url = None
    if payload.job_info and isinstance(payload.job_info, dict):
        url = payload.job_info.get("url")
    elif payload.job_info:
        url = getattr(payload.job_info, "url", None)

    if url:
        try:
            netloc = urlparse(url).netloc
            return netloc or "unknown"
        except Exception:
            return "unknown"
    return "unknown"


# ---------- Endpoints ----------


@app.post("/classify-fields", response_model=ClassifyFieldsResponse)
async def classify_fields(payload: ClassifyFieldsRequest) -> ClassifyFieldsResponse:
    fields: List[FieldInput] = payload.fields
    results = classify_fields_core(fields)
    return ClassifyFieldsResponse(results=results)


@app.post("/generate-answers", response_model=GenerateAnswersResponse)
async def generate_answers(
    payload: GenerateAnswersRequest,
    db: Session = Depends(get_db),
) -> GenerateAnswersResponse:
    """
    Main endpoint the extension calls when user clicks 'Fill from saved info'.

    Flow:
      1) Classify fields -> canonical keys, sources, sensitivity.
      2) For each field, try to pull a value from profile/preferences.
      3) Optionally use RAG + Gemini for remaining fields.
      4) Log trace server-side.
      5) Return minimal fill instructions.
    """
    fields: List[FieldInput] = payload.fields or []
    profile = payload.profile or {}
    preferences = payload.preferences or {}

    # If extension didn't send resume_id (popup reset), fall back to latest resume
    if not payload.resume_id:
        latest = db.query(Resume).order_by(Resume.id.desc()).first()
        if latest:
            payload.resume_id = latest.id
            print("[generate-answers] resume_id missing; using latest:", payload.resume_id)
        else:
            print("[generate-answers] resume_id missing; no resumes found")
    else:
        print("[generate-answers] resume_id:", payload.resume_id)

    domain = _domain_from_payload(payload)

    # 1) Classification (this function already exists in app.py in your project)
    classified = classify_fields_core(fields)

    suggestions: List[FieldAnswer] = []

    # Build facts once per request
    facts_all = build_facts(profile, preferences)

    for cf in classified:
        field = next((f for f in fields if f.id == cf.field_id), None)
        if not field:
            continue

        # Respect schema autofill_allowed
        if not cf.autofill_allowed:
            suggestions.append(
                FieldAnswer(
                    field_id=cf.field_id,
                    value=None,
                    autofill=False,
                    confidence=float(cf.confidence),
                    source_type="unknown",
                    source_ref=None,
                )
            )
            continue
    
            # 1.5) Corrections Store: highest priority
        fp = make_field_fingerprint(
            domain=domain,
            label=field.label or "",
            name=field.name or "",
            placeholder=field.placeholder or "",
            field_type=field.tag or "",
            html_type=field.html_type or "",
        )
        oh = make_options_hash(field.options or [])

        corr = (
            db.query(FieldCorrection)
            .filter(FieldCorrection.domain == domain)
            .filter(FieldCorrection.fingerprint == fp)
            .filter(FieldCorrection.options_hash == oh)
            .first()
        )

        if corr and corr.correct_value:
            suggestions.append(
                FieldAnswer(
                    field_id=cf.field_id,
                    value=corr.correct_value,
                    autofill=True,
                    confidence=0.99,
                    source_type="correction",
                    source_ref=f"corrections:{corr.id}",
                    fill_strategy=corr.fill_strategy,
                )
            )
            continue


        # 2) Fast path: canonical mapping when confidence strong
        suggested_value: Optional[str] = None
        source_type = "unknown"
        source_ref: Optional[str] = None
        confidence = float(cf.confidence)

        if cf.canonical_key != "UNKNOWN" and cf.source and confidence >= CANONICAL_CONFIDENCE_STRONG:
            if cf.source.startswith("profile."):
                key = cf.source.split(".", 1)[1]
                raw = (profile or {}).get(key)
                if isinstance(raw, str) and raw.strip():
                    suggested_value = raw.strip()
                    source_type = "profile"
                    source_ref = f"profile.{key}"

            elif cf.source.startswith("preferences."):
                key = cf.source.split(".", 1)[1]
                raw = (preferences or {}).get(key)
                if isinstance(raw, str) and raw.strip():
                    suggested_value = raw.strip()
                    source_type = "preferences"
                    source_ref = f"preferences.{key}"

        # If we found a strong canonical value, autofill immediately
        if suggested_value is not None:
            suggestions.append(
                FieldAnswer(
                    field_id=cf.field_id,
                    value=suggested_value,
                    autofill=True,
                    confidence=confidence,
                    source_type=source_type,
                    source_ref=source_ref,
                )
            )
            continue

        # 3) Hard path: RAG + Gemini
        field_question = " ".join(
            [
                (field.label or "").strip(),
                (field.placeholder or "").strip(),
                (field.name or "").strip(),
                ("Options: " + ", ".join(field.options or [])) if field.options else "",
            ]
        ).strip()
# GPA fast-path (very reliable)
        if payload.resume_id and re.search(r"\bgpa\b", field_question, re.IGNORECASE):
            gpa = extract_gpa(db, payload.resume_id)
            if gpa:
                suggestions.append(
                    FieldAnswer(
                        field_id=cf.field_id,
                        value=gpa,
                        autofill=True,
                        confidence=0.99,
                        source_type="resume",
                        source_ref="resume.gpa",
                    )
                )
                continue
        top_facts = retrieve_top_facts(field_question, facts_all, top_k=MAX_FACTS_TO_SEND)

        top_chunks = []
        if payload.resume_id:
            try:
                top_chunks = search_resume(db, payload.resume_id, field_question, top_k=MAX_CHUNKS_TO_SEND)
            except Exception as e:
                print("[resume search] failed:", e)
                top_chunks = []

        decision = decide_value(
            field_question=field_question,
            field_type=field.html_type or field.tag or "text",
            options=field.options or [],
            candidate_facts=top_facts,
            candidate_chunks=top_chunks,
        )

        append_rag_trace(
            {
                "field_id": cf.field_id,
                "canonical_key": cf.canonical_key,
                "canonical_source": cf.source,
                "canonical_confidence": cf.confidence,
                "field_question": field_question,
                "top_facts": top_facts,
                "top_chunks": [{"chunk_id": c["chunk_id"], "score": c["score"]} for c in top_chunks],
                "gemini_decision": decision.model_dump(),
            }
        )

        # Safe mode thresholds: below 0.60 returns NULL
        if float(decision.confidence) < MIN_CONFIDENCE_TO_RETURN_VALUE:
            suggestions.append(
                FieldAnswer(
                    field_id=cf.field_id,
                    value=None,
                    autofill=False,
                    confidence=float(decision.confidence),
                    source_type="unknown",
                    source_ref=None,
                )
            )
            continue

        if float(decision.confidence) < MIN_CONFIDENCE_TO_AUTOFILL:
            suggestions.append(
                FieldAnswer(
                    field_id=cf.field_id,
                    value=None,
                    autofill=False,
                    confidence=float(decision.confidence),
                    source_type="unknown",
                    source_ref=None,
                )
            )
            continue

        suggestions.append(
            FieldAnswer(
                field_id=cf.field_id,
                value=decision.value,
                autofill=True,
                confidence=float(decision.confidence),
                source_type=decision.source_type,
                source_ref=decision.source_ref,
            )
        )

    return GenerateAnswersResponse(suggestions=suggestions)



@app.on_event("startup")
def init_db():
    Base.metadata.create_all(bind=engine)

def _sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def _safe_filename(name: str) -> str:
    name = name or "resume.pdf"
    name = Path(name).name
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    if not Path(name).suffix:
        name += ".pdf"
    return name


@app.post("/resumes")
async def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    sha = _sha256_bytes(content)
    ext = Path(file.filename or "resume.pdf").suffix or ".pdf"
    safe_name = _safe_filename(file.filename or f"resume{ext}")

    # Local storage base
    resumes_dir = DATA_DIR / "resumes"
    resumes_dir.mkdir(parents=True, exist_ok=True)

    # 1) Create DB row first (we need id)
    placeholder_path = str(resumes_dir / f"{sha}{ext}")
    r = Resume(original_filename=file.filename or "resume", stored_path=placeholder_path, sha256=sha)
    db.add(r)
    db.commit()
    db.refresh(r)

    # 2) Save by resume id in a stable path
    resume_folder = resumes_dir / str(r.id)
    resume_folder.mkdir(parents=True, exist_ok=True)

    final_path = resume_folder / safe_name
    final_path.write_bytes(content)

    # 3) Optionally also keep sha copy for dedupe (not required, but nice)
    sha_path = resumes_dir / f"{sha}{ext}"
    if not sha_path.exists():
        sha_path.write_bytes(content)

    # 4) Update DB stored_path to the final stable path
    r.stored_path = str(final_path)
    db.add(r)
    db.commit()

    return {"id": r.id, "filename": r.original_filename, "sha256": r.sha256, "created_at": r.created_at}


@app.get("/resumes")
def list_resumes(db: Session = Depends(get_db)):
    rows = db.execute(select(Resume).order_by(desc(Resume.created_at))).scalars().all()
    return [{"id": r.id, "filename": r.original_filename, "sha256": r.sha256, "created_at": r.created_at} for r in rows]

@app.get("/resumes/{resume_id}/download")
def download_resume(resume_id: int, db: Session = Depends(get_db)):
    r = db.get(Resume, resume_id)
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")
    return FileResponse(path=r.stored_path, filename=r.original_filename)

@app.get("/resumes/latest")
def get_latest_resume(db: Session = Depends(get_db)):
    r = db.query(Resume).order_by(Resume.id.desc()).first()
    if not r:
        return {"resume_id": None}
    return {"resume_id": r.id, "stored_path": r.stored_path, "original_filename": r.original_filename}


@app.post("/profiles")
def create_profile(payload: dict, db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Profile name required")
    p = Profile(name=name)
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "name": p.name, "created_at": p.created_at}

@app.get("/profiles")
def list_profiles(db: Session = Depends(get_db)):
    rows = db.execute(select(Profile).order_by(desc(Profile.created_at))).scalars().all()
    return [{"id": p.id, "name": p.name, "created_at": p.created_at} for p in rows]

@app.post("/profiles/{profile_id}/versions")
def save_profile_version(profile_id: int, payload: dict, db: Session = Depends(get_db)):
    p = db.get(Profile, profile_id)
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")

    data = payload.get("data")
    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="payload.data must be a JSON object")

    resume_id = payload.get("resume_id")
    if resume_id is not None and db.get(Resume, resume_id) is None:
        raise HTTPException(status_code=400, detail="resume_id not found")

    v = ProfileVersion(profile_id=profile_id, resume_id=resume_id, data=data)
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"id": v.id, "profile_id": v.profile_id, "resume_id": v.resume_id, "created_at": v.created_at}

@app.get("/profiles/{profile_id}/versions")
def list_profile_versions(profile_id: int, db: Session = Depends(get_db)):
    if db.get(Profile, profile_id) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    rows = db.execute(
        select(ProfileVersion)
        .where(ProfileVersion.profile_id == profile_id)
        .order_by(desc(ProfileVersion.created_at))
    ).scalars().all()
    return [{"id": v.id, "resume_id": v.resume_id, "created_at": v.created_at} for v in rows]

@app.get("/profiles/{profile_id}/versions/{version_id}")
def get_profile_version(profile_id: int, version_id: int, db: Session = Depends(get_db)):
    v = db.get(ProfileVersion, version_id)
    if not v or v.profile_id != profile_id:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"id": v.id, "profile_id": v.profile_id, "resume_id": v.resume_id, "created_at": v.created_at, "data": v.data}


@app.post("/corrections/bulk", response_model=CorrectionsBulkOut)
def upsert_corrections(
    payload: CorrectionsBulkIn,
    db: Session = Depends(get_db),
) -> CorrectionsBulkOut:
    saved = 0
    updated = 0

    for item in payload.items:
        fp = make_field_fingerprint(
            domain=item.domain,
            label=item.label or "",
            name=item.name or "",
            placeholder=item.placeholder or "",
            field_type=item.field_type or "",
            html_type=item.html_type or "",
        )
        oh = make_options_hash(item.options or [])

        existing = (
            db.query(FieldCorrection)
            .filter(FieldCorrection.domain == item.domain)
            .filter(FieldCorrection.fingerprint == fp)
            .filter(FieldCorrection.options_hash == oh)
            .first()
        )

        if existing:
            existing.correct_value = item.correct_value
            existing.fill_strategy = item.fill_strategy
            existing.question_text = item.question_text
            existing.field_type = item.field_type
            existing.options_json = json.dumps(item.options or [], ensure_ascii=False)
            existing.hits = (existing.hits or 0) + 1
            db.add(existing)
            updated += 1
        else:
            row = FieldCorrection(
                domain=item.domain,
                fingerprint=fp,
                options_hash=oh,
                question_text=item.question_text,
                field_type=item.field_type,
                options_json=json.dumps(item.options or [], ensure_ascii=False),
                correct_value=item.correct_value,
                fill_strategy=item.fill_strategy,
                hits=1,
            )
            db.add(row)
            saved += 1

    db.commit()
    return CorrectionsBulkOut(saved=saved, updated=updated)

@app.get("/corrections/export")
def export_corrections(db: Session = Depends(get_db)):
    rows = (
        db.query(FieldCorrection)
        .order_by(FieldCorrection.updated_at.desc())
        .all()
    )
    out = []
    for r in rows:
        out.append(
            {
                "domain": r.domain,
                "fingerprint": r.fingerprint,
                "options_hash": r.options_hash,
                "question_text": r.question_text,
                "field_type": r.field_type,
                "options": json.loads(r.options_json) if r.options_json else [],
                "correct_value": r.correct_value,
                "fill_strategy": r.fill_strategy,
                "hits": r.hits,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
        )
    return out
