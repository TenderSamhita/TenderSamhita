# ARCHITECTURE — BIS Procurement Standards Recommendation Engine

## Overview

Retrieval-first, evidence-grounded system. No hallucination; every output cites exact BIS source.

```
Procurement Officer
       |
Tender PDF / Text
       |
Tender Parser (PyMuPDF page-preserving) → Requirement Extractor (regex + keyword)
       |
Structured Requirements (product, material, application, capacity, dimensions, testing, safety, IS refs, evidence)
       |
Query Normalization → Hybrid Retrieval
       |
BIS Knowledge Base  (standards, sections, chunks, specifications, tables, figures, references, compliance)
       |
FAISS (IndexFlatIP, normalized) + BM25 (rank-bm25) + metadata bonus
       |
Union Top 20+20 → Rerank (semantic 50%, title 20%, scope 15%, material 10%, recency 5%)
       |
Evidence Assembly (scope/technical evidence, tables, figures, references, compliance)
       |
Abstention gate (HIGH/MEDIUM/LOW/INSUFFICIENT_EVIDENCE, threshold 0.25) + Version checker (old IS → newer in corpus)
       |
Final Recommendations + Tender vs Standard comparison matrix
       |
Procurement Officer Review
```

## Data model (SQLite, SQLAlchemy)

`standards` (is_number, normalized_identifier, title, year, ...), `sections` (hierarchy), `chunks` (page, section, text, chunk_type, embedding_id), `specifications` (property/value/unit/tolerance/condition), `tables` (caption, headers, rows, bbox, confidence), `figures` (caption, bbox, image_path, is_confirmed, duplicate_group), `references` (target_identifier, relationship_type, page), `compliance` (type, value, source), `documents` (hash, parse_status, ocr_required).

Canonical JSON per PDF: `{document, metadata, sections, chunks, specifications, tables, figures, references, compliance}` — `data/processed/json/*.json` is source of truth for DB and indexes.

## Ingestion pipeline (`src/ingestion/pipeline.py`)

`scanner.probe → text_extractor.extract_pages → metadata.extract_metadata → heading_detector.detect_sections → table_extractor → figure_extractor (with image_filter) → specification_extractor → reference_extractor → compliance_extractor → chunking (semantic, 300-700 tokens, preserve sections/tables) → JSON → SQLite`

- Page boundaries never flattened; every chunk knows document/page/section.
- Hash-based incremental skip; one bad PDF never stops corpus.
- Per-PDF timing and status logged (SUCCESS/PARTIAL/OCR_REQUIRED/FAILED).

## Retrieval

- **Embeddings (Pluggable):** Configured via `config/config.yaml` → `embedding.model`. Default: `BAAI/bge-small-en-v1.5` (384d). Supported models: `BAAI/bge-small-en-v1.5`, `BAAI/bge-base-en-v1.5`, `sentence-transformers/all-MiniLM-L6-v2`, `intfloat/e5-base-v2`. Dimension detected **dynamically** — never hardcoded. BGE/E5 models have query/passage prefixes applied automatically via `embedding_registry.py`.
- **FAISS:** `IndexFlatIP` (cosine via IP on normalized vectors); mapping vector_id → chunk_id stored separately in JSON. Model name + dim stored in `index_meta.json` sidecar; API warns on model/index mismatch.
- **BM25:** exact IS numbers, grades, test method codes — critical where semantic fails.
- **Hybrid:** `final = 0.5*semantic_norm + 0.3*bm25_norm + 0.2*metadata_bonus` (metadata_bonus for exact IS number match, capped 0.3), single-source penalty 0.85, configurable via `config.yaml`.
- **Rerank:** group chunks by standard_id; aggregate max + avg top-3 hybrid; score title overlap, scope signal, material signal, recency (year 2000-2026 normalized).

## Tender understanding (`src/tender/`)

PDF upload → PyMuPDF page extraction (same as standards, reuses code) OR plain text. Extractor finds product, material, application, capacity, dimensions (with page evidence), testing/safety keywords, IS refs (for version checking), top keywords. Normalizer builds query expansion from product/material/application/capacity/keywords/testing.

Dimension rule: tender dimensions (source=tender) kept separate from standard dimensions (source=standard); never silently overwrites.

## Recommendation & safeguards

- `recommendation/ranking.py` orchestrates hybrid → rerank.
- `evidence.py` assembles scope/technical evidence, specs, tables, figures, references from DB using top-3 chunks as evidence.
- `abstention.py`: if top score <0.25 or no evidence → abstain with reason "Insufficient evidence...".
- `version_checker.py`: compares tender IS year vs corpus max year per IS base (IS number + Part) → warning "Latest available edition in corpus: ...".
- Hard validation (spec 43): every returned `standard_id` must exist in `meta_map` (DB); fake IS numbers never emitted.
- No fake citations: every evidence cites existing document/page/section/chunk_id.

## API (`src/api/`)

FastAPI, CORS open for demo. All paths resolved relative to project root (absolute or `D:\BIS\bis-engine\...`). Serves frontend `frontend/dist` at `/` when built, `/figures` statics. Retrieval singletons lazily loaded from `data/indexes` + DB meta_map.

## UI (`frontend/src/App.jsx`)

Government-oriented layout: header (BIS blue), four sequential cards (Upload → AI understanding → Recommended standards → Comparison). No chatbot chrome. Evidence panels show page/section/chunk_id + quoted text; deep dive reveals specs/tables/figures/references.

## Scaling

- 1304 PDFs → ~20k-40k pages → 60k-130k chunks → FAISS 60k×384 ≈ 90 MB RAM.
- Batch embeddings, streaming ingestion, hash skip, persistent indexes.
- Designed for 20k PDFs with incremental indexing (future IVF).

## Security

Upload validation, size limit, safe temp names, no path traversal, no filesystem path exposure via API.

## Config

`config/config.yaml` centralizes all thresholds, weights, paths, OCR triggers, figure bands, chunk sizes, FAISS/BM25 params.

## Embedding Model Selection

Model is configured via `config.yaml` `embedding.model`. To change model:
1. Update `embedding.model` in `config.yaml`
2. Run `python scripts/rebuild_index.py --force-rebuild` (dim is detected automatically)
3. Optionally run `python scripts/evaluate_embeddings.py` first to benchmark candidates

See `src/retrieval/embedding_registry.py` for registered models and their prefix strategies.
