# backend/resume_index.py
from __future__ import annotations

from pathlib import Path
from typing import List, Tuple

import faiss
import numpy as np
from sqlalchemy.orm import Session

from db import DATA_DIR
from db_models import ResumeChunk
from embeddings import embed_texts
from resume_ingest import extract_pdf_text, chunk_text


def _index_path(resume_id: int) -> Path:
    return DATA_DIR / f"resume_{resume_id}.faiss"


def _normalize(v: np.ndarray) -> np.ndarray:
    # embeddings.py already normalizes, but keep this safe
    norms = np.linalg.norm(v, axis=1, keepdims=True) + 1e-12
    return v / norms


def build_index_for_resume(db: Session, resume_id: int, pdf_path: str) -> None:
    """
    Extract -> chunk -> store chunks in DB -> build FAISS index file.
    Safe to call multiple times (rebuilds by deleting old rows/index).
    """
    text = extract_pdf_text(pdf_path)
    chunks = chunk_text(text)

    # Remove old chunks (if re-indexing)
    db.query(ResumeChunk).filter(ResumeChunk.resume_id == resume_id).delete()
    db.commit()

    # Insert chunks
    for idx, ch in enumerate(chunks):
        db.add(ResumeChunk(resume_id=resume_id, chunk_index=idx, text=ch))
    db.commit()

    if not chunks:
        # create empty index? just skip
        idx_path = _index_path(resume_id)
        if idx_path.exists():
            idx_path.unlink()
        return

    # Embed chunks (normalized cosine)
    vecs = embed_texts(chunks)  # embeddings.py uses normalize_embeddings=True
    vecs = vecs.astype(np.float32)
    vecs = _normalize(vecs)

    dim = vecs.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vecs)  # ids correspond to chunk_index order
    faiss.write_index(index, str(_index_path(resume_id)))


def search_resume(db: Session, resume_id: int, query: str, top_k: int = 8) -> List[dict]:
    """
    Returns [{chunk_id, chunk_index, text, score}]
    """
    idx_path = _index_path(resume_id)
    if not idx_path.exists():
        return []

    index = faiss.read_index(str(idx_path))

    qvec = embed_texts([query]).astype(np.float32)  # already normalized
    qvec = _normalize(qvec)

    scores, ids = index.search(qvec, top_k)
    ids = ids[0].tolist()
    scores = scores[0].tolist()

    # Fetch chunks by chunk_index
    rows = (
        db.query(ResumeChunk)
        .filter(ResumeChunk.resume_id == resume_id)
        .filter(ResumeChunk.chunk_index.in_(ids))
        .all()
    )
    by_idx = {r.chunk_index: r for r in rows}

    out: List[dict] = []
    for score, idx in zip(scores, ids):
        r = by_idx.get(idx)
        if not r:
            continue
        out.append(
            {
                "chunk_id": r.id,
                "chunk_index": r.chunk_index,
                "text": r.text,
                "score": float(score),
            }
        )
    return out
