"""
scripts/ingest_corpus.py — Incremental corpus ingestion with manifest tracking.

Usage:
    python -m scripts.ingest_corpus --input data/raw_pdfs --incremental
    python -m scripts.ingest_corpus --input data/raw_pdfs --rebuild-index
"""
from __future__ import annotations

import argparse
import hashlib
import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ingest_corpus")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest(manifest_path: Path) -> Dict:
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"documents": {}}


def save_manifest(manifest_path: Path, manifest: Dict):
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


def run_ingestion(
    input_dir: Path,
    incremental: bool = True,
    rebuild_index: bool = False,
    limit: int = 0,
):
    from src.ingestion.scanner import scan_corpus, save_inventory
    from src.ingestion.pipeline import process_corpus, _hash_file
    from src.storage.database import init_db, get_session_factory

    config_path = PROJECT_ROOT / "config" / "config.yaml"
    import yaml
    config = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    paths_cfg = config.get("paths", {})
    db_path = PROJECT_ROOT / paths_cfg.get("db_path", "data/bis.db")
    json_dir = PROJECT_ROOT / paths_cfg.get("json_dir", "data/processed/json")
    figures_dir = PROJECT_ROOT / paths_cfg.get("figures_dir", "data/processed/figures")
    manifest_path = PROJECT_ROOT / "data" / "manifest.json"

    # Ensure directories
    db_path.parent.mkdir(parents=True, exist_ok=True)
    json_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)

    # Initialize DB
    logger.info("Initializing database at %s", db_path)
    init_db(db_path)

    # Load manifest
    manifest = load_manifest(manifest_path)

    # Scan corpus
    logger.info("Scanning PDFs in %s ...", input_dir)
    scan_start = time.time()
    records = scan_corpus(input_dir)
    scan_elapsed = time.time() - scan_start
    logger.info("Scan completed in %.1fs — %d PDFs found", scan_elapsed, len(records))

    # Save inventory
    inventory_path = PROJECT_ROOT / "data" / "inventory.json"
    save_inventory(records, inventory_path)

    # Deduplication stats
    total = len(records)
    success = sum(1 for r in records if r.status == "SUCCESS")
    partial = sum(1 for r in records if r.status == "PARTIAL")
    ocr_required = sum(1 for r in records if r.status == "OCR_REQUIRED")
    failed = sum(1 for r in records if r.status == "FAILED")

    # Check for duplicates by SHA-256
    sha_counts = {}
    for r in records:
        if r.sha256:
            sha_counts.setdefault(r.sha256, []).append(r)
    duplicates = {sha: recs for sha, recs in sha_counts.items() if len(recs) > 1}
    duplicate_count = sum(len(recs) - 1 for recs in duplicates.values())

    logger.info("=" * 60)
    logger.info("CORPUS SCAN REPORT")
    logger.info("=" * 60)
    logger.info("PDFs found:       %d", total)
    logger.info("Duplicates:       %d", duplicate_count)
    logger.info("SUCCESS:          %d", success)
    logger.info("PARTIAL:          %d", partial)
    logger.info("OCR_REQUIRED:     %d", ocr_required)
    logger.info("FAILED:           %d", failed)
    logger.info("=" * 60)

    # Incremental skip: check existing hashes in manifest
    existing_hashes = set()
    if incremental:
        for doc_id, doc_info in manifest.get("documents", {}).items():
            if doc_info.get("sha256"):
                existing_hashes.add(doc_info["sha256"])
        # Also check DB
        try:
            from src.storage.models import Document
            factory = get_session_factory(db_path)
            session = factory()
            rows = session.query(Document.hash).all()
            for r in rows:
                if r[0]:
                    existing_hashes.add(r[0])
            session.close()
        except Exception as e:
            logger.warning("Could not load DB hashes: %s", e)
        logger.info("Incremental mode: %d existing hashes to skip", len(existing_hashes))

    # Process PDFs
    logger.info("Starting ingestion (incremental=%s, limit=%d)...", incremental, limit or total)
    ingest_start = time.time()

    from src.ingestion.pipeline import process_single_pdf

    stats = {"total": 0, "success": 0, "partial": 0, "failed": 0, "skipped": 0, "ocr_required": 0}
    processed_count = 0

    for i, rec in enumerate(records):
        if limit and processed_count >= limit:
            break

        pdf_path = Path(rec.path)

        # Skip duplicates (keep first)
        if rec.sha256 and duplicates.get(rec.sha256) and rec != duplicates[rec.sha256][0]:
            stats["skipped"] += 1
            continue

        # Skip already processed
        if incremental and rec.sha256 and rec.sha256 in existing_hashes:
            stats["skipped"] += 1
            continue

        stats["total"] += 1
        processed_count += 1

        try:
            result = process_single_pdf(
                pdf_path,
                json_out_dir=json_dir,
                figures_out_dir=figures_dir,
                config=config,
                use_db=True,
                db_path=db_path,
            )
            st = result.get("_status", "FAILED")
            if st == "SUCCESS":
                stats["success"] += 1
            elif st == "PARTIAL":
                stats["partial"] += 1
            else:
                stats["failed"] += 1

            if result.get("document", {}).get("ocr_pages", 0) > 0:
                stats["ocr_required"] += 1

            # Update manifest
            doc_info = result.get("document", {})
            meta = result.get("metadata", {})
            doc_id = meta.get("standard_id") or pdf_path.stem
            manifest["documents"][doc_id] = {
                "sha256": rec.sha256,
                "filename": pdf_path.name,
                "path": str(pdf_path),
                "is_number": meta.get("is_number"),
                "title": meta.get("title"),
                "edition_year": meta.get("edition_year"),
                "status": st,
                "pages": doc_info.get("page_count"),
                "specifications": len(result.get("specifications", [])),
                "tables": len(result.get("tables", [])),
                "figures": len(result.get("figures", [])),
                "references": len(result.get("references", [])),
                "chunks": len(result.get("chunks", [])),
                "processed_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }

            # Save manifest periodically
            if processed_count % 50 == 0:
                save_manifest(manifest_path, manifest)
                logger.info("Progress: %d/%d processed (%d success, %d partial, %d failed, %d skipped)",
                           processed_count, stats["total"], stats["success"], stats["partial"], stats["failed"], stats["skipped"])

        except Exception as e:
            logger.error("Failed to process %s: %s", pdf_path.name, e)
            stats["failed"] += 1

    # Final manifest save
    save_manifest(manifest_path, manifest)
    ingest_elapsed = time.time() - ingest_start

    logger.info("=" * 60)
    logger.info("INGESTION COMPLETE")
    logger.info("=" * 60)
    logger.info("Time:             %.1fs", ingest_elapsed)
    logger.info("Processed:        %d", stats["total"])
    logger.info("Success:          %d", stats["success"])
    logger.info("Partial:          %d", stats["partial"])
    logger.info("Failed:           %d", stats["failed"])
    logger.info("Skipped:          %d", stats["skipped"])
    logger.info("OCR required:     %d", stats["ocr_required"])
    logger.info("Manifest:         %s", manifest_path)
    logger.info("=" * 60)

    # Rebuild indexes if requested
    if rebuild_index:
        logger.info("Rebuilding search indexes...")
        try:
            from src.retrieval.embeddings import EmbeddingModel
            from src.retrieval.semantic_search import SemanticIndex
            from src.retrieval.bm25_search import BM25Index

            emb_cfg = config.get("embedding", config.get("embeddings", {}))
            embedder = EmbeddingModel.from_config(emb_cfg)

            indexes_dir = PROJECT_ROOT / paths_cfg.get("indexes_dir", "data/indexes")
            indexes_dir.mkdir(parents=True, exist_ok=True)

            # Load all chunks from DB
            from src.storage.models import Chunk
            factory = get_session_factory(db_path)
            session = factory()
            chunks = session.query(Chunk).all()
            texts = [c.text for c in chunks]
            chunk_ids = [c.chunk_id for c in chunks]
            session.close()

            if not texts:
                logger.warning("No chunks found — cannot build index")
            else:
                logger.info("Encoding %d chunks...", len(texts))
                embeddings = embedder.encode_passages(texts)

                # Build FAISS
                import faiss
                import numpy as np
                dim = embeddings.shape[1]
                index = faiss.IndexFlatIP(dim)
                if config.get("embedding", {}).get("normalize_embeddings", True):
                    faiss.normalize_L2(embeddings)
                index.add(embeddings)

                faiss_path = indexes_dir / "faiss.index"
                faiss.write_index(index, str(faiss_path))

                mapping = {i: cid for i, cid in enumerate(chunk_ids)}
                mapping_path = indexes_dir / "faiss_mapping.json"
                with open(mapping_path, "w") as f:
                    json.dump(mapping, f)

                # Save index meta
                meta = embedder.to_meta()
                meta_path = indexes_dir / "index_meta.json"
                with open(meta_path, "w") as f:
                    json.dump(meta, f, indent=2)

                logger.info("FAISS index built: %d vectors, dim=%d", index.ntotal, dim)

                # Build BM25
                bm25 = BM25Index(texts, chunk_ids)
                bm25_path = indexes_dir / "bm25.pkl"
                bm25.save(bm25_path)
                logger.info("BM25 index built: %d documents", len(texts))

        except Exception as e:
            logger.error("Index rebuild failed: %s", e, exc_info=True)

    return stats


def main():
    parser = argparse.ArgumentParser(description="Tender Samhita Corpus Ingestion")
    parser.add_argument("--input", type=str, default="data/raw_pdfs", help="Input directory with PDFs")
    parser.add_argument("--incremental", action="store_true", default=True, help="Skip already processed PDFs")
    parser.add_argument("--rebuild-index", action="store_true", help="Rebuild FAISS + BM25 indexes after ingestion")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of PDFs to process (0=all)")
    parser.add_argument("--full", action="store_true", help="Full reprocessing (no incremental skip)")
    args = parser.parse_args()

    input_dir = PROJECT_ROOT / args.input
    if not input_dir.exists():
        logger.error("Input directory not found: %s", input_dir)
        sys.exit(1)

    run_ingestion(
        input_dir=input_dir,
        incremental=not args.full,
        rebuild_index=args.rebuild_index,
        limit=args.limit,
    )


if __name__ == "__main__":
    main()
