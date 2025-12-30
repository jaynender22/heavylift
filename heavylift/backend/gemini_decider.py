# backend/gemini_decider.py
from __future__ import annotations

import os
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field
from google import genai

VERTEX_MODEL = os.getenv("HEAVYLIFT_GEMINI_MODEL", "gemini-2.5-flash")


class RagDecision(BaseModel):
    value: Optional[str] = Field(default=None)
    source_type: Literal["profile", "preferences", "resume", "unknown"]
    source_ref: Optional[str] = Field(default=None)  # profile.firstName | preferences.willingToRelocate | resume_chunk:123
    confidence: float = Field(ge=0.0, le=1.0)
    note: Optional[str] = None


def _vertex_client() -> genai.Client:
    # Force Vertex mode (you already set env vars, but this avoids API-key confusion)
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION") or "us-central1"
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is not set.")
    return genai.Client(vertexai=True, project=project, location=location)


_client = _vertex_client()


def decide_value(
    *,
    field_question: str,
    field_type: str,
    options: List[str],
    candidate_facts: List[Dict[str, Any]],
    candidate_chunks: List[Dict[str, Any]],
) -> RagDecision:
    payload = {
        "field": {
            "question": field_question,
            "field_type": field_type,
            "options": options,
        },
        "rules": [
            "Use ONLY the provided candidates. Do not invent anything.",
            "If the answer is not clearly supported by candidates, return source_type='unknown' and value=null.",
            "If options are provided (radio/select), value must exactly match one option or be null.",
        ],
        "candidates": {
            "facts": candidate_facts,
            "resume_chunks": candidate_chunks,
        },
    }

    resp = _client.models.generate_content(
        model=VERTEX_MODEL,
        contents=str(payload),
        config={
            "response_mime_type": "application/json",
            "response_schema": RagDecision.model_json_schema(),
            "temperature": 0.2,
        },
    )

    return RagDecision.model_validate_json(resp.text)
