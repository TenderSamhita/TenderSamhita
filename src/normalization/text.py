"""
normalization/text.py — Lightweight text normalization

- Unicode normalize (NFKC)
- Collapse whitespace but preserve paragraph breaks
- Repair common OCR artifacts (optional)
- Preserve technical tokens: ±, °C, μ, etc. (do not strip)
"""
from __future__ import annotations

import re
import unicodedata


def normalize_text(text: str) -> str:
    if not text:
        return ""
    # NFKC
    text = unicodedata.normalize("NFKC", text)
    # Fix Windows cp1252 artifacts common in BIS PDFs
    # e.g., \xa0 non-breaking, smart quotes
    text = text.replace("\xa0", " ").replace("\r", "")
    # Preserve ±, ° etc but normalize decimal comma vs point? Keep original
    # Collapse 3+ newlines to 2, and 3+ spaces to 1 but keep newlines
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Trim lines
    lines = [ln.strip() for ln in text.splitlines()]
    # Remove empty lines collapse
    out_lines = []
    prev_empty = False
    for ln in lines:
        if not ln:
            if not prev_empty:
                out_lines.append("")
            prev_empty = True
        else:
            out_lines.append(ln)
            prev_empty = False
    return "\n".join(out_lines).strip()
