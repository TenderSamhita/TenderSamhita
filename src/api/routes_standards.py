"""
routes_standards.py — Standard deep-dive endpoints
"""
from __future__ import annotations

from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from ..storage.database import get_session_factory
from ..storage.models import Standard, Figure, Table, Reference, Specification, Section, Chunk

router = APIRouter()


def _cfg():
    p = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    if p.exists():
        import yaml
        with open(p, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}

def _resolve(p: str | Path) -> Path:
    p = Path(p)
    if p.is_absolute():
        return p
    return (Path(__file__).resolve().parents[2] / p).resolve()

def _session():
    cfg = _cfg()
    db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
    factory = get_session_factory(db_path)
    return factory()


@router.get("/standards/{standard_id}")
def get_standard(standard_id: str):
    sess = _session()
    try:
        std = sess.get(Standard, standard_id)
        if not std:
            raise HTTPException(status_code=404, detail=f"Standard {standard_id} not found")
        # sections
        secs = sess.query(Section).filter_by(standard_id=standard_id).order_by(Section.page_start).all()
        specs = sess.query(Specification).filter_by(standard_id=standard_id).all()
        # Fallback title from scope when ingestion failed to extract title
        title = std.title
        if not title and std.scope:
            # Extract first sentence of scope as a surrogate title
            first_sentence = (std.scope or "").split("\n")[0].strip()[:120]
            title = first_sentence or std.normalized_identifier

        # Filter specs to confidence >= 0.6 to remove extraction noise
        quality_specs = [sp for sp in specs if (sp.confidence or 0) >= 0.6]
        # If no high-confidence specs, fall back to all
        if not quality_specs:
            quality_specs = specs

        return {
            "standard_id": std.standard_id,
            "is_number": std.normalized_identifier,
            "title": title,
            "year": std.edition_year,
            "revision": std.revision,
            "iso_reference": std.iso_reference,
            "ics_code": std.ics_code,
            "page_count": std.page_count,
            "pdf_path": std.pdf_path,
            "sections": [{"section_id": s.section_id, "title": s.title, "number": s.section_number, "page": s.page_start} for s in secs[:30]],
            "specifications": [
                {
                    "property": sp.property,
                    "value": sp.value,
                    "unit": sp.unit,
                    "nominal": sp.nominal,
                    "tolerance": sp.tolerance,
                    "minimum": sp.minimum,
                    "maximum": sp.maximum,
                    "condition": sp.condition,
                    "page": sp.page,
                    "section": sp.section,
                    "confidence": sp.confidence,
                }
                for sp in quality_specs[:20]
            ],
            "scope": std.scope,
            "status": std.status or "active",
        }
    finally:
        sess.close()


@router.get("/standards/{standard_id}/figures")
def get_figures(standard_id: str):
    sess = _session()
    try:
        figs = sess.query(Figure).filter_by(standard_id=standard_id).all()
        if not figs:
            return {"standard_id": standard_id, "figures": []}
        return {
            "standard_id": standard_id,
            "figures": [
                {
                    "figure_id": f.figure_id,
                    "figure_number": f.figure_number,
                    "caption": f.caption,
                    "page": f.page,
                    "section": f.section,
                    "image_path": f.image_path,
                    "confidence": f.confidence,
                    "is_confirmed": bool(f.is_confirmed),
                }
                for f in figs
            ],
        }
    finally:
        sess.close()


@router.get("/standards/{standard_id}/tables")
def get_tables(standard_id: str):
    sess = _session()
    try:
        tables = sess.query(Table).filter_by(standard_id=standard_id).all()
        import json
        out = []
        for t in tables:
            try:
                headers = json.loads(t.headers) if t.headers else []
                rows = json.loads(t.rows) if t.rows else []
            except Exception:
                headers, rows = [], []
            out.append({
                "table_id": t.table_id,
                "page": t.page,
                "section": t.section,
                "caption": t.caption,
                "headers": headers,
                "rows": rows[:20],
                "confidence": t.confidence,
            })
        return {"standard_id": standard_id, "tables": out}
    finally:
        sess.close()


@router.get("/standards/{standard_id}/references")
def get_references(standard_id: str):
    sess = _session()
    try:
        refs = sess.query(Reference).filter_by(source_standard_id=standard_id).all()
        return {
            "standard_id": standard_id,
            "references": [
                {
                    "reference_id": r.reference_id,
                    "target": r.target_identifier,
                    "ref_standard": r.target_identifier,  # alias for frontend compatibility
                    "type": r.relationship_type,
                    "page": r.page,
                    "confidence": r.confidence,
                    "raw": (r.raw_text or "")[:300],
                }
                for r in refs
            ],
        }
    finally:
        sess.close()
