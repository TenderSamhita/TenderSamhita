"""
recommendation/version_checker.py — Latest version / currency check (spec 38)

If tender references IS XXXX:2018 and corpus has IS XXXX:2025 → flag.
Does NOT automatically modify tender; provides evidence.

Compares by is_number (base) ignoring part/year, then checks year.
"""
from __future__ import annotations

import re
from typing import Dict, List, Tuple

IS_RE = re.compile(r"IS\s*(\d+)\s*(?:\(?\s*Part\s*(\d+)[^\)]*\)?)?\s*[:\-]?\s*(\d{4})?", re.I)


def parse_is(s: str) -> tuple[str | None, int | None, int | None]:
    m = IS_RE.search(s)
    if not m:
        return None, None, None
    num = m.group(1)
    part = int(m.group(2)) if m.group(2) else None
    year = int(m.group(3)) if m.group(3) else None
    base = f"IS {num}" + (f" (Part {part})" if part else "")
    return base, part, year


def check_versions(tender_is_refs: List[Dict], corpus_standards: List[Dict]) -> List[Dict]:
    """
    tender_is_refs: list of {value, source_page, source_text} from tender extractor
    corpus_standards: list of dicts with normalized_identifier / is_number / year
    Returns warnings like:
      {tender_ref, latest_available, message}
    """
    warnings = []
    # Build map base -> max year standard
    base_to_max = {}
    for std in corpus_standards:
        ident = std.get("normalized_identifier") or std.get("standard_id", "")
        base, part, year = parse_is(ident)
        if not base or not year:
            continue
        key = base
        if key not in base_to_max or year > base_to_max[key]["year"]:
            base_to_max[key] = {"year": year, "identifier": ident, "meta": std}

    for ref in tender_is_refs:
        t_base, t_part, t_year = parse_is(ref["value"])
        if not t_base:
            continue
        # Find corpus match
        entry = base_to_max.get(t_base)
        if not entry:
            continue
        if t_year and entry["year"] and t_year < entry["year"]:
            warnings.append({
                "tender_ref": ref["value"],
                "tender_year": t_year,
                "latest_available": entry["identifier"],
                "latest_year": entry["year"],
                "source_page": ref.get("source_page"),
                "message": f"Tender references {ref['value']}. Latest available edition in corpus: {entry['identifier']}.",
                "evidence": f"Corpus contains {entry['identifier']} (year {entry['year']}) vs tender {t_year}.",
            })
    return warnings
