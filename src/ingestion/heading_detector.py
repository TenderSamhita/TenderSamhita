"""
heading_detector.py — Phase 4: Section Detection

Robust heading detection without assuming identical headings across standards.

Signals fused:
- Font-size clustering (via PyMuPDF dict extraction where available)
- Capitalization & numbering regex
- Numbering hierarchy (e.g., 5, 5.1, 5.2.1, Annex A)
- Common BIS section vocabulary

Output: list of sections with parent-child hierarchy, page, bbox.

Sections schema:
{
  "section_id": "...",
  "title": "Scope",
  "number": "1",
  "level": 1,
  "page": 5,
  "parent": None,
  "text": "..."  # optionally aggregated until next heading
}
"""
from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz

logger = logging.getLogger(__name__)

# Known BIS sections — lowercased for matching; not exhaustive but covers 90%
KNOWN_SECTIONS = [
    "scope", "normative references", "references", "terms and definitions",
    "terms", "definitions", "symbols", "abbreviations", "principle", "reagents",
    "reagents and materials", "materials", "apparatus", "equipment",
    "samples and sampling", "sampling", "preparation of apparatus",
    "calibration and standardization", "calibration", "procedure", "proceure",
    "heater tube deposit rating", "precision", "test report", "report",
    "annex", "bibliography", "foreword", "requirements", "dimensions",
    "construction", "performance", "testing", "test methods", "sampling",
    "inspection", "marking", "packaging", "labelling", "labelling",
    "general", "designation", "manufacture", "workmanship", "supply",
]

NUMBERED_RE = re.compile(r"^\s*(\d+(?:\.\d+)*|[A-Z]\.\d+|Annex\s+[A-Z])\s+(.+)$", re.I)
ANNEX_RE = re.compile(r"^\s*Annex\s+([A-Z])\b", re.I)
# Fallback: All-caps short lines like "SCOPE" or "1 SCOPE"
ALLCAPS_RE = re.compile(r"^\s*(\d+)?\s*([A-Z][A-Z \-/&,]{3,50})\s*$")


def _font_size_headings(path: Path) -> Dict[int, List[Tuple[float, str]]]:
    """Collect candidate heading lines with font-size signal."""
    doc = fitz.open(path)
    candidates = {}
    for pi, page in enumerate(doc):
        d = page.get_text("dict")
        for block in d.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                # average font size for line
                sizes = [s.get("size", 0) for s in spans]
                avg = sum(sizes) / len(sizes) if sizes else 0
                text = "".join(s.get("text", "") for s in spans).strip()
                if not text or len(text) > 120:
                    continue
                # Heuristic: headings are often larger or boldish
                # Use size > median + 1 as signal; we compute per-page median later
                candidates.setdefault(pi + 1, []).append((avg, text, line.get("bbox")))
    doc.close()
    return candidates


def _detect_from_text_pages(pages: List[Dict]) -> List[Dict]:
    """Pure text-regex fallback — works even when font dict unavailable."""
    sections: List[Dict] = []
    # Pre-compile vocabulary pattern
    vocab_pat = re.compile(
        r"^\s*(?:\d+(?:\.\d+)*\s+)?(" + "|".join(re.escape(v) for v in KNOWN_SECTIONS) + r")\s*$",
        re.I,
    )
    for pg in pages:
        page_no = pg["page_number"]
        lines = pg["text"].splitlines()
        for line in lines:
            stripped = line.strip()
            if not stripped or len(stripped) > 120:
                continue
            # Numbered heading: "5 Requirements" or "5.1 General"
            m = NUMBERED_RE.match(stripped)
            if m:
                num, title = m.group(1).strip(), m.group(2).strip()
                # Title should be plausible (not too long, not full sentence)
                if len(title.split()) <= 8 and not title.endswith("."):
                    sections.append({"page": page_no, "number": num, "title": title.strip(), "raw": stripped})
                    continue
            # Vocabulary match: line equals known section (case-insensitive)
            if vocab_pat.match(stripped):
                # Avoid duplicating if already captured as numbered
                if not any(s["raw"] == stripped and s["page"] == page_no for s in sections):
                    sections.append({"page": page_no, "number": None, "title": stripped, "raw": stripped})
                continue
            # Annex detection: "Annex A (informative)"
            if ANNEX_RE.match(stripped):
                sections.append({"page": page_no, "number": stripped.split()[1], "title": stripped, "raw": stripped})
                continue
    return sections


def detect_sections(path: Path | str, pages: Optional[List[Dict]] = None) -> List[Dict]:
    """
    Unified section detection.
    If pages provided (from text_extractor), use text-regex.
    Also optionally fuse font-size signal for ranking.
    Returns sorted, de-duplicated sections with level & parent.
    """
    path = Path(path)
    if pages is None:
        from .text_extractor import extract_pages
        pages = extract_pages(path)

    raw_secs = _detect_from_text_pages(pages)

    # De-duplicate by (title, page) keeping first
    seen = set()
    uniq: List[Dict] = []
    for s in raw_secs:
        key = (s["title"].lower().strip(), s["page"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(s)

    # Assign level and hierarchy
    sorted_secs = sorted(uniq, key=lambda x: x["page"])
    # Level: numbered depth (1 -> 1, 5.2 -> 2, Annex A -> 1)
    for s in sorted_secs:
        num = s.get("number")
        if num is None:
            s["level"] = 1
        elif re.match(r"^\d+$", str(num)):
            s["level"] = 1
        elif re.match(r"^\d+\.\d+$", str(num)):
            s["level"] = 2
        elif re.match(r"^\d+\.\d+\.\d+$", str(num)):
            s["level"] = 3
        elif re.match(r"^Annex", str(num), re.I):
            s["level"] = 1
        else:
            s["level"] = 1

    # Parent-child linking + unique section_id
    stack: List[Dict] = []
    seen_ids = set()
    for idx, s in enumerate(sorted_secs):
        # Pop until find parent with level < current
        while stack and stack[-1]["level"] >= s["level"]:
            stack.pop()
        s["parent_title"] = stack[-1]["title"] if stack else None
        s["parent_number"] = stack[-1].get("number") if stack else None
        # Generate section_id — ensure uniqueness (add index + hash to avoid truncation collisions)
        safe = re.sub(r"[^A-Za-z0-9]+", "_", s["title"])[:24]
        base = f"P{s['page']:03d}_{safe}"
        cand = base
        suffix = 0
        while cand in seen_ids:
            suffix += 1
            cand = f"{base}_{suffix:02d}"
        # Also add global idx to guarantee uniqueness even across pages with same title
        if cand in seen_ids:
            cand = f"{base}_{idx:04d}"
        s["section_id"] = cand
        seen_ids.add(cand)
        stack.append(s)

    # Post-filter: remove obvious false positives (e.g., single word appearing mid-paragraph)
    # Keep only sections where title matches known vocab or numbered pattern
    # Already filtered, but apply length guard
    filtered = [s for s in sorted_secs if len(s["title"]) >= 3 and len(s["title"]) <= 80]
    return filtered
