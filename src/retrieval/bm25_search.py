"""
retrieval/bm25_search.py — BM25 lexical retrieval (mandatory)

Handles exact IS numbers, grades, test method codes.
Uses rank-bm25.
"""
from __future__ import annotations

import logging
import pickle
import re
from pathlib import Path
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> List[str]:
    # Keep IS numbers, codes, units as tokens; lowercase
    # Split on whitespace/punct but preserve alphanum codes
    text = text.lower()
    # Replace punctuation with space but keep is/part/unit tokens
    tokens = re.findall(r"[a-z0-9]+(?:[_\-./][a-z0-9]+)*", text)
    return tokens


class BM25Index:
    def __init__(self):
        self.bm25 = None
        self.doc_ids: List[str] = []  # chunk_id list aligned to corpus
        self.doc_texts: List[str] = []
        self.doc_meta: List[Dict] = []

    def build(self, chunks: List[Dict]):
        """
        chunks: list of dicts with chunk_id, text, standard_id, page, section
        """
        from rank_bm25 import BM25Okapi
        corpus_tokens = []
        self.doc_ids = []
        self.doc_texts = []
        self.doc_meta = []
        for ch in chunks:
            toks = _tokenize(ch["text"])
            # also add metadata tokens for exact IS number matching
            extra = f"{ch.get('standard_id','')} {ch.get('section','')}"
            toks += _tokenize(extra)
            corpus_tokens.append(toks)
            self.doc_ids.append(ch["chunk_id"])
            self.doc_texts.append(ch["text"])
            self.doc_meta.append(ch)
        self.bm25 = BM25Okapi(corpus_tokens)
        logger.info("BM25 built: %d docs", len(corpus_tokens))

    def search(self, query: str, top_k: int = 20) -> List[Dict]:
        if self.bm25 is None:
            return []
        q_toks = _tokenize(query)
        if not q_toks:
            return []
        scores = self.bm25.get_scores(q_toks)
        # top_k
        import numpy as np
        idx = np.argsort(scores)[::-1][:top_k]
        results = []
        for i in idx:
            if scores[i] <= 0:
                continue
            results.append({
                "chunk_id": self.doc_ids[i],
                "text": self.doc_texts[i],
                "meta": self.doc_meta[i],
                "bm25_score": float(scores[i]),
            })
        return results

    def save(self, path: Path | str):
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump({"bm25": self.bm25, "doc_ids": self.doc_ids, "doc_texts": self.doc_texts, "doc_meta": self.doc_meta}, f)
        logger.info("BM25 saved to %s", path)

    @classmethod
    def load(cls, path: Path | str) -> "BM25Index":
        with open(path, "rb") as f:
            data = pickle.load(f)
        inst = cls()
        inst.bm25 = data["bm25"]
        inst.doc_ids = data["doc_ids"]
        inst.doc_texts = data["doc_texts"]
        inst.doc_meta = data["doc_meta"]
        logger.info("BM25 loaded from %s (%d docs)", path, len(inst.doc_ids))
        return inst
