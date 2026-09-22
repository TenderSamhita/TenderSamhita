"""
recommendation/ranking.py — Orchestrator for candidate generation → reranking → evidence
"""
from __future__ import annotations

from typing import Dict, List

from sqlalchemy.orm import Session

from ..retrieval.bm25_search import BM25Index
from ..retrieval.embeddings import EmbeddingModel
from ..retrieval.hybrid_search import extract_is_from_query, hybrid_search
from ..retrieval.reranker import rerank_standards
from ..retrieval.semantic_search import SemanticIndex


def recommend_for_query(
    query_text: str,
    bm25: BM25Index,
    sem_index: SemanticIndex,
    embedder: EmbeddingModel,
    standard_meta_map: Dict[str, Dict],
    session: Session | None = None,
    top_k_sem: int = 20,
    top_k_bm25: int = 20,
    weights: Dict | None = None,
    semantic_weight: float = 0.5,
    bm25_weight: float = 0.3,
    metadata_weight: float = 0.2,
) -> Dict:
    """
    End-to-end: semantic + BM25 union → hybrid → rerank.
    Returns {ranked_standards, hybrid_chunks}
    """
    # Semantic
    q_emb = embedder.encode_single(query_text)
    sem_res = sem_index.search(q_emb, top_k=top_k_sem)
    bm_res = bm25.search(query_text, top_k=top_k_bm25)

    hybrid = hybrid_search(
        query_text,
        semantic_results=sem_res,
        bm25_results=bm_res,
        semantic_weight=semantic_weight,
        bm25_weight=bm25_weight,
        metadata_weight=metadata_weight,
        extract_is_numbers=extract_is_from_query(query_text),
    )

    # Rerank by standard
    rerank_weights = weights or {"semantic": 0.5, "title": 0.2, "scope": 0.15, "material": 0.1, "status": 0.05}
    ranked = rerank_standards(hybrid, standard_meta_map, query_text, weights=rerank_weights)

    return {"ranked_standards": ranked, "hybrid_chunks": hybrid, "semantic_results": sem_res, "bm25_results": bm_res}
