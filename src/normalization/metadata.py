"""
normalization/metadata.py — Phase 3: BIS Metadata Extraction

Detects:
- IS number, part, year, revision, ISO reference, ICS, title

Normalization:
- raw_identifier vs normalized_identifier (canonical: IS 1448 (Part 97):2026)
- year as int, part as int|None
- Handles variants: "IS 1448 (Part 97):2026", "IS 1448 : Part 97 : 2026", "IS:1448-97-2026"

Extracted from first 3 pages text (headers / foreword) for precision.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

# IS number — robust to spacing, brackets, colon/unicode colon
IS_RE = re.compile(
    r"IS\s*[:\-]?\s*(\d{2,6})"            # IS + number
    r"\s*(?:\(?\s*Part\s*(\d+)\s*\)?)?"    # optional Part N
    r"\s*(?:\(?\s*Sec\s*(\d+)\s*\)?)?"     # optional Sec N
    r"\s*[:\-]\s*(\d{4})",                 # : YYYY
    re.I,
)
# Fallback without colon: "IS 1448 (Part 97) 2026"
IS_LOOSE_RE = re.compile(
    r"IS\s+(\d{2,6})\s*\(?\s*Part\s*(\d+)[^\)]*\)?\s*(\d{4})", re.I
)
ISO_RE = re.compile(r"ISO\s*(\d+(?::\d+)?)\s*:\s*(\d{4})", re.I)
ICS_RE = re.compile(r"ICS\s*([0-9\.]+(?:\s*,\s*[0-9\.]+)*)", re.I)
REVISION_RE = re.compile(r"(\bFirst\b|\bSecond\b|\bThird\b|\bFourth\b|\bFifth\b)\s+Revision", re.I)
# Title: after IS header, next 2-4 lines until ICS or BIS
TITLE_HINT_RE = re.compile(r"(Methods of|Specification for|Glossary|Code of Practice|Guidelines|.*Standard.*)", re.I)


def _first_pages_text(pages: List[Dict], n: int = 3) -> str:
    return "\n".join(p["text"] for p in pages[:n])


def extract_metadata(pages: List[Dict], filename: str = "") -> Dict:
    text = _first_pages_text(pages, 4)
    raw_is: Optional[str] = None
    normalized: Optional[str] = None
    is_number: Optional[int] = None
    part: Optional[int] = None
    sec: Optional[int] = None
    year: Optional[int] = None

    m = IS_RE.search(text)
    if not m:
        m = IS_LOOSE_RE.search(text)
        if m:
            # loose has groups: num, part, year (no sec)
            try:
                is_number = int(m.group(1))
                part = int(m.group(2)) if m.group(2) else None
                year = int(m.group(3))
                raw_is = m.group(0).strip()
            except Exception:
                m = None
    if m and not raw_is:
        # IS_RE groups: 1=num, 2=part, 3=sec, 4=year
        try:
            is_number = int(m.group(1))
            part = int(m.group(2)) if m.group(2) else None
            sec = int(m.group(3)) if m.group(3) else None
            year = int(m.group(4))
            raw_is = m.group(0).strip()
        except Exception:
            pass

    # Fallback to filename if text yielded nothing
    if not raw_is and filename:
        mf = IS_RE.search(filename.replace("_", " "))
        if mf:
            try:
                is_number = int(mf.group(1))
                part = int(mf.group(2)) if mf.group(2) else None
                sec = int(mf.group(3)) if mf.group(3) else None
                year = int(mf.group(4))
                raw_is = mf.group(0).strip()
            except Exception:
                pass
        else:
            # last fallback: simple digits
            mf2 = re.search(r"(\d{2,6}).*?(\d{4})", filename)
            if mf2:
                raw_is = mf2.group(0)

    # Normalized identifier
    if is_number and year:
        base = f"IS {is_number}"
        if part is not None:
            base += f" (Part {part})"
        if sec is not None:
            base += f" (Sec {sec})"
        base += f":{year}"
        normalized = base
    elif raw_is:
        # best-effort normalization: collapse whitespace
        normalized = re.sub(r"\s+", " ", raw_is).strip()

    # ISO reference
    iso_ref: Optional[str] = None
    mi = ISO_RE.search(text)
    if mi:
        iso_ref = f"ISO {mi.group(1)}:{mi.group(2)}"

    # ICS
    ics: Optional[str] = None
    mc = ICS_RE.search(text)
    if mc:
        ics = mc.group(1).strip()

    # Revision
    revision: Optional[str] = None
    mr = REVISION_RE.search(text)
    if mr:
        revision = mr.group(0).strip()

    # Title heuristic: first meaningful heading after IS line
    title: Optional[str] = None
    if pages:
        p1_lines = [ln.strip() for ln in pages[0]["text"].splitlines() if ln.strip()]
        # Find IS line index
        is_idx = -1
        for idx, ln in enumerate(p1_lines):
            if re.search(r"IS\s*\d+", ln, re.I):
                is_idx = idx
                break
        if is_idx >= 0:
            # Title is next 1-4 non-empty lines excluding ICS/BIS/price group lines
            candidates = []
            for ln in p1_lines[is_idx + 1:is_idx + 8]:
                if re.search(r"ICS|BIS|Price Group|MANAK|BUREAU", ln, re.I):
                    break
                if len(ln) < 4 or re.match(r"^[\W_]+$", ln):
                    continue
                candidates.append(ln)
            if candidates:
                # Join until we hit a plausible title length
                title = " ".join(candidates[:3]).strip()
                # Clean: remove trailing year/ICS fragments
                title = re.sub(r"\s*\(\s*(First|Second|Third).*$", "", title, flags=re.I).strip()
                if len(title) > 200:
                    title = title[:200]
                if len(title) < 5:
                    title = None

    # Standard ID canonical for DB: normalized with safe chars
    standard_id = None
    if normalized:
        standard_id = re.sub(r"[^A-Za-z0-9]+", "_", normalized).strip("_")

    return {
        "raw_identifier": raw_is,
        "normalized_identifier": normalized,
        "standard_id": standard_id,
        "is_number": is_number,
        "part": part,
        "section": sec,
        "year": year,
        "iso_reference": iso_ref,
        "ics_code": ics,
        "revision": revision,
        "title": title,
        "filename": filename,
    }
