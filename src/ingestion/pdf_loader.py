"""
pdf_loader.py — Thin wrapper around PyMuPDF for safe opening.
Ensures:
- Every PDF is opened read-only
- Encrypted PDFs are flagged
- Page count is available without loading full content
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import fitz

logger = logging.getLogger(__name__)


class PDFLoadError(RuntimeError):
    pass


def open_pdf(path: Path | str) -> fitz.Document:
    path = Path(path)
    if not path.exists():
        raise PDFLoadError(f"File not found: {path}")
    try:
        doc = fitz.open(path)
        if doc.is_encrypted:
            # Try empty password; if still encrypted, flag
            try:
                doc.authenticate("")
            except Exception:
                pass
            if doc.is_encrypted:
                doc.close()
                raise PDFLoadError(f"Encrypted PDF (password required): {path}")
        return doc
    except fitz.FileDataError as e:
        raise PDFLoadError(f"Corrupt or unsupported PDF {path}: {e}") from e
    except Exception as e:
        raise PDFLoadError(f"Failed to open {path}: {e}") from e


def get_page_count(path: Path | str) -> Optional[int]:
    try:
        doc = open_pdf(path)
        n = len(doc)
        doc.close()
        return n
    except Exception:
        return None
