"""
recommendation/evidence.py — Evidence assembly for a standard

Pulls scope evidence, technical evidence, tables, figures, references
from DB/JSON for final recommendation payload.
"""
from __future__ import annotations

from typing import Dict, List

from sqlalchemy.orm import Session

from ..storage import models


def assemble_evidence(session: Session, standard_id: str, top_chunks: List[Dict]) -> Dict:
    std = session.get(models.Standard, standard_id)
    if not std:
        return {"error": "Standard not found", "standard_id": standard_id}

    # Fetch related
    sections = session.query(models.Section).filter_by(standard_id=standard_id).all()
    specs = session.query(models.Specification).filter_by(standard_id=standard_id).all()
    tables = session.query(models.Table).filter_by(standard_id=standard_id).all()
    figures = session.query(models.Figure).filter_by(standard_id=standard_id, is_confirmed=1).all()
    refs = session.query(models.Reference).filter_by(source_standard_id=standard_id).all()
    compliance = session.query(models.Compliance).filter_by(standard_id=standard_id).all()

    # Build evidence chunks grouped by type
    evidence = []
    for ch in top_chunks[:3]:
        evidence.append({
            "page": ch.get("meta", {}).get("page") or ch.get("page"),
            "section": ch.get("meta", {}).get("section") or ch.get("section"),
            "text": ch.get("text")[:600],
            "chunk_id": ch.get("chunk_id"),
            "score": ch.get("hybrid_score") or ch.get("semantic_score") or ch.get("bm25_score"),
        })

    # Apply null-title fallback from scope
    title = std.title
    if not title and std.scope:
        first_sentence = (std.scope or "").split("\n")[0].strip()[:120]
        title = first_sentence or std.normalized_identifier

    # Filter specs by confidence to reduce noise
    quality_specs = [s for s in specs if (s.confidence or 0) >= 0.6]
    if not quality_specs:
        quality_specs = specs

    return {
        "standard_id": standard_id,
        "is_number": std.normalized_identifier or std.is_number,
        "title": title,
        "year": std.edition_year,
        "revision": std.revision,
        "iso_reference": std.iso_reference,
        "ics_code": std.ics_code,
        "scope": std.scope or (sections[0].title if sections else None),
        "evidence": evidence,
        "specifications": [
            {
                "property": s.property, "value": s.value, "unit": s.unit,
                "nominal": s.nominal, "tolerance": s.tolerance,
                "page": s.page, "section": s.section, "confidence": s.confidence,
            }
            for s in quality_specs[:12]
        ],
        "tables": [{"table_id": t.table_id, "page": t.page, "caption": t.caption, "headers": t.headers, "rows": t.rows[:800] if isinstance(t.rows,str) else str(t.rows)[:800]} for t in tables[:5]],
        "figures": [{"figure_id": f.figure_id, "figure_number": f.figure_number, "caption": f.caption, "page": f.page, "image_path": f.image_path} for f in figures[:5]],
        "references": [{"reference_id": r.reference_id, "target": r.target_identifier, "ref_standard": r.target_identifier, "type": r.relationship_type, "page": r.page} for r in refs[:10]],
        "compliance": [{"type": c.type, "value": c.value[:300], "page": c.page} for c in compliance[:5]],
        "pdf_path": std.pdf_path,
        "page_count": std.page_count,
    }
