from __future__ import annotations

import json
import re
from pathlib import Path
from typing import List, Dict, Any

from sqlalchemy.orm import Session
from pypdf import PdfReader

from db_models import Resume

BACKEND_DIR = Path(__file__).resolve().parent
DATA_DIR = BACKEND_DIR / "data"
CACHE_DIR = DATA_DIR / "resume_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _extract_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    parts: List[str] = []
    for page in reader.pages:
        txt = page.extract_text() or ""
        if txt.strip():
            parts.append(txt)
    return "\n".join(parts)


def _chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> List[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i : i + chunk_size])
        i += max(1, chunk_size - overlap)
    return chunks


def _cache_path(resume_id: int) -> Path:
    return CACHE_DIR / f"resume_{resume_id}.json"


def _load_or_build_chunks(db: Session, resume_id: int) -> List[Dict[str, Any]]:
    cp = _cache_path(resume_id)
    if cp.exists():
        return json.loads(cp.read_text(encoding="utf-8"))

    r = db.query(Resume).filter(Resume.id == resume_id).first()
    if not r:
        return []

    p = Path(r.stored_path)
    if not p.exists():
        return []

    text = ""
    if p.suffix.lower() == ".pdf":
        text = _extract_pdf_text(p)
    else:
        # fallback for .txt/.md etc
        text = p.read_text(encoding="utf-8", errors="ignore")

    raw_chunks = _chunk_text(text)
    chunks = [{"chunk_id": f"{resume_id}:{i}", "text": c} for i, c in enumerate(raw_chunks)]

    cp.write_text(json.dumps(chunks, ensure_ascii=False), encoding="utf-8")
    return chunks


def search_resume(db: Session, resume_id: int, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    chunks = _load_or_build_chunks(db, resume_id)
    if not chunks:
        return []

    q = (query or "").lower()
    # simple token scoring (works well enough for “GPA”, “citizenship”, etc.)
    tokens = [t for t in re.split(r"[^a-z0-9.]+", q) if t]
    if not tokens:
        return []

    scored = []
    for ch in chunks:
        txt = (ch["text"] or "").lower()
        score = 0.0
        for t in tokens:
            if t and t in txt:
                score += 1.0
        if score > 0:
            scored.append({"chunk_id": ch["chunk_id"], "text": ch["text"], "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


def extract_gpa(db: Session, resume_id: int) -> str | None:
    chunks = _load_or_build_chunks(db, resume_id)
    if not chunks:
        return None

    text = " ".join([c["text"] for c in chunks])
    # common GPA patterns
    m = re.search(r"\bGPA\b[^0-9]{0,20}([0-4]\.\d{1,2})", text, flags=re.IGNORECASE)
    if m:
        return m.group(1)

    m = re.search(r"([0-4]\.\d{1,2})\s*/\s*4\.0", text)
    if m:
        return m.group(1)

    return None