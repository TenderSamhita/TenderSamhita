"""
api/main.py — FastAPI entrypoint for Tender Samhita
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

import yaml
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..storage.database import get_engine, get_session_factory
from .routes_search import router as search_router
from .routes_recommend import router as recommend_router
from .routes_standards import router as standards_router
from .routes_tender import router as tender_router
from .routes_workspaces import router as workspaces_router
from .routes_analysis import router as analysis_router
from .routes_graph import router as graph_router

logger = logging.getLogger(__name__)

# Load .env if present
load_dotenv()

APP_VERSION = "2.1.0"


def load_config():
    cfg_path = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}


def get_embedding_cfg(cfg: dict) -> dict:
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
    p = Path(p)
    if p.is_absolute():
        return p
    root = Path(__file__).resolve().parents[2]
    return (root / p).resolve()


config = load_config()

# Resolve paths from environment or config
DB_PATH = os.getenv("BIS_DB_PATH") or config.get("paths", {}).get("db_path", "data/bis.db")
RAW_PDFS = os.getenv("BIS_RAW_PDFS") or config.get("paths", {}).get("raw_pdfs", "data/raw_pdfs")
# Render sets PORT; fallback to API_PORT or 8000
API_PORT = int(os.getenv("PORT") or os.getenv("API_PORT", "8000"))
_raw_cors = os.getenv("CORS_ORIGINS", "")
if _raw_cors:
    CORS_ORIGINS = [o.strip() for o in _raw_cors.split(",") if o.strip()]
else:
    CORS_ORIGINS = ["*"]

app = FastAPI(
    title="Tender Samhita — Procurement Standards Intelligence",
    version=APP_VERSION,
    description="Evidence-grounded AI recommendation for Indian Standards in procurement.",
)

# allow_origins=["*"] with allow_credentials=True is rejected by browsers;
# use wildcard-friendly setting when origins is ["*"]
cors_kwargs = dict(
    allow_methods=["*"],
    allow_headers=["*"],
)
if CORS_ORIGINS == ["*"]:
    cors_kwargs["allow_origins"] = ["*"]
    cors_kwargs["allow_credentials"] = False
else:
    cors_kwargs["allow_origins"] = CORS_ORIGINS
    cors_kwargs["allow_credentials"] = True

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Mount routers first — they must take precedence over static mounts
app.include_router(search_router, prefix="/api", tags=["search"])
app.include_router(recommend_router, prefix="/api", tags=["recommend"])
app.include_router(standards_router, prefix="/api", tags=["standards"])
app.include_router(tender_router, prefix="/api", tags=["tender"])
app.include_router(workspaces_router, prefix="/api", tags=["workspaces"])
app.include_router(analysis_router, prefix="/api", tags=["analysis"])
app.include_router(graph_router, prefix="/api", tags=["graph"])

# Static for figures
figures_dir = resolve_path(config.get("paths", {}).get("figures_dir", "data/processed/figures"))
if figures_dir.exists():
    try:
        app.mount("/figures", StaticFiles(directory=str(figures_dir)), name="figures")
    except Exception:
        pass

frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
_frontend_mounted = (frontend_dist / "index.html").exists() if frontend_dist.exists() else False

# Mount static assets (js/css/images) from dist/assets etc without shadowing /api:
# Serve /assets, /logo.png etc via StaticFiles at fine-grained paths
if _frontend_mounted:
    # Mount assets folder separately
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        try:
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")
        except Exception:
            pass
    # Mount root static files (logo etc) — serve index assets via explicit routes below


@app.get("/api")
def api_root():
    return {
        "service": "Tender Samhita API",
        "status": "online",
        "version": APP_VERSION,
        "docs": "/docs",
        "frontend_mounted": _frontend_mounted,
    }


@app.get("/api/health")
def health():
    db_path = resolve_path(DB_PATH)
    indexes_dir = resolve_path(config.get("paths", {}).get("indexes_dir", "data/indexes"))
    # Actual system state — not faked
    bm25_path = indexes_dir / "bm25.pkl"
    faiss_path = indexes_dir / "faiss.index"
    mapping_path = indexes_dir / "faiss_mapping.json"
    meta_path = indexes_dir / "index_meta.json"
    # Try to report counts without crashing if DB/index not ready
    corpus_count = None
    chunk_count = None
    index_model = None
    try:
        if db_path.exists():
            factory = get_session_factory(db_path)
            sess = factory()
            try:
                from ..storage.models import Standard as _Std, Chunk as _Chunk
                corpus_count = sess.query(_Std).count()
                chunk_count = sess.query(_Chunk).count()
            finally:
                sess.close()
    except Exception:
        pass
    try:
        if meta_path.exists():
            with open(meta_path, "r", encoding="utf-8") as f:
                _meta = json.load(f)
            index_model = _meta.get("model")
    except Exception:
        pass
    bm25_loaded = bm25_path.exists()
    faiss_loaded = faiss_path.exists() and mapping_path.exists()
    # Check embedding model availability (without heavy load)
    embedding_status = "configured"
    try:
        emb_model = os.getenv("EMBEDDING_MODEL") or config.get("embedding", {}).get("model", "BAAI/bge-small-en-v1.5")
    except Exception:
        emb_model = "BAAI/bge-small-en-v1.5"
    # Retrieval lazy state if already loaded
    retrieval_status = "not_loaded"
    try:
        if retrieval.loaded:
            retrieval_status = "loaded" if (retrieval.bm25 and retrieval.sem_index) else "partial"
        elif bm25_loaded and faiss_loaded:
            retrieval_status = "ready (lazy)"
    except Exception:
        pass
    graph_ready = True
    try:
        from ..storage.models import StandardRelationship as _SR
        # just check table exists; count not needed for health
        graph_ready = True
    except Exception:
        graph_ready = False
    # Overall status
    healthy = db_path.exists() and bm25_loaded and faiss_loaded and (corpus_count or 0) > 0
    return {
        "status": "healthy" if healthy else "degraded",
        "version": APP_VERSION,
        "database": "ok" if db_path.exists() else "missing",
        "corpus": corpus_count if corpus_count is not None else 0,
        "chunks": chunk_count if chunk_count is not None else 0,
        "semantic_index": "loaded" if faiss_loaded else "missing",
        "bm25": "loaded" if bm25_loaded else "missing",
        "embedding_model": emb_model,
        "embedding_status": embedding_status,
        "index_model": index_model,
        "retrieval": retrieval_status,
        "graph": "ready" if graph_ready else "not_ready",
        "frontend_mounted": _frontend_mounted,
        "indexes_exist": indexes_dir.exists(),
        "db_exists": db_path.exists(),
        "intelligence": ["gap_detector", "conflict_detector", "traceability", "specification_builder", "quality_review"],
    }


@app.get("/api/stats")
def stats():
    from ..storage.models import Standard, Chunk, Table, Figure, Reference, Specification, Document, Workspace, StandardRelationship
    db_path = resolve_path(DB_PATH)
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
            "workspaces": session.query(Workspace).count(),
            "relationships": session.query(StandardRelationship).count(),
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
    load_error = None

retrieval = RetrievalState()


def get_retrieval():
    if not retrieval.loaded:
        try:
            from ..retrieval.bm25_search import BM25Index
            from ..retrieval.semantic_search import SemanticIndex
            from ..retrieval.embeddings import EmbeddingModel
            cfg = load_config()
            indexes_dir = resolve_path(cfg.get("paths", {}).get("indexes_dir", "data/indexes"))
            emb_cfg = get_embedding_cfg(cfg)

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
            retrieval.embedder = EmbeddingModel.from_config(emb_cfg)

            db_path = resolve_path(DB_PATH)
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
            retrieval.load_error = None
            logger.info("Retrieval indexes loaded successfully")
        except Exception as e:
            logger.error("Retrieval load failed: %s", e)
            retrieval.load_error = str(e)
            # Do NOT set loaded=True on failure — allow retry on next request
    return retrieval


# Serve SPA — must be last so it does not shadow /api/*, /docs, /figures
if _frontend_mounted:
    @app.get("/")
    def serve_root():
        return FileResponse(str(frontend_dist / "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Never intercept API/docs/openapi/figures/assets
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi") or full_path.startswith("figures") or full_path.startswith("assets/"):
            raise HTTPException(status_code=404, detail="Not Found")
        # Serve static file if exists (e.g. logo.png, favicon)
        candidate = frontend_dist / full_path
        if full_path and candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))
        # SPA fallback — all non-api routes serve index.html for client-side routing
        return FileResponse(str(frontend_dist / "index.html"))


@app.get("/api/embedding/info")
def embedding_info():
    from ..retrieval.embedding_registry import list_supported
    cfg = load_config()
    emb_cfg = get_embedding_cfg(cfg)
    indexes_dir = resolve_path(config.get("paths", {}).get("indexes_dir", "data/indexes"))

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
    }
