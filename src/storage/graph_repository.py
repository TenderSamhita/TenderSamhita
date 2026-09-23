"""
storage/graph_repository.py — Standards knowledge graph data access.

Provides graph queries over standard relationships stored in the database.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from .models import Standard, Reference, StandardRelationship, Section, Specification

logger = logging.getLogger(__name__)


def get_standard_graph(session: Session, standard_id: str) -> Dict:
    """
    Get knowledge graph subgraph for a specific standard.

    Returns nodes and edges representing the standard's relationships.
    """
    std = session.get(Standard, standard_id)
    if not std:
        return {"nodes": [], "edges": [], "error": f"Standard {standard_id} not found"}

    nodes = []
    edges = []

    # Root node
    nodes.append({
        "id": standard_id,
        "type": "standard",
        "label": std.normalized_identifier or std.is_number or standard_id,
        "title": std.title,
        "year": std.edition_year,
        "status": std.status,
    })

    # Sections as child nodes
    sections = session.query(Section).filter_by(standard_id=standard_id).all()
    for sec in sections[:15]:
        sec_id = sec.section_id or f"{standard_id}_sec_{sec.section_number}"
        nodes.append({
            "id": sec_id,
            "type": "section",
            "label": sec.title or f"Section {sec.section_number}",
            "section_number": sec.section_number,
            "page": sec.page_start,
        })
        edges.append({
            "source": standard_id,
            "target": sec_id,
            "relationship": "contains",
        })

    # Specifications as child nodes
    specs = session.query(Specification).filter_by(standard_id=standard_id).all()
    for spec in specs[:10]:
        spec_id = f"{standard_id}_spec_{spec.spec_id}"
        nodes.append({
            "id": spec_id,
            "type": "specification",
            "label": f"{spec.property}: {spec.value} {spec.unit or ''}",
            "property": spec.property,
            "value": spec.value,
            "unit": spec.unit,
            "page": spec.page,
        })
        edges.append({
            "source": standard_id,
            "target": spec_id,
            "relationship": "specifies",
        })

    # References as related standard nodes
    refs = session.query(Reference).filter_by(source_standard_id=standard_id).all()
    for ref in refs[:10]:
        ref_id = ref.target_identifier or ref.reference_id
        nodes.append({
            "id": ref_id,
            "type": "reference",
            "label": ref.target_identifier,
            "relationship_type": ref.relationship_type,
            "page": ref.page,
        })
        edges.append({
            "source": standard_id,
            "target": ref_id,
            "relationship": ref.relationship_type or "references",
            "page": ref.page,
        })

    return {"nodes": nodes, "edges": edges}


def get_workspace_graph(session: Session, workspace_id: str) -> Dict:
    """
    Get knowledge graph for a procurement workspace.
    Includes all standards referenced in traceability and specification.
    """
    from .models import Traceability, SpecificationItem

    nodes = []
    edges = []
    seen_standards = set()

    # Get traceability entries
    traces = session.query(Traceability).filter_by(workspace_id=workspace_id).all()
    for t in traces:
        if t.matched_standard_id and t.matched_standard_id not in seen_standards:
            seen_standards.add(t.matched_standard_id)
            std = session.get(Standard, t.matched_standard_id)
            if std:
                nodes.append({
                    "id": t.matched_standard_id,
                    "type": "standard",
                    "label": std.normalized_identifier or std.is_number,
                    "title": std.title,
                    "year": std.edition_year,
                })

        # Requirement node
        req_id = t.requirement_id or f"req_{t.tender_parameter}"
        nodes.append({
            "id": req_id,
            "type": "requirement",
            "label": t.tender_parameter,
            "value": t.tender_value,
            "status": t.status,
        })

        if t.matched_standard_id:
            edges.append({
                "source": req_id,
                "target": t.matched_standard_id,
                "relationship": "traceable_to",
                "status": t.status,
            })

    # Get specification items
    specs = session.query(SpecificationItem).filter_by(workspace_id=workspace_id).all()
    for s in specs:
        if s.applicable_standard_id and s.applicable_standard_id not in seen_standards:
            seen_standards.add(s.applicable_standard_id)
            std = session.get(Standard, s.applicable_standard_id)
            if std:
                nodes.append({
                    "id": s.applicable_standard_id,
                    "type": "standard",
                    "label": std.normalized_identifier or std.is_number,
                    "title": std.title,
                })

    # Add cross-standard relationships
    for std_id in seen_standards:
        refs = session.query(Reference).filter_by(source_standard_id=std_id).all()
        for ref in refs[:5]:
            if ref.target_identifier in seen_standards:
                edges.append({
                    "source": std_id,
                    "target": ref.target_identifier,
                    "relationship": ref.relationship_type or "references",
                })

    return {"nodes": nodes, "edges": edges}


def get_all_relationships(session: Session, limit: int = 200) -> List[Dict]:
    """Get all standard relationships for graph visualization."""
    rels = session.query(StandardRelationship).limit(limit).all()
    return [
        {
            "relationship_id": r.relationship_id,
            "source": r.source_standard_id,
            "target": r.target_standard_id or r.target_identifier,
            "type": r.relationship_type,
            "page": r.evidence_page,
            "confidence": r.confidence,
        }
        for r in rels
    ]


def populate_relationships_from_references(session: Session) -> int:
    """
    Populate standard_relationships table from existing references table.
    Returns count of relationships created.
    """
    refs = session.query(Reference).all()
    count = 0
    for ref in refs:
        # Check if relationship already exists
        existing = session.query(StandardRelationship).filter_by(
            source_standard_id=ref.source_standard_id,
            target_identifier=ref.target_identifier,
        ).first()
        if existing:
            continue

        rel = StandardRelationship(
            relationship_id=f"rel_{ref.reference_id}",
            source_standard_id=ref.source_standard_id,
            target_identifier=ref.target_identifier,
            relationship_type=ref.relationship_type or "normative_reference",
            evidence_page=ref.page,
            confidence=ref.confidence,
        )
        session.add(rel)
        count += 1

    session.commit()
    return count
