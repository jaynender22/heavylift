# backend/embeddings.py

from typing import List, Dict, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
from schema import CANONICAL_FIELDS

# Load a small, fast sentence transformer
_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Precompute embeddings for canonical fields
_can_texts = [
    f"{field['key']}: {field['description']}" for field in CANONICAL_FIELDS
]
_can_embeddings = _model.encode(_can_texts, normalize_embeddings=True)
_can_keys = [field["key"] for field in CANONICAL_FIELDS]


def embed_texts(texts: List[str]) -> np.ndarray:
    return _model.encode(texts, normalize_embeddings=True)


def classify_field_texts(
    field_texts: List[str], min_confidence: float = 0.35
) -> List[Tuple[str, float]]:
    """
    For each field text, return (canonical_key, similarity).
    If max similarity is below min_confidence, return ('UNKNOWN', score).
    """
    if not field_texts:
        return []

    field_embs = embed_texts(field_texts)  # shape: (n_fields, dim)
    sims = np.matmul(field_embs, _can_embeddings.T)  # cosine sims

    results: List[Tuple[str, float]] = []
    for i in range(len(field_texts)):
        row = sims[i]
        best_idx = int(np.argmax(row))
        best_score = float(row[best_idx])
        key = _can_keys[best_idx]
        if best_score < min_confidence:
            key = "UNKNOWN"
        results.append((key, best_score))
    return results
