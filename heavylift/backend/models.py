# backend/models.py

from typing import List, Optional, Dict, Any
from pydantic import BaseModel


# ---------- Existing models (unchanged behavior) ----------

class FieldInput(BaseModel):
    id: str
    label: Optional[str] = ""
    name: Optional[str] = ""
    placeholder: Optional[str] = ""
    tag: Optional[str] = ""         # 'input', 'select', 'textarea'
    html_type: Optional[str] = ""   # e.g. 'text', 'email', 'radio'
    options: Optional[List[str]] = None


class ClassifyFieldsRequest(BaseModel):
    fields: List[FieldInput]


class ClassifiedField(BaseModel):
    field_id: str
    canonical_key: str
    source: str                # e.g. 'profile.email' or 'none'
    confidence: float
    sensitive: bool
    autofill_allowed: bool


class ClassifyFieldsResponse(BaseModel):
    results: List[ClassifiedField]


# ---------- New: live-report + generate-answers models ----------

class FieldSuggestion(BaseModel):
    """
    One field on a specific page and what we decided to do with it.
    This is what powers the 'live report' and also what we use to
    build actual fill instructions for the content script.
    """
    field_id: str
    suggested_value: Optional[str] = None        # what we plan to fill (already normalized to text)
    canonical_key: Optional[str] = None          # e.g. 'WORK_AUTH_US', 'FULL_NAME'
    source: str                                  # 'profile' | 'preferences' | 'rule' | 'ml' | 'none'
    confidence: float                            # 0.0–1.0
    reason: Optional[str] = None                 # short human-readable explanation


class ScanReport(BaseModel):
    """
    High-level summary for a single scan of a page.
    Logged after every /generate-answers call so you can
    later review unknown / low-confidence fields.
    """
    job_url: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    timestamp: float                              # unix seconds
    fields: List[FieldSuggestion]


class JobInfo(BaseModel):
    """
    Optional context about the job being applied to.
    For now we mostly care about URL; company/role are nice-to-have.
    """
    url: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None


class GenerateAnswersRequest(BaseModel):
    """
    Main payload from the extension popup to the backend when the user
    clicks 'Fill from saved info'.
    """
    job_info: Optional[JobInfo] = None
    profile: Optional[Dict[str, Any]] = None       # whatever you store in chrome.storage
    preferences: Optional[Dict[str, Any]] = None   # same
    resume_id: Optional[int] = None
    fields: List[FieldInput]


class FieldAnswer(BaseModel):
    field_id: str
    value: Optional[str] = None
    autofill: bool = False
    confidence: float = 0.0
    source_type: str = "unknown"
    source_ref: Optional[str] = None


class GenerateAnswersResponse(BaseModel):
    suggestions: List[FieldAnswer]

