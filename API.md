# API — FastAPI Endpoints

Base: `http://localhost:8000` (FastAPI serves frontend at `/` when built).

All responses are JSON. Errors: `400` for bad input, `503` for not-yet-built indexes/DB, `404` for unknown standard.

---

## `GET /api/health`

```json
{
  "status": "ok",
  "version": "0.1.0",
  "db_exists": true,
  "indexes_exist": true,
  "retrieval": "hybrid (FAISS + BM25)"
}
```

## `GET /api/stats`

```json
{
  "standards": 16,
  "chunks": 682,
  "tables": 151,
  "figures_confirmed": 38,
  "figures_total": 192,
  "references": 478,
  "specifications": 6527,
  "documents": 16
}
```

---

## `POST /api/search`

Semantic / lexical / hybrid search over chunks.

```bash
curl -X POST http://localhost:8000/api/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"thermal oxidation stability gas turbine fuels","mode":"hybrid","top_k":10}'
```

```json
{
  "query": "...",
  "mode": "hybrid",
  "results": [
    {
      "chunk_id": "IS_1448_Part_97_2026_P005_C001",
      "page": 5,
      "section": "Scope",
      "standard_id": "IS_1448_Part_97_2026",
      "text": "...",
      "score": 0.82,
      "sources": ["semantic","bm25"],
      "semantic_score": 0.91,
      "bm25_score": 2.4
    }
  ]
}
```

`mode`: `semantic` | `lexical` | `hybrid` (default).

---

## `POST /api/tender/analyze`

```bash
curl -X POST http://localhost:8000/api/tender/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"Need stainless steel water tanks for municipal drinking water, 500 L"}'
```

```json
{
  "requirements": {
    "product": "water tank",
    "material": "stainless steel",
    "application": "drinking water",
    "capacity": "500 L",
    "dimensions": [{"value":"500 L","source_page":1}],
    "testing": ["test"],
    "is_references": [],
    "keywords": ["stainless","steel","water","tanks",...]
  },
  "query_text": "water tank stainless steel drinking water 500 L ..."
}
```

## `POST /api/tender/upload`

Multipart PDF (25 MB limit, safe temp file, no path traversal).

```bash
curl -X POST http://localhost:8000/api/tender/upload -F file=@tender.pdf
```

Response same as above plus `filename`, `page_count`.

---

## `POST /api/recommend`

Evidence-grounded recommendation (hard-validated).

```bash
curl -X POST http://localhost:8000/api/recommend \
  -H 'Content-Type: application/json' \
  -d '{"query":"thermal oxidation stability of gas turbine fuels","top_k":5}'
```

```json
{
  "query": "...",
  "requirements": { "...": "..." },
  "query_text": "...",
  "recommendations": [
    {
      "standard_id": "IS_1448_Part_97_2026",
      "is_number": "IS 1448 (Part 97):2026",
      "title": "...",
      "year": 2026,
      "iso_reference": "ISO 6249:2021",
      "relevance": "HIGH",
      "score": 0.82,
      "components": {"semantic":0.74,"title":0.2,"scope":0.15,"material":0.1,"status":0.9},
      "why": ["Semantic relevance: 0.74", "Title match: 0.20", ...],
      "evidence": [{"page":5,"section":"Scope","text":"...","chunk_id":"...","score":0.8}],
      "specifications": [{"property":"deposit thickness","value":"161.925 ± 0.254","unit":"mm","page":8}],
      "tables": [{"table_id":"T008_01_...","page":8,"caption":"Table 1 ...","headers":["..."],"rows":[["..."]]}],
      "figures": [{"figure_id":"F010_...","figure_number":"Figure 1","caption":"...","page":10}],
      "references": [{"target":"IS 3171:...", "type":"normative_reference","page":2}]
    }
  ],
  "abstention": {"decision":"RECOMMEND","confidence":"MEDIUM","top_score":0.49},
  "version_warnings": [
    {"tender_ref":"IS 1448 (Part 97):2015","latest_available":"IS 1448 (Part 97):2026","message":"..."}
  ]
}
```

Abstention: if `decision=="ABSTAIN"` then `recommendations==[]` and `reason=="Insufficient evidence..."`.

---

## `GET /api/standards/{standard_id}`

Deep dive header.

```bash
curl http://localhost:8000/api/standards/IS_1448_Part_97_2026
```

## `GET /api/standards/{standard_id}/figures`

```bash
curl http://localhost:8000/api/standards/IS_1448_Part_97_2026/figures
```

Returns confirmed + rejected? Currently returns all; frontend filters `is_confirmed`.

## `GET /api/standards/{standard_id}/tables`

## `GET /api/standards/{standard_id}/references`

---

## `POST /api/compare`

Tender vs Standard matrix (MISMATCH is potential, requires officer review).

```bash
curl -X POST http://localhost:8000/api/compare \
  -H 'Content-Type: application/json' \
  -d '{"tender_text":"Need heater tube diameter 100 mm","standard_id":"IS_1448_Part_97_2026"}'
```

```json
{
  "standard_id": "IS_1448_Part_97_2026",
  "is_number": "IS 1448 (Part 97):2026",
  "tender_requirements": {"material":null, "dimensions":[{"value":"100 mm"}]},
  "comparison": [
    {"requirement":"Material","tender":"Not specified in tender","standard":"Not found in available source","evidence":"No evidence","status":"TENDER_NOT_SPECIFIED"},
    {"requirement":"Dimensions","tender":"100 mm","standard":"161.925 ± 0.254","evidence":"p.8 ...","status":"MISMATCH","note":"Potential specification mismatch requiring officer review."}
  ],
  "note": "Mismatches are POTENTIAL and require procurement officer review — system does not decide compliance."
}
```

---

## Security notes

- Upload: validates `content_type`, size limit, suffix, uses `NamedTemporaryFile` with random name, deletes after processing; never uses original filename as path.
- No filesystem paths returned beyond `pdf_path` (internal) and `image_path` (figures dir, mounted read-only).

## Running

```bash
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
# Frontend built via `cd frontend && npm run build` is served at /
```
