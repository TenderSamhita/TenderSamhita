"""
tender/parser.py — Tender PDF / text parser

Supports:
- PDF upload → page-preserving text extraction (reuses ingestion.text_extractor)
- Plain text input
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)


def parse_tender_pdf(path: Path | str) -> Dict:
    from ..ingestion.text_extractor import extract_pages
    pages = extract_pages(path)
    full_text = "\n\n".join(p["text"] for p in pages)
    return {
        "source": "pdf",
        "path": str(Path(path).resolve()),
        "filename": Path(path).name,
        "page_count": len(pages),
        "pages": pages,
        "full_text": full_text,
        "total_chars": sum(p["char_count"] for p in pages),
    }


def parse_tender_text(text: str) -> Dict:
    # Wrap as single-page pseudo
    return {
        "source": "text",
        "path": None,
        "filename": None,
        "page_count": 1,
        "pages": [{"page_number": 1, "text": text, "char_count": len(text), "word_count": len(text.split())}],
        "full_text": text,
        "total_chars": len(text),
    }
