#!/usr/bin/env python
"""
scripts/validate_dataset.py â€” Parser validation (spec 54)

Checks:
1. Every standard has ID
2. Every standard has title if detectable
3. Every chunk has page
4. Every figure has page
5. Every table has page
6. Every reference has source
7. No figure duplicate explosion
8. Logos not confirmed
9. No empty chunks
10. No giant garbage
11. No broken Unicode beyond OCR noise
12. No vector IDs without chunk IDs (indexes)
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.storage.database import get_session_factory


def load_config():
    with open(ROOT / "config" / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def main():
    cfg = load_config()
    db_path = ROOT / cfg.get("paths", {}).get("db_path", "data/bis.db")
    if not db_path.exists():
        print(f"DB not found: {db_path}")
        sys.exit(1)
    factory = get_session_factory(db_path)
    session = factory()
    from src.storage.models import Standard, Chunk, Figure, Table, Reference
    import json

    issues = []
    passed = []

    # 1. Every standard has ID
    standards = session.query(Standard).all()
    if not standards:
        issues.append("FAIL: No standards in DB")
    else:
        passed.append(f"Standards: {len(standards)}")
        missing_id = [s for s in standards if not s.standard_id]
        if missing_id:
            issues.append(f"FAIL: {len(missing_id)} standards missing ID")
        else:
            passed.append("All standards have ID")

    # 2. Title if detectable (warn if >40% missing title)
    missing_title = [s for s in standards if not s.title]
    pct_missing = len(missing_title)/max(len(standards),1)
    if pct_missing > 0.4:
        issues.append(f"WARN: {len(missing_title)}/{len(standards)} standards missing title ({pct_missing:.0%})")
    else:
        passed.append(f"Titles: {len(standards)-len(missing_title)}/{len(standards)} have title")

    # 3. Every chunk has page
    chunks = session.query(Chunk).all()
    no_page = [c for c in chunks if not c.page]
    if no_page:
        issues.append(f"FAIL: {len(no_page)}/{len(chunks)} chunks missing page")
    else:
        passed.append(f"Chunks: {len(chunks)} all have page")

    # 4. Every figure has page
    figs = session.query(Figure).all()
    no_fig_page = [f for f in figs if not f.page]
    if no_fig_page:
        issues.append(f"FAIL: {len(no_fig_page)} figures missing page")
    else:
        passed.append(f"Figures: {len(figs)} ({len([f for f in figs if f.is_confirmed])} confirmed) all have page")

    # 5. Every table has page
    tables = session.query(Table).all()
    no_tab_page = [t for t in tables if not t.page]
    if no_tab_page:
        issues.append(f"FAIL: {len(no_tab_page)} tables missing page")
    else:
        passed.append(f"Tables: {len(tables)} all have page")

    # 6. Every reference has source_standard
    refs = session.query(Reference).all()
    no_src = [r for r in refs if not r.source_standard_id]
    if no_src:
        issues.append(f"FAIL: {len(no_src)} references missing source")
    else:
        passed.append(f"References: {len(refs)} all have source")

    # 7. No figure duplicate explosion: check per-document figure counts not insane
    from collections import Counter
    fig_counts = Counter(f.standard_id for f in figs)
    insane = {sid:c for sid,c in fig_counts.items() if c>80}
    if insane:
        issues.append(f"WARN: Some standards have excessive figures (>80): {list(insane.items())[:3]}")
    else:
        passed.append(f"Figure counts per standard OK (max {max(fig_counts.values()) if fig_counts else 0})")

    # 8. Logos not confirmed: check duplicate_group frequency for confirmed
    # If a figure appears on >35% pages but is confirmed â†’ likely logo leak
    if figs:
        confirmed = [f for f in figs if f.is_confirmed]
        # heuristic: if many confirmed have same duplicate_group
        dup_counter = Counter(f.duplicate_group for f in confirmed if f.duplicate_group)
        frequent_conf = {g:c for g,c in dup_counter.items() if c>10}
        if frequent_conf:
            issues.append(f"WARN: Confirmed figures with high duplicate frequency â€” possible logo leak: {list(frequent_conf.items())[:3]}")
        else:
            passed.append("Logo filtering: no excessive duplicate among confirmed figures")

    # 9. No empty chunks
    empty = [c for c in chunks if not c.text or len(c.text.strip()) < 10]
    if empty:
        issues.append(f"FAIL: {len(empty)} empty/tiny chunks")
    else:
        passed.append("No empty chunks")

    # 10. No giant garbage chunks (>6000 chars or token explosion)
    giant = [c for c in chunks if len(c.text) > 6000]
    if giant:
        issues.append(f"WARN: {len(giant)} giant chunks (>6000 chars) â€” inspect")
    else:
        passed.append("No giant garbage chunks")

    # 11. Unicode sanity
    # check for excessive replacement char
    bad_unicode = [c for c in chunks if c.text.count("\ufffd") > 5]
    if bad_unicode:
        issues.append(f"WARN: {len(bad_unicode)} chunks with many replacement chars (bad Unicode)")
    else:
        passed.append("Unicode OK")

    # 12. No vector IDs without chunk mapping (if indexes exist)
    indexes_dir = ROOT / cfg.get("paths", {}).get("indexes_dir", "data/indexes")
    faiss_path = indexes_dir / "faiss.index"
    mapping_path = indexes_dir / "faiss_mapping.json"
    if faiss_path.exists() and mapping_path.exists():
        try:
            import faiss, json
            index = faiss.read_index(str(faiss_path))
            with open(mapping_path, "r", encoding="utf-8") as f:
                mapping = json.load(f)
            if index.ntotal != len(mapping):
                issues.append(f"FAIL: FAISS ntotal {index.ntotal} != mapping {len(mapping)}")
            else:
                passed.append(f"FAISS OK: ntotal={index.ntotal} mapping={len(mapping)}")
        except Exception as e:
            issues.append(f"WARN: FAISS check failed: {e}")
    else:
        passed.append("FAISS not yet built â€” skipped")

    session.close()

    print("="*70)
    print("PARSER VALIDATION REPORT")
    print("="*70)
    print("\nPASSED:")
    for p in passed:
        print(f"  âœ“ {p}")
    print("\nISSUES:")
    if not issues:
        print("  âœ“ No issues â€” dataset VALID")
    else:
        for iss in issues:
            print(f"  â€¢ {iss}")
    print("\n" + "="*70)
    if any("FAIL" in i for i in issues):
        print("OVERALL: FAIL â€” fix issues before retrieval")
        sys.exit(1)
    else:
        print("OVERALL: PASS (warnings may need review)")
        sys.exit(0)


if __name__ == "__main__":
    main()

