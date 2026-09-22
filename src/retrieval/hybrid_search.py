"""
retrieval/hybrid_search.py — SEMANTIC + BM25 + Metadata hybrid

Conceptual score per spec 28:
  final = semantic_w * semantic_norm + bm25_w * bm25_norm + metadata_bonus

Metadata filtering: e.g., ICS, year, IS number exact match bonus

Returns union candidates, then expects reranker to refine.
"""
from __future__ import annotations

import logging
import re
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


def _normalize_scores(scores: List[float]) -> List[float]:
    if not scores:
        return []
    mn, mx = min(scores), max(scores)
    if mx - mn < 1e-6:
        return [0.5] * len(scores)
    return [(s - mn) / (mx - mn) for s in scores]


def hybrid_search(
    query: str,
    semantic_results: List[Dict],
    bm25_results: List[Dict],
    semantic_weight: float = 0.5,
    bm25_weight: float = 0.3,
    metadata_weight: float = 0.2,
    extract_is_numbers: Optional[List[str]] = None,
) -> List[Dict]:
    """
    Merge semantic + BM25.
    Returns ranked list of dicts with hybrid_score and sources.
    """
    # Normalize within each modality
    sem_scores = [r.get("semantic_score", 0) for r in semantic_results]
    bm_scores = [r.get("bm25_score", 0) for r in bm25_results]
    sem_norm = _normalize_scores(sem_scores)
    bm_norm = _normalize_scores(bm_scores)

    # Build map chunk_id -> entry
    merged: Dict[str, Dict] = {}

    for r, ns in zip(semantic_results, sem_norm):
        cid = r["chunk_id"]
        merged[cid] = {
            "chunk_id": cid,
            "text": r.get("text"),
            "meta": r.get("meta"),
            "semantic_score": r.get("semantic_score", 0),
            "semantic_norm": ns,
            "bm25_score": 0,
            "bm25_norm": 0,
            "sources": ["semantic"],
        }

    for r, nb in zip(bm25_results, bm_norm):
        cid = r["chunk_id"]
        if cid in merged:
            merged[cid]["bm25_score"] = r.get("bm25_score", 0)
            merged[cid]["bm25_norm"] = nb
            merged[cid]["sources"].append("bm25")
        else:
            merged[cid] = {
                "chunk_id": cid,
                "text": r.get("text"),
                "meta": r.get("meta"),
                "semantic_score": 0,
                "semantic_norm": 0,
                "bm25_score": r.get("bm25_score", 0),
                "bm25_norm": nb,
                "sources": ["bm25"],
            }

    # Compute hybrid score
    for cid, entry in merged.items():
        # metadata bonus: exact IS number match in text
        bonus = 0.0
        if extract_is_numbers:
            txt = (entry.get("text") or "") + " " + str(entry.get("meta", {}).get("standard_id",""))
            for is_num in extract_is_numbers:
                if is_num.lower() in txt.lower():
                    bonus += 0.15
        entry["metadata_bonus"] = min(bonus, 0.3)
        # If only one modality present, penalize slightly but keep
        has_both = len(entry["sources"]) == 2
        base = semantic_weight * entry["semantic_norm"] + bm25_weight * entry["bm25_norm"] + metadata_weight * entry["metadata_bonus"]
        if not has_both:
            base *= 0.85  # slight penalty for single-source evidence
        entry["hybrid_score"] = round(float(base), 4)
        entry["base_score"] = base

    ranked = sorted(merged.values(), key=lambda x: x["hybrid_score"], reverse=True)
    return ranked


def extract_is_from_query(query: str) -> List[str]:
    """Extract IS numbers for metadata bonus."""
    pat = re.compile(r"IS\s*\d+(?:\s*\(?\s*Part\s*\d+[^\)]*\)?)?\s*:?\s*\d{4}?", re.I)
    return [m.group(0).strip() for m in pat.finditer(query)]
