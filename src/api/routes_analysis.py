"""
api/routes_analysis.py — Full procurement analysis pipeline.

POST /api/tender/full-analysis    — Complete pipeline
POST /api/tender/gaps             — Gap detection
POST /api/tender/conflicts        — Conflict detection
POST /api/tender/quality          — Quality review
POST /api/specification/build     — Build specification
POST /api/traceability/matrix     — Generate traceability
"""
from __future__ import annotations

import logging
import uuid
import traceback
from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..storage.database import get_session_factory
from ..storage.models import (
    Workspace, WorkspaceRequirement, Traceability, SpecificationItem,
)
from ..recommendation.query_understanding import understand_query
from ..tender.comparison import compare

logger = logging.getLogger(__name__)

router = APIRouter()


def _cfg():
    p = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}


def _resolve(p: str | Path) -> Path:
    p = Path(p)
    if p.is_absolute():
        return p
    return (Path(__file__).resolve().parents[2] / p).resolve()


def _get_session():
    cfg = _cfg()
    db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
    return get_session_factory(db_path)()


class FullAnalysisRequest(BaseModel):
    text: Optional[str] = None
    workspace_id: Optional[str] = None


class GapRequest(BaseModel):
    text: str


class ConflictRequest(BaseModel):
    text: str
    standard_id: str


class QualityRequest(BaseModel):
    text: str


class SpecificationBuildRequest(BaseModel):
    text: str
    workspace_id: Optional[str] = None


class TraceabilityRequest(BaseModel):
    text: str
    workspace_id: Optional[str] = None


