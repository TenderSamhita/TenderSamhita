"""
retrieval/reranker.py — Candidate standard reranking

Per spec 34: reranking evaluates candidate standard (not just chunk) against:
- product/title relevance
- scope relevance
- material/application
- status/version
Uses aggregated chunk evidence per standard.

Conceptual weights (configurable starting point):
 50% semantic, 20% product/title, 15% scope, 10% material, 5% status

Logs every scoring component for audit.
"""
from __future__ import annotations

import logging
import re
from collections import defaultdict
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


def _title_match(query: str, standard_meta: Dict) -> float:
    q = set(re.findall(r"[a-z0-9]+", query.lower()))
    title = (standard_meta.get("title") or "") + " " + (standard_meta.get("normalized_identifier") or "")
    t = set(re.findall(r"[a-z0-9]+", title.lower()))
    if not q:
        return 0.0
    inter = len(q & t)
    return inter / len(q)


def _scope_signal(chunks: List[Dict]) -> float:
    # If any chunk's section is Scope and hybrid_score high
    for c in chunks:
        meta = c.get("meta", {})
        sec = (meta.get("section") or "").lower()
        if "scope" in sec:
            return min(1.0, c.get("hybrid_score", 0) + 0.15)
    return 0.0


def _material_signal(query: str, chunks: List[Dict]) -> float:
    qm = re.findall(r"\b(steel|stainless|aluminium|aluminum|brass|copper|pvc|hdpe|rubber|concrete|cement|bitumen|petroleum|gas|turbine|fuel)\b", query, re.I)
    if not qm:
        return 0.0
    qm = set(w.lower() for w in qm)
    hit = 0
    for c in chunks:
        txt = (c.get("text") or "") + " " + str(c.get("meta", {}).get("section",""))
        txt_low = txt.lower()
        for w in qm:
            if w in txt_low:
                hit += 1
                break
    return min(1.0, hit / max(len(chunks), 1) + 0.2)


def rerank_standards(
    hybrid_ranked_chunks: List[Dict],
    standard_meta_map: Dict[str, Dict],  # standard_id -> meta (title, year etc)
    query: str,
    weights: Dict[str, float] | None = None,
) -> List[Dict]:
    """
    Groups chunks by standard_id, computes standard-level scores.
    Returns ranked standards with evidence.
    """
    weights = weights or {"semantic": 0.5, "title": 0.2, "scope": 0.15, "material": 0.1, "status": 0.05}

    # Group
    grouped: Dict[str, List[Dict]] = defaultdict(list)
    for ch in hybrid_ranked_chunks:
        sid = ch.get("meta", {}).get("standard_id") or ch.get("meta", {}).get("standard_id")
        if not sid:
            # fallback: try to parse from chunk_id prefix
            cid = ch["chunk_id"]
            sid = cid.split("_P")[0] if "_P" in cid else "unknown"
        grouped[sid].append(ch)

    ranked = []
    for sid, chunks in grouped.items():
        # Aggregate semantic: max hybrid_score (best chunk) + avg top3
        sorted_chunks = sorted(chunks, key=lambda x: x.get("hybrid_score", 0), reverse=True)
        best = sorted_chunks[0].get("hybrid_score", 0) if sorted_chunks else 0
        top3_avg = sum(c.get("hybrid_score", 0) for c in sorted_chunks[:3]) / min(3, len(sorted_chunks))
        semantic_agg = 0.6 * best + 0.4 * top3_avg

        meta = standard_meta_map.get(sid, {})
        title_score = _title_match(query, meta)
        scope_score = _scope_signal(sorted_chunks)
        material_score = _material_signal(query, sorted_chunks)
        # Status: prefer recent year (normalize 2000-2026 -> 0-1)
        year = meta.get("year") or meta.get("edition_year") or 2000
        try:
            year = int(year)
        except Exception:
            year = 2000
        status_score = max(0.0, min(1.0, (year - 2000) / 26.0))
        # Combined
        final = (
            weights.get("semantic", 0.5) * semantic_agg
            + weights.get("title", 0.2) * title_score
            + weights.get("scope", 0.15) * scope_score
            + weights.get("material", 0.1) * material_score
            + weights.get("status", 0.05) * status_score
        )
        ranked.append({
            "standard_id": sid,
            "meta": meta,
            "score": round(float(final), 4),
            "components": {
                "semantic": round(float(semantic_agg), 4),
                "title": round(float(title_score), 4),
                "scope": round(float(scope_score), 4),
                "material": round(float(material_score), 4),
                "status": round(float(status_score), 4),
            },
            "evidence_chunks": sorted_chunks[:3],  # top 3 evidence
            "chunk_count": len(chunks),
            "best_chunk_score": round(float(best), 4),
        })

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked
