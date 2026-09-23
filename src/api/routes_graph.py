"""
api/routes_graph.py — Standards knowledge graph API.

GET /api/graph/standards          — Standards relationship graph
GET /api/graph/standard/{id}     — Subgraph for specific standard
GET /api/graph/workspace/{id}    — Graph for workspace analysis
GET /api/graph/relationships      — All relationship types
POST /api/graph/populate          — Populate relationships from references
"""
from __future__ import annotations

from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException

from ..storage.database import get_session_factory
from ..storage.graph_repository import (
    get_standard_graph, get_workspace_graph, get_all_relationships,
    populate_relationships_from_references,
)

router = APIRouter()


def _cfg():
    p = Path(__file__).resolve().parents[2] / "config" / "config.yaml"
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    return {}


def _resolve(p: str | Path) -> Path:
    p = Path(p)
    if p.is_absolute():
        return p
    return (Path(__file__).resolve().parents[2] / p).resolve()


def _get_session():
    cfg = _cfg()
    db_path = _resolve(cfg.get("paths", {}).get("db_path", "data/bis.db"))
    return get_session_factory(db_path)()


@router.get("/graph/standards")
def standards_graph():
    """Get all standard relationships for graph visualization."""
    session = _get_session()
    try:
        rels = get_all_relationships(session)
        return {"relationships": rels, "count": len(rels)}
    finally:
        session.close()


@router.get("/graph/standard/{standard_id}")
def standard_graph(standard_id: str):
    """Get knowledge graph subgraph for a specific standard."""
    session = _get_session()
    try:
        graph = get_standard_graph(session, standard_id)
        return graph
    finally:
        session.close()


@router.get("/graph/workspace/{workspace_id}")
def workspace_graph(workspace_id: str):
    """Get knowledge graph for a procurement workspace."""
    session = _get_session()
    try:
        graph = get_workspace_graph(session, workspace_id)
        return graph
    finally:
        session.close()


@router.get("/graph/relationships")
def list_relationships():
    """Get all relationship types and counts."""
    session = _get_session()
    try:
        from ..storage.models import StandardRelationship
        rels = session.query(StandardRelationship).all()

        # Count by type
        type_counts = {}
        for r in rels:
            t = r.relationship_type or "unknown"
            type_counts[t] = type_counts.get(t, 0) + 1

        return {
            "total": len(rels),
            "by_type": type_counts,
            "relationships": [
                {
                    "id": r.relationship_id,
                    "source": r.source_standard_id,
                    "target": r.target_identifier,
                    "type": r.relationship_type,
                    "page": r.evidence_page,
                }
                for r in rels[:100]
            ],
        }
    finally:
        session.close()


@router.post("/graph/populate")
def populate_graph():
    """Populate standard_relationships from existing references."""
    session = _get_session()
    try:
        count = populate_relationships_from_references(session)
        return {"status": "ok", "relationships_created": count}
    finally:
        session.close()
