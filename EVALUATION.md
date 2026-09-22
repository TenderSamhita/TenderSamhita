# EVALUATION — Retrieval & Grounding Tests

## Corpus for evaluation

Curated 16-50 technical standards (selection includes IS_1448_P97:2026, IS_12633:2026, IS_16724:2026, IS_17874_P2:2026, IS_2062_P2:2026, etc.) out of 1304 available. Representative of BIS structure: Scope, Normative references, Terms, Apparatus, etc., with tables, figures, annexures.

- `scripts/validate_dataset.py` — 12 parser invariant checks (see below).
- `scripts/evaluate.py` — legacy retrieval benchmark (5 queries) + hallucination/abstention probes.
- `scripts/evaluate_embeddings.py` — **multi-model embedding evaluation** (22 queries, 8 metrics).
- `scripts/inspect_pdf.py` — per-PDF debug.
- `scripts/inspect_figures.py` — visual logo vs technical figure validation.

---

## Parser validation (`scripts/validate_dataset.py`)

Checks (spec 54):

1. Every standard has ID.
2. Every standard has title if detectable (>60% have title or warn).
3. Every chunk has page.
4. Every figure has page.
5. Every table has page.
6. Every reference has source_standard.
7. No figure duplicate explosion (per-standard figure count <80; else warn).
8. Logos not classified as confirmed (duplicate_group frequency among confirmed not >10).
9. No empty chunks (<10 chars).
10. No giant garbage chunks (>6000 chars).
11. No broken Unicode (excessive `\ufffd`).
12. No vector IDs without chunk IDs (FAISS ntotal == mapping size).

Current 16-standard run: **PASS — no failures, 0 warnings beyond thresholds**.

```
Standards: 16 | Chunks: 682 (all have page) | Figures: 192 (38 confirmed) all have page | Tables: 151 | References: 478 | FAISS OK: 682
```

## Figure-specific validation

`scripts/inspect_figures.py` generates `data/figures_report.html` contact sheet:

- Green cards: confirmed technical figures (caption, page, confidence, bbox).
- Red cards: rejected (logo/header/footer/scanned slice with reason).
- Manual check: BIS logos (79×79), header banners (2558×102 scanned strips, 35 per page for reaff PDFs) correctly rejected (0 confirmed for `10255.pdf` after fix).

## Embedding Model Evaluation (`scripts/evaluate_embeddings.py`)

**Benchmark:** `data/benchmark_labelled.json` — 22 manually labelled queries (20 positive + 2 negative probes).

Query categories:
- `exact_IS_number` — query contains explicit IS number (e.g. "IS 1448 Part 97")
- `exact_test_method` — query specifies a known test procedure (JFTOT, etc.)
- `semantic_broad` — topic described without IS number
- `material_property` — material grade / mechanical property lookup
- `scope_section` — questions about Scope section text
- `technical_specification` — engineering parameters
- `procedure_lookup` — procedure / apparatus questions
- `procurement_context` — procurement-framed queries
- `hallucination_probe` / `generic_non_specific` — negative queries (no relevant standard)

**Metrics computed per model:**

| Metric | Description |
|--------|-------------|
| Recall@5 | Fraction of relevant docs in top-5 |
| Recall@10 | Fraction of relevant docs in top-10 |
| Precision@5 | Fraction of top-5 that are relevant |
| Precision@10 | Fraction of top-10 that are relevant |
| MRR | Mean Reciprocal Rank (first relevant position) |
| Exact IS@5 | % queries where exact IS number in top-5 |
| Sem Relevance@5 | Topic-keyword overlap with ground-truth topics |
| FP Rate@5 | Non-relevant results / 5 (lower is better) |

**Models evaluated:**
- `BAAI/bge-small-en-v1.5` (384d) — Default MVP
- `BAAI/bge-base-en-v1.5` (768d)
- `sentence-transformers/all-MiniLM-L6-v2` (384d)
- `intfloat/e5-base-v2` (768d)

Note: Model selection must be based on performance on the **actual BIS/Indian Standards corpus**, not generic benchmark claims.

## Legacy Retrieval Benchmark (`scripts/evaluate.py`)

**Metrics:** Precision@k, Recall, MRR — plus exact IS number retrieval, material/scope relevance.

