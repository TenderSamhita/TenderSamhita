"""
text_extractor.py — Phase 2: Page-preserving text extraction

Strategy:
1. Native text extraction via PyMuPDF (fast)
2. Quality gate per page (char count, control-char ratio)
3. If quality poor & image-heavy, mark ocr_required (fallback later via easyocr)
4. Preserve page boundaries — never flatten whole PDF.
   Every output dict has document, page, text, char_count, image_count.

Page dict schema:
{
  "page_number": 1,
  "text": "...",
  "char_count": 1234,
  "word_count": 200,
  "image_count": 2,
  "width": 595, "height": 842,
  "has_text": True,
  "ocr_required": False
}
"""
from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Dict, List

import fitz

logger = logging.getLogger(__name__)

CONTROL_RE = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F]")


def _text_quality(text: str) -> float:
    """Heuristic quality score 0-1. High = good native text."""
    if not text or not text.strip():
        return 0.0
    # ratio of printable vs control, and word length sanity
    ctrl = len(CONTROL_RE.findall(text))
    total = len(text)
    ctrl_ratio = ctrl / max(total, 1)
    # average word length
    words = text.split()
    if not words:
        return 0.0
    avg_wlen = sum(len(w) for w in words) / len(words)
    # quality high if ctrl low and avg word not insane
    score = 1.0 - ctrl_ratio
    if avg_wlen > 20 or avg_wlen < 2:
        score *= 0.6
    # repeated same char?
    if len(set(text.strip()[:200])) < 5:
        score *= 0.3
    return max(0.0, min(1.0, score))


def extract_pages(path: Path | str, ocr_threshold: int = 30) -> List[Dict]:
    """
    Returns list of page dicts preserving boundaries.
    Never flattens to giant string.
    """
    path = Path(path)
    doc = fitz.open(path)
    pages: List[Dict] = []
    for i, page in enumerate(doc):
        text = page.get_text("text") or ""
        # pdfplumber-style char sanity: strip but preserve paragraph breaks
        # Normalize: keep newlines, collapse multiple spaces but not newlines
        # We preserve original for provenance; also store cleaned.
        char_count = len(text)
        word_count = len(text.split())
        image_count = len(page.get_images(full=True))
        rect = page.rect
        quality = _text_quality(text)
        ocr_required = False
        # Gate: text empty but images present OR very short + control heavy
        if char_count < ocr_threshold and image_count > 0:
            ocr_required = True
        elif quality < 0.35 and image_count > 0:
            ocr_required = True
        pages.append(
            {
                "page_number": i + 1,
                "text": text,
                "char_count": char_count,
                "word_count": word_count,
                "image_count": image_count,
                "width": float(rect.width),
                "height": float(rect.height),
                "quality": round(quality, 3),
                "has_text": char_count > ocr_threshold,
                "ocr_required": ocr_required,
            }
        )
    doc.close()
    return pages


def extract_document(path: Path | str) -> Dict:
    """High-level document extraction with doc-level summary."""
    pages = extract_pages(path)
    total_chars = sum(p["char_count"] for p in pages)
    ocr_pages = sum(1 for p in pages if p["ocr_required"])
    return {
        "path": str(Path(path).resolve()),
        "filename": Path(path).name,
        "page_count": len(pages),
        "total_chars": total_chars,
        "ocr_pages": ocr_pages,
        "ocr_required_doc": ocr_pages > len(pages) * 0.3 or total_chars < 500,
        "pages": pages,
    }
