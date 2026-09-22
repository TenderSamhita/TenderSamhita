"""
retrieval/filters.py — Metadata filtering (ICS, year, status)
"""
from __future__ import annotations

from typing import Dict, List


def filter_by_ics(chunks: List[Dict], allowed_ics_prefix: str | None) -> List[Dict]:
    if not allowed_ics_prefix:
        return chunks
    filtered = []
    for c in chunks:
        meta = c.get("meta", {}) if isinstance(c.get("meta"), dict) else {}
        ics = meta.get("ics_code") or ""
        if ics.startswith(allowed_ics_prefix):
            filtered.append(c)
    return filtered
