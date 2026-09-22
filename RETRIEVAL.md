# RETRIEVAL — Semantic + Lexical + Metadata Hybrid

## Overview

Core retrieval is **retrieval-first, retrieval-only**: authoritative information comes from retrieved BIS corpus evidence, never from LLM generation.

## Chunking

**Pipeline:** `src/ingestion/pipeline.py :: _chunk_pages`

- Semantic chunking: section → paragraph (double newline) → sentences, packing to `target_tokens 500` (max 700) with `words*1.3` token estimate.
- Overlap only when necessary; preserve section/page provenance; never split tables arbitrarily; reject chunks <40 chars or <10 tokens, or >6000 chars (garbage).
- Example chunk: `{chunk_id: IS1448P97_2026_P06_C03, standard_id: IS_1448_Part_97_2026, section: Apparatus, page: 6, text: "...", chunk_type: requirements}`

## Embeddings

**Module:** `src/retrieval/embeddings.py` (`EmbeddingModel`) + `src/retrieval/embedding_registry.py`

- Model: configured via `config/config.yaml` → `embedding.model`. **Default:** `BAAI/bge-small-en-v1.5` (384d).
- Supported models: `BAAI/bge-small-en-v1.5` (384d), `BAAI/bge-base-en-v1.5` (768d), `sentence-transformers/all-MiniLM-L6-v2` (384d), `intfloat/e5-base-v2` (768d).
- **Dimension detected dynamically** via `get_sentence_embedding_dimension()` — never hardcoded anywhere.
- **Query/passage prefixes** applied automatically: BGE uses `"Represent this sentence: "` for queries; E5 uses `"query: "`/`"passage: "`. MiniLM uses no prefix. See `embedding_registry.py`.
- `EmbeddingModel.from_config(cfg_dict)` factory reads from config dict; `encode_query()` applies query prefix; `encode_passages()` applies passage prefix; `encode_single()` is backward-compat alias for `encode_query()`.
- Batch size, device, normalize all configurable. CPU, deterministic.

## FAISS

**Module:** `src/retrieval/semantic_search.py` (`SemanticIndex`)

- `faiss.IndexFlatIP` for normalized vectors (cosine via IP).
- Stores `id_to_chunk` mapping vector_id → chunk dict; `chunk_to_id` reverse; persists as `faiss.index` + `faiss_mapping.json`.
- `search(query_emb, top_k=20)` returns `{chunk_id, text, meta, semantic_score, vector_id}`.
- Incremental `add(embeddings, chunks)` — for MVP full rebuild via `scripts/rebuild_index.py`.
- **`index_meta.json` sidecar** stored alongside index: `{model, dim, built_at, chunk_count}`. `rebuild_index.py` writes it; API and rebuild script read it to detect model/dim mismatches.

## BM25

**Module:** `src/retrieval/bm25_search.py` (`BM25Index`)

- Mandatory per spec: handles exact IS numbers, grades, abbreviations, test method codes that semantic may miss.
- Tokenizer: `re.findall(r"[a-z0-9]+(?:[_\-./][a-z0-9]+)*", text.lower())` preserves `IS_1448`, `Part_97`, `JFTOT`.
- Also adds metadata tokens (`standard_id`, `section`) per chunk for IS number bonus.
- `rank-bm25` `BM25Okapi`; `search(query, top_k=20)` returns `bm25_score`.

## Hybrid

**Module:** `src/retrieval/hybrid_search.py`

Conceptual score (spec 28):

```
final = semantic_w * semantic_norm + bm25_w * bm25_norm + metadata_bonus
metadata_bonus = 0.15 per exact IS number found in text (capped 0.3)
single-source penalty 0.85 if only one modality present
semantic_norm, bm25_norm = min-max normalized within each modality
```

Initial weights configurable: `semantic 0.50, bm25 0.30, metadata 0.20` (tunable, not hard-coded as optimal).

Procedure:
1. Normalize semantic and BM25 scores separately (min-max).
2. Build `chunk_id → entry` map merging both lists, tracking `sources: ["semantic"]` or `["bm25"]` or both.
3. Compute `hybrid_score`, sort descending → ranked hybrid chunks.

IS number extraction for bonus: `IS\s*\d+(?:\s*\(?\s*Part\s*\d+[^\)]*\)?)?\s*:?\s*\d{4}?`.

## Reranking

**Module:** `src/retrieval/reranker.py` (`rerank_standards`)

Groups hybrid chunks by `standard_id`, computes standard-level score:

- `semantic_agg = 0.6*best_hybrid + 0.4*avg_top3_hybrid`
- `title_score = |query_tokens ∩ title_tokens| / |query_tokens|`
- `scope_score = max hybrid of chunks where section=="Scope"` (+0.15)
- `material_score = material keyword overlap (steel, aluminium, petroleum, etc.)`
- `status_score = (year-2000)/26` (recency, 2000-2026 normalized)
- `final = 0.50*semantic + 0.20*title + 0.15*scope + 0.10*material + 0.05*status` (configurable `rerank_weights`).

Returns ranked standards with `evidence_chunks` top-3, `components` breakdown, `chunk_count`.

## Query understanding

**Module:** `src/recommendation/query_understanding.py` + `src/tender/*`

- Input may be natural language or tender PDF.
- `tender/extractor.py` extracts structured `requirements` (product/material/application/capacity/dimensions/testing/safety/IS refs with page evidence).
- `tender/normalizer.py` builds query expansion: product + material + application + capacity + top keywords (TF) + testing cues.
- Keeps tender vs standard dimensions separate — never confuses sources.

## Candidate generation

`recommendation/ranking.py :: recommend_for_query`:

```
q_emb = embedder.encode_single(query_text)
sem_res = sem_index.search(q_emb, top_k=20)
bm_res = bm25.search(query_text, top_k=20)
hybrid = hybrid_search(query, sem_res, bm_res, weights)
ranked = rerank_standards(hybrid, meta_map, query)
```

## Evidence, abstention, version checker

- `evidence.py`: pullsDB `standard`, `specs` (12), `tables` (5), `figures` (5 confirmed), `references` (10), `compliance` (5) plus top-3 evidence chunks with page/section/text.
- `abstention.py`: if top `score <0.25` or no evidence → `ABSTAIN` (INSSUFFICIENT_EVIDENCE) with reason string; else HIGH (≥0.65)/MEDIUM (≥0.40)/LOW.
- `version_checker.py`: parses tender IS refs and corpus IS numbers (base `IS N [Part P]` + year) → if tender year < corpus max year for same base → warning "Latest available edition in corpus: ...".

## Hallucination safeguards

- Hard validation: every returned `standard_id` checked against `meta_map` keys (DB); fake IS numbers never emitted.
- Every citation (evidence, tables, figures, references) validated against DB/document/page/section/chunk_id.
- No fake probabilities — confidence is evidence-based bucket.

## Evaluation

`scripts/evaluate_embeddings.py` multi-model benchmark (22 queries, all 4 supported models):

**Metrics per model:** Recall@5, Recall@10, Precision@5, Precision@10, MRR, Exact IS@5, Semantic Relevance@5, False Positive Rate@5.

Legacy `scripts/evaluate.py` benchmark (5 queries, 100% P@5 on 682-chunk corpus):

- "thermal oxidation stability..." → IS 1448 P97
- "pressure tunnels..." → IS 12633
- "explosive atmospheres..." → IS 16724
- "yoga terminology..." → IS 17874 P2
- "aviation turbine fuel..." → IS 1448 P186/P97

See `EVALUATION.md`.
