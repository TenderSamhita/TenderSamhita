"""
compliance_extractor.py — Phase 9: Certification/QCO extraction

Extracts certification/compliance information ONLY when explicitly supported.
Fields: qco_applicable, certification_required, bis_licence_required, marking, etc.

IMPORTANT: Do NOT assume standard existence => mandatory certification.
If evidence absent, return "Not established from available source."
"""
from __future__ import annotations

import re
from typing import Dict, List, Optional

# Explicit markers
QCO_RE = re.compile(r"\b(QCO|Quality\s+Control\s+Order)\b", re.I)
CERT_RE = re.compile(r"\b(certification|BIS\s+licen[sc]e|ISI\s+mark|Standard\s+Mark|Compulsory\s+Certification)\b", re.I)
MARKING_RE = re.compile(r"\b(Marking|Labelling|Packaging|Sampling|Inspection)\b.{0,60}", re.I)


def extract_compliance(pages: List[Dict], standard_id: Optional[str] = None) -> List[Dict]:
    results: List[Dict] = []
    full = "\n".join(p["text"] for p in pages)

    # Only emit if explicit evidence exists
    evidence_pages = []
    for pg in pages:
        txt = pg["text"]
        # Search for each compliance cue
        if QCO_RE.search(txt):
            # capture surrounding 200 chars
            for m in QCO_RE.finditer(txt):
                snippet = txt[max(0,m.start()-120): m.end()+120].strip().replace("\n"," ")
                results.append({
                    "compliance_id": f"C{pg['page_number']:03d}_qco",
                    "standard_id": standard_id,
                    "type": "qco_reference",
                    "value": snippet[:500],
                    "source": raw_snippet_with_page(txt, m),
                    "page": pg["page_number"],
                    "confidence": 0.7,
                })
        if CERT_RE.search(txt):
            for m in CERT_RE.finditer(txt):
                snippet = txt[max(0,m.start()-120): m.end()+120].strip().replace("\n"," ")
                # Only if explicitly says required/mandatory
                if re.search(r"(required|mandatory|shall|c\.?o\.?m\.?pulsory)", snippet, re.I):
                    results.append({
                        "compliance_id": f"C{pg['page_number']:03d}_cert_{m.start()}",
                        "standard_id": standard_id,
                        "type": "certification_required",
                        "value": snippet[:500],
                        "source": snippet[:500],
                        "page": pg["page_number"],
                        "confidence": 0.65,
                    })
        # Marking / Sampling sections — often have explicit requirements
        if re.search(r"\b(Marking|Sampling|Inspection)\b", txt, re.I) and pg["page_number"] > 3:
            # Heuristic: if section heading present, capture
            for m in MARKING_RE.finditer(txt):
                snippet = txt[max(0,m.start()-80): m.end()+200].strip().replace("\n"," ")[:500]
                typ = m.group(1).lower() + "_requirements"
                # Only add one per page per type
                if not any(r["page"]==pg["page_number"] and r["type"]==typ for r in results):
                    results.append({
                        "compliance_id": f"C{pg['page_number']:03d}_{typ}",
                        "standard_id": standard_id,
                        "type": typ,
                        "value": snippet,
                        "source": snippet,
                        "page": pg["page_number"],
                        "confidence": 0.6,
                    })

    # If none found, we return empty — caller should interpret as "Not established"
    return results


def raw_snippet_with_page(txt: str, match) -> str:
    return txt[max(0,match.start()-120): match.end()+120].strip().replace("\n"," ")[:500]
