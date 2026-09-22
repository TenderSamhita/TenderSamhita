# BIS Procurement Standards Recommendation Engine — SIH26108

**AI recommends. Evidence explains. Procurement officer decides.**

Evidence-grounded AI system that recommends applicable Indian Standards (IS) for procurement specifications, with exact page/section/table/figure provenance and zero hallucinations.

---

## 1. What it does

- Accepts **procurement tender PDF** or natural-language requirement.
- Parses tender into structured requirements (product, material, application, capacity, dimensions, testing, safety, referenced IS).
- **Hybrid retrieval** (semantic MiniLM-L6-v2 FAISS + BM25 lexical + metadata bonus) over a local corpus of BIS standards (1304 PDFs, scales to 20k).
- Reranks candidates by title/scope/material/recency; returns Top-5 with evidence.
- Shows **page/section/chunk/table/figure/reference provenance** for every recommendation.
- Extracts **technical specifications, tables, figures, normative references, compliance/QCO** from standards.
- Tender-vs-Standard comparison matrix (MATCH / MISMATCH / TENDER_NOT_SPECIFIED) — never auto-invalidates tender.
- **Version checker:** flags tender referencing old edition when newer available in corpus.
- **Abstains** when evidence insufficient; never hallucinates IS numbers or clauses.

---

## 2. Architecture

```
Tender PDF/Text
  → Tender Parser + Requirement Extractor
  → Query Understanding
  → Hybrid Retrieval (FAISS + BM25 + metadata)
  → Candidate Standards → Reranking → Evidence Verification
  → Final Recommendations + Tables/Figures/References/Compliance
  → Tender vs Standard Comparison
  → Officer Review
```

See `ARCHITECTURE.md` for detailed pipeline.

---

## 3. Installation

**Python 3.10**, CPU-only (GPU optional). Node 22 for frontend.

```bash
pip install -r requirements.txt   # pymupdf, pdfplumber, sentence-transformers, faiss-cpu, rank-bm25, FastAPI, etc.
# Frontend
cd frontend && npm install && npm run build
```

No internet required at retrieval time — corpus is local.

Configuration: `config/config.yaml`

```yaml
paths:
  raw_pdfs: "D:/BIS/AI_RECOMMENDATION_ENGINE-scraper/.../BIS_PDFs_Part1"
  db_path: "data/bis.db"
  indexes_dir: "data/indexes"
retrieval:
  semantic_weight: 0.5
  bm25_weight: 0.3
  metadata_weight: 0.2
```

---

## 4. Dataset structure

Corpus is **already downloaded** — do not scrape at runtime.

```
data/raw_pdfs  → configured to existing BIS_PDFs_Part1 (1304 PDFs, ~1.95 GB)
data/processed/json     → canonical per-PDF JSON (metadata/sections/chunks/tables/figures/refs/specs)
data/processed/figures  → confirmed technical figure crops
data/processed/tables   → (future: table images if needed)
data/bis.db            → SQLite (standards, sections, chunks, specs, tables, figures, references, compliance)
data/indexes/faiss.index + faiss_mapping.json + bm25.pkl
```

Incremental ingestion: SHA-256 hash skip; reprocess only changed PDFs.

---

## 5. Ingestion

```bash
# Full corpus (1304 PDFs, ~30 min on CPU)
python scripts/ingest.py

# First 100
python scripts/ingest.py --limit 100

# Single file debug
python scripts/ingest.py --file "path/to/IS_1448_Part_97_2026.pdf"

# Force reprocess (ignore hash cache)
python scripts/ingest.py --rebuild

# Curated demo selection (50 diverse technical docs including IS_1448_P97)
python scripts/ingest_selection.py
```

Every pipeline stage logs `document / stage / status / duration / warnings`. One bad PDF never stops 5,000 others.

---

## 6. Parsing

**Text:** PyMuPDF native extraction first; page-preserving (never flatten). Quality gate per page; OCR fallback flagged (easyocr) if char count <30 and image-heavy.

**Sections:** Regex + known BIS vocabulary (Scope, Normative references, Terms, Procedure, etc.) + numbered hierarchy (5, 5.1, Annex A) with parent-child linking.

**Tables:** pdfplumber dual strategy (lattice → stream fallback), validated column consistency, stored with headers/rows/bbox/caption/confidence.

**Figures — critical:** Enumerate every embedded image with bbox/dimensions/hash. Figure filter rejects:
- Frequent (>35% pages), header/footer band (top 12%/bottom 10%), tiny (<2500 px), banner aspect (>8), scanned-page slices (wide thin tiling, dense pages >8 images/page), small square logos without caption. Caption proximity ("Figure 1") gives strong boost (+0.35). See `PARSER.md` section 3.

**Specifications:** Unit-aware regex extraction (value ± tolerance + unit + material/condition) with confidence.

**References:** IS/ISO/ASTM/IEC patterns; typed as normative/test_method/terminology/allied with page provenance.

---

## 7. Figure extraction (see PARSER.md)

Validation script:

```bash
python scripts/inspect_pdf.py "path/to/file.pdf" --save-debug
# generates data/debug/<stem>/page_001.png + figure_candidates/ + confirmed_figures/
python scripts/inspect_figures.py  # HTML contact sheet for visual logo vs technical diagram check
```

---

## 8. Embeddings / FAISS / BM25

```bash
python scripts/rebuild_index.py  # batch 64, CPU, IndexFlatIP (cosine via IP), normalized MiniLM-L6-v2 (384d)
```

FAISS `IndexFlatIP` on normalized vectors; BM25 via `rank-bm25` on tokenized chunks + standard_id/section tokens. Hybrid:

