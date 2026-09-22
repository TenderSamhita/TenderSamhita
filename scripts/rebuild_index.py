#!/usr/bin/env python
"""
scripts/rebuild_index.py -- Build FAISS + BM25 indexes from DB chunks

Steps:
 1. Load chunks from SQLite
 2. Batch-encode passages via configured embedding model (with passage prefix)
 3. Build FAISS IndexFlatIP + mapping JSON
 4. Build BM25
 5. Save to data/indexes/
 6. Write index_meta.json sidecar (model name, dim, build timestamp, chunk count)

Model selection:
  Reads  config/config.yaml  `embedding.model` (or legacy `embeddings.model`).
  Override via --model flag.

Mismatch detection:
  If existing index_meta.json has a different model, script warns and exits
  unless --force-rebuild is passed (or --model changes the active model).

Usage:
  python scripts/rebuild_index.py
  python scripts/rebuild_index.py --batch 64
  python scripts/rebuild_index.py --model "BAAI/bge-base-en-v1.5"
  python scripts/rebuild_index.py --force-rebuild
  python scripts/rebuild_index.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import yaml
from tqdm import tqdm

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.retrieval.bm25_search import BM25Index          # noqa: E402
from src.retrieval.embeddings import EmbeddingModel      # noqa: E402
from src.retrieval.semantic_search import SemanticIndex  # noqa: E402
from src.storage.database import get_session_factory     # noqa: E402
from src.storage.models import Chunk                     # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def load_config() -> dict:
    with open(ROOT / "config" / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_embedding_cfg(cfg: dict) -> dict:
    """
    Return the embedding config dict.
    Supports both new `embedding:` key and legacy `embeddings:` key.
    """
    if "embedding" in cfg:
        return cfg["embedding"]
    if "embeddings" in cfg:
        logger.warning(
            "Config key 'embeddings' is deprecated -- rename to 'embedding' in config.yaml"
        )
        old = cfg["embeddings"]
        # Normalise legacy key `normalize` -> `normalize_embeddings`
        if "normalize" in old and "normalize_embeddings" not in old:
            old = dict(old)
            old["normalize_embeddings"] = old.pop("normalize")
        return old
    return {}


# ---------------------------------------------------------------------------
# Index metadata sidecar
# ---------------------------------------------------------------------------

def load_index_meta(indexes_dir: Path) -> dict | None:
    meta_path = indexes_dir / "index_meta.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_index_meta(indexes_dir: Path, embedder: EmbeddingModel, chunk_count: int):
    meta = embedder.to_meta()
    meta["built_at"] = datetime.now(timezone.utc).isoformat()
    meta["chunk_count"] = chunk_count
    meta_path = indexes_dir / "index_meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    logger.info("Index metadata saved -> %s", meta_path)
    return meta


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Rebuild FAISS + BM25 indexes")
    parser.add_argument("--batch", type=int, default=None, help="Embedding batch size override")
    parser.add_argument(
        "--model", type=str, default=None,
        help="Override embedding model (e.g. 'BAAI/bge-base-en-v1.5')"
    )
    parser.add_argument(
        "--force-rebuild", action="store_true",
        help="Rebuild even if model matches existing index_meta.json"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Validate config + model loading only; do not write any files"
    )
    args = parser.parse_args()

    cfg = load_config()
    paths = cfg.get("paths", {})
    db_path = ROOT / paths.get("db_path", "data/bis.db")
    indexes_dir = ROOT / paths.get("indexes_dir", "data/indexes")
    emb_cfg = get_embedding_cfg(cfg)

    # CLI model overrides config
    if args.model:
        emb_cfg = dict(emb_cfg)
        emb_cfg["model"] = args.model
        logger.info("Model overridden via CLI: %s", args.model)

    model_name = emb_cfg.get("model", "BAAI/bge-small-en-v1.5")
    batch_size = args.batch or emb_cfg.get("batch_size", 32)

    # ---- Mismatch detection ---------------------------------------------------
    existing_meta = load_index_meta(indexes_dir)
    if existing_meta and not args.force_rebuild:
        existing_model = existing_meta.get("model", "")
        if existing_model and existing_model != model_name:
            print(
                f"\n??  MODEL MISMATCH DETECTED\n"
                f"   Existing index built with : {existing_model}\n"
                f"   Configured model          : {model_name}\n"
                f"\n   The FAISS index dimensions will be incompatible.\n"
                f"   Run with --force-rebuild to rebuild the index with the new model.\n"
                f"   Or revert config/config.yaml to '{existing_model}' to keep existing index.\n"
            )
            sys.exit(1)
        elif existing_model == model_name:
            logger.info("Index model matches config (%s). Proceeding with rebuild.", model_name)

    # ---- DB check ------------------------------------------------------------
    if not db_path.exists():
        print(f"DB not found at {db_path}. Run ingest.py first.")
        sys.exit(1)

    factory = get_session_factory(db_path)
    session = factory()
    try:
        chunks = session.query(Chunk).all()
        print(f"Loaded {len(chunks)} chunks from DB")
        if not chunks:
            print("No chunks -- run ingest.py first")
            sys.exit(1)
        chunk_dicts = [
            {
                "chunk_id": c.chunk_id,
                "standard_id": c.standard_id,
                "section": c.section_title,
                "page": c.page,
                "text": c.text,
            }
            for c in chunks
        ]
    finally:
        session.close()

    # ---- Embedder setup -------------------------------------------------------
    embedder = EmbeddingModel.from_config(emb_cfg)
    print(f"\nEmbedding model : {embedder.model_name}")
    print(f"Dimension       : {embedder.dim}  (detected dynamically)")
    print(f"Normalize       : {embedder._cfg.normalize_embeddings}")
    print(f"Batch size      : {batch_size}")
    print(f"Query prefix    : {embedder._cfg.query_prefix!r}")
    print(f"Passage prefix  : {embedder._cfg.passage_prefix!r}")

    if args.dry_run:
        print("\n[OK] Dry-run complete -- no files written.")
        return

    # ---- Encode passages ------------------------------------------------------
    texts = [c["text"] for c in chunk_dicts]
    print(f"\nEncoding {len(texts)} passages with '{embedder.model_name}' (batch={batch_size}) ...")
    embeddings = embedder.encode_passages(texts, batch_size=batch_size)
    print(f"Embeddings shape: {embeddings.shape} | dim={embedder.dim}")

    # ---- FAISS ---------------------------------------------------------------
    indexes_dir.mkdir(parents=True, exist_ok=True)
    dim = embedder.dim
    sem = SemanticIndex(dim=dim)
    sem.add(embeddings.astype(np.float32), chunk_dicts)
    faiss_path = indexes_dir / "faiss.index"
    mapping_path = indexes_dir / "faiss_mapping.json"
    sem.save(faiss_path, mapping_path)
    print(f"FAISS saved : {faiss_path} ({sem.index.ntotal} vectors, dim={dim})")

    # ---- BM25 ----------------------------------------------------------------
    bm25 = BM25Index()
    bm25.build(chunk_dicts)
    bm25_path = indexes_dir / "bm25.pkl"
    bm25.save(bm25_path)
    print(f"BM25 saved  : {bm25_path}")

    # ---- Metadata sidecar ----------------------------------------------------
    meta = save_index_meta(indexes_dir, embedder, len(chunk_dicts))

    print("\n[OK] Index rebuild complete.")
    print(f"  Model   : {meta['model']}")
    print(f"  Dim     : {meta['dim']}")
    print(f"  Chunks  : {meta['chunk_count']} | Standards: {len(set(c['standard_id'] for c in chunk_dicts))}")
    print(f"  Built   : {meta['built_at']}")
    print(f"  FAISS   : {faiss_path}")
    print(f"  BM25    : {bm25_path}")
    print(f"  Meta    : {indexes_dir / 'index_meta.json'}")


if __name__ == "__main__":
    main()
