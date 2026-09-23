"""
intelligence/quality_review.py — Analyze tender document quality.

Checks for missing parameters, ambiguous requirements, outdated references,
and other quality issues in procurement specifications.
"""
from __future__ import annotations

import logging
import re
from typing import Dict, List

logger = logging.getLogger(__name__)


def review_tender_quality(
    tender_text: str,
    requirements: Dict,
    recommendation_result: Dict | None = None,
) -> Dict:
    """
    Analyze tender document quality.

    Returns:
    {
        "score": float (0-100),
        "issues": List[{
            "category": str,
            "severity": "critical" | "warning" | "info",
            "description": str,
            "evidence": str | None,
            "suggestion": str | None,
        }],
        "summary": {
            "total_issues": int,
            "critical": int,
            "warnings": int,
            "info": int,
        }
    }
    """
    issues = []

    # 1. Check for missing measurable parameters
    issues.extend(_check_missing_params(requirements))

    # 2. Check for ambiguous language
    issues.extend(_check_ambiguity(tender_text))

    # 3. Check for missing units
    issues.extend(_check_missing_units(requirements))

    # 4. Check for outdated standard references
    issues.extend(_check_outdated_refs(requirements, recommendation_result))

    # 5. Check for conflicting requirements
    issues.extend(_check_internal_conflicts(requirements))

    # 6. Check for missing acceptance criteria
    issues.extend(_check_acceptance_criteria(requirements))

    # 7. Check for missing inspection points
    issues.extend(_check_inspection_points(requirements))

    # Calculate score
    critical = sum(1 for i in issues if i["severity"] == "critical")
    warnings = sum(1 for i in issues if i["severity"] == "warning")
    info = sum(1 for i in issues if i["severity"] == "info")

    # Start at 100, deduct for issues
    score = 100.0
    score -= critical * 15
    score -= warnings * 5
    score -= info * 1
    score = max(0, min(100, score))

    return {
        "score": round(score, 1),
        "issues": issues,
        "summary": {
            "total_issues": len(issues),
            "critical": critical,
            "warnings": warnings,
            "info": info,
        },
    }


def _check_missing_params(requirements: Dict) -> List[Dict]:
    """Check for missing critical procurement parameters."""
    issues = []
    critical_params = {
        "product": "Product description",
        "material": "Material specification",
        "application": "Application/environment",
    }
    for param, label in critical_params.items():
        if not requirements.get(param):
            issues.append({
                "category": "missing_parameter",
                "severity": "critical",
                "description": f"{label} not specified in tender",
                "evidence": None,
                "suggestion": f"Include {label.lower()} in the tender specification.",
            })

    important_params = {
        "capacity": "Capacity/quantity",
        "testing": "Testing requirements",
        "dimensions": "Dimensional requirements",
    }
    for param, label in important_params.items():
        val = requirements.get(param)
        if not val or (isinstance(val, list) and len(val) == 0):
            issues.append({
                "category": "missing_parameter",
                "severity": "warning",
                "description": f"{label} not specified",
                "evidence": None,
                "suggestion": f"Consider specifying {label.lower()}.",
            })

    return issues


def _check_ambiguity(tender_text: str) -> List[Dict]:
    """Check for ambiguous language in tender text."""
    issues = []
    ambiguous_terms = [
        (r'\b(approximately|approx|about|around|roughly)\b', "Approximate values — specify exact requirements"),
        (r'\b(suitable|appropriate|adequate|sufficient)\b', "Vague qualification — specify measurable criteria"),
        (r'\b(as per|in accordance with|conforming to)\b(?!\s+(IS|ISO|ASTM|IEC|BIS))', "Reference without specific standard — cite exact standard"),
        (r'\b(high quality|good quality|best quality)\b', "Subjective quality claim — specify measurable criteria"),
        (r'\b(may|might|could|should)\b', "Non-mandatory language — use 'shall' for requirements"),
    ]

    for pattern, desc in ambiguous_terms:
        matches = re.findall(pattern, tender_text, re.I)
        if matches:
            issues.append({
                "category": "ambiguity",
                "severity": "warning" if "shall" not in desc.lower() else "info",
                "description": f"{desc} ({len(matches)} occurrence{'s' if len(matches) > 1 else ''})",
                "evidence": matches[0] if matches else None,
                "suggestion": "Review and clarify the tender language.",
            })

    return issues


