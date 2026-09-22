"""
api/main.py -- FastAPI entrypoint

Endpoints per spec 46:
POST /api/tender/upload
POST /api/tender/analyze
POST /api/recommend
POST /api/search
GET  /api/standards/{standard_id}
GET  /api/standards/{standard_id}/figures
GET  /api/standards/{standard_id}/tables
GET  /api/standards/{standard_id}/references
POST /api/compare
GET  /api/health
GET  /api/stats
"""
from __future__ import annotations

import json
import logging
import tempfile
from pathlib import Path
from typing import Optional

import yaml
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ..storage.database import get_engine, get_session_factory
from .routes_search import router as search_router
from .routes_recommend import router as recommend_router
from .routes_standards import router as standards_router
from .routes_tender import router as tender_router

logger = logging.getLogger(__name__)


def load_config():
    cfg_path = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}


def get_embedding_cfg(cfg: dict) -> dict:
    """
    Compat shim: supports both new `embedding:` key and legacy `embeddings:` key.
    Normalises `normalize` -> `normalize_embeddings` for old configs.
    """
    if "embedding" in cfg:
        return cfg["embedding"]
    if "embeddings" in cfg:
        logger.warning(
            "Config key 'embeddings' is deprecated -- rename to 'embedding' in config.yaml"
        )
        old = dict(cfg["embeddings"])
        if "normalize" in old and "normalize_embeddings" not in old:
            old["normalize_embeddings"] = old.pop("normalize")
        return old
    return {}


def resolve_path(p: str | Path) -> Path:
    """Resolve config path relative to project root if not absolute."""
    p = Path(p)
    if p.is_absolute():
        return p
    root = Path(__file__).resolve().parents[2]
    return (root / p).resolve()


