"""
tender/comparison.py — Tender vs Standard matrix (spec 41)

Compares tender requirements against relevant standard requirements.
Never claims tender invalid; flags POTENTIAL mismatch requiring officer review.

Matrix row: Requirement | Tender | Standard | Evidence | Status
Status: MATCH | MISMATCH | TENDER_NOT_SPECIFIED | STANDARD_NOT_FOUND
"""
from __future__ import annotations

import re
from typing import Dict, List


def _norm(v) -> str:
    if v is None:
        return ""
    return re.sub(r"\s+", " ", str(v).lower()).strip()


def compare(tender_req: Dict, standard_meta: Dict, standard_specs: List[Dict], standard_text: str = "") -> List[Dict]:
    rows = []

    # Material
    tender_mat = tender_req.get("material")
    # Try to infer standard material from specs or text
    std_mat = None
    std_mat_evidence = None
    for s in standard_specs:
        if s.get("material"):
            std_mat = s["material"]
            std_mat_evidence = f"p.{s.get('page')} {s.get('raw_text','')[:120]}"
            break
    if not std_mat and standard_text:
        mm = re.search(r"(stainless steel|SS\s*304|aluminium|6061-T6)", standard_text, re.I)
        if mm:
            std_mat = mm.group(0)
            std_mat_evidence = f"standard text: {mm.group(0)}"

    if tender_mat and std_mat:
        status = "MATCH" if _norm(tender_mat) in _norm(std_mat) or _norm(std_mat) in _norm(tender_mat) else "MISMATCH"
    elif not tender_mat and std_mat:
        status = "TENDER_NOT_SPECIFIED"
    elif tender_mat and not std_mat:
        status = "STANDARD_NOT_FOUND"
    else:
        status = "TENDER_NOT_SPECIFIED"
    rows.append({
        "requirement": "Material",
        "tender": tender_mat or "Not specified in tender",
        "standard": std_mat or "Not found in available source",
        "evidence": std_mat_evidence or "No evidence",
        "status": status,
        "note": "Potential specification mismatch requiring officer review." if status=="MISMATCH" else ""
    })

    # Capacity
    tender_cap = tender_req.get("capacity")
    std_cap = None
    std_cap_ev = None
    for s in standard_specs:
        if "capacity" in s.get("property","").lower() or "volume" in s.get("property","").lower():
            std_cap = s.get("value")
            std_cap_ev = f"p.{s.get('page')} {s.get('raw_text','')[:120]}"
            break
    if tender_cap and std_cap:
        # numeric compare if possible
        try:
            tn = float(re.search(r"(\d+(?:\.\d+)?)", tender_cap).group(1))
            sn = float(re.search(r"(\d+(?:\.\d+)?)", std_cap).group(1))
            status = "MATCH" if abs(tn-sn) < 1e-6 else "MISMATCH"
        except Exception:
            status = "MATCH" if _norm(tender_cap)==_norm(std_cap) else "MISMATCH"
    elif not tender_cap and std_cap:
        status = "TENDER_NOT_SPECIFIED"
    elif tender_cap and not std_cap:
        status = "STANDARD_NOT_FOUND"
    else:
        status = "TENDER_NOT_SPECIFIED"
    rows.append({
        "requirement": "Capacity",
        "tender": tender_cap or "Not specified in tender",
        "standard": std_cap or "Not found in available source",
        "evidence": std_cap_ev or "No evidence",
        "status": status,
        "note": "Potential specification mismatch requiring officer review." if status=="MISMATCH" else ""
    })

    # Dimensions (aggregate)
    tender_dims = tender_req.get("dimensions", [])
    # Extract std dimensions from specs
    std_dims = [s for s in standard_specs if any(k in s.get("property","").lower() for k in ["diameter","length","thickness","width","height"])]
    # Build row for dimensions
    if tender_dims and std_dims:
        # Compare first tender dim vs first std dim — simplistic for MVP; officer decides
        tdim = tender_dims[0].get("value") if tender_dims else None
        sdim = std_dims[0].get("value") if std_dims else None
        status = "MISMATCH"  # always flag if both exist but may not match numerically — officer review
        try:
            tn = float(re.search(r"(\d+(?:\.\d+)?)", str(tdim)).group(1))
            sn = float(re.search(r"(\d+(?:\.\d+)?)", str(sdim)).group(1))
            tol = std_dims[0].get("tolerance")
            if tol:
                # within tolerance? parse ±
                import re as _re
                tm = _re.search(r"(\d+(?:\.\d+)?)", tol)
                if tm:
                    tval = float(tm.group(1))
                    if abs(tn - sn) <= tval + 1e-6:
                        status = "MATCH"
        except Exception:
            pass
        rows.append({
            "requirement": "Dimensions",
            "tender": tdim or "Not specified",
            "standard": sdim or "Not found",
            "evidence": f"p.{std_dims[0].get('page')} {std_dims[0].get('raw_text','')[:120]}" if std_dims else "No evidence",
            "status": status,
            "note": "Potential specification mismatch requiring officer review." if status=="MISMATCH" else ""
        })
    elif not tender_dims and std_dims:
        rows.append({
            "requirement": "Dimensions",
            "tender": "Not specified in tender",
            "standard": f"{std_dims[0].get('property')}: {std_dims[0].get('value')}",
            "evidence": f"p.{std_dims[0].get('page')}",
            "status": "TENDER_NOT_SPECIFIED",
            "note": ""
        })
    elif tender_dims and not std_dims:
        rows.append({
            "requirement": "Dimensions",
            "tender": tender_dims[0].get("value"),
            "standard": "Not found in available source",
            "evidence": "No evidence",
            "status": "STANDARD_NOT_FOUND",
            "note": ""
        })

    # Testing
    tender_testing = tender_req.get("testing", [])
    has_std_testing = bool(any("test" in (s.get("section") or "").lower() or "test" in s.get("property","").lower() for s in standard_specs))
    rows.append({
        "requirement": "Testing",
        "tender": ", ".join(tender_testing) if tender_testing else "Not specified in tender",
        "standard": "Testing requirements found" if has_std_testing else "Not found in available source",
        "evidence": f"{len([s for s in standard_specs if 'test' in str(s.get('section','')).lower()])} specs" if has_std_testing else "No evidence",
        "status": "TENDER_NOT_SPECIFIED" if not tender_testing and has_std_testing else ("MATCH" if tender_testing and has_std_testing else "STANDARD_NOT_FOUND"),
        "note": ""
    })

    return rows
