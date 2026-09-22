"""
ingestion/pipeline.py — Canonical ingestion pipeline

For each PDF:
  scanner.probe → text_extractor → metadata → heading_detector
  → table_extractor → figure_extractor → specification → references → compliance
  → chunking → JSON canonical → DB persistence

Every output JSON conforms to spec 23:
{
  document, metadata, sections, chunks, specifications, tables, figures, references, compliance
}

Page-level provenance mandatory. One bad PDF must not crash whole run.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional

from tqdm import tqdm

from ..normalization.metadata import extract_metadata
from ..normalization.text import normalize_text
from .heading_detector import detect_sections
from .text_extractor import extract_pages

logger = logging.getLogger(__name__)


def _hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _chunk_pages(pages: List[Dict], sections: List[Dict], standard_id: str, target_tokens: int = 500) -> List[Dict]:
    """
    Semantic chunking: section → paragraph, ~300-700 tokens with overlap only when needed.
    Approach: split by section boundaries, then by paragraphs (double newline), pack until target_tokens.
    Uses approximate tokens = words * 1.3 (or chars/4). Simple but effective for MVP.
    """
    # Build page->section map
    page_to_section = {}
    sec_by_page = sorted(sections, key=lambda s: s["page"])
    current = None
    for pg in sorted(pages, key=lambda p: p["page_number"]):
        # sections starting at or before this page
        for s in sec_by_page:
            if s["page"] <= pg["page_number"]:
                current = s["title"]
        page_to_section[pg["page_number"]] = current or "General"

    def est_tokens(t: str) -> int:
        return max(1, int(len(t.split()) * 1.3))

    chunks: List[Dict] = []
    chunk_counter = 0
    for pg in pages:
        sec_title = page_to_section.get(pg["page_number"], "General")
        # split page text into paragraphs
        paras = [p.strip() for p in pg["text"].split("\n\n") if p.strip()]
        # if no double newline, split by sentences fallback
        if len(paras) <= 1 and len(pg["text"]) > 800:
            import re
            paras = [s.strip() for s in re.split(r"(?<=[\.。])\s+", pg["text"]) if s.strip()]

        buf = ""
        buf_tokens = 0
        for para in paras:
            pt = est_tokens(para)
            # never create giant chunk >700 tokens; split para if needed
            if pt > 700:
                # flush buf first
                if buf.strip() and len(buf.strip()) >= 40:
                    chunk_counter += 1
                    cid = f"{standard_id}_P{pg['page_number']:03d}_C{chunk_counter:03d}"
                    chunks.append({
                        "chunk_id": cid,
                        "standard_id": standard_id,
                        "section": sec_title,
                        "page": pg["page_number"],
                        "text": normalize_text(buf.strip()),
                        "chunk_type": "requirements" if any(k in sec_title.lower() for k in ["requirement","apparatus","test","scope"]) else "general",
                        "token_count": buf_tokens,
                    })
                    buf = ""
                    buf_tokens = 0
                # split long para by sentences
                import re as _re
                sentences = _re.split(r"(?<=[\.])\s+", para)
                for sent in sentences:
                    st = est_tokens(sent)
                    if buf_tokens + st > target_tokens and buf.strip():
                        chunk_counter += 1
                        cid = f"{standard_id}_P{pg['page_number']:03d}_C{chunk_counter:03d}"
                        chunks.append({
                            "chunk_id": cid,
                            "standard_id": standard_id,
                            "section": sec_title,
                            "page": pg["page_number"],
                            "text": normalize_text(buf.strip()),
                            "chunk_type": "general",
                            "token_count": buf_tokens,
                        })
                        buf = sent + " "
                        buf_tokens = st
                    else:
                        buf += sent + " "
                        buf_tokens += st
                continue

            if buf_tokens + pt > target_tokens and buf.strip():
                chunk_counter += 1
                cid = f"{standard_id}_P{pg['page_number']:03d}_C{chunk_counter:03d}"
                text_clean = normalize_text(buf.strip())
                if len(text_clean) >= 40:  # reject garbage chunks
                    chunks.append({
                        "chunk_id": cid,
                        "standard_id": standard_id,
                        "section": sec_title,
                        "page": pg["page_number"],
                        "text": text_clean,
                        "chunk_type": "requirements" if any(k in sec_title.lower() for k in ["requirement","apparatus","test","scope"]) else "general",
                        "token_count": buf_tokens,
                    })
                buf = para + "\n\n"
                buf_tokens = pt
            else:
                buf += para + "\n\n"
                buf_tokens += pt

        if buf.strip() and len(normalize_text(buf.strip())) >= 40:
            chunk_counter += 1
            cid = f"{standard_id}_P{pg['page_number']:03d}_C{chunk_counter:03d}"
            chunks.append({
                "chunk_id": cid,
                "standard_id": standard_id,
                "section": sec_title,
                "page": pg["page_number"],
                "text": normalize_text(buf.strip()),
                "chunk_type": "requirements" if any(k in sec_title.lower() for k in ["requirement","apparatus","test","scope"]) else "general",
                "token_count": buf_tokens,
            })

    # Filter: no giant garbage, no empty
    filtered = [c for c in chunks if 40 <= len(c["text"]) <= 6000 and c["token_count"] >= 10]
    return filtered


def process_single_pdf(
    pdf_path: Path | str,
    json_out_dir: Optional[Path] = None,
    figures_out_dir: Optional[Path] = None,
    config: Optional[Dict] = None,
    use_db: bool = False,
    db_path: Optional[Path] = None,
) -> Dict:
    """
    Process one PDF end-to-end. Returns canonical JSON dict + status.
    Persists to DB if use_db True.
    """
    pdf_path = Path(pdf_path)
    t0 = time.time()
    log_ctx = {"file": pdf_path.name}
    status = "SUCCESS"
    warnings: List[str] = []
    try:
        # 1. Text extraction
        pages = extract_pages(pdf_path)
        total_chars = sum(p["char_count"] for p in pages)
        ocr_pages = sum(1 for p in pages if p["ocr_required"])
        if total_chars < 100 and ocr_pages > 0:
            warnings.append(f"low_text_{total_chars}_ocr_pages_{ocr_pages}")

        # 2. Metadata
        meta = extract_metadata(pages, filename=pdf_path.name)
        standard_id = meta.get("standard_id") or pdf_path.stem

        # 3. Sections
        try:
            sections = detect_sections(pdf_path, pages)
        except Exception as e:
            logger.warning("section detection failed %s: %s", pdf_path.name, e)
            sections = []
            status = "PARTIAL"
            warnings.append(f"section_failed:{e}")

        sections_map = {s["page"]: s["title"] for s in sections}

        # 4. Tables
        try:
            from .table_extractor import extract_tables
            tables = extract_tables(pdf_path, sections_map=sections_map)
        except Exception as e:
            logger.warning("table extraction failed %s: %s", pdf_path.name, e)
            tables = []
            warnings.append(f"table_failed:{e}")

        # 5. Figures
        try:
            from .figure_extractor import extract_figures
            figures = extract_figures(pdf_path, pages=pages, sections_map=sections_map, save_dir=figures_out_dir, config=config.get("ingestion",{}).get("figure") if config else None)
        except Exception as e:
            logger.warning("figure extraction failed %s: %s", pdf_path.name, e)
            figures = []
            warnings.append(f"figure_failed:{e}")

        # 6. Specifications
        try:
            from .specification_extractor import extract_specifications
            specs = extract_specifications(pages, sections_map=sections_map)
        except Exception as e:
            logger.warning("spec extraction failed %s: %s", pdf_path.name, e)
            specs = []
            warnings.append(f"spec_failed:{e}")

        # 7. References
        try:
            from .reference_extractor import extract_references
            refs = extract_references(pages, source_standard_id=standard_id)
        except Exception as e:
            logger.warning("reference extraction failed %s: %s", pdf_path.name, e)
            refs = []
            warnings.append(f"ref_failed:{e}")

        # 8. Compliance
        try:
            from .compliance_extractor import extract_compliance
            compliance = extract_compliance(pages, standard_id=standard_id)
        except Exception as e:
            logger.warning("compliance extraction failed %s: %s", pdf_path.name, e)
            compliance = []
            warnings.append(f"compliance_failed:{e}")

        # 9. Chunking (semantic)
        chunks = _chunk_pages(pages, sections, standard_id, target_tokens=config.get("chunking",{}).get("target_tokens",500) if config else 500)

        # 10. Document top-level
        doc_hash = _hash_file(pdf_path)
        document = {
            "file_name": pdf_path.name,
            "path": str(pdf_path.resolve()),
            "hash": doc_hash,
            "page_count": len(pages),
            "total_chars": total_chars,
            "ocr_pages": ocr_pages,
            "parse_status": status,
        }

        canonical = {
            "document": document,
            "metadata": meta,
            "sections": sections,
            "chunks": chunks,
            "specifications": specs,
            "tables": tables,
            "figures": figures,
            "references": refs,
            "compliance": compliance,
        }

        # Save JSON
        if json_out_dir:
            json_out_dir = Path(json_out_dir)
            json_out_dir.mkdir(parents=True, exist_ok=True)
            out_path = json_out_dir / f"{standard_id}.json"
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(canonical, f, indent=2, ensure_ascii=False)

        # DB persistence
        if use_db and db_path:
            from ..storage.database import get_session_factory
            from ..storage import repository as repo
            factory = get_session_factory(db_path)
            session = factory()
            try:
                full_text = "\n\n".join(p["text"][:5000] for p in pages[:5])  # truncated for storage
                repo.upsert_standard(session, meta, str(pdf_path), doc_hash, len(pages), full_text)
                if sections:
                    repo.add_sections(session, standard_id, sections)
                if chunks:
                    repo.add_chunks(session, chunks)
                if specs:
                    repo.add_specifications(session, specs, standard_id)
                if tables:
                    repo.add_tables(session, tables, standard_id)
                if figures:
                    repo.add_figures(session, figures, standard_id)
                if refs:
                    repo.add_references(session, refs, standard_id)
                if compliance:
                    repo.add_compliance(session, compliance, standard_id)
                # Document row
                from ..storage.models import Document
                doc_row = Document(
                    document_id=doc_hash[:16],
                    file_name=pdf_path.name,
                    path=str(pdf_path.resolve()),
                    hash=doc_hash,
                    page_count=len(pages),
                    parse_status=status,
                    ocr_required=1 if ocr_pages>0 else 0,
                    error_message="; ".join(warnings) if warnings else None,
                )
                session.merge(doc_row)
                session.commit()
            except Exception as e:
                session.rollback()
                logger.error("DB persistence failed %s: %s", pdf_path.name, e)
                status = "PARTIAL"
                warnings.append(f"db_failed:{e}")
            finally:
                session.close()

        elapsed = time.time() - t0
        logger.info("Processed %s | status=%s | pages=%d | chunks=%d | tables=%d | figures=%d(conf=%d) | refs=%d | specs=%d | %.2fs | %s",
                    pdf_path.name, status, len(pages), len(chunks), len(tables),
                    len([f for f in figures if f.get("is_confirmed")]), len(figures), len(refs), len(specs), elapsed,
                    ";".join(warnings) if warnings else "OK")
        canonical["_warnings"] = warnings
        canonical["_elapsed"] = elapsed
        canonical["_status"] = status
        return canonical

    except Exception as e:
        logger.error("Fatal process failed %s: %s", pdf_path.name, e, exc_info=True)
        return {
            "document": {"file_name": pdf_path.name, "path": str(pdf_path), "parse_status": "FAILED", "error": str(e)},
            "metadata": {},
            "sections": [],
            "chunks": [],
            "specifications": [],
            "tables": [],
            "figures": [],
            "references": [],
            "compliance": [],
            "_status": "FAILED",
            "_error": str(e),
        }


def process_corpus(
    root: Path | str,
    json_out_dir: Path | str,
    figures_out_dir: Path | str,
    db_path: Path | str | None = None,
    config: Optional[Dict] = None,
    limit: int = 0,
    skip_hashed: bool = True,
) -> Dict:
    """
    Process entire corpus with hash-based incremental skip.
    Returns summary stats.
    """
    root = Path(root)
    pdfs = sorted(root.rglob("*.pdf"))
    if limit and limit > 0:
        pdfs = pdfs[:limit]

    json_out_dir = Path(json_out_dir)
    figures_out_dir = Path(figures_out_dir)
    json_out_dir.mkdir(parents=True, exist_ok=True)
    figures_out_dir.mkdir(parents=True, exist_ok=True)

    # Load existing hashes for skip
    existing_hashes = set()
    if skip_hashed and db_path and Path(db_path).exists():
        try:
            from ..storage.database import get_session_factory
            from ..storage.models import Document
            factory = get_session_factory(db_path)
            session = factory()
            rows = session.query(Document.hash).all()
            existing_hashes = {r[0] for r in rows if r[0]}
            session.close()
            logger.info("Incremental: %d existing document hashes", len(existing_hashes))
        except Exception as e:
            logger.warning("hash cache load failed: %s", e)

    stats = {"total": len(pdfs), "success": 0, "partial": 0, "failed": 0, "skipped": 0, "ocr_required": 0}
    for pdf in tqdm(pdfs, desc="Ingesting PDFs"):
        # hash skip
        if skip_hashed and existing_hashes:
            try:
                h = _hash_file(pdf)
                if h in existing_hashes:
                    stats["skipped"] += 1
                    continue
            except Exception:
                pass
        result = process_single_pdf(pdf, json_out_dir=json_out_dir, figures_out_dir=figures_out_dir, config=config, use_db=bool(db_path), db_path=db_path)
        st = result.get("_status", "FAILED")
        if st == "SUCCESS":
            stats["success"] += 1
        elif st == "PARTIAL":
            stats["partial"] += 1
        else:
            stats["failed"] += 1
        if result.get("document", {}).get("ocr_pages", 0) > 0:
            stats["ocr_required"] += 1

    logger.info("Corpus ingestion summary: %s", stats)
    return stats
