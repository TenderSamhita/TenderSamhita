"""
intelligence/gap_detector.py — Detect missing/unspecified procurement requirements.

Analyzes extracted tender requirements against procurement best practices
and known standard requirements to identify gaps.
"""
from __future__ import annotations

import logging
import re
from typing import Dict, List

logger = logging.getLogger(__name__)

# Parameters that are critical for procurement specifications
CRITICAL_PARAMS = {
    "capacity": "Capacity/volume not specified — procurement quantity unclear",
    "material": "Material specification not provided — may lead to non-compliant bids",
    "application": "Application/environment not specified — affects standard selection",
    "testing": "Testing/inspection requirements not specified — acceptance criteria unclear",
    "dimensions": "Dimensional requirements not specified — may cause compatibility issues",
    "safety": "Safety requirements not referenced — compliance risk",
    "certification": "Certification/QCO requirements not stated — mandatory compliance unclear",
}

# Parameters that are important but may be intentionally omitted
IMPORTANT_PARAMS = {
    "temperature": "Operating temperature range not specified",
    "pressure": "Pressure rating not specified",
    "voltage": "Electrical rating not specified",
    "tolerance": "Tolerance requirements not specified",
    "surface_finish": "Surface finish requirements not specified",
    "coating": "Coating/protection requirements not specified",
    "marking": "Marking/packaging requirements not specified",
    "delivery": "Delivery timeline not specified",
    "warranty": "Warranty period not specified",
}

# Test method keywords to check for
TEST_KEYWORDS = [
    "test", "testing", "inspection", "sampling", "calibration",
    "acceptance", "qualification", "verification", "validation",
    "hydrostatic", "tensile", "compression", "hardness",
]


def detect_gaps(
    requirements: Dict,
    recommendation_result: Dict | None = None,
) -> List[Dict]:
    """
    Analyze extracted requirements for missing critical parameters.

    Returns list of gap objects:
    {
        "category": str,
        "parameter": str,
        "description": str,
        "severity": "critical" | "important" | "info",
        "evidence": str | None,
        "suggestion": str | None,
    }
    """
    gaps = []
    reqs = requirements if isinstance(requirements, dict) else {}

    # Check critical parameters
    for param, desc in CRITICAL_PARAMS.items():
        value = reqs.get(param)
        if not value or (isinstance(value, str) and value.lower() in ("", "none", "not specified")):
            evidence = _find_evidence_for_param(param, recommendation_result)
            gaps.append({
                "category": "critical",
                "parameter": param,
                "description": desc,
                "severity": "critical",
                "evidence": evidence,
                "suggestion": f"Consider specifying {param} in the tender requirement.",
            })

    # Check important parameters
    for param, desc in IMPORTANT_PARAMS.items():
        value = reqs.get(param)
        if not value or (isinstance(value, str) and value.lower() in ("", "none", "not specified")):
            gaps.append({
                "category": "important",
                "parameter": param,
                "description": desc,
                "severity": "important",
                "evidence": None,
                "suggestion": None,
            })

    # Check if testing requirements are sufficiently detailed
    testing = reqs.get("testing", [])
    if isinstance(testing, list) and len(testing) < 2:
        gaps.append({
            "category": "testing",
            "parameter": "testing_methods",
            "description": "Limited testing requirements — consider specifying acceptance test methods",
            "severity": "important",
            "evidence": None,
            "suggestion": "Specify test methods, acceptance criteria, and inspection points.",
        })

    # Check for IS references in tender
    is_refs = reqs.get("is_references", [])
    if not is_refs:
        gaps.append({
            "category": "standards",
            "parameter": "standard_references",
            "description": "No Indian Standards explicitly referenced in tender",
            "severity": "info",
            "evidence": None,
            "suggestion": "Consider referencing applicable BIS standards for technical compliance.",
        })

    # Check for unit consistency
    dimensions = reqs.get("dimensions", [])
    if isinstance(dimensions, list) and len(dimensions) > 0:
        units = set()
        for dim in dimensions:
            if isinstance(dim, dict):
                val = dim.get("value", "")
            else:
                val = str(dim)
            # Extract unit from value
            unit_match = re.search(r'(mm|cm|m|inch|in|kg|g|L|mL|°C|bar|kPa|MPa|V|A|kW|Hz)', val, re.I)
            if unit_match:
                units.add(unit_match.group(0).lower())
        if len(units) > 2:
            gaps.append({
                "category": "consistency",
                "parameter": "unit_consistency",
                "description": f"Multiple unit systems detected ({', '.join(units)}) — may cause confusion",
                "severity": "info",
                "evidence": None,
                "suggestion": "Consider standardizing units throughout the specification.",
            })

    return gaps


def _find_evidence_for_param(param: str, recommendation_result: Dict | None) -> str | None:
    """Find evidence from recommendations for a missing parameter."""
    if not recommendation_result:
        return None
    recs = recommendation_result.get("recommendations", [])
    for rec in recs[:3]:
        specs = rec.get("specifications", [])
        for spec in specs:
            prop = (spec.get("property") or "").lower()
            if param in prop or prop in param:
                return f"IS {rec.get('is_number', '?')} — {spec.get('property')}: {spec.get('value')} {spec.get('unit', '')}"
    return None
