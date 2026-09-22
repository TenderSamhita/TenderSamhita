#!/usr/bin/env python
"""
scripts/ingest.py — Corpus ingestion entrypoint

Usage:
  python scripts/ingest.py                    # ingest entire corpus
  python scripts/ingest.py --file sample.pdf  # single file
  python scripts/ingest.py --limit 100        # first 100
  python scripts/ingest.py --no-db            # JSON only
  python scripts/ingest.py --rebuild          # force reprocess (ignore hash cache)
"""
from __future__ import annotations

import argparse
import logging
import sys
import yaml
from pathlib import Path

# Ensure src on path when run as script
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.ingestion.pipeline import process_single_pdf, process_corpus  # noqa: E402
from src.storage.database import init_db  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


def load_config():
    cfg_path = ROOT / "config" / "config.yaml"
    with open(cfg_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser(description="BIS corpus ingestion")
    parser.add_argument("--file", type=str, default=None, help="Single PDF path")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of PDFs (0=all)")
    parser.add_argument("--no-db", action="store_true", help="Do not persist to DB, JSON only")
    parser.add_argument("--rebuild", action="store_true", help="Ignore hash cache, reprocess all")
    args = parser.parse_args()

    cfg = load_config()
    paths = cfg.get("paths", {})
    raw_root = Path(paths.get("raw_pdfs"))
    json_dir = ROOT / paths.get("json_dir", "data/processed/json")
    figures_dir = ROOT / paths.get("figures_dir", "data/processed/figures")
    db_path = ROOT / paths.get("db_path", "data/bis.db")

    if not args.no_db:
        init_db(db_path)

    if args.file:
        p = Path(args.file)
        if not p.exists():
            print(f"File not found: {p}")
            sys.exit(1)
        print(f"Processing single file: {p}")
        res = process_single_pdf(
            p,
            json_out_dir=json_dir,
            figures_out_dir=figures_dir,
            config=cfg,
            use_db=not args.no_db,
            db_path=db_path,
        )
        print(f"Status: {res.get('_status')} | chunks={len(res.get('chunks',[]))} | tables={len(res.get('tables',[]))} | figures(conf)={len([f for f in res.get('figures',[]) if f.get('is_confirmed')])}/{len(res.get('figures',[]))}")
        return

    print(f"Processing corpus root: {raw_root} | limit={args.limit or 'all'} | hash_cache={not args.rebuild}")
    stats = process_corpus(
        root=raw_root,
        json_out_dir=json_dir,
        figures_out_dir=figures_dir,
        db_path=None if args.no_db else db_path,
        config=cfg,
        limit=args.limit,
        skip_hashed=not args.rebuild,
    )
    print(f"Done: {stats}")


if __name__ == "__main__":
    main()
