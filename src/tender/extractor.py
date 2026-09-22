"""
tender/extractor.py — Structured requirement extraction from tender text

Extracts (spec 29/31):
- product, material, application, capacity, dimensions, performance,
  testing, safety, environment, industry, keywords, known IS refs

Preserves page-level evidence: {parameter, value, source_page, source_text}

Keep separate from BIS standard dimensions (spec 30) — source=tender
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

# IS in tender — for version checking
IS_TENDER_RE = re.compile(r"IS\s*\d+(?:\s*\(?\s*Part\s*\d+[^\)]*\)?)?\s*[:\-]?\s*\d{4}?", re.I)
# Dimension patterns
DIM_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(mm|cm|m|inch|in|kg|g|L|mL|°C|bar|kPa|MPa|V|A|kW|Hz)\b", re.I)
CAPACITY_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(L|litre|liter|mL|KL|kL|capacity|tonne|tons?)\b", re.I)
MATERIAL_RE = re.compile(r"\b(stainless steel|SS\s*304|SS\s*316|mild steel|carbon steel|aluminium|aluminum|brass|copper|PVC|uPVC|HDPE|rubber|concrete|cement|bitumen|polyethylene)\b", re.I)
APPLICATION_RE = re.compile(r"\b(drinking water|municipal|potable|aviation|gas turbine|fuel|petroleum|construction|electrical|installation|storage tank|pressure vessel)\b", re.I)
PRODUCT_PATTERNS = [
    r"water\s*(?:storage\s*)?tank",
    r"pressure\s*tunnel",
    r"gas\s*turbine\s*fuel",
    r"thermal\s*oxidation\s*stability",
    r"heater\s*tube",
    r"cement|concrete|steel|pipe|valve|pump|cable|transformer|explosive\s*atmosphere|electrical\s*installation",
    r"yoga|terminology",
]
PRODUCT_RE = re.compile("|".join(f"({p})" for p in PRODUCT_PATTERNS), re.I)


def _find_with_provenance(pattern: re.Pattern, pages: List[Dict]) -> List[Dict]:
    hits = []
    for pg in pages:
        text = pg["text"]
        for m in pattern.finditer(text):
            # capture 200 chars window for source_text
            s, e = m.start(), m.end()
            window = text[max(0,s-120): e+120].strip().replace("\n"," ")[:400]
            hits.append({
                "value": m.group(0).strip(),
                "source_page": pg["page_number"],
                "source_text": window,
            })
    return hits


def extract_requirements(tender_parsed: Dict) -> Dict:
    """
    Returns structured requirements with evidence.
    All tender-sourced; standard-sourced kept separately.
    """
    pages: List[Dict] = tender_parsed.get("pages", [])
    full_text = tender_parsed.get("full_text", "")

    # Product
    product_hits = _find_with_provenance(PRODUCT_RE, pages)
    product = product_hits[0]["value"] if product_hits else None

    # Material
    material_hits = _find_with_provenance(MATERIAL_RE, pages)
    material = material_hits[0]["value"] if material_hits else None

    # Application
    app_hits = _find_with_provenance(APPLICATION_RE, pages)
    application = app_hits[0]["value"] if app_hits else None

    # Capacity (e.g., 500 L)
    capacity_hits = _find_with_provenance(CAPACITY_RE, pages)
    capacity = capacity_hits[0]["value"] if capacity_hits else None

    # Dimensions (list)
    dim_hits = _find_with_provenance(DIM_RE, pages)

    # Testing / safety cues
    testing_keywords = re.findall(r"\b(test|testing|inspection|sampling|calibration|deposit rating|JFTOT)\b", full_text, re.I)
    testing = list(set(w.lower() for w in testing_keywords))[:8]

    safety_keywords = re.findall(r"\b(safety|hazard|warning|explosive|protection)\b", full_text, re.I)
    safety = list(set(w.lower() for w in safety_keywords))[:8]

    # IS references mentioned in tender (for version checking)
    is_refs = []
    for pg in pages:
        for m in IS_TENDER_RE.finditer(pg["text"]):
            s = m.group(0).strip()
            # deduplicate
            if s not in [r["value"] for r in is_refs]:
                is_refs.append({
                    "value": s,
                    "source_page": pg["page_number"],
                    "source_text": pg["text"][max(0,m.start()-120): m.end()+120].strip().replace("\n"," ")[:400]
                })

    # Keywords: top nouns-ish (simple)
    words = re.findall(r"[a-z]{3,}", full_text.lower())
    # lightweight stopword filter
    stop = {"the","and","for","with","from","that","this","shall","will","are","has","have","been","were","which","using","test","standard"}
    keywords = [w for w in words if w not in stop]
    from collections import Counter
    cnt = Counter(keywords)
    top_keywords = [w for w,_ in cnt.most_common(12)]

    return {
        "source": "tender",
        "product": product,
        "product_evidence": product_hits[:3],
        "material": material,
        "material_evidence": material_hits[:3],
        "application": application,
        "application_evidence": app_hits[:3],
        "capacity": capacity,
        "capacity_evidence": capacity_hits[:3],
        "dimensions": dim_hits[:8],
        "testing": testing,
        "safety": safety,
        "is_references": is_refs,
        "keywords": top_keywords,
        "full_text_snippet": full_text[:2000],
        "page_count": tender_parsed.get("page_count", 1),
    }
