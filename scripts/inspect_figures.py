#!/usr/bin/env python
"""
scripts/inspect_figures.py â€” Figure validation report (spec 55)

Generates HTML contact sheet showing thumbnails, caption, page, confidence.
Critical to verify logos are NOT classified as confirmed figures.

Usage:
  python scripts/inspect_figures.py
  python scripts/inspect_figures.py --limit 20
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import yaml
from src.storage.database import get_session_factory
from src.storage.models import Figure

def load_config():
    with open(ROOT / "config" / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--out", type=str, default=None)
    args = parser.parse_args()

    cfg = load_config()
    db_path = ROOT / cfg.get("paths", {}).get("db_path", "data/bis.db")
    if not db_path.exists():
        print(f"DB not found at {db_path}. Run ingest first.")
        sys.exit(1)

    factory = get_session_factory(db_path)
    session = factory()
    try:
        q = session.query(Figure).order_by(Figure.standard_id, Figure.page).limit(args.limit).all()
        print(f"Loaded {len(q)} figures (limit={args.limit})")
        if not q:
            print("No figures in DB â€” did figure extraction run?")
            return
        # Group by confirmed
        confirmed = [f for f in q if f.is_confirmed]
        rejected = [f for f in q if not f.is_confirmed]
        print(f"Confirmed: {len(confirmed)} | Rejected/logo: {len(rejected)}")
        # Build HTML
        html = """<!doctype html><html><head><meta charset='utf-8'><title>BIS Figures â€” Inspection</title>
<style>body{font-family:system-ui,Arial;margin:24px} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.card{border:1px solid #ddd;border-radius:8px;padding:10px}.card.confirmed{border-color:#16a34a;background:#f0fdf4}
.card.rejected{opacity:0.7;background:#fef2f2} img{max-width:100%;height:180px;object-fit:contain;background:#fff;border:1px solid #eee}
.meta{font-size:12px;color:#555} .cap{font-size:13px;margin:6px 0} .tag{display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px}
.tag.conf{color:#fff;background:#16a34a} .tag.rej{color:#fff;background:#dc2626}</style>
</head><body>
<h1>BIS Figures Inspection â€” Validation Report</h1>
<p>Check that confirmed figures are true technical diagrams (not BIS logos / headers). Rejected should be logos.</p>
"""
        html += f"<p><b>Total:</b> {len(q)} &nbsp; <span class='tag conf'>Confirmed: {len(confirmed)}</span> &nbsp; <span class='tag rej'>Rejected: {len(rejected)}</span></p>"
        html += "<h2>Confirmed technical figures (should be diagrams)</h2><div class='grid'>"
        for f in confirmed[:80]:
            img_rel = f.image_path or ""
            # Make relative to project root if absolute
            try:
                img_rel = str(Path(img_rel).resolve().relative_to(ROOT)) if img_rel else ""
            except Exception:
                img_rel = f.image_path or ""
            html += f"<div class='card confirmed'><div class='tag conf'>CONFIRMED</div>"
            html += f"<div class='meta'>{f.standard_id} &middot; p.{f.page} &middot; {f.figure_number or ''}</div>"
            if f.image_path and Path(f.image_path).exists():
                # Use absolute file path â€” browser will need file://, but report is for visual inspection via HTML open
                html += f"<img src='file:///{f.image_path.replace(chr(92),'/')}' alt='{f.figure_id}'>"
            else:
                html += f"<div style='height:100px;background:#eee;display:flex;align-items:center;justify-content:center'>No image (path: {f.image_path})</div>"
            html += f"<div class='cap'><b>{f.caption or '(no caption)'}</b></div>"
            html += f"<div class='meta'>conf={f.confidence} &middot; bbox={f.bbox} &middot; method={f.source_method}</div>"
            html += "</div>"
        html += "</div><h2>Rejected (logos / header / footer â€” should NOT be technical)</h2><div class='grid'>"
        for f in rejected[:60]:
            html += f"<div class='card rejected'><div class='tag rej'>REJECTED</div>"
            html += f"<div class='meta'>{f.standard_id} &middot; p.{f.page}</div>"
            html += f"<div class='cap'>{f.figure_id} &middot; group={f.duplicate_group}</div>"
            html += f"<div class='meta'>conf={f.confidence} &middot; reason: logos filtered</div>"
            html += "</div>"
        html += "</div></body></html>"

        out_path = Path(args.out) if args.out else ROOT / "data" / "figures_report.html"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(html, encoding="utf-8")
        print(f"Report saved to {out_path}")
        print("Open in browser to visually verify figures vs logos.")
    finally:
        session.close()


if __name__ == "__main__":
    main()