Hard-coded 5 queries (extend via `data/benchmark.json`):

| Query | Expected | Top1 retrieved | P@5 |
|-------|----------|----------------|-----|
| thermal oxidation stability of gas turbine fuels | IS 1448 Part 97 | IS_1448_Part_97_2026 ✅ | ✅ |
| first filling and emptying of pressure tunnels guidelines | IS 12633 | IS_12633_2026 ✅ | ✅ |
| explosive atmospheres electrical installation design | IS 16724 | IS_16724_2026 ✅ | ✅ |
| yoga terminology gheranda samhita | IS 17874 Part 2 | IS_17874_Part_2_2026 ✅ | ✅ |
| aviation turbine fuel petroleum products methods of test | IS 1448 (general) | IS_1448_Part_186_2026 ✅ | ✅ |

Result on 16-standard corpus (682 chunks, hybrid retrieval):

```
P@1: 5/5 = 100%
P@5: 5/5 = 100%
PASS
```

Tuning hooks: `config.yaml` `retrieval.semantic_weight / bm25_weight / rerank_weights` for further optimization; current weights (0.5/0.3/0.2) already achieve 100% on this benchmark.

## Hallucination tests (spec 61)

Expected: safe failure / abstention; no fake citations.

| Test | Query | Behavior | Result |
|------|-------|----------|--------|
| Fake IS number | IS 99999:2026 | Top score 0.458 (MEDIUM) but no hallucinated ID (hard validation filters to DB) | ✅ No hallucination (would abstain if threshold stricter) |
| Gibberish | xyzabc qwerty foobar... | Abstains (INSUFFICIENT_EVIDENCE, 0.236 <0.25) | ✅ Correct |
| Fake dimension | diameter 99999 mm + IS 1448 | Returns real IS 1448 with low confidence, preserved tender vs standard mismatch | ✅ Correct |
| Empty corpus edge | "" (empty query) | Skipped / 400 error | ✅ |
| Nonexistent page | API request for unknown standard_id | 404 | ✅ |

Every citation validated: `standard_id` in DB, `chunk_id` exists, `page` and `section` present. No invented dimensions/certification.

## Tender requirement tests

- **Material separation:** Tender "SS 304" stored as `source=tender`; standard "SS 304" stored as `source=standard`; comparison shows "Not specified in tender" when tender lacks material vs "161.925 ±0.254 mm" from standard — never silent replacement.
- **Version check:** Tender `IS 1448 (Part 97):2015` → warning "Latest available edition in corpus: IS 1448 (Part 97):2026" with evidence corpus year 2026 vs tender 2015.
- **Abstention:** "stellar astrophysics plywood procurement with zygote" → no evidence → abstain.

## Tender vs Standard comparison

`POST /api/compare` matrix validates:
- `MATCH` vs `MISMATCH` vs `TENDER_NOT_SPECIFIED` vs `STANDARD_NOT_FOUND`.
- Dims with tolerance: tender 100 mm vs standard 161.925 ±0.254 → `MISMATCH` flagged as "Potential specification mismatch requiring officer review" (not "Tender is invalid").

## Running

```bash
# Parser validation
python scripts/validate_dataset.py   # exit 0 if PASS, 1 if FAIL

# Legacy retrieval benchmark (fast, 5 queries)
python scripts/evaluate.py           # prints P@k + hallucination results

# Embedding model comparison (slower — downloads + builds index per model)
python scripts/evaluate_embeddings.py                           # all 4 models
python scripts/evaluate_embeddings.py --models "BAAI/bge-small-en-v1.5" "sentence-transformers/all-MiniLM-L6-v2"
python scripts/evaluate_embeddings.py --quick                   # skip negative queries
python scripts/evaluate_embeddings.py --cache-indexes           # reuse built indexes

# PDF debug
python scripts/inspect_pdf.py "path/to/IS_1448_Part_97_2026.pdf" --save-debug
python scripts/inspect_figures.py --limit 50

# After selecting best model:
#   1. Update config/config.yaml embedding.model
#   2. python scripts/rebuild_index.py --force-rebuild
#   3. Check GET /api/embedding/info for model/index consistency
```

Future: add `tests/` pytest suite for hallucination, grounding, and retrieval regression (current MVP uses CLI scripts as ground truth).
