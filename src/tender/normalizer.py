"""
tender/normalizer.py — Lightweight tender requirement normalization
"""
from __future__ import annotations

import re


def normalize_query(requirements: dict) -> str:
    """Build search query from structured requirements."""
    parts = []
    for k in ["product","material","application","capacity"]:
        v = requirements.get(k)
        if v:
            parts.append(v)
    # also add keywords
    kws = requirements.get("keywords", [])[:8]
    parts.extend(kws)
    # add testing cues
    testing = requirements.get("testing", [])
    parts.extend(testing[:3])
    q = " ".join(parts)
    # collapse
    q = re.sub(r"\s+", " ", q).strip()
    return q[:600] if q else "procurement requirement"
