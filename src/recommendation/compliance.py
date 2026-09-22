"""
recommendation/compliance.py — Safe compliance surfacing

Only surfaces when evidence exists; otherwise returns Not established.
"""
from __future__ import annotations

from typing import Dict, List

from sqlalchemy.orm import Session

from ..storage import models


def get_compliance(session: Session, standard_id: str) -> Dict:
    comps = session.query(models.Compliance).filter_by(standard_id=standard_id).all()
    if not comps:
        return {"status": "Not established from available source.", "items": []}
    items = [{"type": c.type, "value": c.value, "page": c.page, "confidence": c.confidence} for c in comps]
    return {"status": "Evidence found", "items": items}