config = load_config()
app = FastAPI(
    title="BIS Procurement Standards Recommendation Engine",
    version="0.1.0",
    description="Evidence-grounded AI recommendation for Indian Standards in procurement.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(search_router, prefix="/api", tags=["search"])
app.include_router(recommend_router, prefix="/api", tags=["recommend"])
app.include_router(standards_router, prefix="/api", tags=["standards"])
app.include_router(tender_router, prefix="/api", tags=["tender"])

# Static for figures (if available)
figures_dir = resolve_path(config.get("paths", {}).get("figures_dir", "data/processed/figures"))
if figures_dir.exists():
    try:
        app.mount("/figures", StaticFiles(directory=str(figures_dir)), name="figures")
    except Exception:
        pass

# Serve frontend dist if built -- mount at /app so it does NOT intercept /api routes
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.exists():
    try:
        app.mount("/app", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
    except Exception:
        pass


@app.get("/api/health")
def health():
    # Check DB and indexes
    db_path = resolve_path(config.get("paths", {}).get("db_path", "data/bis.db"))
    indexes_dir = resolve_path(config.get("paths", {}).get("indexes_dir", "data/indexes"))
    return {
        "status": "ok",
        "version": "0.1.0",
        "db_exists": db_path.exists(),
        "indexes_exist": indexes_dir.exists(),
        "retrieval": "hybrid (FAISS + BM25)",
    }


@app.get("/api/stats")
def stats():
    from ..storage.models import Standard, Chunk, Table, Figure, Reference, Specification, Document
    db_path = resolve_path(config.get("paths", {}).get("db_path", "data/bis.db"))
    if not db_path.exists():
        return {"error": "DB not initialized. Run ingest.py first."}
    factory = get_session_factory(db_path)
    session = factory()
    try:
        return {
            "standards": session.query(Standard).count(),
            "chunks": session.query(Chunk).count(),
            "tables": session.query(Table).count(),
            "figures_confirmed": session.query(Figure).filter_by(is_confirmed=1).count(),
            "figures_total": session.query(Figure).count(),
            "references": session.query(Reference).count(),
            "specifications": session.query(Specification).count(),
            "documents": session.query(Document).count(),
        }
    finally:
        session.close()


# Global retrieval singletons (lazy load)
class RetrievalState:
    bm25 = None
    sem_index = None
    embedder = None
    meta_map = None
    loaded = False

retrieval = RetrievalState()


def get_retrieval():
    if not retrieval.loaded:
        # Attempt to load; if missing, return None and let endpoints return 503
        try:
            from ..retrieval.bm25_search import BM25Index
            from ..retrieval.semantic_search import SemanticIndex
            from ..retrieval.embeddings import EmbeddingModel
            cfg = load_config()
            indexes_dir = resolve_path(cfg.get("paths", {}).get("indexes_dir", "data/indexes"))
            emb_cfg = get_embedding_cfg(cfg)

            # Check index_meta.json for model/dim mismatch
            meta_path = indexes_dir / "index_meta.json"
            if meta_path.exists():
                with open(meta_path, "r", encoding="utf-8") as f:
                    idx_meta = json.load(f)
                configured_model = emb_cfg.get("model", "BAAI/bge-small-en-v1.5")
                if idx_meta.get("model") != configured_model:
                    logger.warning(
                        "INDEX MODEL MISMATCH: index built with '%s', config specifies '%s'. "
                        "Run rebuild_index.py --force-rebuild to fix.",
                        idx_meta.get("model"), configured_model,
                    )

            bm25_path = indexes_dir / "bm25.pkl"
            faiss_path = indexes_dir / "faiss.index"
            mapping_path = indexes_dir / "faiss_mapping.json"
            if bm25_path.exists():
                retrieval.bm25 = BM25Index.load(bm25_path)
            if faiss_path.exists() and mapping_path.exists():
                retrieval.sem_index = SemanticIndex.load(faiss_path, mapping_path)
            # Use from_config() to get correct prefix strategy per model
            retrieval.embedder = EmbeddingModel.from_config(emb_cfg)

            # meta map from DB
            db_path = resolve_path(cfg.get("paths", {}).get("db_path", "data/bis.db"))
            if db_path.exists():
                factory = get_session_factory(db_path)
                session = factory()
                try:
                    from ..storage.models import Standard
                    rows = session.query(Standard).all()
                    retrieval.meta_map = {
                        r.standard_id: {
                            "standard_id": r.standard_id,
                            "normalized_identifier": r.normalized_identifier,
                            "is_number": r.is_number,
                            "title": r.title,
                            "year": r.edition_year,
                            "edition_year": r.edition_year,
                            "iso_reference": r.iso_reference,
                            "ics_code": r.ics_code,
                            "revision": r.revision,
                        }
                        for r in rows
                    }
                finally:
                    session.close()
            retrieval.loaded = True
        except Exception as e:
            logger.warning("Retrieval load failed: %s", e)
            retrieval.loaded = True
    return retrieval


@app.get("/api/embedding/info")
def embedding_info():
    """
    Returns current embedding model configuration and index metadata.
    Useful for verifying model/index consistency without restarting the server.
    """
    from ..retrieval.embedding_registry import list_supported
    cfg = load_config()
    emb_cfg = get_embedding_cfg(cfg)
    indexes_dir = resolve_path(cfg.get("paths", {}).get("indexes_dir", "data/indexes"))

    index_meta = None
    meta_path = indexes_dir / "index_meta.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            index_meta = json.load(f)

    configured_model = emb_cfg.get("model", "BAAI/bge-small-en-v1.5")
    mismatch = (
        index_meta is not None
        and index_meta.get("model") != configured_model
    )

    return {
        "configured_model": configured_model,
        "normalize_embeddings": emb_cfg.get("normalize_embeddings", True),
        "batch_size": emb_cfg.get("batch_size", 32),
        "device": emb_cfg.get("device", "cpu"),
        "index_meta": index_meta,
        "model_index_mismatch": mismatch,
        "supported_models": list_supported(),
        "evaluation_script": "python scripts/evaluate_embeddings.py",
        "rebuild_command": "python scripts/rebuild_index.py --force-rebuild",
    }
