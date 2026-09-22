"""
recommendation/abstention.py — Confidence & abstention logic (spec 36)

States: HIGH | MEDIUM | LOW | INSUFFICIENT_EVIDENCE
No fake probabilities; evidence-based.

Rules:
- If top score < abstain_threshold → INSUFFICIENT_EVIDENCE → abstain
- Else bucket by thresholds
- Also abstain if corpus empty or no evidence chunks
"""
from __future__ import annotations

from typing import Dict, List


def decide_abstention(ranked_standards: List[Dict], config: Dict | None = None) -> Dict:
    cfg = config or {}
    # thresholds from config.yaml recommendation.*
    high_thr = cfg.get("high_threshold", 0.65)
    med_thr = cfg.get("medium_threshold", 0.40)
    abstain_thr = cfg.get("abstain_threshold", 0.25)

    if not ranked_standards:
        return {"decision": "ABSTAIN", "confidence": "INSUFFICIENT_EVIDENCE", "reason": "No candidate standards retrieved from available corpus."}

    top = ranked_standards[0]
    score = top.get("score", 0)
    evidence_count = len(top.get("evidence_chunks", [])) if isinstance(top.get("evidence_chunks"), list) else 0

    if score < abstain_thr or evidence_count == 0:
        return {
            "decision": "ABSTAIN",
            "confidence": "INSUFFICIENT_EVIDENCE",
            "reason": "Insufficient evidence to confidently recommend an applicable standard from the available corpus.",
            "top_score": score,
        }

    if score >= high_thr:
        conf = "HIGH"
    elif score >= med_thr:
        conf = "MEDIUM"
    else:
        conf = "LOW"

    return {"decision": "RECOMMEND", "confidence": conf, "top_score": score}
