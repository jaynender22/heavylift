# backend/profile_facts.py
from __future__ import annotations

from typing import Any, Dict, List


def _humanize(key: str) -> str:
    # profile.firstName -> First Name
    base = key.split(".")[-1]
    out = []
    buf = ""
    for ch in base:
        if ch.isupper() and buf:
            out.append(buf)
            buf = ch
        else:
            buf += ch
    if buf:
        out.append(buf)
    return " ".join([w.capitalize() for w in out])


def build_facts(profile: Dict[str, Any], preferences: Dict[str, Any]) -> List[dict]:
    facts: List[dict] = []

    def add(prefix: str, k: str, v: Any):
        if v is None:
            return
        if isinstance(v, str) and not v.strip():
            return
        full_key = f"{prefix}.{k}"
        facts.append(
            {
                "key": full_key,
                "label": _humanize(full_key),
                "value": str(v).strip(),
            }
        )

    for k, v in (profile or {}).items():
        add("profile", k, v)

    for k, v in (preferences or {}).items():
        add("preferences", k, v)

    return facts
