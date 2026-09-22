# PROJECT AUDIT — SIH26108 BIS Procurement Recommendation Engine

**Date:** 2026-09-21
**Auditor:** Muse Spark (Lead AI/Data/Backend/IR/PDF Architect)
**Workspace:** `D:\BIS`

---

## 1. Repository & Workspace Inspection

| Item | Status |
|------|--------|
| Working directory | `D:\BIS` |
| Git repo | **No** (not a git repo) |
| Existing application code | **None** — only the scraper corpus exists |
| Python | 3.10.0 (CPython, win32, 64-bit) — `python` command |
| `python3` alias | Not available (Windows) |
| CUDA | Not available (`torch.cuda.is_available() == False`) — CPU-only |
| Node / Frontend baseline | `D:\projects` contains two unrelated projects (`Dhiraj_stores`, `paperguard`) — not reused |

**Conclusion:** Green-field project. No existing code to preserve. No risk of overwriting.

---

## 2. PDF Corpus Discovery

### 2.1 Location

```
D:\BIS\AI_RECOMMENDATION_ENGINE-scraper\
└── AI_RECOMMENDATION_ENGINE-scraper\
    └── BIS_PDFs_Part1\
        ├── pdfs\           (710 files)
        ├── pdfs_part1\     (100 files)
        ├── pdfs_part2\     (100 files)
        ├── pdfs_part3\     (100 files)
        ├── pdfs_part4\     (100 files)
        ├── pdfs_part5\     (100 files)
        └── pdfs_part6\     (94 files)
```

**Total PDFs: 1304**

> Found via `Get-ChildItem -Recurse -Filter *.pdf | Measure-Object` across `BIS_PDFs_Part1`.

### 2.2 File-size distribution

| Metric | Value |
|--------|-------|
| Minimum | 37,758 bytes |
| Maximum | 105,016,068 bytes (`IS_ISO_IEC_14882_2024.pdf`, ~105 MB) |
| Average | ~1.49 MB |
| Corpus total (est.) | ~1.95 GB |

### 2.3 Filename Convention Analysis

Regex tested: `IS[_ ]?(\d+).*?(\d{4})\.pdf$`

| Category | Count | Example |
|----------|-------|---------|
| Parseable IS pattern | 1219 | `IS_1448_Part_97_2026.pdf` |
| Non-parseable | 85 | `10255.pdf`, `1200_10.pdf`, `11649_1_1986_reff2022.pdf` |

Non-parseable files are mostly older BIS numbers without the `IS_` prefix or short numeric titles (e.g. `10255.pdf` may still be an IS but naming predates convention). Filename-based IS extraction must be treated as a **hint**, not ground truth — formal extraction will re-parse from inside PDF text.

### 2.4 Text Availability (random 50-PDF probe via PyMuPDF)

| Result | Count |
|--------|-------|
| Native text > 500 chars | 50/50 (100%) |
| OCR required (<500 chars) | 0/50 |
| Failed to open | 0/50 |

**Interpretation:** Corpus is almost entirely **native-text PDFs** (BIS digital exports), not scanned image PDFs. OCR fallback is rarely required but must remain for edge cases (old scanned annexures). Header/footer/BIS branding is embedded as images, not scanned text.

### 2.5 Representative PDFs (5-sample deep inspection)

| # | PDF | Pages | Text chars | Images | Filename → Header IS Match |
|---|-----|-------|------------|--------|---------------------------|
| 1 | `IS_1448_Part_97_2026.pdf` | 40 | 84,756 | 26 | `IS 1448 (Part 97) : 2026` ✓ |
| 2 | `IS_2062_Part_2_2026.pdf` | 24 | 45,485 | 17 | `IS 2062 (Part 2) : 2026` ✓ |
| 3 | `IS_16724_2026.pdf` | 156 | 382,651 | 44 | `IS 16724 : 2026` ✓ |
| 4 | `IS_17874_Part_2_2026.pdf` | 14 | 27,974 | 8 | `IS 17874 (Part 2) : 2026` ✓ |
| 5 | `IS_12633_2026.pdf` | 12 | 25,112 | 11 | `IS 12633 : 2026` ✓ |

**Observations from `IS_1448_Part_97_2026.pdf` (primary validation doc):**

