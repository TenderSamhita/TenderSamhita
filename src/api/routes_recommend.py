"""
routes_recommend.py — POST /api/recommend

Input: { query, top_k }
Output: { requirements, recommendations, abstention, version_warnings }

Hard validation per spec 43: never output IS number not in DB.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..recommendation.abstention import decide_abstention
from ..recommendation.evidence import assemble_evidence
from ..recommendation.query_understanding import understand_query
from ..recommendation.ranking import recommend_for_query
from ..recommendation.version_checker import check_versions
from ..storage.database import get_session_factory
from ..storage.models import Standard

logger = logging.getLogger(__name__)
router = APIRouter()


class RecommendRequest(BaseModel):
    query: str
    top_k: int = 5


def _load_config():
    cfg_path = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}

def _resolve(p: str | Path) -> Path:
    p = Path(p)
    if p.is_absolute():
        return p
    return (Path(__file__).resolve().parents[2] / p).resolve()


@router.post("/recommend")
def recommend(req: RecommendRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="query required")
    cfg = _load_config()
    retrieval_cfg = cfg.get("retrieval", {})
    recommendation_cfg = cfg.get("recommendation", {})

    # 1. Understand query → requirements
    q_under = understand_query(req.query)
    requirements = q_under["requirements"]
    query_text = q_under["query_text"]

    # 2. Load retrieval
    from .main import get_retrieval
    ret = get_retrieval()
    if ret.bm25 is None or ret.sem_index is None:
        raise HTTPException(status_code=503, detail="Indexes not built. Run rebuild_index.py after ingestion.")
    if ret.meta_map is None or len(ret.meta_map) == 0:
        raise HTTPException(status_code=503, detail="Standards DB empty. Run ingest.py first.")

    # 3. Recommend
    result = recommend_for_query(
        query_text=query_text,
        bm25=ret.bm25,
        sem_index=ret.sem_index,
        embedder=ret.embedder,
        standard_meta_map=ret.meta_map,
        top_k_sem=retrieval_cfg.get("top_k_semantic", 20),
        top_k_bm25=retrieval_cfg.get("top_k_bm25", 20),
        weights=retrieval_cfg.get("rerank_weights"),
        semantic_weight=retrieval_cfg.get("semantic_weight", 0.5),
        bm25_weight=retrieval_cfg.get("bm25_weight", 0.3),
        metadata_weight=retrieval_cfg.get("metadata_weight", 0.2),
    )
    ranked = result["ranked_standards"]
    # Hard validation: filter to only standards existing in DB (already via meta_map)
    # Further verify ranked standard_id is in meta_map (prevents hallucination)
    validated = [r for r in ranked if r["standard_id"] in ret.meta_map]

    # Abstention decision
    abstention = decide_abstention(validated, config=recommendation_cfg)
    if abstention["decision"] == "ABSTAIN":
        return {
            "query": req.query,
            "requirements": requirements,
            "query_text": query_text,
            "recommendations": [],
            "abstention": abstention,
            "version_warnings": [],
            "evidence_note": "No recommendation — insufficient evidence from available corpus.",
        }

    # 4. Assemble evidence for top_k
    db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
    factory = get_session_factory(db_path)
    session = factory()
    recommendations = []
    try:
        for r in validated[:req.top_k]:
            sid = r["standard_id"]
            # evidence chunks are already in r["evidence_chunks"] (hybrid). Use those for provenance
            evidence_payload = assemble_evidence(session, sid, r.get("evidence_chunks", []))
            # Attach ranking signals
            recommendations.append({
                "standard_id": sid,
                "is_number": evidence_payload.get("is_number"),
                "title": evidence_payload.get("title"),
                "year": evidence_payload.get("year"),
                "iso_reference": evidence_payload.get("iso_reference"),
                "relevance": "HIGH" if r["score"] >= recommendation_cfg.get("high_threshold", 0.65) else ("MEDIUM" if r["score"] >= recommendation_cfg.get("medium_threshold", 0.40) else "LOW"),
                "score": r["score"],
                "components": r.get("components"),
                "why": [
                    f"Semantic relevance: {r['components']['semantic']:.2f}",
                    f"Title match: {r['components']['title']:.2f}",
                    f"Scope coverage: {r['components']['scope']:.2f}",
                ],
                "evidence": evidence_payload.get("evidence", []),
                "specifications": evidence_payload.get("specifications", [])[:6],
                "tables": evidence_payload.get("tables", [])[:2],
                "figures": evidence_payload.get("figures", [])[:2],
                "references": evidence_payload.get("references", [])[:5],
            })
    finally:
        session.close()

    # 5. Version warnings
    tender_is_refs = requirements.get("is_references", [])
    # Build corpus standards list for checker
    corpus_list = list(ret.meta_map.values())
    version_warnings = check_versions(tender_is_refs, corpus_list)

    return {
        "query": req.query,
        "requirements": requirements,
        "query_text": query_text,
        "recommendations": recommendations,
        "abstention": abstention,
        "version_warnings": version_warnings,
    }
