"""
intelligence/traceability.py — Generate tender → standard traceability matrix.

Maps each tender requirement to matched standard clauses with evidence
and status classification.
"""
from __future__ import annotations

import logging
import uuid
from typing import Dict, List

logger = logging.getLogger(__name__)


def generate_traceability(
    workspace_id: str,
    tender_requirements: Dict,
    recommendations: List[Dict],
    comparison_result: Dict | None = None,
) -> List[Dict]:
    """
    Generate traceability matrix rows.

    Returns list of traceability objects:
    {
        "trace_id": str,
        "workspace_id": str,
        "tender_parameter": str,
        "tender_value": str,
        "matched_standard_id": str | None,
        "matched_clause": str | None,
        "evidence_page": int | None,
        "evidence_text": str | None,
        "status": str,
    }
    """
    rows = []

    # Extract key parameters from tender
    params_to_trace = _extract_traceable_params(tender_requirements)

    for param in params_to_trace:
        # Find best matching standard for this parameter
        best_match = _find_best_match(param, recommendations)

        if best_match:
            rows.append({
                "trace_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "requirement_id": param["id"],
                "tender_parameter": param["name"],
                "tender_value": param["value"],
                "matched_standard_id": best_match["standard_id"],
                "matched_clause": best_match.get("clause"),
                "evidence_page": best_match.get("evidence_page"),
                "evidence_text": best_match.get("evidence_text"),
                "status": best_match.get("status", "supported"),
            })
        else:
            rows.append({
                "trace_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "requirement_id": param["id"],
                "tender_parameter": param["name"],
                "tender_value": param["value"],
                "matched_standard_id": None,
                "matched_clause": None,
                "evidence_page": None,
                "evidence_text": None,
                "status": "not_found",
            })

    # Use comparison matrix to enhance status
    if comparison_result and "comparison" in comparison_result:
        comp_map = {}
        for row in comparison_result["comparison"]:
            key = row.get("parameter", "").lower()
            comp_map[key] = row

        for trace_row in rows:
            param_key = trace_row["tender_parameter"].lower()
            if param_key in comp_map:
                comp_status = comp_map[param_key].get("status", "")
                if comp_status == "MATCH":
                    trace_row["status"] = "supported"
                elif comp_status == "MISMATCH":
                    trace_row["status"] = "conflict"
                elif comp_status == "TENDER_NOT_SPECIFIED":
                    trace_row["status"] = "review_required"

    return rows


def _extract_traceable_params(requirements: Dict) -> List[Dict]:
    """Extract traceable parameters from tender requirements."""
    params = []

    # Product
    product = requirements.get("product")
    if product:
        params.append({
            "id": "product",
            "name": "Product",
            "value": str(product),
            "category": "product",
        })

    # Material
    material = requirements.get("material")
    if material:
        params.append({
            "id": "material",
            "name": "Material",
            "value": str(material),
            "category": "material",
        })

    # Application
    application = requirements.get("application")
    if application:
        params.append({
            "id": "application",
            "name": "Application",
            "value": str(application),
            "category": "application",
        })

    # Capacity
    capacity = requirements.get("capacity")
    if capacity:
        params.append({
            "id": "capacity",
            "name": "Capacity",
            "value": str(capacity),
            "category": "capacity",
        })

    # Dimensions
    dimensions = requirements.get("dimensions", [])
    for i, dim in enumerate(dimensions[:5]):
        if isinstance(dim, dict):
            params.append({
                "id": f"dimension_{i}",
                "name": f"Dimension {i+1}",
                "value": dim.get("value", ""),
                "category": "dimension",
            })
        else:
            params.append({
                "id": f"dimension_{i}",
                "name": f"Dimension {i+1}",
                "value": str(dim),
                "category": "dimension",
            })

    # Testing
    testing = requirements.get("testing", [])
    if isinstance(testing, list):
        for i, t in enumerate(testing[:3]):
            params.append({
                "id": f"testing_{i}",
                "name": f"Testing: {t}",
                "value": str(t),
                "category": "testing",
            })

    # Safety
    safety = requirements.get("safety", [])
    if isinstance(safety, list):
        for i, s in enumerate(safety[:3]):
            params.append({
                "id": f"safety_{i}",
                "name": f"Safety: {s}",
                "value": str(s),
                "category": "safety",
            })

    return params


def _find_best_match(param: Dict, recommendations: List[Dict]) -> Dict | None:
    """Find the best matching standard clause for a tender parameter."""
    param_name = param["name"].lower()
    param_value = param["value"].lower()
    best = None
    best_score = 0

    for rec in recommendations[:5]:
        std_id = rec.get("standard_id", "")
        is_number = rec.get("is_number", "")
        specs = rec.get("specifications", [])
        evidence = rec.get("evidence", [])

        for spec in specs:
            score = 0
            prop = (spec.get("property") or "").lower()
            val = (spec.get("value") or "").lower()

            # Score based on property name match
            if any(word in prop for word in param_name.split()):
                score += 3

            # Score based on value match
            if param_value and val:
                if param_value in val or val in param_value:
                    score += 5
                # Numeric comparison
                try:
                    t_num = float(param_value.replace(",", "").split()[0])
                    s_num = float(val.replace(",", "").split()[0])
                    if abs(t_num - s_num) / max(abs(s_num), 1) < 0.15:
                        score += 4
                except (ValueError, IndexError):
                    pass

            if score > best_score:
                best_score = score
                # Find best evidence chunk
                ev_page = None
                ev_text = None
                for ev in evidence:
                    if isinstance(ev, dict):
                        ev_page = ev.get("page")
                        ev_text = ev.get("text", "")[:200]
                        break

                best = {
                    "standard_id": std_id,
                    "is_number": is_number,
                    "clause": spec.get("section", ""),
                    "evidence_page": ev_page,
                    "evidence_text": ev_text or f"{spec.get('property')}: {spec.get('value')} {spec.get('unit', '')}",
                    "status": "supported" if score >= 5 else "partially_supported" if score >= 2 else "unverified",
                }

    return best
