# PARSER — PDF Document Intelligence

## 1. Text extraction

**Module:** `src/ingestion/text_extractor.py`

- Uses `pymupdf` (fitz) `page.get_text("text")` per page.
- Preserves boundaries: returns `List[page_dict]` with `page_number`, `text`, `char_count`, `word_count`, `image_count`, `width`, `height`, `quality`, `has_text`, `ocr_required`.
- Never flattens entire PDF to one string; every chunk retains page/section provenance.
- Quality gate `_text_quality`: control-char ratio, avg word length, repeated-char check. Flags `ocr_required` if `char_count <30` and `image_count>0` or quality <0.35 with images.
- OCR fallback stub in `src/ingestion/ocr.py` (easyocr) — corpus is native-text PDFs (50-sample probe: 100% native), so OCR rarely needed; page marked `OCR_REQUIRED` if heavy image + empty text.

## 2. Metadata extraction

**Module:** `src/normalization/metadata.py`

- Parses first 3-4 pages text for IS number, part, sec, year, ISO reference, ICS, revision, title.
- Robust regex `IS_RE = IS\s*[:\-]?\s*(\d{2,6})\s*(?:\(?\s*Part\s*(\d+)\s*\)?)?\s*(?:\(?\s*Sec\s*(\d+)\s*\)?)?\s*[:\-]\s*(\d{4})` handles variants like `IS 1448 (Part 97):2026` or `IS_1448_Part_97_2026.pdf`.
- Fallback to filename if text yielded nothing; stores `raw_identifier` and `normalized_identifier` (`IS 1448 (Part 97):2026`) plus `standard_id` safe for DB.
- ISO reference `ISO 6249:2021`, ICS `75.160.20`, revision `Second Revision`, title heuristic (first meaningful lines after IS header).

## 3. Section detection

**Module:** `src/ingestion/heading_detector.py`

- Known BIS sections vocabulary (scope, normative references, terms, principle, reagents, apparatus, ...).
- Numbered regex `^(\d+(?:\.\d+)*|[A-Z]\.\d+|Annex\s+[A-Z])` + title plausibility (≤8 words, not ending with `.`).
- De-duplicates by (title, page), assigns level (1/2/3), builds parent-child stack.
- Generates unique `section_id` (`P006_Requirements` with collision suffix to avoid truncation collisions like `P003_Booking_of_Dimensions_In_booki`).
- Tested on `IS_1448_P97` (94 sections detected) vs `IS_16724` (irregular headings) — regex + vocab fallback ensures robustness.

## 4. Table extraction

**Module:** `src/ingestion/table_extractor.py`

- Uses `pdfplumber.find_tables()` (lattice via text_x/y tolerance) + fallback `extract_tables()`.
- For each table: `table_id`, `page`, `section`, `caption` (nearby "Table N" line), `headers`, `rows`, `raw_text`, `bbox`, `confidence`.
- Validation `_validate_table`: column count consistency, row ratio → status `SUCCESS` (0.9) / `PARTIAL` (0.6) / `LOW` (0.3); rejects empty or single-column noise.
- Preserves raw extracted text + headers/rows JSON; handles merged cells by cleaning (`\n` → space). Tables not split arbitrarily; chunking preserves tables.

## 5. Figure extraction & filtering (critical)

**Modules:** `src/ingestion/figure_extractor.py` + `src/ingestion/image_filter.py`

### Why this is hard

Naive "save every image object" on `IS_1448_P97` would save 26 image objects, mostly BIS logos, header/footer banners, and scanned-page slices — not technical figures. Previous attempts failed here.

### Pipeline

