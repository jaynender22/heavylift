# backend/app.py

from typing import List
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import (
    FieldInput,
    ClassifyFieldsRequest,
    ClassifyFieldsResponse,
    ClassifiedField,
)
from schema import CANONICAL_FIELDS
from embeddings import classify_field_texts

app = FastAPI()

# Allow calls from your extension and local pages (relaxed for dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    for field in CANONICAL_FIELDS:
        if field["key"] == key:
            return field.get("source", "none")
    return "none"


def is_sensitive_key(key: str) -> bool:
    # For now, none of our basic profile fields are sensitive in the
    # demographic/ID sense. Later you might add KEYS like RACE, GENDER etc.
    for field in CANONICAL_FIELDS:
        if field["key"] == key:
            return bool(field.get("sensitive", False))
    return False


@app.post("/classify-fields", response_model=ClassifyFieldsResponse)
async def classify_fields(payload: ClassifyFieldsRequest) -> ClassifyFieldsResponse:
    fields: List[FieldInput] = payload.fields
    if not fields:
        return ClassifyFieldsResponse(results=[])

    texts = [build_field_text(f) for f in fields]
    key_conf_pairs = classify_field_texts(texts)

    results: List[ClassifiedField] = []
    for f, (key, conf) in zip(fields, key_conf_pairs):
        source = lookup_source_for_key(key)
        sensitive = is_sensitive_key(key)
        autofill_allowed = (key != "UNKNOWN") and (source != "none") and (not sensitive)

        results.append(
            ClassifiedField(
                field_id=f.id,
                canonical_key=key,
                source=source,
                confidence=conf,
                sensitive=sensitive,
                autofill_allowed=autofill_allowed,
            )
        )

    return ClassifyFieldsResponse(results=results)
