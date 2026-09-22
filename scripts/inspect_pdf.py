#!/usr/bin/env python
"""
scripts/inspect_pdf.py â€” Debug per-PDF extraction (spec 56)

Usage:
  python scripts/inspect_pdf.py path/to/file.pdf
  python scripts/inspect_pdf.py path/to/file.pdf --save-debug

Outputs:
- Metadata
- Pages / text quality
- Sections
- Tables (headers/rows)
- Figures (confirmed vs rejected) with reasons
- References
- Specifications (sample)

Optionally saves:
  data/debug/<stem>/page_001.png etc + figure_candidates/ + confirmed_figures/
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.ingestion.figure_extractor import extract_figures  # noqa: E402
from src.ingestion.pipeline import process_single_pdf  # noqa: E402


def load_config():
    with open(ROOT / "config" / "config.yaml", "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def main():
    parser = argparse.ArgumentParser(description="Inspect PDF extraction")
    parser.add_argument("pdf", type=str, help="Path to PDF")
    parser.add_argument("--save-debug", action="store_true", help="Save page renders + figure crops")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"Not found: {pdf_path}")
        sys.exit(1)

    cfg = load_config()
    debug_root = ROOT / cfg.get("paths", {}).get("debug_dir", "data/debug")
    figures_dir = None
    if args.save_debug:
        figures_dir = debug_root / pdf_path.stem / "figures"
        figures_dir.mkdir(parents=True, exist_ok=True)

    print(f"Inspecting {pdf_path} ...")
    result = process_single_pdf(
        pdf_path,
        json_out_dir=None,
        figures_out_dir=figures_dir,
        config=cfg,
        use_db=False,
    )

    # Print summary
    doc = result.get("document", {})
    meta = result.get("metadata", {})
    secs = result.get("sections", [])
    chunks = result.get("chunks", [])
    tables = result.get("tables", [])
    figs = result.get("figures", [])
    refs = result.get("references", [])
    specs = result.get("specifications", [])

    print("\n" + "="*70)
    print("METADATA")
    print(json.dumps(meta, indent=2, ensure_ascii=False))
    print("\nDOCUMENT")
    print(json.dumps({k:v for k,v in doc.items() if k!="path"}, indent=2))
    print(f"\nSECTIONS ({len(secs)})")
    for s in secs[:20]:
        print(f"  p{s['page']:02d} L{s['level']} [{s.get('number') or '-'}] {s['title']} (parent={s.get('parent_title')})")
    if len(secs)>20:
        print(f"  ... +{len(secs)-20} more")

    print(f"\nCHUNKS ({len(chunks)})")
    for c in chunks[:3]:
        print(f"  {c['chunk_id']} p{c['page']} [{c['section']}] {c['text'][:180]}...")
    if len(chunks)>3:
        print(f"  ... +{len(chunks)-3} more")

    print(f"\nTABLES ({len(tables)})")
    for t in tables[:3]:
        print(f"  {t['table_id']} p{t['page']} cap={t.get('caption')} headers={t.get('headers')} rows={len(t.get('rows',[]))} status={t.get('status')}")
        if t.get('rows'):
            for row in t['rows'][:2]:
                print(f"    {row}")

    print(f"\nFIGURES total={len(figs)} | confirmed={len([f for f in figs if f.get('is_confirmed')])} | rejected={len([f for f in figs if f.get('is_rejected')])}")
    for f in figs[:15]:
        flag = "âœ“ CONFIRMED" if f.get("is_confirmed") else "âœ— REJECTED"
        print(f"  {flag} {f['figure_id']} p{f['page']} num={f.get('figure_number')} score={f.get('filter_score')} freq={f.get('frequency')} reasons={f.get('reject_reasons')} cap_nearby={f.get('caption_nearby')} cap={str(f.get('caption'))[:60]}")

    print(f"\nREFERENCES ({len(refs)})")
    for r in refs[:10]:
        print(f"  p{r['page']} {r['relationship_type']:20s} {r['target_identifier']} <- {r['raw_text'][:60]}")

    print(f"\nSPECIFICATIONS ({len(specs)})")
    for s in specs[:8]:
        print(f"  p{s['page']} {s['property']}: {s['value']} (unit={s['unit']} tol={s['tolerance']} cond={s['condition']} conf={s['confidence']})")

    print("\nWARNINGS:", result.get("_warnings"))
    print(f"Elapsed: {result.get('_elapsed',0):.2f}s | Status: {result.get('_status')}")

    # Save JSON debug
    if args.save_debug:
        out = debug_root / pdf_path.stem / "canonical.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False, default=str)
        print(f"\nDebug JSON saved to {out}")

        # Also render page thumbnails
        try:
            import fitz
            doc_f = fitz.open(pdf_path)
            for i, page in enumerate(doc_f):
                pix = page.get_pixmap(dpi=90)
                img_path = debug_root / pdf_path.stem / f"page_{i+1:03d}.png"
                pix.save(str(img_path))
            doc_f.close()
            print(f"Page renders saved to {debug_root / pdf_path.stem}/")
        except Exception as e:
            print(f"Page render failed: {e}")

    # Optional contact sheet hint
    print("\nDone. To visually validate figures, run: python scripts/inspect_figures.py")


if __name__ == "__main__":
    main()

