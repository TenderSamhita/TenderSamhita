"""
scanner.py — Phase 1: PDF Corpus Discovery

Scans the configured raw_pdfs directory, inventories every PDF with:
- filename, absolute/relative path, size, page count, text presence,
  image count, IS detection hint, parse status, SHA256.

Does NOT crash on bad PDFs — one bad PDF never stops the corpus.
"""
from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import List, Optional

import fitz  # pymupdf

logger = logging.getLogger(__name__)

IS_FILENAME_RE = re.compile(r"IS[_ ]?(\d+)", re.I)
YEAR_RE = re.compile(r"(19|20)\d{2}")


@dataclass
class InventoryRecord:
    filename: str
    path: str
    relative_path: str
    file_size: int
    page_count: Optional[int]
    sha256: Optional[str]
    has_text: Optional[bool]
    text_chars: int
    image_count: int
    detected_is_hint: Optional[str]
    detected_year_hint: Optional[str]
    ocr_required: bool
    status: str  # SUCCESS | PARTIAL | OCR_REQUIRED | FAILED
    error: Optional[str] = None


def sha256_of(path: Path, chunk_size: int = 1 << 20) -> Optional[str]:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(chunk_size), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception as e:
        logger.warning("sha256 failed for %s: %s", path, e)
        return None


def hint_from_filename(name: str) -> tuple[Optional[str], Optional[str]]:
    is_hint = None
    year_hint = None
    m = IS_FILENAME_RE.search(name)
    if m:
        is_hint = m.group(1)
    y = YEAR_RE.search(name)
    if y:
        year_hint = y.group(0)
    return is_hint, year_hint


def probe_pdf(path: Path, ocr_threshold: int = 500) -> InventoryRecord:
    rel = str(path)
    try:
        root = path.anchor
    except Exception:
        root = ""
    is_hint, year_hint = hint_from_filename(path.name)
    rec = InventoryRecord(
        filename=path.name,
        path=str(path.resolve()),
        relative_path=str(path),
        file_size=path.stat().st_size if path.exists() else 0,
        page_count=None,
        sha256=None,
        has_text=None,
        text_chars=0,
        image_count=0,
        detected_is_hint=is_hint,
        detected_year_hint=year_hint,
        ocr_required=False,
        status="FAILED",
        error=None,
    )
    try:
        rec.sha256 = sha256_of(path)
        doc = fitz.open(path)
        rec.page_count = len(doc)
        total_chars = 0
        images = 0
        for page in doc:
            try:
                total_chars += len(page.get_text("text") or "")
                images += len(page.get_images(full=True))
            except Exception as e:
                logger.debug("page probe error %s p%d: %s", path.name, page.number, e)
        doc.close()
        rec.text_chars = total_chars
        rec.image_count = images
        rec.has_text = total_chars > 50
        # status logic
        if total_chars < ocr_threshold and rec.page_count and rec.page_count > 0:
            # Check if image-heavy & text-empty
            if images > rec.page_count * 0.8:
                rec.status = "OCR_REQUIRED"
                rec.ocr_required = True
            elif total_chars < 100:
                rec.status = "OCR_REQUIRED"
                rec.ocr_required = True
            else:
                rec.status = "PARTIAL"
        elif not rec.has_text:
            rec.status = "OCR_REQUIRED"
            rec.ocr_required = True
        else:
            rec.status = "SUCCESS"
    except Exception as e:
        rec.status = "FAILED"
        rec.error = f"{type(e).__name__}: {e}"
        logger.warning("probe failed %s: %s", path, e)
    return rec


def scan_corpus(root: Path | str, ocr_threshold: int = 500) -> List[InventoryRecord]:
    root = Path(root)
    if not root.exists():
        raise FileNotFoundError(f"Corpus root not found: {root}")
    pdfs = sorted(root.rglob("*.pdf"))
    logger.info("Scanning %d PDFs under %s", len(pdfs), root)
    records: List[InventoryRecord] = []
    for p in pdfs:
        rec = probe_pdf(p, ocr_threshold=ocr_threshold)
        records.append(rec)
    # summary log
    from collections import Counter
    c = Counter(r.status for r in records)
    logger.info("Scan summary: %s | total=%d", dict(c), len(records))
    return records


def save_inventory(records: List[InventoryRecord], out_path: Path | str) -> None:
    import json
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    data = [asdict(r) for r in records]
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    logger.info("Inventory saved to %s (%d records)", out, len(records))
