# CURRENT ARCHITECTURE AUDIT — Tender Samhita (as of 2026-09-23)

## 1. Executive Summary

Tender Samhita is a working procurement standards recommendation engine with:
- **Backend**: FastAPI + SQLAlchemy (SQLite) + FAISS + BM25 + sentence-transformers
- **Frontend**: React 18 + Vite + Lucide icons (no UI framework)
- **Corpus**: 1304 BIS standard PDFs (~1.95 GB), currently 16-50 indexed for demo
- **Retrieval**: Hybrid (semantic FAISS + BM25 lexical + metadata bonus) with reranking
- **Status**: Functional MVP with working tender analysis, recommendations, comparison, knowledge map, and review workspace

The system already implements core procurement workflow: tender parsing → requirement extraction → hybrid retrieval → reranking → evidence assembly → version checking → abstention gating.

---

## 2. Repository Structure

```
D:\BIS\
├── AI_RECOMMENDATION_ENGINE-scraper/
│   └── AI_RECOMMENDATION_ENGINE-scraper/
│       └── BIS_PDFs_Part1/          (1304 PDFs, ~1.95 GB)
│           ├── pdfs/                 (710 files)
│           ├── pdfs_part1-6/         (100 each, 94 in part6)
└── bis-engine/                       (main application)
    ├── config/config.yaml            (central configuration)
    ├── data/
    │   ├── raw_pdfs/                 (symlink to corpus)
    │   ├── processed/json/           (per-PDF canonical JSON)
    │   ├── processed/figures/        (confirmed technical figures)
    │   ├── indexes/                  (faiss.index, bm25.pkl, faiss_mapping.json)
    │   └── bis.db                    (SQLite database)
    ├── src/
    │   ├── api/                      (FastAPI routes)
    │   ├── ingestion/                (PDF parsing pipeline)
    │   ├── normalization/            (text normalization)
    │   ├── storage/                  (SQLAlchemy models + DB)
    │   ├── retrieval/                (FAISS + BM25 + hybrid + reranker)
    │   ├── recommendation/           (evidence + abstention + version check)
    │   ├── tender/                   (tender parsing + extraction + comparison)
    │   └── evaluation/               (benchmark scripts)
    ├── scripts/                      (ingestion, indexing, evaluation)
    ├── tests/                        (empty - only __init__.py)
    ├── frontend/
    │   ├── src/
    │   │   ├── App.jsx               (root component, 9 views)
    │   │   ├── pages/                (9 page components)
    │   │   ├── components/           (9 subdirectories, ~40 components)
    │   │   ├── context/              (AppContext, ReviewContext)
    │   │   ├── services/             (9 API service modules)
    │   │   └── styles/index.css      (961 lines, complete design system)
    │   ├── public/logo.png           (official logo)
    │   ├── package.json              (React 18, Vite 5, lucide-react)
    │   └── vite.config.js            (proxy /api → :8000)
    ├── requirements.txt              (31 Python packages)
    └── README.md
```

---

## 3. Backend Architecture

### 3.1 FastAPI Application (`src/api/main.py`)

**Endpoints:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tender/upload` | POST | Upload tender PDF → parsed + requirements |
| `/api/tender/analyze` | POST | Analyze tender text → requirements |
| `/api/recommend` | POST | Get standards recommendations for query |
| `/api/search` | POST | Hybrid/semantic/lexical search |
| `/api/standards/{id}` | GET | Standard detail |
| `/api/standards/{id}/figures` | GET | Figures for standard |
| `/api/standards/{id}/tables` | GET | Tables for standard |
| `/api/standards/{id}/references` | GET | References for standard |
| `/api/compare` | POST | Tender vs Standard comparison matrix |
| `/api/health` | GET | System health check |
| `/api/stats` | GET | Corpus statistics |
| `/api/embedding/info` | GET | Embedding model configuration |

**Singletons:** Lazy-loaded retrieval state (BM25, FAISS index, embedder, meta_map).

### 3.2 Data Model (`src/storage/models.py`)

**Tables:**
- `standards` — IS number, title, year, revision, scope, full_text, pdf_path
- `sections` — hierarchy with parent_section_id
- `chunks` — page, section, text, chunk_type, embedding_id
- `specifications` — property, value, unit, tolerance, confidence
- `tables` — caption, headers (JSON), rows (JSON), bbox, confidence
- `figures` — figure_number, caption, image_path, is_confirmed, duplicate_group
- `references` — target_identifier, relationship_type, page
- `compliance` — type, value, source, page
- `documents` — hash, parse_status, ocr_required

### 3.3 Ingestion Pipeline (`src/ingestion/`)

```
scanner → text_extractor → metadata → heading_detector → table_extractor
→ figure_extractor (with image_filter) → specification_extractor
→ reference_extractor → compliance_extractor → chunking → JSON → SQLite
```

**Key modules:**
- `pipeline.py` — orchestrator
- `text_extractor.py` — PyMuPDF native extraction with OCR fallback
- `table_extractor.py` — pdfplumber lattice/stream dual strategy
- `figure_extractor.py` — embedded image extraction with filtering
- `image_filter.py` — perceptual hash logo dedup, header/footer band rejection
- `specification_extractor.py` — unit-aware regex extraction
- `reference_extractor.py` — IS/ISO/ASTM/IEC pattern extraction
- `compliance_extractor.py` — QCO/certification extraction
- `heading_detector.py` — regex + font-size section detection

### 3.4 Retrieval System (`src/retrieval/`)

| Module | Purpose |
|--------|---------|
| `embeddings.py` | Sentence-transformers wrapper |
| `embedding_registry.py` | Model prefix strategies (BGE, E5, MiniLM) |
| `semantic_search.py` | FAISS IndexFlatIP with mapping |
| `bm25_search.py` | rank-bm25 BM25Okapi |
| `hybrid_search.py` | Weighted fusion (0.5 semantic + 0.3 BM25 + 0.2 metadata) |
| `reranker.py` | Standard-level reranking (semantic 50%, title 20%, scope 15%, material 10%, status 5%) |
| `filters.py` | Query filters |

**Current weights (config.yaml):**
```yaml
retrieval:
  semantic_weight: 0.50
  bm25_weight: 0.30
  metadata_weight: 0.20
  top_k_semantic: 20
  top_k_bm25: 20
  top_k_final: 10
