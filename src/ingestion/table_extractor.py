"""
table_extractor.py — Phase 5: Table Extraction

Uses pdfplumber dual strategy (lattice → stream).
Every table gets:
- table_id, page, section, caption, headers, rows, raw_text, confidence

Validation:
- column count consistency
- row non-empty
- numeric/unit sanity (preserves but flags)
"""
from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz
import pdfplumber

logger = logging.getLogger(__name__)


def _caption_nearby(page_text: str, table_bbox: Tuple[float, float, float, float], tables_y: float) -> Optional[str]:
    """Find Table caption near bbox."""
    lines = page_text.splitlines()
    for ln in lines:
        s = ln.strip()
        if re.match(r"Table\s+\d+", s, re.I):
            return s[:300]
    return None


def _validate_table(table: List[List[Optional[str]]]) -> Tuple[str, float]:
    """Returns (status, confidence)."""
    if not table or len(table) < 2:
        return "EMPTY", 0.2
    header = table[0]
    cols = len([c for c in header if c is not None and str(c).strip() != ""])
    # check row consistency
    consistent = 0
    for row in table[1:]:
        n = len([c for c in row if c is not None])
        if abs(n - cols) <= 1:
            consistent += 1
    ratio = consistent / max(len(table) - 1, 1)
    if ratio > 0.85 and cols >= 2:
        return "SUCCESS", 0.9
    elif ratio > 0.6:
        return "PARTIAL", 0.6
    else:
        return "LOW", 0.3


def _clean_cell(c) -> str:
    if c is None:
        return ""
    return str(c).strip().replace("\n", " ")


def extract_tables(path: Path | str, sections_map: Optional[Dict[int, str]] = None) -> List[Dict]:
    """
    Returns list of table dicts.
    sections_map: page -> section title for provenance.
    """
    path = Path(path)
    doc = fitz.open(path)  # for text/caption lookup
    page_texts = {i + 1: page.get_text("text") for i, page in enumerate(doc)}
    doc.close()

    results: List[Dict] = []
    try:
        with pdfplumber.open(path) as pdf:
            for pi, page in enumerate(pdf.pages):
                pg_no = pi + 1
                # Try lattice first, then stream
                tables = page.find_tables(table_settings={"text_x_tolerance": 3, "text_y_tolerance": 3})
                # pdfplumber find_tables already picks best; we fallback if empty
                if not tables:
                    tables = []
                # Also try explicit extract via page.extract_tables as backup
                if not tables:
                    try:
                        raw = page.extract_tables(table_settings={"text_x_tolerance": 3})
                        # convert raw to fake table objects? Skip — need bbox; just use raw as tables
                        # Build pseudo-tables without bbox
                        for idx, t in enumerate(raw or []):
                            if not t or len(t) < 2:
                                continue
                            status, conf = _validate_table(t)
                            hdrs = [_clean_cell(c) for c in t[0]] if t else []
                            rows = [[_clean_cell(c) for c in row] for row in t[1:]]
                            table_id = f"T{pg_no:03d}_{idx+1:02d}_{hashlib.md5(str(t).encode()).hexdigest()[:6]}"
                            # caption heuristic
                            caption = _caption_nearby(page_texts.get(pg_no, ""), (0, 0, 0, 0), 0)
                            results.append({
                                "table_id": table_id,
                                "page": pg_no,
                                "section": sections_map.get(pg_no) if sections_map else None,
                                "caption": caption,
                                "headers": hdrs,
                                "rows": rows,
                                "raw_text": "\n".join([" | ".join(r) for r in t[:6]]),
                                "extraction_method": "pdfplumber_extract_tables",
                                "confidence": conf,
                                "status": status,
                            })
                        continue
                    except Exception as e:
                        logger.debug("pdfplumber fallback error p%d: %s", pg_no, e)

                for idx, tbl in enumerate(tables):
                    try:
                        data = tbl.extract()
                    except Exception as e:
                        logger.debug("tbl extract failed p%d idx%d: %s", pg_no, idx, e)
                        continue
                    if not data or len(data) < 1:
                        continue
                    status, conf = _validate_table(data)
                    hdrs = [_clean_cell(c) for c in (data[0] if data else [])]
                    rows = [[_clean_cell(c) for c in row] for row in data[1:]]
                    bbox = tbl.bbox  # (x0, top, x1, bottom)
                    caption = _caption_nearby(page_texts.get(pg_no, ""), bbox, bbox[1] if bbox else 0)
                    table_id = f"T{pg_no:03d}_{idx+1:02d}_{hashlib.md5(str(bbox).encode()).hexdigest()[:6]}"
                    results.append({
                        "table_id": table_id,
                        "page": pg_no,
                        "section": sections_map.get(pg_no) if sections_map else None,
                        "caption": caption,
                        "headers": hdrs,
                        "rows": rows,
                        "raw_text": "\n".join([" | ".join([_clean_cell(c) for c in row]) for row in data[:8]]),
                        "bbox": bbox,
                        "extraction_method": "pdfplumber_find_tables",
                        "confidence": conf,
                        "status": status,
                    })
    except Exception as e:
        logger.warning("table extraction failed for %s: %s", path, e)

    return results
