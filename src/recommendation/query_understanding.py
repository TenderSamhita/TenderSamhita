"""
recommendation/query_understanding.py — Tender → structured query for retrieval

Reuses tender extractor + normalizer.
"""
from __future__ import annotations

from typing import Dict

from ..tender.extractor import extract_requirements
from ..tender.normalizer import normalize_query
from ..tender.parser import parse_tender_pdf, parse_tender_text


def understand_query(query_input: Dict | str) -> Dict:
    """
    query_input: either {"text": "..."} or {"pdf_path": "..."} or raw string
    Returns: {requirements, query_text}
    """
    if isinstance(query_input, str):
        parsed = parse_tender_text(query_input)
    elif isinstance(query_input, dict) and "pdf_path" in query_input:
        parsed = parse_tender_pdf(query_input["pdf_path"])
    elif isinstance(query_input, dict) and "text" in query_input:
        parsed = parse_tender_text(query_input["text"])
    else:
        # assume already tender_parsed dict
        parsed = query_input
    req = extract_requirements(parsed)
    q_text = normalize_query(req)
    # also append raw if substantial
    if len(parsed.get("full_text","")) > 20 and len(q_text) < 50:
        q_text = parsed["full_text"][:500]
    return {"requirements": req, "query_text": q_text, "parsed": parsed}