```

### 3.5 Recommendation System (`src/recommendation/`)

| Module | Purpose |
|--------|---------|
| `ranking.py` | Orchestrates hybrid → rerank → recommend |
| `evidence.py` | Assembles scope/technical evidence, specs, tables, figures, references |
| `abstention.py` | HIGH/MEDIUM/LOW/INSUFFICIENT_EVIDENCE gating |
| `version_checker.py` | Tender IS year vs corpus max year |
| `query_understanding.py` | Query → requirements extraction |
| `allied_standards.py` | Related standards discovery |
| `compliance.py` | QCO/compliance extraction |

### 3.6 Tender System (`src/tender/`)

| Module | Purpose |
|--------|---------|
| `parser.py` | PDF/text → structured pages |
| `extractor.py` | Structured requirements (product, material, dimensions, etc.) |
| `normalizer.py` | Query expansion from requirements |
| `comparison.py` | Tender vs Standard parameter matrix (MATCH/MISMATCH/NOT_SPECIFIED) |

---

## 4. Frontend Architecture

### 4.1 Views (`frontend/src/pages/`)

| Page | View ID | Purpose |
|------|---------|---------|
| `DashboardPage.jsx` | `dashboard` | Landing — active tender, standards directory, review queue |
| `TenderAnalysisPage.jsx` | `tender` | Tender upload/text input + extracted requirements |
| `RecommendationsPage.jsx` | `recommendations` | Recommended standards with filters |
| `StandardDeepDivePage.jsx` | `deepdive` | Standard detail with knowledge map + 10 tabs |
| `ComparisonPage.jsx` | `compare` | Tender vs Standard parameter cross-evaluation |
| `SearchPage.jsx` | `search` | Standards directory search (hybrid/semantic/lexical) |
| `ReviewWorkspacePage.jsx` | `review` | Officer review dossier (saved standards + pinned evidence) |
| `SystemStatusPage.jsx` | `system` | Backend health + embedding config |
| `RetrievalDebugPage.jsx` | `debug` | RAG diagnostic debugger |

### 4.2 Components (`frontend/src/components/`)

**Layout:** `AppHeader.jsx`, `AppSidebar.jsx`

**Common:** `TenderSamhitaLogo.jsx`, `StatusBadge.jsx`, `EmptyState.jsx`, `ErrorState.jsx`, `LoadingState.jsx`, `SourcePageViewer.jsx`, `EvidencePanel.jsx`, `TechnicalTable.jsx`, `Breadcrumbs.jsx`

**Tender:** `TenderUploadAnalyze.jsx`, `RequirementsViewer.jsx`

**Recommendations:** `RecommendationCard.jsx`

**Deep Dive (19 components):** `StandardHeader.jsx`, `DeepDiveNav.jsx`, `StandardKnowledgeMap.jsx`, `NodeDetailPanel.jsx`, `StandardInfoDrawer.jsx`, `OverviewTab.jsx`, `ScopeTab.jsx`, `RequirementsTab.jsx`, `SpecificationExplorerTab.jsx`, `TableViewerTab.jsx`, `FigureViewerTab.jsx`, `FigureCard.jsx`, `FigureLightbox.jsx`, `TestMethodsTab.jsx`, `ReferenceListTab.jsx`, `AlliedStandardsTab.jsx`, `ConformityTab.jsx`, `VersionTimelineTab.jsx`, `EvidenceTab.jsx`

**Comparison:** `ComparisonMatrix.jsx`

**Review:** (empty directory)

### 4.3 Context & State

- `AppContext.jsx` — Navigation, active standard, tender data, modal states
- `ReviewContext.jsx` — Saved standards, pinned evidence, officer notes

### 4.4 Services (API layer)

| Service | Endpoint |
|---------|----------|
| `apiClient.js` | Base fetch wrapper with timeout |
| `tenderService.js` | `/api/tender/*` |
| `recommendationService.js` | `/api/recommend` |
| `searchService.js` | `/api/search` |
| `standardService.js` | `/api/standards/*` |
| `comparisonService.js` | `/api/compare` |
| `evidenceService.js` | Evidence pinning |
| `systemService.js` | `/api/health`, `/api/stats` |
| `mockAdapter.js` | Fallback mock data |

### 4.5 Design System (`frontend/src/styles/index.css`)

**961 lines** — Complete CSS design system with:
- Navy/saffron palette, Inter font, CSS variables
- Header gradient, sidebar, panels, buttons, tables
- Knowledge map nodes, mindmap viewport, filter chips
- Status pills, editable requirement rows
- Info drawer, split modal, side panel animations

---

## 5. Configuration (`config/config.yaml`)

```yaml
paths:
  raw_pdfs: "D:/BIS/AI_RECOMMENDATION_ENGINE-scraper/.../BIS_PDFs_Part1"
  db_path: "data/bis.db"
  indexes_dir: "data/indexes"

embedding:
  model: "BAAI/bge-small-en-v1.5"  # 384d
  normalize_embeddings: true
  batch_size: 32
  device: "cpu"

retrieval:
  semantic_weight: 0.50
  bm25_weight: 0.30
  metadata_weight: 0.20
  top_k_semantic: 20
  top_k_bm25: 20
  top_k_final: 10
  rerank_weights: { semantic: 0.50, title: 0.20, scope: 0.15, material: 0.10, status: 0.05 }

recommendation:
  high_threshold: 0.65
  medium_threshold: 0.40
  abstain_threshold: 0.25
  max_recommendations: 5
```

---

## 6. What Already Works

### 6.1 Core Pipeline (Working)
1. **Tender parsing** — PDF upload or text input → structured pages
2. **Requirement extraction** — Product, material, application, capacity, dimensions, testing, safety, IS refs
3. **Query normalization** — Builds expanded query from requirements
4. **Hybrid retrieval** — FAISS semantic + BM25 lexical + metadata bonus
5. **Reranking** — Standard-level aggregation with title/scope/material/recency signals
6. **Evidence assembly** — Specs, tables, figures, references from DB
7. **Abstention gating** — HIGH/MEDIUM/LOW/INSUFFICIENT_EVIDENCE
8. **Version checking** — Tender IS year vs corpus max year
9. **Tender vs Standard comparison** — MATCH/MISMATCH/NOT_SPECIFIED matrix
10. **Hard validation** — Every returned standard_id verified against DB

### 6.2 Frontend (Working)
1. **Dashboard** — Active tender, standards directory, review queue
2. **Tender analysis** — Upload/text with preset examples
3. **Recommendations** — Cards with relevance badges, evidence, actions
4. **Standard deep dive** — Knowledge map + 10 tabs (specs, tables, figures, refs, allied, conformity, amendments, evidence, overview)
5. **Knowledge map** — Interactive radial graph with zoom/pan, category filters, node detail panel
6. **Search** — Hybrid/semantic/lexical with filter panel
7. **Comparison** — Tender vs Standard matrix
8. **Review workspace** — Saved standards, pinned evidence, officer notes, export
9. **System status** — Health check, embedding config
10. **Source page viewer** — PDF page inspection modal
11. **Figure lightbox** — Full-size figure viewing

### 6.3 Ingestion (Working)
- PyMuPDF text extraction with OCR fallback
- pdfplumber table extraction (lattice + stream)
- Figure extraction with logo/header/footer filtering
- Specification extraction with unit-aware regex
- Reference extraction (IS/ISO/ASTM/IEC)
- Compliance extraction
- Semantic chunking (300-700 tokens)
- Hash-based incremental ingestion

---

## 7. Gaps & Issues vs Target Product

### 7.1 Product Workflow Gaps

| Gap | Current State | Target State |
|-----|--------------|--------------|
| **Procurement analysis as primary flow** | Dashboard is landing; tender is one view | Procurement analysis should be the central experience |
| **Tender → Standard traceability matrix** | Basic comparison (MATCH/MISMATCH/NOT_SPECIFIED) | Full traceability: Tender Req → Standard → Clause → Evidence → Status |
| **Gap detection** | Not implemented | Detect missing/unspecified requirements |
| **Conflict detection** | Basic mismatch detection | Tender vs Standard, Standard vs Standard version conflicts |
| **Specification builder** | Not implemented | Evidence-grounded technical specification drafting |
| **Tender quality review** | Not implemented | Missing params, ambiguous requirements, outdated refs |
| **"Why is this standard relevant?"** | Basic score components | Detailed scope/product/application/technical match explanation |
| **Standards knowledge graph** | Per-standard radial mind map | Cross-standard relationship graph |
| **Conformity/QCO intelligence** | Basic extraction | Mandatory vs voluntary, certification schemes |

### 7.2 UI/UX Gaps

| Gap | Current State | Target State |
|-----|--------------|--------------|
| **Visual identity** | Government blue header, saffron accents | Restrained enterprise palette from logo |
| **Landing page** | Dashboard with 3 cards | Clean CTA-focused landing with procurement input |
| **Workspace layout** | Single-column pages | 3-pane workspace (requirements / analysis / evidence) |
| **Navigation** | 6-item sidebar | Reduced primary nav (Overview, Procurements, Standards, Search) |
| **Typography** | Inter (loaded) | Consistent hierarchy, professional density |
| **Loading states** | Basic spinner | Professional skeletons with progress messages |
| **Error states** | Generic messages | Actionable error explanations |
| **Empty states** | Basic text | Guided empty states with CTAs |
| **Animation** | Hover transforms, slide-in panels | Subtle transitions only |
| **Responsive** | Not implemented | Desktop-first with tablet support |

### 7.3 Backend Gaps

| Gap | Current State | Target State |
|-----|--------------|--------------|
| **Cross-standards knowledge graph** | Per-standard only | Graph API for standards relationships |
| **Procurement workspace API** | Single tender analyze + recommend | Workspace-scoped analysis with history |
| **Specification builder API** | Not implemented | POST /api/specification/build |
| **Gap detection API** | Not implemented | POST /api/tender/gaps |
| **Conflict detection API** | Not implemented | POST /api/tender/conflicts |
| **Tender quality review API** | Not implemented | POST /api/tender/quality |
| **Cross-standards search** | Single corpus search | Graph-aware retrieval |

### 7.4 Data Gaps

| Gap | Current State | Target State |
|-----|--------------|--------------|
| **Standards relationships** | references table only | Full graph (normative, test method, allied, amendment, supersedes) |
| **Knowledge graph edges** | Not stored | source → target → relationship_type → evidence |
| **Procurement workspaces** | Ephemeral (context state) | Persistent workspace with history |
| **Audit trail** | Not implemented | Action log for officer decisions |

---

## 8. Technical Debt

1. **No tests** — `tests/` directory is empty
2. **Inline styles** — Heavy use of inline styles in components (not CSS modules)
3. **No TypeScript** — All JSX, no type safety
4. **No state management library** — Context API only
5. **No routing library** — Manual view switching via context
6. **CSS in single file** — 961-line monolithic CSS
7. **No error boundaries** — React error handling
8. **No loading skeleton components** — Ad-hoc loading states
9. **Mock adapter** — Fallback mock data in services
10. **No API validation** — Frontend doesn't validate API responses

---

## 9. Dependencies

### Python (requirements.txt)
```
pymupdf, pdfplumber, pdfminer.six, pikepdf, pypdfium2
sentence-transformers, transformers, torch (CPU)
faiss-cpu, rank-bm25
scikit-learn, scikit-image, opencv-python, opencv-contrib
Pillow, ImageHash, numpy, scipy, pandas
SQLAlchemy, aiosqlite
FastAPI, uvicorn, pydantic
PyYAML, tqdm, easyocr
lxml, beautifulsoup4
```

### Frontend (package.json)
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "lucide-react": "^1.47.0",
  "vite": "^5.4.0",
  "@vitejs/plugin-react": "^4.3.3"
}
```

---

## 10. Scaling Characteristics

- **Corpus**: 1304 PDFs → ~20k-40k pages → ~60k-130k chunks
- **FAISS index**: ~90 MB RAM for 60k × 384d vectors
- **Ingestion**: ~30 min on CPU for full corpus
- **Retrieval**: <2s for hybrid search (FAISS + BM25 + rerank)
- **Largest PDF**: 105 MB (IS_ISO_IEC_14882_2024.pdf)

---

*Audit completed. Ready for product architecture design and implementation planning.*
