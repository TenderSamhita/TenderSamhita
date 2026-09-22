#!/usr/bin/env python
"""
scripts/evaluate_embeddings.py -- Multi-model embedding evaluation harness

Compares embedding models on the BIS Indian Standards corpus using a manually
labelled benchmark (data/benchmark_labelled.json).

Metrics per model:
  Recall@5        fraction of relevant docs appearing in top-5 results
  Recall@10       fraction of relevant docs appearing in top-10 results
  Precision@5     fraction of top-5 results that are relevant
  Precision@10    fraction of top-10 results that are relevant
  MRR             Mean Reciprocal Rank (position of first relevant result)
  Exact IS @5     % of queries where exact IS number found in top-5
  Sem Relevance   topic-keyword overlap score (semantic quality beyond exact match)
  FP Rate @5      false positive rate = non-relevant / total in top-5

For each model being evaluated:
  1. Load model -> detect dim
  2. Build a temporary FAISS index (does NOT overwrite production data/indexes/)
  3. Run all 22 benchmark queries
  4. Collect and aggregate metrics

Output:
  stdout         -- formatted comparison table
  data/embedding_eval_results.json  -- raw per-query results for all models
  data/embedding_eval_report.md     -- markdown report with recommendation

Usage:
  # Evaluate all 4 supported models (slow, downloads models)
  python scripts/evaluate_embeddings.py

  # Evaluate specific models only
  python scripts/evaluate_embeddings.py --models "BAAI/bge-small-en-v1.5" "sentence-transformers/all-MiniLM-L6-v2"

  # Quick test with only positive queries (skip negatives)
  python scripts/evaluate_embeddings.py --models "BAAI/bge-small-en-v1.5" --quick

  # Use custom benchmark file
  python scripts/evaluate_embeddings.py --benchmark data/benchmark_labelled.json

  # Skip FAISS rebuild if index already exists for this model in temp dir
  python scripts/evaluate_embeddings.py --cache-indexes
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import tempfile
import time
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.retrieval.bm25_search import BM25Index          # noqa: E402
from src.retrieval.embeddings import EmbeddingModel      # noqa: E402
from src.retrieval.embedding_registry import REGISTRY, list_supported  # noqa: E402
from src.retrieval.semantic_search import SemanticIndex  # noqa: E402
from src.retrieval.hybrid_search import hybrid_search, extract_is_from_query  # noqa: E402
from src.retrieval.reranker import rerank_standards      # noqa: E402
from src.storage.database import get_session_factory     # noqa: E402
from src.storage.models import Chunk, Standard           # noqa: E402

logging.basicConfig(level=logging.WARNING, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

# ---- Constants ---------------------------------------------------------------
ALL_MODELS = list_supported()
EVAL_TOP_K = 10  # retrieve up to top-10 for computing @5 and @10 metrics


# ===========================================================================
# Config + Data loading
# ===========================================================================

def load_config() -> dict:
    with open(ROOT / "config" / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def get_embedding_cfg(cfg: dict) -> dict:
    """Compat shim: supports both `embedding:` and legacy `embeddings:` key."""
    if "embedding" in cfg:
        return cfg["embedding"]
    old = cfg.get("embeddings", {})
    if "normalize" in old:
        old = dict(old)
        old["normalize_embeddings"] = old.pop("normalize")
    return old


def load_benchmark(benchmark_path: Path) -> List[Dict]:
    with open(benchmark_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["queries"]


def load_corpus_chunks(db_path: Path) -> Tuple[List[Dict], Dict[str, Dict]]:
    """Load all chunks + standard meta from DB."""
    factory = get_session_factory(db_path)
    session = factory()
    try:
        chunks = session.query(Chunk).all()
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
        standards = session.query(Standard).all()
        meta_map = {
            r.standard_id: {
                "standard_id": r.standard_id,
                "normalized_identifier": r.normalized_identifier,
                "is_number": r.is_number,
                "title": r.title,
                "year": r.edition_year,
                "edition_year": r.edition_year,
            }
            for r in standards
        }
    finally:
        session.close()
    return chunk_dicts, meta_map


# ===========================================================================
# Index building (per-model, in temp dir)
# ===========================================================================

def build_temp_index(
    embedder: EmbeddingModel,
    chunk_dicts: List[Dict],
    cache_dir: Path,
    use_cache: bool = False,
) -> Tuple[SemanticIndex, BM25Index]:
    """
    Build (or load from cache) FAISS + BM25 for a given embedder.
    Stores in cache_dir/<sanitized_model_name>/.
    Does NOT touch data/indexes/ -- production index is never overwritten.
    """
    safe_name = embedder.model_name.replace("/", "__").replace("-", "_")
    model_cache = cache_dir / safe_name
    faiss_path = model_cache / "faiss.index"
    mapping_path = model_cache / "faiss_mapping.json"
    bm25_path = model_cache / "bm25.pkl"

    # BM25 is model-independent, cache once
    bm25_shared = cache_dir / "bm25.pkl"

    if use_cache and faiss_path.exists() and mapping_path.exists():
        print(f"  [cache] Loading FAISS from {model_cache}")
        sem = SemanticIndex.load(faiss_path, mapping_path)
    else:
        model_cache.mkdir(parents=True, exist_ok=True)
        texts = [c["text"] for c in chunk_dicts]
        print(f"  Encoding {len(texts)} passages ...")
        t0 = time.perf_counter()
        embeddings = embedder.encode_passages(texts)
        elapsed = time.perf_counter() - t0
        print(f"  Done in {elapsed:.1f}s | shape={embeddings.shape} | dim={embedder.dim}")

        sem = SemanticIndex(dim=embedder.dim)
        sem.add(embeddings.astype(np.float32), chunk_dicts)
        sem.save(faiss_path, mapping_path)

    if use_cache and bm25_shared.exists():
        bm25 = BM25Index.load(bm25_shared)
    else:
        bm25 = BM25Index()
        bm25.build(chunk_dicts)
        bm25.save(bm25_shared)

    return sem, bm25


# ===========================================================================
# Metric computation
# ===========================================================================

def _is_relevant(standard_id: str, relevant_ids: List[str]) -> bool:
    """Check if a returned standard_id matches any of the relevant ground truth IDs."""
    if not relevant_ids:
        return False
    sid_lower = standard_id.lower().replace("-", "_")
    for rid in relevant_ids:
        if rid.lower().replace("-", "_") == sid_lower:
            return True
    return False


def _semantic_relevance(
    top_results: List[Dict],
    relevant_topics: List[str],
    k: int = 5,
) -> float:
    """
    Topic-keyword overlap score (0-1).
    For each result in top-k, checks title/section text against relevant_topics keywords.
    """
    if not relevant_topics:
        return 0.0
    topic_tokens = set()
    for t in relevant_topics:
        topic_tokens.update(re.findall(r"[a-z0-9]+", t.lower()))

    scores = []
    for r in top_results[:k]:
        meta = r.get("meta", {})
        text = " ".join([
            str(meta.get("title", "")),
            str(meta.get("normalized_identifier", "")),
            str(r.get("text", "")),
        ]).lower()
        tokens = set(re.findall(r"[a-z0-9]+", text))
        if not topic_tokens:
            scores.append(0.0)
            continue
        overlap = len(topic_tokens & tokens) / len(topic_tokens)
        scores.append(overlap)

    return float(np.mean(scores)) if scores else 0.0


def compute_metrics_for_query(
    query_item: Dict,
    top_results: List[Dict],
    k_values: Tuple[int, ...] = (5, 10),
) -> Dict:
    """
    Compute all metrics for a single query given retrieval results.
    top_results: list of standard-level results (from rerank_standards), sorted by score desc.
    """
    relevant_ids = query_item.get("relevant_ids", [])
    relevant_topics = query_item.get("relevant_topics", [])
    is_negative = not relevant_ids  # negative query has no correct answer

    result_ids = [r["standard_id"] for r in top_results]
    relevances = [_is_relevant(sid, relevant_ids) for sid in result_ids]

    metrics = {}

    # Recall@k, Precision@k
    for k in k_values:
        top_k_rel = relevances[:k]
        n_relevant_total = len(relevant_ids)

        # Precision@k: fraction of top-k that are relevant
        prec_k = sum(top_k_rel) / k if k > 0 else 0.0

        # Recall@k: fraction of all relevant docs found in top-k
        if n_relevant_total > 0:
            rec_k = sum(top_k_rel) / n_relevant_total
        else:
            rec_k = 0.0  # negative query: recall is undefined -> 0

        metrics[f"precision@{k}"] = round(prec_k, 4)
        metrics[f"recall@{k}"] = round(rec_k, 4)

    # MRR: reciprocal rank of FIRST relevant result
    mrr = 0.0
    for rank, rel in enumerate(relevances, start=1):
        if rel:
            mrr = 1.0 / rank
            break
    metrics["mrr"] = round(mrr, 4)

    # Exact IS retrieval @5: did top-5 contain any exact match?
    metrics["exact_is_at5"] = int(any(relevances[:5]))

    # Semantic relevance @5
    metrics["semantic_relevance@5"] = round(
        _semantic_relevance(top_results, relevant_topics, k=5), 4
    )

    # False positive rate @5: non-relevant results in top-5 / 5
    fp_at5 = sum(1 for r in relevances[:5] if not r)
    metrics["fp_rate@5"] = round(fp_at5 / 5, 4)

    # Per-query metadata
    metrics["query_id"] = query_item["id"]
    metrics["query"] = query_item["query"]
    metrics["is_negative"] = is_negative
    metrics["category"] = query_item.get("category", "")
    metrics["top5_ids"] = result_ids[:5]
    metrics["relevant_ids"] = relevant_ids

    return metrics


def aggregate_metrics(per_query: List[Dict]) -> Dict:
    """Aggregate per-query metrics into macro averages."""
    # Separate positive and negative queries
    positive = [q for q in per_query if not q["is_negative"]]
    negative = [q for q in per_query if q["is_negative"]]

    def mean(vals):
        return round(float(np.mean(vals)), 4) if vals else 0.0

    agg = {}
    for metric in ["precision@5", "precision@10", "recall@5", "recall@10", "mrr",
                   "semantic_relevance@5"]:
        vals = [q[metric] for q in positive if metric in q]
        agg[metric] = mean(vals)

    # Exact IS@5: fraction of positive queries where top-5 had exact match
    agg["exact_is@5"] = mean([q["exact_is_at5"] for q in positive])

    # False positive rate: average over ALL queries (including negatives)
    agg["fp_rate@5"] = mean([q["fp_rate@5"] for q in per_query])

    # Negative query stats: for negative queries, top score should be low
    # (abstention proxy) -- not a standard metric but useful diagnostic
    agg["n_positive_queries"] = len(positive)
    agg["n_negative_queries"] = len(negative)
    agg["n_total_queries"] = len(per_query)

    return agg


# ===========================================================================
# Per-model evaluation runner
# ===========================================================================

def evaluate_model(
    model_name: str,
    chunk_dicts: List[Dict],
    meta_map: Dict,
    benchmark_queries: List[Dict],
    cfg: dict,
    cache_dir: Path,
    use_cache: bool = False,
    quick: bool = False,
) -> Dict:
    """Run full evaluation for one model. Returns {model, aggregate, per_query, timing}."""
    print(f"\n{'='*70}")
    print(f"  Evaluating: {model_name}")
    print(f"{'='*70}")

    emb_cfg = dict(get_embedding_cfg(cfg))
    emb_cfg["model"] = model_name

    t_load_start = time.perf_counter()
    embedder = EmbeddingModel.from_config(emb_cfg)
    print(f"  Dim detected: {embedder.dim}")
    print(f"  Query prefix: {embedder._cfg.query_prefix!r}")
    print(f"  Passage prefix: {embedder._cfg.passage_prefix!r}")

    # Build / load temp index
    sem, bm25 = build_temp_index(embedder, chunk_dicts, cache_dir, use_cache)
    t_index_done = time.perf_counter()
    print(f"  Index ready in {t_index_done - t_load_start:.1f}s | FAISS ntotal={sem.index.ntotal}")

    ret_cfg = cfg.get("retrieval", {})
    sem_w = ret_cfg.get("semantic_weight", 0.5)
    bm25_w = ret_cfg.get("bm25_weight", 0.3)
    meta_w = ret_cfg.get("metadata_weight", 0.2)

    queries_to_run = benchmark_queries
    if quick:
        queries_to_run = [q for q in benchmark_queries if q.get("difficulty") != "negative"]
        print(f"  Quick mode: running {len(queries_to_run)} positive queries only")

    per_query_results = []
    t_q_start = time.perf_counter()

    for item in queries_to_run:
        q = item["query"]
        q_emb = embedder.encode_query(q)

        sem_res = sem.search(q_emb, top_k=EVAL_TOP_K * 2)
        bm25_res = bm25.search(q, top_k=EVAL_TOP_K * 2)
        is_nums = extract_is_from_query(q)
        hybrid = hybrid_search(
            q, sem_res, bm25_res,
            semantic_weight=sem_w,
            bm25_weight=bm25_w,
            metadata_weight=meta_w,
            extract_is_numbers=is_nums,
        )
        reranked = rerank_standards(hybrid, meta_map, q)

        qm = compute_metrics_for_query(item, reranked, k_values=(5, 10))
        per_query_results.append(qm)

        rel_symbol = "[OK]" if qm["exact_is_at5"] else ("--" if item.get("relevant_ids") == [] else "[FAIL]")
        print(
            f"  [{rel_symbol}] {item['id']} | P@5={qm['precision@5']:.2f} "
            f"R@5={qm['recall@5']:.2f} MRR={qm['mrr']:.2f} "
            f"| top1={reranked[0]['standard_id'] if reranked else 'none'}"
        )

    t_q_done = time.perf_counter()
    query_time = t_q_done - t_q_start

    aggregate = aggregate_metrics(per_query_results)
    aggregate["query_time_s"] = round(query_time, 2)
    aggregate["index_build_time_s"] = round(t_index_done - t_load_start, 2)

    print(f"\n  > Aggregate metrics ({model_name}):")
    print(f"    Recall@5    = {aggregate['recall@5']:.4f}")
    print(f"    Recall@10   = {aggregate['recall@10']:.4f}")
    print(f"    Precision@5 = {aggregate['precision@5']:.4f}")
    print(f"    Precision@10= {aggregate['precision@10']:.4f}")
    print(f"    MRR         = {aggregate['mrr']:.4f}")
    print(f"    Exact IS@5  = {aggregate['exact_is@5']:.4f}")
    print(f"    Sem Rel@5   = {aggregate['semantic_relevance@5']:.4f}")
    print(f"    FP Rate@5   = {aggregate['fp_rate@5']:.4f}")

    return {
        "model": model_name,
        "dim": embedder.dim,
        "aggregate": aggregate,
        "per_query": per_query_results,
    }


# ===========================================================================
# Report generation
# ===========================================================================

def print_comparison_table(results: List[Dict]):
    """Print side-by-side comparison table to stdout."""
    metrics_order = [
        ("Recall@5",     "recall@5"),
        ("Recall@10",    "recall@10"),
        ("Precision@5",  "precision@5"),
        ("Precision@10", "precision@10"),
        ("MRR",          "mrr"),
        ("Exact IS@5",   "exact_is@5"),
        ("Sem Rel@5",    "semantic_relevance@5"),
        ("FP Rate@5",    "fp_rate@5"),
    ]

    col_w = 22
    header = f"{'Metric':<20}" + "".join(f"{r['model'].split('/')[-1][:col_w]:<{col_w}}" for r in results)
    print("\n" + "=" * (20 + col_w * len(results)))
    print("EMBEDDING MODEL COMPARISON -- BIS RETRIEVAL BENCHMARK")
    print("=" * (20 + col_w * len(results)))
    print(header)
    print("-" * (20 + col_w * len(results)))

    for label, key in metrics_order:
        vals = [r["aggregate"].get(key, 0.0) for r in results]
        best_idx = (
            vals.index(min(vals)) if "fp" in key.lower()
            else vals.index(max(vals))
        )
        row = f"{label:<20}"
        for i, (r, v) in enumerate(zip(results, vals)):
            marker = " <" if i == best_idx else "  "
            row += f"{v:<{col_w - 2}.4f}{marker}"
        print(row)

    print("-" * (20 + col_w * len(results)))
    # Index build time
    row = f"{'Build time (s)':<20}"
    for r in results:
        t = r["aggregate"].get("index_build_time_s", 0)
        row += f"{t:<{col_w}.1f}"
    print(row)

    print("=" * (20 + col_w * len(results)))
    print("< = best value for that metric\n")


def pick_winner(results: List[Dict]) -> str:
    """Simple heuristic: rank models by weighted composite score."""
    weights = {
        "recall@5": 0.25,
        "recall@10": 0.15,
        "precision@5": 0.20,
        "mrr": 0.20,
        "exact_is@5": 0.10,
        "semantic_relevance@5": 0.07,
        "fp_rate@5": -0.03,  # negative: lower is better
    }
    best_model = None
    best_score = -1.0
    for r in results:
        agg = r["aggregate"]
        score = sum(w * agg.get(k, 0.0) for k, w in weights.items())
        r["_composite_score"] = round(score, 4)
        if score > best_score:
            best_score = score
            best_model = r["model"]
    return best_model


def write_report(results: List[Dict], output_path: Path, winner: str):
    """Write markdown evaluation report."""
    lines = [
        "# BIS Embedding Model Evaluation Report",
        "",
        f"**Corpus:** BIS Indian Standards (from `data/bis.db`)",
        f"**Benchmark:** `data/benchmark_labelled.json`",
        f"**Models evaluated:** {len(results)}",
        "",
        "## Summary Comparison",
        "",
        "| Metric | " + " | ".join(r['model'].split('/')[-1] for r in results) + " |",
        "|--------|" + "|".join(["--------"] * len(results)) + "|",
    ]

    metrics_order = [
        ("Recall@5",     "recall@5"),
        ("Recall@10",    "recall@10"),
        ("Precision@5",  "precision@5"),
        ("Precision@10", "precision@10"),
        ("MRR",          "mrr"),
        ("Exact IS@5",   "exact_is@5"),
        ("Sem Rel@5",    "semantic_relevance@5"),
        ("FP Rate@5",    "fp_rate@5"),
        ("Build time (s)", "index_build_time_s"),
    ]

    for label, key in metrics_order:
        vals = [r["aggregate"].get(key, 0.0) for r in results]
        row_cells = []
        for v in vals:
            row_cells.append(f"{v:.4f}")
        lines.append(f"| {label} | " + " | ".join(row_cells) + " |")

    lines += [
        "",
        "## Recommended Model",
        "",
        f"**{winner}**",
        "",
        "> Based on composite weighted score: Recall@5 (25%), Precision@5 (20%), "
        "MRR (20%), Recall@10 (15%), Exact IS@5 (10%), Semantic Relevance (7%), "
        "FP Rate (?3%).",
        "",
        "## Per-Query Results",
        "",
    ]

    for r in results:
        lines.append(f"### {r['model']}")
        lines.append("")
        lines.append("| Query ID | Category | P@5 | R@5 | MRR | ExactIS | Top-1 Retrieved |")
        lines.append("|----------|----------|-----|-----|-----|---------|-----------------|")
        for q in r["per_query"]:
            top1 = q["top5_ids"][0] if q["top5_ids"] else "none"
            lines.append(
                f"| {q['query_id']} | {q['category']} | {q['precision@5']:.2f} | "
                f"{q['recall@5']:.2f} | {q['mrr']:.2f} | {'[OK]' if q['exact_is_at5'] else '[FAIL]'} | {top1} |"
            )
        lines.append("")

    lines += [
        "## Notes",
        "",
        "- Models were evaluated on the currently ingested BIS corpus chunks in `data/bis.db`.",
        "- Indexes were built in a temporary directory -- production indexes NOT overwritten.",
        "- BGE models use `'Represent this sentence: '` query prefix automatically.",
        "- E5 models use `'query: '` / `'passage: '` prefixes automatically.",
        "- Negative queries (Q20, Q21) test false-positive rate -- not included in Recall/Precision averages.",
        "- After selecting the best model, run: `python scripts/rebuild_index.py --force-rebuild`",
    ]

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n[OK] Report saved -> {output_path}")


# ===========================================================================
# Entry point
# ===========================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Evaluate and compare embedding models on the BIS corpus"
    )
    parser.add_argument(
        "--models", nargs="+", default=None,
        help=f"Models to evaluate. Defaults to all supported: {ALL_MODELS}",
    )
    parser.add_argument(
        "--benchmark", type=Path,
        default=ROOT / "data" / "benchmark_labelled.json",
        help="Path to labelled benchmark JSON (default: data/benchmark_labelled.json)",
    )
    parser.add_argument(
        "--quick", action="store_true",
        help="Skip negative queries -- faster run for development iteration",
    )
    parser.add_argument(
        "--cache-indexes", action="store_true",
        help="Reuse previously built temp indexes (skip encoding step if cache exists)",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=ROOT / "data",
        help="Directory for output files (default: data/)",
    )
    args = parser.parse_args()

    models_to_eval = args.models or ALL_MODELS
    print(f"BIS Embedding Model Evaluation")
    print(f"Models  : {models_to_eval}")
    print(f"Benchmark: {args.benchmark}")

    if not args.benchmark.exists():
        print(f"ERROR: Benchmark file not found: {args.benchmark}")
        print("Run from bis-engine root or specify --benchmark path.")
        sys.exit(1)

    cfg = load_config()
    paths = cfg.get("paths", {})
    db_path = ROOT / paths.get("db_path", "data/bis.db")

    if not db_path.exists():
        print(f"ERROR: DB not found: {db_path}. Run ingest.py first.")
        sys.exit(1)

    print(f"\nLoading corpus chunks from {db_path} ...")
    chunk_dicts, meta_map = load_corpus_chunks(db_path)
    print(f"  {len(chunk_dicts)} chunks | {len(meta_map)} standards")

    benchmark_queries = load_benchmark(args.benchmark)
    print(f"  {len(benchmark_queries)} benchmark queries loaded")

    # Temp dir for model-specific indexes (never overwrites production index)
    cache_dir = ROOT / "data" / "_eval_index_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    print(f"  Temp index cache: {cache_dir}")

    all_results = []
    for model_name in models_to_eval:
        try:
            result = evaluate_model(
                model_name=model_name,
                chunk_dicts=chunk_dicts,
                meta_map=meta_map,
                benchmark_queries=benchmark_queries,
                cfg=cfg,
                cache_dir=cache_dir,
                use_cache=args.cache_indexes,
                quick=args.quick,
            )
            all_results.append(result)
        except Exception as e:
            print(f"\n  ERROR evaluating {model_name}: {e}")
            import traceback
            traceback.print_exc()

    if not all_results:
        print("No models evaluated successfully. Exiting.")
        sys.exit(1)

    # ---- Results output -------------------------------------------------------
    print_comparison_table(all_results)

    winner = pick_winner(all_results)
    print(f"[WINNER]  Recommended model: {winner}")
    print(f"    (Composite score: {next(r['_composite_score'] for r in all_results if r['model']==winner):.4f})")

    # Composite scores table
    print("\nComposite scores (weighted):")
    for r in sorted(all_results, key=lambda x: x.get("_composite_score", 0), reverse=True):
        marker = " < RECOMMENDED" if r["model"] == winner else ""
        print(f"  {r['model']:<50} {r.get('_composite_score', 0):.4f}{marker}")

    # Save raw results JSON
    args.output_dir.mkdir(parents=True, exist_ok=True)
    results_path = args.output_dir / "embedding_eval_results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "models_evaluated": models_to_eval,
                "winner": winner,
                "results": [
                    {k: v for k, v in r.items() if not k.startswith("_")}
                    for r in all_results
                ],
            },
            f, indent=2, ensure_ascii=False
        )
    print(f"\n[OK] Raw results -> {results_path}")

    # Save markdown report
    report_path = args.output_dir / "embedding_eval_report.md"
    write_report(all_results, report_path, winner)

    print(f"\nNext steps:")
    print(f"  1. Review {report_path}")
    print(f"  2. Update config/config.yaml: embedding.model: \"{winner}\"")
    print(f"  3. Rebuild production index: python scripts/rebuild_index.py --force-rebuild")


if __name__ == "__main__":
    main()
