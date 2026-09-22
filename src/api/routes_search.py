"""
routes_search.py — POST /api/search  (semantic | lexical | hybrid)
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Literal

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..retrieval.bm25_search import BM25Index
from ..retrieval.embeddings import EmbeddingModel
from ..retrieval.hybrid_search import hybrid_search, extract_is_from_query
from ..retrieval.semantic_search import SemanticIndex

logger = logging.getLogger(__name__)
router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    mode: Literal["semantic", "lexical", "hybrid"] = "hybrid"
    top_k: int = 10


class SearchResponse(BaseModel):
    query: str
    mode: str
    results: list


def _load_config():
    cfg_path = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    if cfg_path.exists():
        import yaml
        with open(cfg_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}

def _resolve(p: str | Path) -> Path:
    p = Path(p)
    if p.is_absolute():
        return p
    return (Path(__file__).resolve().parents[2] / p).resolve()


@router.post("/search")
def search(req: SearchRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query required")
    cfg = _load_config()
    indexes_dir = _resolve(cfg.get("paths", {}).get("indexes_dir", "data/indexes"))
    bm25_path = indexes_dir / "bm25.pkl"
    faiss_path = indexes_dir / "faiss.index"
    mapping_path = indexes_dir / "faiss_mapping.json"

    # Lazy load per request (MVP; for prod cache globally)
    try:
        from .main import get_retrieval
        ret = get_retrieval()
        bm25 = ret.bm25
        sem = ret.sem_index
        embedder = ret.embedder
        if mode_requires(mode=req.mode, bm25=bm25, sem=sem):
            raise HTTPException(status_code=503, detail="Indexes not built. Run rebuild_index.py first.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Retrieval not ready: {e}")

    results = []
    if req.mode in ("semantic", "hybrid"):
        if sem is None or embedder is None:
            if req.mode == "semantic":
                raise HTTPException(status_code=503, detail="Semantic index not available")
        else:
            q_emb = embedder.encode_single(req.query)
            sem_res = sem.search(q_emb, top_k=req.top_k if req.mode=="semantic" else 20)
            if req.mode == "semantic":
                for r in sem_res[:req.top_k]:
                    results.append({
                        "chunk_id": r["chunk_id"],
                        "page": r["meta"].get("page"),
                        "section": r["meta"].get("section"),
                        "standard_id": r["meta"].get("standard_id"),
                        "text": r["text"][:800],
                        "score": r["semantic_score"],
                        "source": "semantic",
                    })
                return {"query": req.query, "mode": req.mode, "results": results}

    if req.mode in ("lexical", "hybrid"):
        if bm25 is None:
            if req.mode == "lexical":
                raise HTTPException(status_code=503, detail="BM25 index not available")
        else:
            bm_res = bm25.search(req.query, top_k=req.top_k if req.mode=="lexical" else 20)
            if req.mode == "lexical":
                for r in bm_res[:req.top_k]:
                    results.append({
                        "chunk_id": r["chunk_id"],
                        "page": r["meta"].get("page"),
                        "section": r["meta"].get("section"),
                        "standard_id": r["meta"].get("standard_id"),
                        "text": r["text"][:800],
                        "score": r["bm25_score"],
                        "source": "bm25",
                    })
                return {"query": req.query, "mode": req.mode, "results": results}

    # Hybrid
    if sem is not None and bm25 is not None and embedder is not None:
        q_emb = embedder.encode_single(req.query)
        sem_res = sem.search(q_emb, top_k=20)
        bm_res = bm25.search(req.query, top_k=20)
        cfg_ret = cfg.get("retrieval", {})
        hybrid = hybrid_search(
            req.query,
            semantic_results=sem_res,
            bm25_results=bm_res,
            semantic_weight=cfg_ret.get("semantic_weight", 0.5),
            bm25_weight=cfg_ret.get("bm25_weight", 0.3),
            metadata_weight=cfg_ret.get("metadata_weight", 0.2),
            extract_is_numbers=extract_is_from_query(req.query),
        )
        for r in hybrid[:req.top_k]:
            results.append({
                "chunk_id": r["chunk_id"],
                "page": r["meta"].get("page"),
                "section": r["meta"].get("section"),
                "standard_id": r["meta"].get("standard_id"),
                "text": r["text"][:800],
                "score": r["hybrid_score"],
                "sources": r["sources"],
                "semantic_score": r.get("semantic_score", 0),
                "bm25_score": r.get("bm25_score", 0),
            })
    return {"query": req.query, "mode": req.mode, "results": results}


def mode_requires(mode: str, bm25, sem) -> bool:
    if mode == "semantic" and sem is None:
        return True
    if mode == "lexical" and bm25 is None:
        return True
    if mode == "hybrid" and (bm25 is None or sem is None):
        return True
    return False
