"""
routes_tender.py — Tender upload / analyze / compare

- POST /tender/upload  → multipart PDF → parsed + requirements
- POST /tender/analyze → JSON {text} → requirements
- POST /compare        → {tender_text or tender_pdf, standard_id} → matrix
"""
from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Optional

import yaml
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..recommendation.query_understanding import understand_query
from ..storage.database import get_session_factory
from ..tender.comparison import compare

router = APIRouter()


def _cfg():
    p = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}

def _resolve(p: str | Path) -> Path:
    p = Path(p)
    if p.is_absolute():
        return p
    return (Path(__file__).resolve().parents[2] / p).resolve()


class AnalyzeRequest(BaseModel):
    text: str


class CompareRequest(BaseModel):
    tender_text: Optional[str] = None
    standard_id: str


@router.post("/tender/upload")
async def tender_upload(file: UploadFile = File(...)):
    cfg = _cfg()
    max_mb = cfg.get("tender", {}).get("max_pdf_size_mb", 25)
    if file.content_type not in ("application/pdf", "application/octet-stream", "text/plain", None):
        # allow pdf only but be lenient
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    content = await file.read()
    if len(content) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large — limit {max_mb} MB")
    # safe temp
    import tempfile, os
    suffix = Path(file.filename or "tender.pdf").suffix or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        # Prevent path traversal etc – we use temp file, not original name for processing
        result = understand_query({"pdf_path": tmp_path})
        return {
            "filename": file.filename,
            "page_count": result["parsed"].get("page_count"),
            "requirements": result["requirements"],
            "query_text": result["query_text"],
        }
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass


@router.post("/tender/analyze")
def tender_analyze(req: AnalyzeRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text required")
    result = understand_query(req.text)
    return {
        "requirements": result["requirements"],
        "query_text": result["query_text"],
        "page_count": result["parsed"].get("page_count"),
    }


@router.post("/compare")
def compare_tender(req: CompareRequest):
    if not req.standard_id:
        raise HTTPException(status_code=400, detail="standard_id required")
    tender_text = req.tender_text
    if not tender_text or not tender_text.strip():
        raise HTTPException(status_code=400, detail="tender_text required")
    # Parse tender
    from ..tender.parser import parse_tender_text
    from ..tender.extractor import extract_requirements

    tender_parsed = parse_tender_text(tender_text)
    tender_req = extract_requirements(tender_parsed)

    # Load standard specs
    cfg = _cfg()
    db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
    if not db_path.exists():
        raise HTTPException(status_code=503, detail="DB not ready")
    factory = get_session_factory(db_path)
    session = factory()
    try:
        from ..storage.models import Standard, Specification
        std = session.get(Standard, req.standard_id)
        if not std:
            raise HTTPException(status_code=404, detail=f"Standard {req.standard_id} not found")
        specs = session.query(Specification).filter_by(standard_id=req.standard_id).all()
        specs_list = [
            {"property": s.property, "value": s.value, "unit": s.unit, "page": s.page, "section": s.section, "raw_text": s.raw_text, "tolerance": s.tolerance}
            for s in specs
        ]
        # Also fetch some scope text for matrix context
        rows = compare(tender_req, {"is_number": std.is_number, "title": std.title}, specs_list, std.full_text or "")
        return {
            "standard_id": req.standard_id,
            "is_number": std.normalized_identifier,
            "tender_requirements": tender_req,
            "comparison": rows,
            "note": "Mismatches are POTENTIAL and require procurement officer review — system does not decide compliance.",
        }
    finally:
        session.close()
