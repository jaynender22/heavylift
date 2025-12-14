# backend/models.py

from typing import List, Optional
from pydantic import BaseModel


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
