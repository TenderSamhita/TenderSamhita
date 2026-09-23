"""
intelligence/specification_builder.py — Build evidence-grounded technical specifications.

Generates draft technical specifications from tender requirements and
matched standard evidence. Never fabricates requirements.
"""
from __future__ import annotations

import logging
import uuid
from typing import Dict, List

logger = logging.getLogger(__name__)


def build_specification(
    workspace_id: str,
    tender_requirements: Dict,
    recommendations: List[Dict],
    comparison_result: Dict | None = None,
) -> List[Dict]:
    """
    Build evidence-grounded technical specification items.

    Returns list of specification items:
    {
        "item_id": str,
        "workspace_id": str,
        "parameter": str,
        "requirement": str,
        "unit": str | None,
        "condition": str | None,
        "applicable_standard_id": str | None,
        "clause": str | None,
        "evidence_page": int | None,
        "evidence_text": str | None,
        "status": "supported" | "unsupported" | "requires_input",
        "sort_order": int,
    }
    """
    items = []

    # Process each tender requirement
    traceable = _extract_all_params(tender_requirements)

    for i, param in enumerate(traceable):
        # Find matching standard evidence
        match = _find_evidence(param, recommendations)

        if match:
            items.append({
                "item_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "parameter": param["name"],
                "requirement": _format_requirement(param, match),
                "unit": param.get("unit") or match.get("unit"),
                "condition": param.get("condition"),
                "applicable_standard_id": match.get("standard_id"),
                "clause": match.get("clause"),
                "evidence_page": match.get("evidence_page"),
                "evidence_text": match.get("evidence_text"),
                "status": "supported",
                "sort_order": i,
            })
        else:
            # No evidence found — mark as requires_input
            items.append({
                "item_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "parameter": param["name"],
                "requirement": param.get("value", "Not specified"),
                "unit": param.get("unit"),
                "condition": param.get("condition"),
                "applicable_standard_id": None,
                "clause": None,
                "evidence_page": None,
                "evidence_text": None,
                "status": "requires_input",
                "sort_order": i,
            })

    # Add specifications from standards that aren't covered by tender
    additional = _find_additional_specs(recommendations, [p["name"].lower() for p in traceable])
    for j, spec in enumerate(additional):
        items.append({
            "item_id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "parameter": spec["property"],
            "requirement": f"{spec['value']} {spec.get('unit', '')}".strip(),
            "unit": spec.get("unit"),
            "condition": spec.get("condition"),
            "applicable_standard_id": spec.get("standard_id"),
            "clause": spec.get("section"),
            "evidence_page": spec.get("page"),
            "evidence_text": f"IS {spec.get('is_number', '?')} — {spec.get('property')}: {spec.get('value')} {spec.get('unit', '')}",
            "status": "supported",
            "sort_order": len(items) + j,
        })

    return items


def _extract_all_params(requirements: Dict) -> List[Dict]:
    """Extract all traceable parameters from requirements."""
    params = []

    # Product
    if requirements.get("product"):
        params.append({"name": "Product", "value": str(requirements["product"]), "category": "product"})

    # Material
    if requirements.get("material"):
        params.append({"name": "Material", "value": str(requirements["material"]), "category": "material"})

    # Application
    if requirements.get("application"):
        params.append({"name": "Application", "value": str(requirements["application"]), "category": "application"})

    # Capacity
    if requirements.get("capacity"):
        params.append({"name": "Capacity", "value": str(requirements["capacity"]), "category": "capacity"})

    # Dimensions
    for dim in requirements.get("dimensions", [])[:5]:
        if isinstance(dim, dict):
            params.append({
                "name": "Dimension",
                "value": dim.get("value", ""),
                "unit": _extract_unit(dim.get("value", "")),
                "category": "dimension",
            })
        else:
            params.append({
                "name": "Dimension",
                "value": str(dim),
                "unit": _extract_unit(str(dim)),
                "category": "dimension",
            })

    # Testing
    for t in requirements.get("testing", [])[:3]:
        params.append({"name": f"Testing: {t}", "value": str(t), "category": "testing"})

    # Safety
    for s in requirements.get("safety", [])[:3]:
        params.append({"name": f"Safety: {s}", "value": str(s), "category": "safety"})

    return params


def _find_evidence(param: Dict, recommendations: List[Dict]) -> Dict | None:
    """Find best evidence for a parameter from recommendations."""
    name_lower = param["name"].lower()
    value_lower = param.get("value", "").lower()
    best = None
    best_score = 0

    for rec in recommendations[:5]:
        for spec in rec.get("specifications", []):
            score = 0
            prop = (spec.get("property") or "").lower()
            val = (spec.get("value") or "").lower()

            # Property name match
            if any(w in prop for w in name_lower.split()):
                score += 3

            # Value match
            if value_lower and val:
                if value_lower in val or val in value_lower:
                    score += 5
                try:
                    t_num = float(value_lower.replace(",", "").split()[0])
                    s_num = float(val.replace(",", "").split()[0])
                    if abs(t_num - s_num) / max(abs(s_num), 1) < 0.15:
                        score += 4
                except (ValueError, IndexError):
                    pass

            if score > best_score:
                best_score = score
                best = {
                    "standard_id": rec.get("standard_id"),
                    "is_number": rec.get("is_number"),
                    "clause": spec.get("section"),
                    "unit": spec.get("unit"),
                    "condition": spec.get("condition"),
                    "page": spec.get("page"),
                    "evidence_page": spec.get("page"),
                    "evidence_text": f"{spec.get('property')}: {spec.get('value')} {spec.get('unit', '')}",
                }

    return best if best_score >= 2 else None


def _find_additional_specs(recommendations: List[Dict], covered_params: List[str]) -> List[Dict]:
    """Find high-confidence specs from standards not already covered by tender."""
    additional = []
    seen = set()

    for rec in recommendations[:3]:
        for spec in rec.get("specifications", []):
            prop = (spec.get("property") or "").lower()
            # Skip if already covered by tender
            if any(p in prop for p in covered_params):
                continue
            key = (rec.get("standard_id"), spec.get("property"), spec.get("value"))
            if key in seen:
                continue
            seen.add(key)
            additional.append({
                **spec,
                "standard_id": rec.get("standard_id"),
                "is_number": rec.get("is_number"),
            })

    return additional[:10]


def _format_requirement(param: Dict, match: Dict) -> str:
    """Format a requirement string from param and matched evidence."""
    value = param.get("value", "")
    unit = param.get("unit") or match.get("unit", "")
    if unit and unit not in value:
        return f"{value} {unit}".strip()
    return value


def _extract_unit(value: str) -> str | None:
    """Extract unit from a value string."""
    import re
    m = re.search(r'(mm|cm|m|inch|in|kg|g|L|mL|°C|bar|kPa|MPa|V|A|kW|Hz)', value, re.I)
    return m.group(0) if m else None
