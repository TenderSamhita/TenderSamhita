"""
storage/repository.py — CRUD helpers
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from . import models

logger = logging.getLogger(__name__)


def upsert_standard(session: Session, meta: Dict, pdf_path: str, source_hash: str, page_count: int, full_text: str):
    sid = meta.get("standard_id") or Path(pdf_path).stem
    existing = session.get(models.Standard, sid)
    if existing:
        # update
        existing.title = meta.get("title") or existing.title
        existing.edition_year = meta.get("year")
        existing.revision = meta.get("revision")
        existing.iso_reference = meta.get("iso_reference")
        existing.ics_code = meta.get("ics_code")
        existing.normalized_identifier = meta.get("normalized_identifier")
        existing.raw_identifier = meta.get("raw_identifier")
        existing.is_number = str(meta.get("is_number")) if meta.get("is_number") else existing.is_number
        existing.source_hash = source_hash
        existing.page_count = page_count
        session.commit()
        return existing
    std = models.Standard(
        standard_id=sid,
        is_number=str(meta.get("is_number")) if meta.get("is_number") else None,
        raw_identifier=meta.get("raw_identifier"),
        normalized_identifier=meta.get("normalized_identifier"),
        title=meta.get("title"),
        edition_year=meta.get("year"),
        revision=meta.get("revision"),
        iso_reference=meta.get("iso_reference"),
        ics_code=meta.get("ics_code"),
        pdf_path=str(pdf_path),
        page_count=page_count,
        full_text=full_text[:200000] if full_text else None,
        source_hash=source_hash,
    )
    session.add(std)
    session.commit()
    return std


def add_sections(session: Session, standard_id: str, sections: List[Dict]):
    for s in sections:
        sec = models.Section(
            section_id=s.get("section_id"),
            standard_id=standard_id,
            section_number=str(s.get("number")) if s.get("number") else None,
            title=s.get("title"),
            page_start=s.get("page"),
            page_end=s.get("page"),
            parent_section_id=s.get("parent_title"),
        )
        session.merge(sec)
    session.commit()


def add_chunks(session: Session, chunks: List[Dict]):
    for c in chunks:
        ch = models.Chunk(
            chunk_id=c["chunk_id"],
            standard_id=c["standard_id"],
            section_id=c.get("section_id"),
            page=c.get("page"),
            section_title=c.get("section"),
            text=c["text"],
            chunk_type=c.get("chunk_type", "general"),
        )
        session.merge(ch)
    session.commit()


def add_specifications(session: Session, specs: List[Dict], standard_id: str):
    for s in specs:
        try:
            sp = models.Specification(
                spec_id=s["spec_id"],
                standard_id=standard_id,
                page=s.get("page", 0),
                section=s.get("section"),
                property=s.get("property", ""),
                value=s.get("value", ""),
                nominal=s.get("nominal"),
                minimum=s.get("minimum"),
                maximum=s.get("maximum"),
                tolerance=str(s.get("tolerance")) if s.get("tolerance") else None,
                unit=s.get("unit"),
                material=s.get("material"),
                grade=s.get("grade"),
                condition=s.get("condition"),
                raw_text=s.get("raw_text", ""),
                confidence=s.get("confidence", 0.5),
            )
            session.merge(sp)
        except Exception as e:
            logger.debug("spec insert failed %s: %s", s.get("spec_id"), e)
    session.commit()


def add_tables(session: Session, tables: List[Dict], standard_id: str):
    for t in tables:
        rec = models.Table(
            table_id=t["table_id"],
            standard_id=standard_id,
            page=t.get("page", 0),
            section=t.get("section"),
            caption=t.get("caption"),
            headers=json.dumps(t.get("headers", []), ensure_ascii=False),
            rows=json.dumps(t.get("rows", [])[:200], ensure_ascii=False),
            raw_text=t.get("raw_text", "")[:5000],
            confidence=t.get("confidence", 0.5),
            status=t.get("status", "SUCCESS"),
        )
        session.merge(rec)
    session.commit()


def add_figures(session: Session, figures: List[Dict], standard_id: str):
    for f in figures:
        rec = models.Figure(
            figure_id=f["figure_id"],
            standard_id=standard_id,
            page=f.get("page", 0),
            section=f.get("section"),
            figure_number=f.get("figure_number"),
            caption=f.get("caption"),
            image_path=f.get("image_path"),
            bbox=str(f.get("bbox")),
            confidence=f.get("confidence", 0.5),
            is_confirmed=1 if f.get("is_confirmed") else 0,
            duplicate_group=f.get("duplicate_group"),
            source_method=f.get("source_method"),
        )
        session.merge(rec)
    session.commit()


def add_references(session: Session, refs: List[Dict], standard_id: str):
    for idx, r in enumerate(refs):
        rid = f"{standard_id}_R{idx:04d}"
        rec = models.Reference(
            reference_id=rid,
            source_standard_id=standard_id,
            target_identifier=r.get("target_identifier"),
            relationship_type=r.get("relationship_type"),
            raw_text=r.get("raw_text"),
            page=r.get("page", 0),
            confidence=r.get("confidence", 0.5),
        )
        session.merge(rec)
    session.commit()


def add_compliance(session: Session, comps: List[Dict], standard_id: str):
    for c in comps:
        rec = models.Compliance(
            compliance_id=c["compliance_id"],
            standard_id=standard_id,
            type=c.get("type"),
            value=c.get("value"),
            source=c.get("source"),
            page=c.get("page"),
            confidence=c.get("confidence", 0.5),
        )
        session.merge(rec)
    session.commit()


def get_all_chunks(session: Session) -> List[models.Chunk]:
    return session.query(models.Chunk).all()


def get_standard(session: Session, sid: str) -> Optional[models.Standard]:
    return session.get(models.Standard, sid)


def search_standards_by_is(session: Session, is_number: str) -> List[models.Standard]:
    return session.query(models.Standard).filter(models.Standard.is_number == str(is_number)).all()
