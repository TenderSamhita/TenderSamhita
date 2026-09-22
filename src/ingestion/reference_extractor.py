"""
reference_extractor.py — Phase 8: Normative / Allied References

Extracts relationships:
- normative references section (Section 2) plus scattered IS/ISO/ASTM mentions

Pattern:
- IS XXXX[: YYYY] / IS XXXX (Part N):YYYY
- ISO XXXX: YYYY
- ASTM D-XXXX
- IEC XXXX

Relationship types:
- normative_reference (default for section 2)
- test_method_reference (when near "test method" lexicon)
- terminology_reference
- allied (general)

Evidence preserved: raw_text + page
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

# IS robust
IS_RE = re.compile(
    r"IS\s*(\d{2,6})\s*(?:\(?\s*Part\s*(\d+)[^\)]*\)?)?\s*(?:\(?\s*Sec\s*(\d+)[^\)]*\)?)?\s*[:\-]?\s*(\d{4})?",
    re.I,
)
ISO_RE = re.compile(r"ISO\s*(\d+(?:[\-:]\d+)*(?:\s*Part\s*\d+)?)\s*[:\-]?\s*(\d{4})?", re.I)
ASTM_RE = re.compile(r"ASTM\s*([A-Z]?\s*\d+(?:[\-\.]\d+)*)", re.I)
IEC_RE = re.compile(r"IEC\s*(\d+(?:[\-:]\d+)*)", re.I)


def _relationship_for(context: str) -> str:
    low = context.lower()
    if "normative" in low or "references" in low:
        return "normative_reference"
    if "test" in low and ("method" in low or "procedure" in low):
        return "test_method_reference"
    if "terminolog" in low or "definitions" in low or "vocabulary" in low:
        return "terminology_reference"
    if "safety" in low:
        return "safety_reference"
    return "allied"


def extract_references(pages: List[Dict], source_standard_id: Optional[str] = None) -> List[Dict]:
    refs: List[Dict] = []
    seen_keys = set()

    # Join to detect normative section context
    full_lower = "\n".join(p["text"].lower() for p in pages[:6])
    normative_present = "normative references" in full_lower

    for pg in pages:
        page_no = pg["page_number"]
        text = pg["text"]
        # Use a window around each match to infer relationship
        for m in IS_RE.finditer(text):
            raw = m.group(0).strip()
            # Skip false positives: very short like "IS 1" without year/part and inside unrelated sentence?
            # Keep only if has number + at least year or Part
            has_year = bool(re.search(r"\d{4}", raw))
            has_part = "part" in raw.lower()
            # If neither year nor part, likely noise like "is 144..." Skip unless > 4 digits
            if not (has_year or has_part):
                # check if IS number > 1000 and maybe fallback
                num = m.group(1)
                if not num or int(num) < 100:
                    continue
            # Deduplicate by normalized raw per doc
            key = raw.lower().replace(" ", "")
            if key in seen_keys:
                continue
            seen_keys.add(key)
            # Determine relationship by section hint
            section_hint = ""
            # Heuristic: if page is 2-4 and normative_present → normative
            if normative_present and page_no <= 5:
                section_hint = "normative references"
            rel = _relationship_for(section_hint or text[max(0,m.start()-300):m.start()])
            # Build target identifier normalized
            try:
                num = m.group(1)
                part = m.group(2)
                sec = m.group(3)
                year = m.group(4)
                target = f"IS {num}"
                if part:
                    target += f" (Part {part})"
                if sec:
                    target += f" (Sec {sec})"
                if year:
                    target += f":{year}"
            except Exception:
                target = raw
            # Confidence: higher if year present
            conf = 0.85 if has_year else 0.55
            refs.append({
                "source_standard_id": source_standard_id,
                "target_identifier": target,
                "raw_text": raw,
                "relationship_type": rel,
                "page": page_no,
                "confidence": conf,
                "source": "IS_RE",
            })
        # ISO
        for m in ISO_RE.finditer(text):
            raw = m.group(0).strip()
            key = raw.lower().replace(" ","")
            if key in seen_keys:
                continue
            seen_keys.add(key)
            refs.append({
                "source_standard_id": source_standard_id,
                "target_identifier": raw,
                "raw_text": raw,
                "relationship_type": "normative_reference",
                "page": page_no,
                "confidence": 0.75,
                "source": "ISO_RE",
            })
        # ASTM / IEC — lower priority
        for pat, tag in [(ASTM_RE, "test_method_reference"), (IEC_RE, "allied")]:
            for m in pat.finditer(text):
                raw = m.group(0).strip()
                if len(raw) < 6:
                    continue
                key = raw.lower().replace(" ","")
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                refs.append({
                    "source_standard_id": source_standard_id,
                    "target_identifier": raw,
                    "raw_text": raw,
                    "relationship_type": tag,
                    "page": page_no,
                    "confidence": 0.6,
                    "source": tag,
                })

    # Filter: keep only high-confidence IS + first occurrences; deduplicate already done
    # Sort by page
    refs.sort(key=lambda r: r["page"])
    return refs
