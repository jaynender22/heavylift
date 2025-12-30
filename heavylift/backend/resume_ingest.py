# backend/resume_ingest.py
from __future__ import annotations

from pathlib import Path
from typing import List
from pypdf import PdfReader

from rag_config import RESUME_CHUNK_SIZE, RESUME_CHUNK_OVERLAP


def extract_pdf_text(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    parts: List[str] = []
    for page in reader.pages:
        txt = page.extract_text() or ""
        if txt.strip():
            parts.append(txt)
    return "\n".join(parts)


def chunk_text(text: str, chunk_size: int = RESUME_CHUNK_SIZE, overlap: int = RESUME_CHUNK_OVERLAP) -> List[str]:
    # normalize whitespace
    text = " ".join(text.split())
    if not text:
        return []

    chunks: List[str] = []
    i = 0
    step = max(1, chunk_size - overlap)

    while i < len(text):
        chunk = text[i : i + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        i += step

    return chunks
