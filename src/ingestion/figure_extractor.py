"""
figure_extractor.py — Phase 6: Technical Figure Detection + Filtering

Pipeline per spec 12-16:
1. Enumerate embedded images with bbox (PyMuPDF)
2. For each image, compute: bbox, page size, dimensions, hash
3. Detect caption proximity: text window around image contains "Figure"/"Fig."
4. De-duplicate: cluster by (w,h,hash) frequency
5. Filter via image_filter.classify_images (header/footer/tiny/frequent)
6. Output: figures list with provenance + debug groups

Figure schema:
{
  figure_id: "F006_01_a1b2c3",
  figure_number: "Figure 1",
  caption: "Standard heater section",
  page: 6,
  section: "Apparatus",
  bbox: (x0,y0,x1,y1),
  width, height,
  image_path: "data/processed/figures/IS1448..._p06_f01.png" (if saved),
  confidence: 0.85,
  is_confirmed: True,
  source_method: "pymupdf_bbox+caption",
  duplicate_group: "hash_..."
}
"""
from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz
from PIL import Image
import io

from .image_filter import classify_images

logger = logging.getLogger(__name__)

FIGURE_CAPTION_RE = re.compile(r"(Figure|Fig\.)\s+([A-Z]?\d+(?:\.\d+)*)", re.I)
CAPTION_LINE_RE = re.compile(r"^\s*(Figure|Fig\.)\s+[\dA-Z\.]+.*", re.I | re.M)


def _hash_pixmap(pix) -> str:
    try:
        # simple md5 of raw bytes for duplicate detection
        return hashlib.md5(pix.samples).hexdigest()[:12]
    except Exception:
        return ""