- **Page 1** contains title, ICS `75.160.20`, ISO identity `ISO 6249 : 2021`, BIS header with Devanagari, 6 embedded images (logos).
- **Page 4** is image-only (5 images, 0 text) — likely diagram page.
- **Sections** detected: Scope, Normative references, Terms & definitions (3.1 generic, 3.2 rating procedure), Principle, Reagents, Apparatus, Samples, Preparation, Calibration, Procedure, etc. — numbered 1–13 + Annexes A–E.
- **Tables:** `Table 1 — Heater tube characteristics` on page 8; Annex tables present. `pdfplumber.find_tables()` returns 1 table object on page 8 (sample), indicating lattice/stream extraction is viable.
- **Figures:** Captions loosely detected as `Figure 1 …`, `Figure A.1/A.2`. Images per page: `[6,0,0,5,0,0,0,0,0,1,0,0,0,0,0,1,1,3,1,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,5,0]` — header/footer/logo repetition highly probable (images on 11 distinct pages, with first page having 6 images and last pages having 5).
- **References:** `IS 15261 : 2002`, `IS 2 : 2022`, ISO 3170/3171/3274/4288, ASTM D4306/E128 — extensive normative references on page 2–5.
- **Sections numbering challenge:** `IS_16724_2026.pdf` yielded 0 regex section heading hits for pattern `^\s*\d+[\.\s]+[A-Z]…` due to multi-space / irregular heading layout, while others succeeded — confirms heading detector must be robust to whitespace, font-size, and numbering variations.

### 2.6 Image / Figure Risk Assessment

- Pages 1, 4, 39 have dense image clusters (5–6 images) consistent with **BIS logo, header banner, footer, stamps**. Images appearing on many pages at similar coordinates are expected to be logos/headers.
- True technical figures likely on pages 10, 16–18, 22, 28–29 (single images surrounded by apparatus text, Figure 1 reference).
- Naive "save every image" would capture **26 image objects** for `IS_1448_Part_97` alone, most being logos. Filtering pipeline (perceptual hash, position, frequency, caption proximity) is critical.

### 2.7 Table Risk Assessment

- `IS_1448_Part_97` tables contain merged header cells, metallurgy characteristics (Mg:Si ratio), and annex calibration tables. Extraction must validate column consistency and merged cells.
- Mixed layout: some tables are bordered lattice tables, others are stream-style without full borders.

### 2.8 Edge Cases Anticipated

- Multi-column not observed in these samples (BIS standards typically single-column), but 156-page `IS_16724_2026` may contain complex layouts.
- Unicode symbols present: `±`, `°C`, `μ`, `Ω`, superscripts, Devanagari on first page — must preserve correctly.
- Scanned pages: Not observed in 50-sample but page 4 with 0 text / 5 images suggests a **figure-only page** that is still native but with embedded image; OCR would needed only if text extraction returns empty for content-heavy pages.

### 2.9 Scalability Notes

- 1304 PDFs → est. ~20k–40k pages (avg 15–30 pp). At 300–700 tokens/chunk → ~60k–130k chunks. FAISS `IndexFlatIP` in RAM for 60k×384 (MiniLM) ≈ 90 MB — feasible. Recommended batching + incremental indexing for 10k–20k scale.
- Largest PDF 105 MB requires streaming and hash-based skip for unchanged files.

---

