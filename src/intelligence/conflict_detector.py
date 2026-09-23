"""
intelligence/conflict_detector.py — Detect tender vs standard conflicts.

Compares tender requirements against matched standard specifications
to identify value mismatches, unit conflicts, and version issues.
"""
from __future__ import annotations

import logging
import re
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


def _parse_numeric(value: str) -> Tuple[float | None, str | None]:
    """Extract numeric value and unit from a string like '4.737 mm' or '260 °C'."""
    if not value:
        return None, None
    m = re.match(r'^([\d.]+)\s*([a-zA-Z°μΩ±]+.*)?$', value.strip())
    if m:
        try:
            num = float(m.group(1))
            unit = (m.group(2) or "").strip()
            return num, unit
        except ValueError:
            pass
    return None, None


def _values_compatible(
    tender_val: str, standard_val: str, tolerance_pct: float = 10.0
) -> Dict:
    """
    Check if two values are compatible.
    Returns {"compatible": bool, "reason": str}
    """
    t_num, t_unit = _parse_numeric(tender_val)
    s_num, s_unit = _parse_numeric(standard_val)

    # If both are numeric, compare with tolerance
    if t_num is not None and s_num is not None:
        # Check unit compatibility
        if t_unit and s_unit and t_unit.lower() != s_unit.lower():
            return {
                "compatible": False,
                "reason": f"Unit mismatch: tender uses {t_unit}, standard uses {s_unit}",
            }
        # Compare values
        if s_num == 0:
            compatible = t_num == 0
        else:
            diff_pct = abs(t_num - s_num) / abs(s_num) * 100
            compatible = diff_pct <= tolerance_pct
        if not compatible:
            return {
                "compatible": False,
                "reason": f"Value mismatch: tender={tender_val}, standard={standard_val} (diff={diff_pct:.1f}%)",
            }
        return {"compatible": True, "reason": "Values match within tolerance"}

    # If text values, do exact match
    if tender_val.strip().lower() == standard_val.strip().lower():
        return {"compatible": True, "reason": "Exact text match"}

    return {"compatible": False, "reason": f"Tender: {tender_val} vs Standard: {standard_val}"}


def detect_conflicts(
    tender_requirements: Dict,
    recommendations: List[Dict],
    comparison_result: Dict | None = None,
) -> List[Dict]:
    """
    Detect conflicts between tender requirements and matched standards.

    Returns list of conflict objects:
    {
        "type": "value_mismatch" | "unit_conflict" | "material_conflict" | "version_conflict",
        "tender_parameter": str,
        "tender_value": str,
        "standard_id": str,
        "standard_value": str,
        "evidence": str,
        "severity": "high" | "medium" | "low",
    }
    """
    conflicts = []

    # Use comparison matrix if available
    if comparison_result and "comparison" in comparison_result:
        for row in comparison_result["comparison"]:
            status = row.get("status", "")
            if status in ("MISMATCH", "CONFLICT"):
                conflicts.append({
                    "type": "value_mismatch",
                    "tender_parameter": row.get("parameter", ""),
                    "tender_value": row.get("tender_value", ""),
                    "standard_id": row.get("standard_id", ""),
                    "standard_value": row.get("standard_value", ""),
                    "evidence": row.get("evidence", ""),
                    "severity": "high",
                })

    # Check tender dimensions vs standard specs
    tender_dims = tender_requirements.get("dimensions", [])
    for rec in recommendations[:5]:
        std_id = rec.get("standard_id", "")
        std_specs = rec.get("specifications", [])

        for dim in tender_dims:
            dim_val = dim.get("value", "") if isinstance(dim, dict) else str(dim)
            t_num, t_unit = _parse_numeric(dim_val)

            for spec in std_specs:
                s_val = spec.get("value", "")
                s_num, s_unit = _parse_numeric(s_val)

                if t_num is not None and s_num is not None:
                    # Check for significant mismatch
                    if s_num != 0:
                        diff_pct = abs(t_num - s_num) / abs(s_num) * 100
                        if diff_pct > 15:  # significant mismatch
                            conflicts.append({
                                "type": "value_mismatch",
                                "tender_parameter": dim.get("source_text", dim_val)[:80],
                                "tender_value": dim_val,
                                "standard_id": std_id,
                                "standard_value": f"{s_val} {spec.get('unit', '')}",
                                "evidence": f"IS {rec.get('is_number', '?')} — {spec.get('property', '?')}: {s_val} {spec.get('unit', '')}",
                                "severity": "high" if diff_pct > 30 else "medium",
                            })

    # Check material conflicts
    tender_material = tender_requirements.get("material", "")
    if tender_material:
        for rec in recommendations[:5]:
            for spec in rec.get("specifications", []):
                spec_mat = (spec.get("material") or "").lower()
                if spec_mat and tender_material.lower() not in spec_mat and spec_mat not in tender_material.lower():
                    # Different materials mentioned
                    if any(m in spec_mat for m in ["steel", "aluminium", "copper", "brass", "poly"]):
                        conflicts.append({
                            "type": "material_conflict",
                            "tender_parameter": "material",
                            "tender_value": tender_material,
                            "standard_id": rec.get("standard_id", ""),
                            "standard_value": spec_mat,
                            "evidence": f"IS {rec.get('is_number', '?')} specifies {spec_mat}",
                            "severity": "medium",
                        })

    # Check version conflicts
    tender_is_refs = tender_requirements.get("is_references", [])
    for ref in tender_is_refs:
        ref_val = ref.get("value", "") if isinstance(ref, dict) else str(ref)
        # Extract year from reference
        year_match = re.search(r'(\d{4})', ref_val)
        if year_match:
            ref_year = int(year_match.group(1))
            for rec in recommendations[:5]:
                rec_year = rec.get("year")
                if rec_year and isinstance(rec_year, int) and rec_year > ref_year + 5:
                    conflicts.append({
                        "type": "version_conflict",
                        "tender_parameter": "standard_version",
                        "tender_value": ref_val,
                        "standard_id": rec.get("standard_id", ""),
                        "standard_value": f"Latest: {rec.get('is_number', '?')} ({rec_year})",
                        "evidence": f"Tender references {ref_val}, but corpus contains newer edition ({rec_year})",
                        "severity": "medium",
                    })

    # Deduplicate
    seen = set()
    unique = []
    for c in conflicts:
        key = (c["type"], c["tender_parameter"], c["standard_id"])
        if key not in seen:
            seen.add(key)
            unique.append(c)

    return unique
