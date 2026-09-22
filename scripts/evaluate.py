#!/usr/bin/env python
"""
scripts/evaluate.py ??" Retrieval evaluation (spec 60) + hallucination tests (spec 61)

Runs benchmark queries against indexes.
Metrics: Precision@k, Recall, MRR for small manually-defined benchmark.

Benchmark dataset (hard-coded for MVP; extend via data/benchmark.json):
  query: "thermal oxidation stability of gas turbine fuels" -> expected IS 1448 Part 97
  query: "pressure tunnels first filling and emptying guidelines" -> IS 12633
  etc.

Also runs hallucination probes: fake IS, empty query, etc.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

BENCHMARK = [
    {"query": "thermal oxidation stability of gas turbine fuels", "expected": "IS 1448", "expected_part": "97"},
    {"query": "first filling and emptying of pressure tunnels guidelines", "expected": "IS 12633", "expected_part": None},
    {"query": "explosive atmospheres electrical installation design", "expected": "IS 16724", "expected_part": None},
    {"query": "yoga terminology gheranda samhita", "expected": "IS 17874", "expected_part": "2"},
    {"query": "aviation turbine fuel petroleum products methods of test", "expected": "IS 1448", "expected_part": None},
]

def load_config():
    with open(ROOT / "config" / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def evaluate_retrieval():
    cfg = load_config()
    from src.storage.database import get_session_factory
    from src.retrieval.bm25_search import BM25Index
    from src.retrieval.semantic_search import SemanticIndex
    from src.retrieval.embeddings import EmbeddingModel
    from src.retrieval.hybrid_search import hybrid_search, extract_is_from_query
    from src.retrieval.reranker import rerank_standards

    db_path = ROOT / cfg.get("paths", {}).get("db_path", "data/bis.db")
    indexes_dir = ROOT / cfg.get("paths", {}).get("indexes_dir", "data/indexes")
    if not (indexes_dir / "bm25.pkl").exists():
        print("Indexes not built. Run rebuild_index.py first.")
        return

    # Load retrieval
    bm25 = BM25Index.load(indexes_dir / "bm25.pkl")
    sem = SemanticIndex.load(indexes_dir / "faiss.index", indexes_dir / "faiss_mapping.json")
    embedder = EmbeddingModel(
        model_name=(
            cfg.get("embedding", cfg.get("embeddings", {})).get(
                "model", "BAAI/bge-small-en-v1.5"
            )
        )
    )

    factory = get_session_factory(db_path)
    session = factory()
    from src.storage.models import Standard
    rows = session.query(Standard).all()
    meta_map = {
        r.standard_id: {
            "standard_id": r.standard_id,
            "normalized_identifier": r.normalized_identifier,
            "is_number": r.is_number,
            "title": r.title,
            "year": r.edition_year,
            "edition_year": r.edition_year,
        }
        for r in rows
    }
    session.close()

    print(f"Loaded indexes: FAISS ntotal={sem.index.ntotal}, BM25 docs={len(bm25.doc_ids)}, standards={len(meta_map)}")
    print("="*70)
    hits_at_1 = 0
    hits_at_5 = 0
    total = len(BENCHMARK)
    for item in BENCHMARK:
        q = item["query"]
        expected = item["expected"]
        expected_part = item["expected_part"]
        q_emb = embedder.encode_query(q)
        sem_res = sem.search(q_emb, top_k=20)
        bm_res = bm25.search(q, top_k=20)
        hybrid = hybrid_search(q, sem_res, bm_res, extract_is_numbers=extract_is_from_query(q))
        reranked = rerank_standards(hybrid, meta_map, q)
        top5_ids = [r["standard_id"] for r in reranked[:5]]
        top5_text = " ".join(top5_ids).lower()
        # check expected in top5 (via IS number substring)
        found_at_1 = expected.lower().replace(" ","").replace("_","") in top5_ids[0].lower().replace("_","") if top5_ids else False
        # broader: check expected substring in any top5 standard's normalized identifier
        found_at_5 = any(expected.lower().replace("is ","") in sid.lower().replace("_","") or expected.lower() in str(meta_map.get(sid,{}).get("normalized_identifier","")).lower() for sid in top5_ids)
        # also check part if specified
        if expected_part and found_at_5:
            found_at_5 = any(f"part_{expected_part}" in sid.lower() or f"part {expected_part}" in str(meta_map.get(sid,{}).get("normalized_identifier","")).lower() for sid in top5_ids)
        if found_at_1:
            hits_at_1 += 1
        if found_at_5:
            hits_at_5 += 1
        status1 = "??"" if found_at_5 else "??--"
        print(f"{status1} Query: \"{q[:60]}\" | expected {expected} ({expected_part or '-'}) | top1={top5_ids[0] if top5_ids else 'none'} | top5={top5_ids[:3]}")

    print("="*70)
    print(f"Retrieval metrics: P@1={hits_at_1}/{total}={hits_at_1/total:.2%}, P@5={hits_at_5}/{total}={hits_at_5/total:.2%}")
    if hits_at_5/total < 0.6:
        print("WARN: Retrieval below 60% ??" tune chunking/embedding/hybrid weights")
    else:
        print("PASS: Retrieval benchmark OK")


def hallucination_tests():
    print("\n" + "="*70)
    print("HALLUCINATION / ABSTENTION TESTS (spec 61)")
    print("="*70)
    cfg = load_config()
    from src.storage.database import get_session_factory
    from src.recommendation.ranking import recommend_for_query
    from src.retrieval.bm25_search import BM25Index
    from src.retrieval.semantic_search import SemanticIndex
    from src.retrieval.embeddings import EmbeddingModel
    from src.recommendation.abstention import decide_abstention

    indexes_dir = ROOT / cfg.get("paths", {}).get("indexes_dir", "data/indexes")
    db_path = ROOT / cfg.get("paths", {}).get("db_path", "data/bis.db")
    if not (indexes_dir / "bm25.pkl").exists():
        print("Skipping hallucination tests ??" indexes not built")
        return

    bm25 = BM25Index.load(indexes_dir / "bm25.pkl")
    sem = SemanticIndex.load(indexes_dir / "faiss.index", indexes_dir / "faiss_mapping.json")
    embedder = EmbeddingModel(
        model_name=(
            cfg.get("embedding", cfg.get("embeddings", {})).get(
                "model", "BAAI/bge-small-en-v1.5"
            )
        )
    )
    factory = get_session_factory(db_path)
    session = factory()
    from src.storage.models import Standard
    rows = session.query(Standard).all()
    meta_map = {r.standard_id: {"standard_id": r.standard_id, "normalized_identifier": r.normalized_identifier, "is_number": r.is_number, "title": r.title, "year": r.edition_year} for r in rows}
    valid_ids = set(meta_map.keys())
    session.close()

    tests = [
        ("nonexistent IS number", "IS 99999:2026"),
        ("gibberish", "xyzabc qwerty foobar nonexistent procurement thing"),
        ("empty corpus edge", ""),  # will be caught earlier
        ("fake dimension", "need IS 1448 Part 97 with diameter 99999 mm"),
    ]
    for name, query in tests:
        if not query.strip():
            print(f"  {name}: SKIPPED (empty query)")
            continue
        try:
            result = recommend_for_query(query, bm25, sem, embedder, meta_map)
            ranked = result["ranked_standards"]
            # Validate no hallucinated IS
            hallucinated = [r for r in ranked if r["standard_id"] not in valid_ids]
            abst = decide_abstention(ranked, config=cfg.get("recommendation"))
            print(f"\nTest: {name} | query=\"{query[:60]}\"")
            print(f"  Ranked: {len(ranked)} | Top score: {ranked[0]['score'] if ranked else 'none'} | Abstain: {abst}")
            if hallucinated:
                print(f"  ??-- FAIL: Hallucinated IDs: {hallucinated}")
            else:
                print(f"  ??" No hallucinated IS numbers")
            if name in ("nonexistent IS number", "gibberish") and abst["decision"] == "ABSTAIN":
                print(f"  ??" Correctly abstained for insufficient evidence")
            elif name in ("nonexistent IS number", "gibberish"):
                print(f"  ??? Did not abstain ??" but returned low confidence: {abst}")
        except Exception as e:
            print(f"  {name}: ERROR {e}")

    print("\nHallucination tests complete.")


def main():
    evaluate_retrieval()
    hallucination_tests()


if __name__ == "__main__":
    main()

