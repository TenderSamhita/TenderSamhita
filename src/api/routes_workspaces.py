"""
api/routes_workspaces.py — Procurement workspace CRUD + full analysis.

POST   /api/workspaces              — Create workspace
GET    /api/workspaces              — List workspaces
GET    /api/workspaces/{id}         — Get workspace
PUT    /api/workspaces/{id}         — Update workspace
DELETE /api/workspaces/{id}         — Delete workspace
POST   /api/workspaces/{id}/full-analysis  — Run full procurement analysis
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..storage.database import get_session_factory
from ..storage.models import (
    Workspace, WorkspaceRequirement, Traceability, SpecificationItem, OfficerAction,
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


class CreateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tender_text: Optional[str] = None


class UpdateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


@router.post("/workspaces")
def create_workspace(req: CreateWorkspaceRequest):
    session = _get_session()
    try:
        ws_id = f"WS_{uuid.uuid4().hex[:12]}"
        ws = Workspace(
            workspace_id=ws_id,
            name=req.name or f"Procurement {ws_id[:8]}",
            description=req.description,
            tender_text=req.tender_text,
            status="active",
        )
        session.add(ws)
        session.commit()
        return {
            "workspace_id": ws.workspace_id,
            "name": ws.name,
            "description": ws.description,
            "status": ws.status,
            "created_at": str(ws.created_at),
        }
    finally:
        session.close()


@router.get("/workspaces")
def list_workspaces():
    session = _get_session()
    try:
        workspaces = session.query(Workspace).order_by(Workspace.created_at.desc()).all()
        return [
            {
                "workspace_id": ws.workspace_id,
                "name": ws.name,
                "description": ws.description,
                "status": ws.status,
                "created_at": str(ws.created_at),
                "updated_at": str(ws.updated_at) if ws.updated_at else None,
            }
            for ws in workspaces
        ]
    finally:
        session.close()


@router.get("/workspaces/{workspace_id}")
def get_workspace(workspace_id: str):
    session = _get_session()
    try:
        ws = session.get(Workspace, workspace_id)
        if not ws:
            raise HTTPException(status_code=404, detail=f"Workspace {workspace_id} not found")

        reqs = session.query(WorkspaceRequirement).filter_by(workspace_id=workspace_id).all()
        traces = session.query(Traceability).filter_by(workspace_id=workspace_id).all()
        specs = session.query(SpecificationItem).filter_by(workspace_id=workspace_id).order_by(SpecificationItem.sort_order).all()

        return {
            "workspace_id": ws.workspace_id,
            "name": ws.name,
            "description": ws.description,
            "tender_text": ws.tender_text,
            "status": ws.status,
            "created_at": str(ws.created_at),
            "updated_at": str(ws.updated_at) if ws.updated_at else None,
            "requirements": [
                {
                    "req_id": r.req_id,
                    "category": r.category,
                    "parameter": r.parameter,
                    "value": r.value,
                    "unit": r.unit,
                    "source_page": r.source_page,
                    "is_specified": r.is_specified,
                }
                for r in reqs
            ],
            "traceability": [
                {
                    "trace_id": t.trace_id,
                    "tender_parameter": t.tender_parameter,
                    "tender_value": t.tender_value,
                    "matched_standard_id": t.matched_standard_id,
                    "matched_clause": t.matched_clause,
                    "evidence_page": t.evidence_page,
                    "evidence_text": t.evidence_text,
                    "status": t.status,
                    "officer_decision": t.officer_decision,
                }
                for t in traces
            ],
            "specification": [
                {
                    "item_id": s.item_id,
                    "parameter": s.parameter,
                    "requirement": s.requirement,
                    "unit": s.unit,
                    "condition": s.condition,
                    "applicable_standard_id": s.applicable_standard_id,
                    "clause": s.clause,
                    "evidence_page": s.evidence_page,
                    "evidence_text": s.evidence_text,
                    "status": s.status,
                    "officer_decision": s.officer_decision,
                }
                for s in specs
            ],
        }
    finally:
        session.close()


@router.put("/workspaces/{workspace_id}")
def update_workspace(workspace_id: str, req: UpdateWorkspaceRequest):
    session = _get_session()
    try:
        ws = session.get(Workspace, workspace_id)
        if not ws:
            raise HTTPException(status_code=404, detail=f"Workspace {workspace_id} not found")
        if req.name is not None:
            ws.name = req.name
        if req.description is not None:
            ws.description = req.description
        if req.status is not None:
            ws.status = req.status
        session.commit()
        return {"status": "updated", "workspace_id": workspace_id}
    finally:
        session.close()


@router.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: str):
    session = _get_session()
    try:
        ws = session.get(Workspace, workspace_id)
        if not ws:
            raise HTTPException(status_code=404, detail=f"Workspace {workspace_id} not found")
        # Delete related records
        session.query(WorkspaceRequirement).filter_by(workspace_id=workspace_id).delete()
        session.query(Traceability).filter_by(workspace_id=workspace_id).delete()
        session.query(SpecificationItem).filter_by(workspace_id=workspace_id).delete()
        session.query(OfficerAction).filter_by(workspace_id=workspace_id).delete()
        session.delete(ws)
        session.commit()
        return {"status": "deleted", "workspace_id": workspace_id}
    finally:
        session.close()
