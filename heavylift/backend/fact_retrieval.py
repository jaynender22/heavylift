# backend/fact_retrieval.py
from __future__ import annotations

from typing import List
import numpy as np

from embeddings import embed_texts


def retrieve_top_facts(query: str, facts: List[dict], top_k: int = 10) -> List[dict]:
    if not facts:
        return []

    fact_texts = [f"{f['label']}: {f['value']}" for f in facts]
    vecs = embed_texts([query] + fact_texts).astype(np.float32)

    q = vecs[0]
    fv = vecs[1:]

    # cosine because embeddings are normalized
    scores = fv @ q
    idxs = np.argsort(-scores)[:top_k]

    out = []
    for i in idxs:
        f = facts[int(i)]
        out.append({**f, "score": float(scores[int(i)])})
    return out
