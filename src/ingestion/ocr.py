"""
ocr.py — OCR fallback stub

For MVP: corpus is native-text; OCR is flagged but not executed automatically
(because it is expensive and requires model download).
This module provides:
- should_ocr(page) gate
- ocr_page(page_image) using easyocr if available
- fallback message when OCR not executed
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except Exception:
    EASYOCR_AVAILABLE = False


def should_ocr(page: Dict, total_doc_chars: int) -> bool:
    """Gate logic mirrored from text_extractor."""
    if page.get("ocr_required"):
        return True
    if page.get("char_count", 0) < 30 and page.get("image_count", 0) > 0:
        return True
    if total_doc_chars < 500 and page.get("image_count", 0) > 0:
        return True
    return False


def ocr_page_image(image_path: Path | str, lang: str = "en") -> Optional[str]:
    if not EASYOCR_AVAILABLE:
        logger.warning("easyocr not available — skipping OCR for %s", image_path)
        return None
    try:
        reader = easyocr.Reader([lang], gpu=False, verbose=False)
        results = reader.readtext(str(image_path))
        text = " ".join([r[1] for r in results])
        return text
    except Exception as e:
        logger.warning("OCR failed for %s: %s", image_path, e)
        return None


def ocr_pdf_page(path: Path | str, page_number: int, dpi: int = 200) -> Optional[str]:
    """Render PDF page to image then OCR."""
    import fitz
    try:
        doc = fitz.open(path)
        page = doc[page_number - 1]
        pix = page.get_pixmap(dpi=dpi)
        # to PIL
        import io
        from PIL import Image
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            img.save(tmp.name)
            tmp_path = tmp.name
        text = ocr_page_image(tmp_path)
        doc.close()
        return text
    except Exception as e:
        logger.warning("ocr_pdf_page failed p%d: %s", page_number, e)
        return None