```
final = 0.5*semantic_norm + 0.3*bm25_norm + 0.2*metadata_bonus  (metadata_bonus for exact IS number match, capped 0.3)
single-source penalty 0.85
```

Union top 20+20 → rerank.

---

## 9. Hybrid retrieval

```bash
curl -X POST http://localhost:8000/api/search -H 'Content-Type: application/json' \
  -d '{"query":"thermal oxidation stability gas turbine fuels","mode":"hybrid","top_k":10}'
```

Supports `semantic` / `lexical` / `hybrid`. See `RETRIEVAL.md`.

---

## 10. Tender analysis

```bash
# Text
curl -X POST http://localhost:8000/api/tender/analyze -H 'Content-Type: application/json' \
  -d '{"text":"Need stainless steel water tanks for municipal drinking water, 500 L"}'

# PDF upload
curl -X POST http://localhost:8000/api/tender/upload -F file=@tender.pdf
```

Extracts product/material/application/capacity/dimensions/testing/safety/keywords/IS refs with page evidence. Keeps tender dimensions separate from standard dimensions — never silently replaces.

---

## 11. Recommendation

```bash
curl -X POST http://localhost:8000/api/recommend -H 'Content-Type: application/json' \
  -d '{"query":"thermal oxidation stability of gas turbine fuels","top_k":5}'
```

Response includes `requirements`, `recommendations[]` (why/evidence/page/section/tables/figures/references/score/components), `abstention`, `version_warnings`. Hard validation: every returned IS number exists in DB.

Abstention: HIGH (≥0.65) / MEDIUM (≥0.40) / LOW (<0.40) / INSUFFICIENT_EVIDENCE (<0.25 → abstain).

Version checker: flags tender referencing old IS when newer available in corpus ("Latest available edition in corpus: ...").

---

## 12. API

All endpoints under `/api`:

- `POST /api/tender/upload`, `POST /api/tender/analyze`
- `POST /api/recommend`, `POST /api/search`
- `GET /api/standards/{id}`, `/figures`, `/tables`, `/references`
- `POST /api/compare`  (tender vs standard matrix)
- `GET /api/health`, `/api/stats`

See `API.md`.

---

## 13. UI

Government/procurement-oriented interface (not a ChatGPT clone):

- Upload tender PDF OR describe requirement
- Editable AI understanding panel
- Recommended standards with relevance badges (HIGH/MEDIUM/LOW), why, evidence, page/section, tables, figures, references
- Tender vs Standard comparison matrix
- Deep dive per standard (scope, requirements, dimensions, marking, tables, figures, allied graph)

Dev: `cd frontend && npm run dev` (proxies /api to :8000)  
Prod: `npm run build` → FastAPI serves `frontend/dist` at `/`

---

## 14. Evaluation

```bash
python scripts/evaluate.py        # benchmark: P@5, P@10, MRR + exact IS retrieval
python scripts/validate_dataset.py  # 12 parser invariant checks
python scripts/inspect_figures.py --limit 100  # visual logo vs figure check
```

Benchmark dataset (hard-coded MVP, extend via `data/benchmark.json`):

- "thermal oxidation stability of gas turbine fuels" → IS 1448 Part 97 ✅
- "pressure tunnels first filling..." → IS 12633 ✅
- "explosive atmospheres..." → IS 16724 ✅
- "yoga terminology gheranda..." → IS 17874 Part 2 ✅

Hallucination tests (spec 61): fake IS, gibberish, empty corpus — must abstain or low-confidence with no fake citation.

---

## 15. Known limitations

- Corpus currently 16-50 standards for demo; scaling to 1304 requires ~30 min ingestion + index rebuild (tested incremental).
- OCR rarely triggered (native text PDFs); scanned annexures fallback via easyocr exists but not extensively tuned.
- Table extraction uses pdfplumber lattice/stream only; Camelot/Tabula not required for MVP but may improve bordered tables.
- Figure resolution: confirmed crops at 150 DPI; very low-res embedded images upscaled but not vectorised.
- Multilingual (Hindi/Hinglish) query: architecture supports hook (normalize/translate query → English corpus) but not yet implemented beyond English.
- Compliance/QCO extraction only when explicit text evidence exists — returns "Not established" otherwise.

---

## 16. Future work

- Full 1304 → 20k scale with async ingestion + incremental FAISS (IVF).
- Live BIS catalogue version checker (separate module, local corpus remains primary).
- Advanced reranker (cross-encoder) after hybrid retrieval.
- Hindi query normalization + Devanagari OCR tuning.
- Visual figure QA tool with human-in-loop.

---

## 17. Running the full demo workflow

```bash
# 1. Ingest demo selection (50 curated technical standards, includes IS_1448_P97)
python scripts/ingest_selection.py   # or python scripts/ingest.py --limit 50

# 2. Rebuild indexes
python scripts/rebuild_index.py

# 3. Validate
python scripts/validate_dataset.py
python scripts/evaluate.py

# 4. Start backend
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload

# 5. Frontend (dev) or built statics are served by FastAPI at /
cd frontend && npm run dev   # → http://localhost:5173  (proxied)

# Demo flow:
# Upload IS_1448_P97_tender.pdf → AI understanding → Recommended standards → Evidence (p.5 Scope, p.8 Table 1) → Tender vs Standard → Officer decides
```

---

## 18. Security & performance

- Upload validation: file-type check, 25 MB limit, safe temp names, no path traversal, no filesystem exposure.
- Streaming page-by-page ingestion, batched embeddings, persistent FAISS/BM25, hash skip for incremental updates.

---

**Principle:** *AI recommends. Evidence explains. Procurement officer decides.* — never pretends to be legal authority.
