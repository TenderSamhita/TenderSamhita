"""
recommendation/allied_standards.py — Allied / normative graph builder
"""
from __future__ import annotations

from typing import Dict, List

from sqlalchemy.orm import Session

from ..storage import models


def get_allied_graph(session: Session, standard_id: str) -> Dict:
    refs = session.query(models.Reference).filter_by(source_standard_id=standard_id).all()
    nodes = [{"id": standard_id, "label": standard_id, "type": "primary"}]
    edges = []
    for r in refs:
        target = r.target_identifier
        nodes.append({"id": target, "label": target, "type": r.relationship_type})
        edges.append({
            "source": standard_id,
            "target": target,
            "relationship": r.relationship_type,
            "page": r.page,
            "evidence": r.raw_text,
        })
    # dedup nodes
    seen = {}
    uniq_nodes = []
    for n in nodes:
        if n["id"] not in seen:
            seen[n["id"]] = True
            uniq_nodes.append(n)
    return {"nodes": uniq_nodes, "edges": edges}
