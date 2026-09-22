"""
retrieval/semantic_search.py — FAISS semantic retrieval

Uses IndexFlatIP for normalized vectors (cosine via IP).
Stores mapping vector_id -> chunk_id
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple

import faiss
import numpy as np

logger = logging.getLogger(__name__)


class SemanticIndex:
    def __init__(self, dim: int):
        self.dim = dim
        self.index = faiss.IndexFlatIP(dim)
        self.id_to_chunk: Dict[int, Dict] = {}  # vector_id -> meta
        self.chunk_to_id: Dict[str, int] = {}

    def add(self, embeddings: np.ndarray, chunks: List[Dict]):
        """
        embeddings: (N, dim) normalized
        chunks: aligned list
        """
        assert embeddings.shape[0] == len(chunks)
        assert embeddings.shape[1] == self.dim
        start = self.index.ntotal
        self.index.add(embeddings.astype(np.float32))
        for i, ch in enumerate(chunks):
            vid = start + i
            self.id_to_chunk[vid] = ch
            self.chunk_to_id[ch["chunk_id"]] = vid

    def search(self, query_emb: np.ndarray, top_k: int = 20) -> List[Dict]:
        if self.index.ntotal == 0:
            return []
        query_emb = np.asarray(query_emb, dtype=np.float32).reshape(1, -1)
        # normalize is already done in EmbeddingModel
        scores, ids = self.index.search(query_emb, top_k)
        results = []
        for score, vid in zip(scores[0], ids[0]):
            if vid == -1:
                continue
            meta = self.id_to_chunk.get(int(vid))
            if not meta:
                continue
            results.append({
                "chunk_id": meta["chunk_id"],
                "text": meta["text"],
                "meta": meta,
                "semantic_score": float(score),
                "vector_id": int(vid),
            })
        return results

    def save(self, index_path: Path | str, mapping_path: Path | str):
        index_path = Path(index_path)
        mapping_path = Path(mapping_path)
        index_path.parent.mkdir(parents=True, exist_ok=True)
        mapping_path.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(index_path))
        # mapping as json (chunk ids)
        mapping = {str(k): v for k, v in self.id_to_chunk.items()}
        with open(mapping_path, "w", encoding="utf-8") as f:
            json.dump(mapping, f, indent=2, ensure_ascii=False)
        logger.info("FAISS saved: %s (ntotal=%d), mapping %s", index_path, self.index.ntotal, mapping_path)

    @classmethod
    def load(cls, index_path: Path | str, mapping_path: Path | str) -> "SemanticIndex":
        index_path = Path(index_path)
        mapping_path = Path(mapping_path)
        index = faiss.read_index(str(index_path))
        dim = index.d
        inst = cls(dim)
        inst.index = index
        import json
        with open(mapping_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        inst.id_to_chunk = {int(k): v for k, v in raw.items()}
        for vid, ch in inst.id_to_chunk.items():
            inst.chunk_to_id[ch["chunk_id"]] = vid
        logger.info("FAISS loaded: %s (ntotal=%d)", index_path, inst.index.ntotal)
        return inst