def _check_missing_units(requirements: Dict) -> List[Dict]:
    """Check for dimensions/values without units."""
    issues = []
    dimensions = requirements.get("dimensions", [])
    for dim in dimensions:
        val = dim.get("value", "") if isinstance(dim, dict) else str(dim)
        # Check if numeric value lacks unit
        if re.match(r'^[\d.]+$', val.strip()):
            issues.append({
                "category": "missing_unit",
                "severity": "warning",
                "description": f"Dimensional value '{val}' lacks unit specification",
                "evidence": val,
                "suggestion": "Add unit (mm, cm, m, etc.) to dimensional requirements.",
            })

    return issues


def _check_outdated_refs(requirements: Dict, recommendation_result: Dict | None) -> List[Dict]:
    """Check for potentially outdated standard references."""
    issues = []
    is_refs = requirements.get("is_references", [])

    for ref in is_refs:
        ref_val = ref.get("value", "") if isinstance(ref, dict) else str(ref)
        year_match = re.search(r'(\d{4})', ref_val)
        if year_match:
            year = int(year_match.group(1))
            if year < 2015:
                issues.append({
                    "category": "outdated_reference",
                    "severity": "warning",
                    "description": f"Reference '{ref_val}' may be outdated (published {year})",
                    "evidence": ref_val,
                    "suggestion": "Verify if a newer edition is available.",
                })

    # Check version warnings from recommendation result
    if recommendation_result:
        for vw in recommendation_result.get("version_warnings", []):
            issues.append({
                "category": "version_warning",
                "severity": "info",
                "description": vw.get("warning", ""),
                "evidence": vw.get("tender_ref"),
                "suggestion": "Consider updating to the latest available edition.",
            })

    return issues


def _check_internal_conflicts(requirements: Dict) -> List[Dict]:
    """Check for internally conflicting requirements."""
    issues = []
    # Check for duplicate parameters with different values
    dims = requirements.get("dimensions", [])
    values = [d.get("value", "") if isinstance(d, dict) else str(d) for d in dims]
    seen_values = {}
    for v in values:
        num_match = re.match(r'^([\d.]+)', v)
        if num_match:
            num = num_match.group(1)
            if num in seen_values:
                issues.append({
                    "category": "internal_conflict",
                    "severity": "warning",
                    "description": f"Duplicate dimensional value '{num}' with potentially different contexts",
                    "evidence": v,
                    "suggestion": "Clarify if these are different parameters or duplicates.",
                })
            seen_values[num] = v

    return issues


def _check_acceptance_criteria(requirements: Dict) -> List[Dict]:
    """Check for missing acceptance criteria."""
    issues = []
    testing = requirements.get("testing", [])
    if isinstance(testing, list) and len(testing) == 0:
        issues.append({
            "category": "missing_acceptance",
            "severity": "warning",
            "description": "No acceptance test criteria specified",
            "evidence": None,
            "suggestion": "Specify acceptance test methods and pass/fail criteria.",
        })

    return issues


def _check_inspection_points(requirements: Dict) -> List[Dict]:
    """Check for missing inspection requirements."""
    issues = []
    text = str(requirements.get("full_text_snippet", ""))
    if "inspection" not in text.lower():
        issues.append({
            "category": "missing_inspection",
            "severity": "info",
            "description": "No inspection requirements specified in tender",
            "evidence": None,
            "suggestion": "Consider specifying inspection points and acceptance criteria.",
        })

    return issues