## 3. Installed Python Stack Audit

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `pymupdf` (`fitz`) | 1.28.2 | Native text + image extraction | ✓ installed |
| `pdfplumber` | 0.11.10 | Table extraction, layout | ✓ |
| `pdfminer.six` | 20260107 | Alternative text extraction | ✓ |
| `pikepdf` | 9.1.0 | PDF manipulation | ✓ |
| `pypdfium2` | 5.13.0 | Alternative renderer | ✓ |
| `sentence-transformers` | 3.1.1 | Embeddings (`all-MiniLM-L6-v2`) | ✓ |
| `transformers` | 4.57.6 | Tokenizer for chunking | ✓ |
| `torch` | 2.13.0+cpu | Backend for embeddings | ✓ (CPU) |
| `faiss-cpu` | 1.15.1 | Vector index | ✓ |
| `rank-bm25` | 0.2.2 | Lexical retrieval | ✓ |
| `scikit-learn` | 1.3.2 | TF-IDF fallback / eval | ✓ |
| `opencv-python` | 4.9.0.80 | Image handling | ✓ |
| `opencv-contrib` | 4.12.0.88 | Extended CV | ✓ |
| `Pillow` | 12.3.0 | Image I/O | ✓ |
| `ImageHash` | 4.3.1 | Perceptual hash for logo dedup | ✓ |
| `numpy` | 1.26.4 | Numerics | ✓ |
| `scipy` | 1.15.3 | Sparse / metrics | ✓ |
| `pandas` | 2.1.4 | Data tables | ✓ |
| `SQLAlchemy` | 2.0.35 | ORM for SQLite | ✓ |
| `aiosqlite` | 0.20.0 | Async SQLite | ✓ |
| `FastAPI` | 0.115.0 | Backend API | ✓ |
| `uvicorn` | 0.30.6 | ASGI server | ✓ |
| `pydantic` | 2.9.2 | Validation | ✓ |
| `PyYAML` | 6.0.3 | config.yaml | ✓ |
| `tqdm` | 4.67.1 | Progress | ✓ |
| `easyocr` | 1.7.2 | OCR fallback (`Tesseract` alternative) | ✓ |
| `scikit-image` | 0.25.2 | Image filter pipeline | ✓ |
| `lxml`, `beautifulsoup4` | — | XML/HTML post-processing | ✓ |
| **Not installed** | — | `camelot`, `tabula`, `paddleocr`, `ocrmypdf` | Optional; not required for MVP (pdfplumber + easyocr covers MVP) |

**Conclusion:** Core stack satisfies spec's recommended technologies. No additional heavy dependencies required. CPU embeddings confirmed; batch processing must be used.

---

## 4. Infrastructure & OS

- **OS:** `win32` (Windows 11, PowerShell 5.1)
- **Path convention:** Windows paths (`D:\…`) — all code must use `pathlib` for cross-platform compatibility
- **Permissions:** Temp dir approved: `C:\Users\HARSHG~1\AppData\Local\Temp\opencode`
- **Storage budget:** Data lives under `D:\BIS\bis-engine\data\`

---

## 5. Gaps & Risks Before Build

| Risk | Likelihood | Mitigation planned |
|------|------------|--------------------|
| Filename ≠ PDF-internal IS number | High (85/1304 non-standard) | Regex extraction from page 1–3 text + normalization; filename only as fallback |
| Logo/header images misclassified as figures | Very high | Figure filter: freq > 40%, header/footer band, size <5% page, duplicate hash, missing caption |
| Table border variance (lattice vs stream) | High | Dual extraction (lattice then stream), row/column validation |
| Sections heading variance (caps, numbering, whitespace) | High | Hybrid detector: font-size + regex + numbering + layout |
| Large PDF (105 MB, 1000+ pages if concatenated) memory blow-up | Medium | Streaming page-by-page, hash skip, batch FAISS |
| Hindi/multilingual query | Low for MVP | English-first, architecture leaves hook for translate/normalize |
| OCR noise on annexures | Low | OCR fallback threshold (text < 30 chars/page, image-heavy & text-empty) |
| Hallucination of IS numbers if LLM used for generation | High if LLM generates IDs | Hard validation: every returned `is_number` must exist in `standards` DB |

---

## 6. Project Structure Decision

New project root: **`D:\BIS\bis-engine\`**

```
bis-engine/
├── data/
│   ├── raw_pdfs/        → symlink/config points to corpus (not copied)
│   ├── processed/{text,pages,tables,figures,json}
│   ├── embeddings/
│   └── indexes/
├── src/
│   ├── ingestion/
│   ├── normalization/
│   ├── storage/
│   ├── retrieval/
│   ├── recommendation/
│   ├── tender/
│   ├── api/
│   └── evaluation/
├── scripts/
├── tests/
├── config/config.yaml
├── frontend/            (React Vite)
├── requirements.txt
├── README.md
└── PROJECT_AUDIT.md
```

Ingestion will read from `D:\BIS\AI_RECOMMENDATION_ENGINE-scraper\…\BIS_PDFs_Part1` via config, not by duplicating 2 GB of PDFs.

---

## 7. Next Steps (Phase Planning)

1. **Phase 1 ingestion** against 5 representative PDFs (`IS_1448_P97`, `IS_2062_P2`, `IS_16724`, `IS_17874_P2`, `IS_12633`) before full 1304-scale.
2. Validate text → sections → chunks → metadata on those 5.
3. Build figure filtering against `IS_1448_P97` (known 26 images, only ~5 true figures).
4. Then scale to 1304 with incremental hash & logging.

---
**Audit completed. Proceed to Phase 1 scaffolding.**