@router.post("/tender/full-analysis")
def full_analysis(req: FullAnalysisRequest):
    """
    Run the complete procurement analysis pipeline.

    Returns structured result with status field:
    - "success": full analysis completed
    - "partial": some stages failed, partial results returned
    - "error": critical failure
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text required")

    cfg = _cfg()
    retrieval_cfg = cfg.get("retrieval", {})
    errors = []
    result = {
        "status": "success",
        "workspace_id": req.workspace_id or f"WS_{uuid.uuid4().hex[:12]}",
        "query_text": "",
        "requirements": {},
        "recommendations": [],
        "gaps": [],
        "conflicts": [],
        "quality": {"score": 0, "issues": []},
        "traceability": [],
        "specification": [],
        "version_warnings": [],
    }

    # Stage 1: Understand tender
    try:
        understand_result = understand_query(req.text)
        requirements = understand_result["requirements"]
        query_text = understand_result["query_text"]
        result["query_text"] = query_text
        result["requirements"] = requirements
    except Exception as e:
        logger.error("Stage 1 (understand) failed: %s", e)
        errors.append({"stage": "understand", "error": str(e)})
        result["status"] = "error"
        return result

    # Stage 2: Load retrieval and rank standards
    ranked = []
    try:
        from .main import get_retrieval
        ret = get_retrieval()
        if ret.bm25 is None or ret.sem_index is None:
            errors.append({"stage": "retrieval", "error": "Indexes not built. Run ingest.py first."})
            result["status"] = "partial"
        else:
            from ..recommendation.ranking import recommend_for_query
            rank_result = recommend_for_query(
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
            ranked = [r for r in rank_result["ranked_standards"] if r["standard_id"] in ret.meta_map]
    except Exception as e:
        logger.error("Stage 2 (ranking) failed: %s", e)
        errors.append({"stage": "ranking", "error": str(e)})
        result["status"] = "partial"

    # Stage 3: Assemble evidence
    recommendations = []
    try:
        if ranked:
            from .main import get_retrieval
            ret = get_retrieval()
            db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
            factory = get_session_factory(db_path)
            session = factory()
            try:
                from ..recommendation.evidence import assemble_evidence
                for r in ranked[:5]:
                    sid = r["standard_id"]
                    ev = assemble_evidence(session, sid, r.get("evidence_chunks", []))
                    recommendations.append({
                        "standard_id": sid,
                        "is_number": ev.get("is_number"),
                        "title": ev.get("title"),
                        "year": ev.get("year"),
                        "score": r["score"],
                        "components": r.get("components"),
                        "evidence": ev.get("evidence", []),
                        "specifications": ev.get("specifications", []),
                        "tables": ev.get("tables", []),
                        "figures": ev.get("figures", []),
                        "references": ev.get("references", []),
                    })
            finally:
                session.close()
        result["recommendations"] = recommendations
    except Exception as e:
        logger.error("Stage 3 (evidence) failed: %s", e)
        errors.append({"stage": "evidence", "error": str(e)})
        result["status"] = "partial"

    # Stage 4: Gap detection
    try:
        from ..intelligence.gap_detector import detect_gaps
        result["gaps"] = detect_gaps(requirements, {"recommendations": recommendations})
    except Exception as e:
        logger.error("Stage 4 (gaps) failed: %s", e)
        errors.append({"stage": "gaps", "error": str(e)})

    # Stage 5: Conflict detection
    try:
        from ..intelligence.conflict_detector import detect_conflicts
        result["conflicts"] = detect_conflicts(requirements, recommendations)
    except Exception as e:
        logger.error("Stage 5 (conflicts) failed: %s", e)
        errors.append({"stage": "conflicts", "error": str(e)})

    # Stage 6: Quality review
    try:
        from ..intelligence.quality_review import review_tender_quality
        result["quality"] = review_tender_quality(req.text, requirements)
    except Exception as e:
        logger.error("Stage 6 (quality) failed: %s", e)
        errors.append({"stage": "quality", "error": str(e)})

    # Stage 7: Traceability
    try:
        from ..intelligence.traceability import generate_traceability
        result["traceability"] = generate_traceability(
            result["workspace_id"], requirements, recommendations
        )
    except Exception as e:
        logger.error("Stage 7 (traceability) failed: %s", e)
        errors.append({"stage": "traceability", "error": str(e)})

    # Stage 8: Specification
    try:
        from ..intelligence.specification_builder import build_specification
        result["specification"] = build_specification(
            result["workspace_id"], requirements, recommendations
        )
    except Exception as e:
        logger.error("Stage 8 (specification) failed: %s", e)
        errors.append({"stage": "specification", "error": str(e)})

    # Stage 9: Save workspace
    try:
        db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
        factory = get_session_factory(db_path)
        session2 = factory()
        try:
            ws = session2.get(Workspace, result["workspace_id"])
            if not ws:
                ws = Workspace(
                    workspace_id=result["workspace_id"],
                    name=f"Procurement: {requirements.get('product', 'Unknown')}",
                    tender_text=req.text,
                    status="active",
                )
                session2.add(ws)
            else:
                ws.tender_text = req.text

            session2.query(WorkspaceRequirement).filter_by(workspace_id=result["workspace_id"]).delete()
            for cat in ["product", "material", "application", "capacity", "testing", "safety"]:
                val = requirements.get(cat)
                if val:
                    if isinstance(val, list):
                        for v in val[:5]:
                            session2.add(WorkspaceRequirement(
                                req_id=str(uuid.uuid4()),
                                workspace_id=result["workspace_id"],
                                category=cat,
                                parameter=cat,
                                value=str(v) if not isinstance(v, dict) else v.get("value", ""),
                                is_specified=1,
                            ))
                    else:
                        session2.add(WorkspaceRequirement(
                            req_id=str(uuid.uuid4()),
                            workspace_id=result["workspace_id"],
                            category=cat,
                            parameter=cat,
                            value=str(val),
                            is_specified=1,
                        ))

            session2.query(Traceability).filter_by(workspace_id=result["workspace_id"]).delete()
            for t in result["traceability"]:
                session2.add(Traceability(
                    trace_id=t["trace_id"],
                    workspace_id=result["workspace_id"],
                    requirement_id=t.get("requirement_id"),
                    tender_parameter=t["tender_parameter"],
                    tender_value=t.get("tender_value"),
                    matched_standard_id=t.get("matched_standard_id"),
                    matched_clause=t.get("matched_clause"),
                    evidence_page=t.get("evidence_page"),
                    evidence_text=t.get("evidence_text"),
                    status=t["status"],
                ))

            session2.query(SpecificationItem).filter_by(workspace_id=result["workspace_id"]).delete()
            for s in result["specification"]:
                session2.add(SpecificationItem(
                    item_id=s["item_id"],
                    workspace_id=result["workspace_id"],
                    parameter=s["parameter"],
                    requirement=s["requirement"],
                    unit=s.get("unit"),
                    condition=s.get("condition"),
                    applicable_standard_id=s.get("applicable_standard_id"),
                    clause=s.get("clause"),
                    evidence_page=s.get("evidence_page"),
                    evidence_text=s.get("evidence_text"),
                    status=s["status"],
                    sort_order=s.get("sort_order", 0),
                ))

            session2.commit()
        finally:
            session2.close()
    except Exception as e:
        logger.error("Stage 9 (save workspace) failed: %s", e)
        errors.append({"stage": "save_workspace", "error": str(e)})

    # Stage 10: Version warnings
    try:
        from ..recommendation.version_checker import check_versions
        from .main import get_retrieval
        ret = get_retrieval()
        tender_is_refs = requirements.get("is_references", [])
        corpus_list = list(ret.meta_map.values()) if ret.meta_map else []
        result["version_warnings"] = check_versions(tender_is_refs, corpus_list)
    except Exception as e:
        logger.error("Stage 10 (version check) failed: %s", e)
        errors.append({"stage": "version_check", "error": str(e)})

    if errors:
        result["errors"] = errors
        if result["status"] == "success":
            result["status"] = "partial"

    return result


@router.post("/tender/gaps")
def detect_gaps_endpoint(req: GapRequest):
    try:
        result = understand_query(req.text)
        requirements = result["requirements"]

        from .main import get_retrieval
        ret = get_retrieval()
        recommendations = []
        if ret.loaded and ret.meta_map:
            from ..recommendation.ranking import recommend_for_query
            cfg = _cfg()
            retrieval_cfg = cfg.get("retrieval", {})
            rank_result = recommend_for_query(
                query_text=result["query_text"],
                bm25=ret.bm25,
                sem_index=ret.sem_index,
                embedder=ret.embedder,
                standard_meta_map=ret.meta_map,
                top_k_sem=retrieval_cfg.get("top_k_semantic", 20),
                top_k_bm25=retrieval_cfg.get("top_k_bm25", 20),
                weights=retrieval_cfg.get("rerank_weights"),
            )
            for r in rank_result["ranked_standards"][:3]:
                recommendations.append({"standard_id": r["standard_id"], "specifications": []})

        from ..intelligence.gap_detector import detect_gaps
        return {"status": "success", "gaps": detect_gaps(requirements, {"recommendations": recommendations})}
    except Exception as e:
        logger.error("Gap detection failed: %s", e)
        return {"status": "error", "error": str(e), "gaps": []}


@router.post("/tender/conflicts")
def detect_conflicts_endpoint(req: ConflictRequest):
    try:
        result = understand_query(req.text)
        requirements = result["requirements"]

        from .main import get_retrieval
        ret = get_retrieval()
        recommendations = []
        if ret.loaded and ret.meta_map:
            db_path = _resolve(_cfg().get("paths", {}).get("db_path", "data/bis.db"))
            factory = get_session_factory(db_path)
            session = factory()
            try:
                from ..storage.models import Specification
                specs = session.query(Specification).filter_by(standard_id=req.standard_id).all()
                rec = {
                    "standard_id": req.standard_id,
                    "specifications": [
                        {"property": s.property, "value": s.value, "unit": s.unit, "page": s.page, "section": s.section}
                        for s in specs
                    ],
                }
                recommendations = [rec]
            finally:
                session.close()

        from ..intelligence.conflict_detector import detect_conflicts
        return {"status": "success", "conflicts": detect_conflicts(requirements, recommendations)}
    except Exception as e:
        logger.error("Conflict detection failed: %s", e)
        return {"status": "error", "error": str(e), "conflicts": []}


@router.post("/tender/quality")
def quality_review_endpoint(req: QualityRequest):
    try:
        result = understand_query(req.text)
        requirements = result["requirements"]

        from ..intelligence.quality_review import review_tender_quality
        quality = review_tender_quality(req.text, requirements)
        return {"status": "success", **quality}
    except Exception as e:
        logger.error("Quality review failed: %s", e)
        return {"status": "error", "error": str(e), "score": 0, "issues": []}


@router.post("/specification/build")
def build_specification_endpoint(req: SpecificationBuildRequest):
    try:
        result = understand_query(req.text)
        requirements = result["requirements"]

        from .main import get_retrieval
        ret = get_retrieval()
        recommendations = []
        if ret.loaded and ret.meta_map:
            from ..recommendation.ranking import recommend_for_query
            cfg = _cfg()
            retrieval_cfg = cfg.get("retrieval", {})
            rank_result = recommend_for_query(
                query_text=result["query_text"],
                bm25=ret.bm25,
                sem_index=ret.sem_index,
                embedder=ret.embedder,
                standard_meta_map=ret.meta_map,
                top_k_sem=retrieval_cfg.get("top_k_semantic", 20),
                top_k_bm25=retrieval_cfg.get("top_k_bm25", 20),
                weights=retrieval_cfg.get("rerank_weights"),
            )
            db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
            factory = get_session_factory(db_path)
            session = factory()
            try:
                from ..recommendation.evidence import assemble_evidence
                for r in rank_result["ranked_standards"][:5]:
                    sid = r["standard_id"]
                    ev = assemble_evidence(session, sid, r.get("evidence_chunks", []))
                    recommendations.append({
                        "standard_id": sid,
                        "is_number": ev.get("is_number"),
                        "specifications": ev.get("specifications", []),
                    })
            finally:
                session.close()

        workspace_id = req.workspace_id or f"WS_{uuid.uuid4().hex[:12]}"
        from ..intelligence.specification_builder import build_specification
        spec = build_specification(workspace_id, requirements, recommendations)
        return {"status": "success", "workspace_id": workspace_id, "specification": spec}
    except Exception as e:
        logger.error("Specification build failed: %s", e)
        return {"status": "error", "error": str(e), "specification": []}


@router.post("/traceability/matrix")
def traceability_matrix_endpoint(req: TraceabilityRequest):
    try:
        result = understand_query(req.text)
        requirements = result["requirements"]

        from .main import get_retrieval
        ret = get_retrieval()
        recommendations = []
        if ret.loaded and ret.meta_map:
            from ..recommendation.ranking import recommend_for_query
            cfg = _cfg()
            retrieval_cfg = cfg.get("retrieval", {})
            rank_result = recommend_for_query(
                query_text=result["query_text"],
                bm25=ret.bm25,
                sem_index=ret.sem_index,
                embedder=ret.embedder,
                standard_meta_map=ret.meta_map,
                top_k_sem=retrieval_cfg.get("top_k_semantic", 20),
                top_k_bm25=retrieval_cfg.get("top_k_bm25", 20),
                weights=retrieval_cfg.get("rerank_weights"),
            )
            db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
            factory = get_session_factory(db_path)
            session = factory()
            try:
                from ..recommendation.evidence import assemble_evidence
                for r in rank_result["ranked_standards"][:5]:
                    sid = r["standard_id"]
                    ev = assemble_evidence(session, sid, r.get("evidence_chunks", []))
                    recommendations.append({
                        "standard_id": sid,
                        "is_number": ev.get("is_number"),
                        "specifications": ev.get("specifications", []),
                        "evidence": ev.get("evidence", []),
                    })
            finally:
                session.close()

        workspace_id = req.workspace_id or f"WS_{uuid.uuid4().hex[:12]}"
        from ..intelligence.traceability import generate_traceability
        traceability = generate_traceability(workspace_id, requirements, recommendations)
        return {"status": "success", "workspace_id": workspace_id, "traceability": traceability}
    except Exception as e:
        logger.error("Traceability failed: %s", e)
        return {"status": "error", "error": str(e), "traceability": []}
