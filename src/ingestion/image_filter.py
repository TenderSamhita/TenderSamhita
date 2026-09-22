"""
image_filter.py — Logo / header / footer filtering for figure pipeline

Implements heuristics from spec section 13 without hard-coding one logo.

Signals:
- frequency across pages (perceptual hash or dimension+bbox clustering)
- position: header_band (top 12%), footer_band (bottom 10%)
- size: tiny images (<2500 px area) unlikely to be technical figure
- aspect / bbox: extremely wide thin banners are logos
- duplicate groups

This module does NOT extract images — it classifies candidates supplied by
figure_extractor. Returns decision per image.
"""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


def _is_in_header_footer(bbox: Tuple[float, float, float, float], page_h: float, header_ratio=0.12, footer_ratio=0.10) -> str | None:
    """
    bbox in PDF coordinates (x0,y0,x1,y1) where y0 is top.
    Returns 'header' | 'footer' | None
    """
    if not bbox or page_h <= 0:
        return None
    y0, y1 = bbox[1], bbox[3]
    # bbox near top => header
    if y0 < page_h * header_ratio:
        return "header"
    if y1 > page_h * (1 - footer_ratio):
        return "footer"
    return None


def classify_images(
    candidates: List[Dict],
    total_pages: int,
    header_ratio: float = 0.12,
    footer_ratio: float = 0.10,
    tiny_threshold: int = 2500,
    freq_reject_ratio: float = 0.35,
) -> List[Dict]:
    """
    candidates: list of dicts each with:
      - image_index, page, bbox, width, height, pix_hash (optional), caption_nearby (bool)
    Mutates each with decision fields: is_rejected, reject_reason, score
    """
    # Frequency analysis by (width,height) bucket or hash if available
    key_counter = Counter()
    for c in candidates:
        # Use hash if present, else dimension bucket
        key = c.get("pix_hash") or f"{c.get('width',0)}x{c.get('height',0)}"
        key_counter[key] += 1

    for c in candidates:
        reasons: List[str] = []
        score = 0.5  # neutral
        page_h = c.get("page_height", 842)

        # 1. Frequency — appears on many pages → logo/header/footer
        key = c.get("pix_hash") or f"{c.get('width',0)}x{c.get('height',0)}"
        freq = key_counter[key] / max(total_pages, 1)
        if freq > freq_reject_ratio:
            reasons.append(f"frequent_{freq:.2f}")
            score -= 0.4

        # 2. Header/footer position
        pos = _is_in_header_footer(c.get("bbox"), page_h, header_ratio, footer_ratio)
        if pos:
            reasons.append(pos)
            score -= 0.25
            # if also frequent and in header → strong reject
            if freq > 0.2:
                score -= 0.2

        # 3. Tiny → not technical
        area = c.get("width", 0) * c.get("height", 0)
        if area > 0 and area < tiny_threshold:
            reasons.append("tiny")
            score -= 0.3
        elif area > 80000:  # large diagram area → boost
            score += 0.15

        # 4. Aspect — very wide thin banner / scanned page slices
        w, h = c.get("width", 0), c.get("height", 0)
        if w > 0 and h > 0:
            aspect = max(w, h) / max(min(w, h), 1)
            if aspect > 8 and w > h:
                reasons.append("banner_aspect")
                # Stronger penalty for extreme aspect (scanned strips)
                if aspect > 15:
                    score -= 0.40
                elif aspect > 10:
                    score -= 0.30
                else:
                    score -= 0.15
            # Scanned slice detection: very wide + thin covering page width
            page_w = c.get("page_width", 595)
            page_h_tmp = c.get("page_height", 842)
            if w > page_w * 0.85 and h < page_h_tmp * 0.15 and h < 150:
                reasons.append("scanned_slice")
                score -= 0.35

        # 4b. Small square logos without caption (e.g., 79x79 BIS logo)
        if w > 0 and h > 0 and w < 100 and h < 100 and not c.get("caption_nearby"):
            reasons.append("small_square_logo")
            score -= 0.25

        # 5. Caption proximity → strong positive
        if c.get("caption_nearby"):
            score += 0.35
        else:
            score -= 0.05

        # 6. Section hint — apparatus/test/setup
        sec = (c.get("section") or "").lower()
        if any(k in sec for k in ["apparatus", "test", "figure", "diagram", "setup", "requirements"]):
            score += 0.10

        # Decision
        c["filter_score"] = round(max(0.0, min(1.0, score)), 3)
        # Reject if score < 0.35 OR frequent+header/footer
        is_rejected = False
        if score < 0.35:
            is_rejected = True
        if freq > freq_reject_ratio and pos in ("header", "footer"):
            is_rejected = True
        if "tiny" in reasons and not c.get("caption_nearby"):
            is_rejected = True
        # Never reject if explicitly has Figure caption and decent size
        if c.get("caption_nearby") and area > 15000:
            is_rejected = False

        c["is_rejected"] = is_rejected
        c["reject_reasons"] = reasons
        c["frequency"] = round(freq, 3)

    return candidates