def _caption_nearby(page_text: str, page_images_bboxes=None, caption_window_chars: int = 800) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Checks if Figure caption exists within window.
    For general page-level check (bbox-specific window would require text blocks layout).
    Returns (has_caption, figure_number, caption_text)
    """
    # Find all Figure lines
    for m in CAPTION_LINE_RE.finditer(page_text):
        line = m.group(0).strip()
        fig_m = FIGURE_CAPTION_RE.search(line)
        num = fig_m.group(0).strip() if fig_m else line.split()[1] if len(line.split())>1 else None
        # caption is rest of line after number
        caption = line
        # try to extract number separately
        if fig_m:
            # remainder after match
            remainder = line[fig_m.end():].strip(" —–-:\t")
            return True, fig_m.group(0).strip(), remainder[:300] if remainder else line[:300]
        return True, num, line[:300]
    # also search generic "Figure" anywhere
    if FIGURE_CAPTION_RE.search(page_text):
        mm = FIGURE_CAPTION_RE.search(page_text)
        # grab surrounding 120 chars
        s = mm.start()
        snippet = page_text[max(0,s-60):s+120].strip().replace("\n"," ")
        return True, mm.group(0).strip(), snippet[:300]
    return False, None, None


def extract_figures(
    path: Path | str,
    pages: Optional[List[Dict]] = None,
    sections_map: Optional[Dict[int, str]] = None,
    save_dir: Optional[Path] = None,
    config: Optional[Dict] = None,
) -> List[Dict]:
    """
    Extract figures with filtering.
    - save_dir: if provided, confirmed figures are saved as PNG crops.
    - config: dict with figure thresholds (header_band_ratio etc.)
    """
    path = Path(path)
    cfg = config or {}
    header_ratio = cfg.get("header_band_ratio", 0.12)
    footer_ratio = cfg.get("footer_band_ratio", 0.10)
    tiny_thr = cfg.get("tiny_area_threshold", 2500)
    freq_ratio = cfg.get("freq_reject_ratio", 0.35)

    doc = fitz.open(path)
    # Build page_text map for caption detection
    page_texts = {}
    for pi, pg in enumerate(doc):
        page_texts[pi+1] = pg.get_text("text") or ""

    # Enumerate image candidates
    candidates: List[Dict] = []
    for pi, page in enumerate(doc):
        pg_no = pi + 1
        rect = page.rect
        page_text = page_texts[pg_no]
        has_caption, fig_num_hint, cap_text = _caption_nearby(page_text)
        # Get images on this page
        for img_idx, img in enumerate(page.get_images(full=True)):
            try:
                xref = img[0]
                # Get bbox of image placement
                # page.get_image_rects may not exist on old pymupdf; fallback to whole page
                try:
                    rects = page.get_image_rects(xref)
                    bbox = rects[0] if rects else fitz.Rect(0,0,rect.width, rect.height)
                    bbox_t = (float(bbox.x0), float(bbox.y0), float(bbox.x1), float(bbox.y1))
                    w = float(bbox.x1 - bbox.x0)
                    h = float(bbox.y1 - bbox.y0)
                except Exception:
                    bbox_t = (0, 0, float(rect.width), float(rect.height))
                    w, h = float(rect.width), float(rect.height)
                # Pixmap for hash (optional)
                pix_hash = ""
                width_px = int(w)
                height_px = int(h)
                try:
                    pix = fitz.Pixmap(doc, xref)
                    if pix.n > 4:  # CMYK
                        pix = fitz.Pixmap(fitz.csRGB, pix)
                    pix_hash = _hash_pixmap(pix)
                    width_px = pix.w
                    height_px = pix.h
                except Exception as e:
                    logger.debug("pixmap hash failed p%d img%d: %s", pg_no, img_idx, e)

                candidates.append({
                    "candidate_id": f"c{pg_no:03d}_{img_idx:02d}",
                    "page": pg_no,
                    "bbox": bbox_t,
                    "width": width_px,
                    "height": height_px,
                    "pix_hash": pix_hash,
                    "page_width": float(rect.width),
                    "page_height": float(rect.height),
                    "page_text_snippet": page_text[:600],
                    "caption_nearby": has_caption,
                    "figure_number_hint": fig_num_hint,
                    "caption_hint": cap_text,
                    "section": sections_map.get(pg_no) if sections_map else None,
                })
            except Exception as e:
                logger.debug("image candidate failed p%d img%d: %s", pg_no, img_idx, e)
                continue
    total_pages = len(doc)
    doc.close()

    if not candidates:
        return []

    # Classify via image_filter
    classified = classify_images(
        candidates,
        total_pages=total_pages,
        header_ratio=header_ratio,
        footer_ratio=footer_ratio,
        tiny_threshold=tiny_thr,
        freq_reject_ratio=freq_ratio,
    )

    # Post-filter: per-page density override
    # If a page has >8 image candidates (scanned page or dense stamps), require caption for confirmation
    from collections import Counter
    per_page_counts = Counter(c["page"] for c in classified)
    for c in classified:
        if per_page_counts[c["page"]] > 8 and not c.get("caption_nearby"):
            # Dense page without Figure caption → likely scanned strips or stamps → force reject
            if "dense_page" not in c.get("reject_reasons", []):
                c["reject_reasons"].append("dense_page")
            c["is_rejected"] = True
            c["filter_score"] = min(c["filter_score"], 0.30)
        # Also if candidate marked as scanned_slice, force reject unless caption
        if "scanned_slice" in c.get("reject_reasons", []) and not c.get("caption_nearby"):
            c["is_rejected"] = True

    # Build final figures
    figures: List[Dict] = []
    # For numbering, group confirmed figures per page
    confirmed_count = 0
    for c in classified:
        is_confirmed = not c.get("is_rejected", False) and c.get("filter_score", 0) >= 0.45
        # If image_filter marked rejected but has strong caption+size, still confirm
        if c.get("caption_nearby") and c.get("filter_score",0) >= 0.45:
            is_confirmed = True
        # Generate figure_id
        h = c.get("pix_hash")[:6] if c.get("pix_hash") else hashlib.md5(str(c["bbox"]).encode()).hexdigest()[:6]
        fig_id = f"F{c['page']:03d}_{h}_{confirmed_count:02d}"
        # Figure number from caption hint or fallback to candidate
        fig_num = c.get("figure_number_hint")
        if not fig_num and is_confirmed:
            # assign sequential per document for confirmed
            confirmed_count += 1
            fig_num = f"Figure {confirmed_count}" if is_confirmed else None

        rec = {
            "figure_id": fig_id,
            "candidate_id": c["candidate_id"],
            "page": c["page"],
            "section": c.get("section"),
            "bbox": c["bbox"],
            "width": c["width"],
            "height": c["height"],
            "pix_hash": c.get("pix_hash"),
            "figure_number": fig_num,
            "caption": c.get("caption_hint"),
            "caption_nearby": c["caption_nearby"],
            "filter_score": c.get("filter_score"),
            "is_rejected": c.get("is_rejected"),
            "reject_reasons": c.get("reject_reasons", []),
            "frequency": c.get("frequency"),
            "is_confirmed": is_confirmed,
            "confidence": c.get("filter_score"),
            "duplicate_group": c.get("pix_hash") or f"{c['width']}x{c['height']}",
            "source_method": "pymupdf_bbox+caption+filter",
        }
        # Optionally save crop for confirmed figures
        if is_confirmed and save_dir:
            try:
                save_dir = Path(save_dir)
                save_dir.mkdir(parents=True, exist_ok=True)
                stem = Path(path).stem
                out_name = f"{stem}_p{c['page']:03d}_{fig_id}.png"
                out_path = save_dir / out_name
                # Re-open doc to crop (avoid keeping doc open across classify)
                d2 = fitz.open(path)
                pg = d2[c["page"] - 1]
                # Clip to bbox with slight padding
                clip = fitz.Rect(c["bbox"])
                # Expand 2% padding but clamp to page
                pad_x = (clip.x1 - clip.x0) * 0.02
                pad_y = (clip.y1 - clip.y0) * 0.02
                clip.x0 = max(0, clip.x0 - pad_x)
                clip.y0 = max(0, clip.y0 - pad_y)
                clip.x1 = min(pg.rect.width, clip.x1 + pad_x)
                clip.y1 = min(pg.rect.height, clip.y1 + pad_y)
                # Render clipped region at 2x for quality
                pix = pg.get_pixmap(clip=clip, dpi=150)
                pix.save(str(out_path))
                rec["image_path"] = str(out_path)
                d2.close()
            except Exception as e:
                logger.debug("figure save failed %s: %s", fig_id, e)
                rec["image_path"] = None
        else:
            rec["image_path"] = None
        figures.append(rec)

    # Only return confirmed as primary, but include candidates with flag
    return figures