1. Enumerate `page.get_images(full=True)` per page → for each image, get `page.get_image_rects(xref)` bbox (fallback to page rect), pixmap dimensions, hash (`md5(pix.samples)[:12]`).
2. Detect caption proximity: `FIGURE_CAPTION_RE = (Figure|Fig\.)\s+([A-Z]?\d+(?:\.\d+)*)` and `CAPTION_LINE_RE` search page text; returns `has_caption`, `figure_number_hint`, `caption_hint`.
3. Classify via `image_filter.classify_images`:
   - **Frequency:** `pix_hash` or `WxH` counter; if `freq >0.35` (appears on >35% pages) → logo-like, penalty -0.40.
   - **Header/footer position:** bbox in top 12% or bottom 10% → penalty -0.25 plus extra if frequent.
   - **Size:** area <2500 → tiny, -0.30; area >80000 → large diagram, +0.15; small square <100×100 without caption → -0.25 (BIS logo 79×79).
   - **Aspect / scanned slice:** very wide thin banner (aspect >8, w>h): aspect >15 → -0.40, >10 → -0.30, else -0.15; wide + thin covering page width with h<150 and h<15% page height → `scanned_slice` -0.35 (scanned reaff PDFs tiled into 35 strips of 2558×102 per page).
   - **Caption boost:** +0.35 if nearby; else -0.05.
   - **Section hint:** apparatus/test/diagram/setup → +0.10.
4. Post-filter per-page density override: if page has >8 candidates and no caption → force reject (dense scanned pages).
5. Decision: `filter_score` 0-1; reject if <0.35 or frequent+header/footer or tiny without caption; never reject if caption + area >15000.
6. Generate `figure_id` (`F010_2d5544_00`), `figure_number` from caption hint or sequential fallback, `is_confirmed` flag.

### Results

- `IS_1448_P97`: 26 total, **9 confirmed** true technical figures (pages 10, 16-19, 22, 28 with captions "Standard heater section", "Alignment of heater tube", "Fuel system schematics", etc.), 17 rejected (logos, banner strips, tiny icons). Previously 102 false positives on reaff PDFs like `10255.pdf` now **0 confirmed** after scanned-slice + dense-page fixes.
- Confirmed figures optionally saved as 150 DPI crops to `data/processed/figures/<stem>_pXX_FXXX.png`.

### Validation

- `python scripts/inspect_pdf.py path/to/file.pdf --save-debug` → prints figure list with scores/reasons + saves page renders + json.
- `python scripts/inspect_figures.py` → HTML contact sheet `data/figures_report.html` for visual verification (green confirmed vs red rejected logos).

## 6. Specification extraction

**Module:** `src/ingestion/specification_extractor.py`

- Property lexicon (length, diameter, thickness, capacity, pressure, temperature, voltage, ... + domain terms like heater tube, deposit thickness).
- Value regex captures qualifier ("not less than", "shall be"), numeric range (`\d+(?:\.\d+)?(?:\s*[-–]\s*\d+)?`), tolerance (`± \d`), unit (mm, °C, kPa, etc.), condition ("at 20 °C").
- Stores structured fields: `property`, `value` (original string), `nominal`, `tolerance`, `unit` + `original_unit`, `material` (nearby aluminium/SS etc.), `condition`, `confidence` (0.5 base + bonuses for property/unit/tolerance).
- Preserves raw chunk text (600 chars) and never invents — low confidence if uncertain.

## 7. Reference & compliance

- `reference_extractor.py`: IS/ISO/ASTM/IEC patterns, typed by context (normative for section 2, test_method if near "test method" lexicon), deduped, confidence 0.85 if year present else 0.55.
- `compliance_extractor.py`: only when explicit evidence exists (QCO, BIS licence, ISI mark, Marking/Sampling/Inspection sections with "required/mandatory/shall"). Returns "Not established from available source." if none found.

## 8. Debug & validation

- `scripts/inspect_pdf.py` dumps metadata, sections, tables, figures (with reject reasons), references, specs, warnings.
- `scripts/validate_dataset.py` checks 12 invariants (see `EVALUATION.md`).

Edge cases handled: scanned PDFs (flagged OCR), rotated pages (bbox still captured), table spanning pages (each page table captured separately), captions above/below figures (caption proximity window), annex tables/figures (Annex A.1 etc.), Roman numerals, Unicode symbols (±, °C, μ, Ω), ± tolerance, superscripts.
