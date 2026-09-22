"""
specification_extractor.py — Phase 7: Structured Technical Specifications

Extracts property-value-unit triples with tolerance, condition, material, test_method.

Approach: hybrid regex + context window.
Properties lexicon: dimensions, capacity, pressure, temperature, voltage, etc.

Stored fields per spec (per spec 17):
 property, value/raw, nominal, tolerance, unit, material, grade, condition,
 source_section, source_page, confidence, raw_text

Never invents; LOW confidence if uncertain.
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

# Units canonical
UNITS = [
    "mm","cm","m","µm","um","nm","km",
    "kg","g","mg","t","L","mL","µL",
    "Pa","kPa","MPa","bar","psi",
    "°C","C","K","°F",
    "V","kV","A","mA","W","kW","Hz","kHz","MHz",
    "N","kN","Nm","%","ppm","dB","Ω","ohm","ml","l",
]
UNIT_RE = r"(?:" + "|".join(re.escape(u) for u in sorted(UNITS, key=len, reverse=True)) + r")"
# Property lexicon
PROPERTIES = [
    "length","width","height","diameter","thickness","radius","capacity","volume",
    "weight","mass","pressure","temperature","voltage","current","power","frequency",
    "hardness","strength","tensile","elongation","density","viscosity","tolerance",
    "surface roughness","roughness","deposit thickness","deposit volume","tube length",
    "flow rate","aeration","filtration","metallurgy","magnesium","silicon","heater tube",
    "grade","class","material","concentration","pH","hardness","resistance","load",
]
PROP_RE = re.compile(r"\b(" + "|".join(re.escape(p) for p in PROPERTIES) + r")\b", re.I)

# Value patterns: "161.925 ± 0.254 mm", "60 mm", "1.5 l/min", "not less than 500"
VALUE_RE = re.compile(
    r"(?P<qual>(?:not\s+less\s+than|not\s+more\s+than|minimum|maximum|at\s+least|up\s+to|approx\.?|approximately|shall\s+be|shall\s+not\s+exceed|shall\s+exceed)?)\s*"
    r"(?P<num>\d+(?:\.\d+)?(?:\s*[\-–]\s*\d+(?:\.\d+)?)?)"
    r"\s*(?P<tol>[±]\s*\d+(?:\.\d+)?)?"
    r"\s*(?P<unit>" + UNIT_RE + r")?"
    r"(?:\s*/\s*(?P<unit2>" + UNIT_RE + r"))?"
    r"(?:\s*(?P<per>per\s+\w+))?",
    re.I,
)
# Tolerance in parentheses: "161.925 (6.375 in) ± 0.254"
TOL_RE = re.compile(r"[±]\s*\d+(?:\.\d+)?")
# Condition: "at 20 °C", "at elevated temperature"
COND_RE = re.compile(r"\bat\s+[^,\.]{2,40}", re.I)


def _normalize_unit(u: Optional[str]) -> Optional[str]:
    if not u:
        return None
    # canonical lower but keep °C
    m = {
        "C": "°C", "c": "°C",
        "um": "µm", "ML": "mL", "L": "L",
        "l": "L", "ML": "mL",
    }
    return m.get(u, u)


def _extract_nearby_material(window: str) -> Optional[str]:
    mat_pat = re.compile(r"\b(Aluminium|Aluminum|6061-T6|stainless steel|SS\s*304|SS\s*316|steel|brass|copper|PVC|HDPE|rubber|elastomer|ceramic|glass|6061)\b", re.I)
    mm = mat_pat.search(window)
    return mm.group(0) if mm else None


def extract_specifications(pages: List[Dict], sections_map: Optional[Dict[int, str]] = None) -> List[Dict]:
    specs: List[Dict] = []
    spec_id_counter = 0

    for pg in pages:
        page_no = pg["page_number"]
        section = sections_map.get(page_no) if sections_map else None
        text = pg["text"]
        # Split into sentences / clauses for locality
        # Use newline + period heuristic, keep ~400 char windows
        chunks = re.split(r"(?<=[\.\n])\s+", text)
        for chunk in chunks:
            if len(chunk.strip()) < 20:
                continue
            # Only process chunks containing units or numbers + property
            has_prop = PROP_RE.search(chunk)
            has_unit = re.search(UNIT_RE, chunk, flags=re.I)
            has_num = re.search(r"\d+(?:\.\d+)?", chunk)
            if not (has_num and (has_prop or has_unit)):
                continue

            # Find value occurrences in chunk
            for m in VALUE_RE.finditer(chunk):
                num_raw = m.group("num")
                if not num_raw or len(num_raw) > 20:
                    continue
                # need at least unit or property to be meaningful spec
                unit_raw = m.group("unit") or m.group("unit2")
                qual = (m.group("qual") or "").strip()
                tol_raw = (m.group("tol") or "").strip()
                # Property: nearest property term within chunk before match
                prop = None
                # Search property before match
                before = chunk[:m.start()]
                pm = list(PROP_RE.finditer(before))
                if pm:
                    prop = pm[-1].group(0)
                else:
                    # also after
                    after = chunk[m.end():m.end()+60]
                    pm2 = PROP_RE.search(after)
                    if pm2:
                        prop = pm2.group(0)
                    elif has_prop:
                        prop = has_prop.group(0)

                if not prop:
                    # Generic property from context
                    prop = "requirement"
                # Parse numeric nominal (first number if range)
                try:
                    # handle range "30 - 50"
                    if "-" in num_raw or "–" in num_raw:
                        parts = re.split(r"\s*[\-–]\s*", num_raw.strip())
                        nominal = float(parts[0])
                        # max
                        max_val = float(parts[1]) if len(parts)>1 else None
                    else:
                        nominal = float(num_raw.strip())
                        max_val = None
                except Exception:
                    nominal = None
                    max_val = None

                # Condition
                cond_m = COND_RE.search(chunk[max(0,m.start()-80): m.end()+80])
                condition = cond_m.group(0).strip() if cond_m else None

                material = _extract_nearby_material(chunk)

                # Confidence
                conf = 0.5
                if prop and prop.lower() != "requirement":
                    conf += 0.15
                if unit_raw:
                    conf += 0.15
                if tol_raw:
                    conf += 0.10
                # Penalize very generic chunks
                if len(chunk) > 300:
                    conf -= 0.10
                conf = max(0.1, min(0.95, conf))

                # Build raw_text: original match slice + surrounding qual
                raw_text = m.group(0).strip()
                # preserve original qual
                if qual:
                    raw_text = f"{qual} {raw_text}".strip()

                spec_id_counter += 1
                spec_id = f"S{page_no:03d}_{spec_id_counter:04d}"
                # Unit normalization
                unit_norm = _normalize_unit(unit_raw)

                specs.append({
                    "spec_id": spec_id,
                    "page": page_no,
                    "section": section,
                    "property": prop.strip() if isinstance(prop, str) else prop,
                    "value": raw_text,
                    "raw_text": chunk.strip()[:600],
                    "nominal": nominal,
                    "maximum": max_val,
                    "minimum": None,  # could add range parsing
                    "tolerance": tol_raw if tol_raw else None,
                    "unit": unit_norm,
                    "original_unit": unit_raw,
                    "original_value": num_raw,
                    "material": material,
                    "grade": None,
                    "condition": condition,
                    "test_method": None,
                    "qualifier": qual if qual else None,
                    "confidence": round(conf, 2),
                    "source_section": section,
                    "source_page": page_no,
                })
                # limit per page to avoid explosion
                if len([s for s in specs if s["page"]==page_no]) > 30:
                    break

    # Deduplicate near-identical specs on same page/property/value
    seen = set()
    deduped = []
    for s in specs:
        key = (s["page"], s["property"].lower(), s["value"].lower())
        if key in seen:
            continue
        seen.add(key)
        deduped.append(s)

    return deduped
