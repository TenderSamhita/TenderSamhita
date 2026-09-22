"""
retrieval/embeddings.py -- Pluggable embedding generation (Sentence-Transformers)

Supports any model registered in embedding_registry.py.
Key behaviours:
  - Dimension detected DYNAMICALLY from model (never hardcoded)
  - Query and passage prefixes applied automatically per registry
  - from_config() factory reads config/config.yaml `embedding:` block
  - Backward-compatible: callers that pass model_name/normalize/device still work
  - CPU batch, deterministic

Supported models (via embedding_registry.py):
  BAAI/bge-small-en-v1.5          [default, 384d]
  BAAI/bge-base-en-v1.5           [768d]
  sentence-transformers/all-MiniLM-L6-v2  [384d]
  intfloat/e5-base-v2             [768d]
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Sequence

import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config dataclass
# ---------------------------------------------------------------------------

@dataclass
class EmbeddingConfig:
    """All knobs for a single embedding model instance."""
    model: str = "BAAI/bge-small-en-v1.5"
    normalize_embeddings: bool = True
    batch_size: int = 32
    device: str = "cpu"

    # Derived from registry at construction time (do not set manually)
    query_prefix: str = field(default="", init=False)
    passage_prefix: str = field(default="", init=False)

    def __post_init__(self):
        from .embedding_registry import get_entry
        entry = get_entry(self.model)
        self.query_prefix = entry.query_prefix
        self.passage_prefix = entry.passage_prefix

    @classmethod
    def from_dict(cls, d: dict) -> "EmbeddingConfig":
        """
        Build from a config dict.
        Accepts both old-style keys (embeddings.normalize) and new-style
        (embedding.normalize_embeddings) for backward compatibility.
        """
        # Normalize key names
        normalize = d.get("normalize_embeddings", d.get("normalize", True))
        return cls(
            model=d.get("model", "BAAI/bge-small-en-v1.5"),
            normalize_embeddings=bool(normalize),
            batch_size=int(d.get("batch_size", 32)),
            device=d.get("device", "cpu"),
        )


# ---------------------------------------------------------------------------
# EmbeddingModel
# ---------------------------------------------------------------------------

class EmbeddingModel:
    """
    Thin wrapper around SentenceTransformer that applies model-specific
    query/passage prefixes and exposes a stable encode() API.

    Usage:
        # From config dict
        model = EmbeddingModel.from_config(cfg["embedding"])

        # Direct construction (compat with existing callers)
        model = EmbeddingModel(model_name="BAAI/bge-small-en-v1.5")

        # Encode a query (prefix applied automatically)
        q_emb = model.encode_query("thermal oxidation stability")

        # Encode document passages (passage prefix applied automatically)
        d_embs = model.encode_passages(texts, batch_size=32)
    """

    def __init__(
        self,
        model_name: str = "BAAI/bge-small-en-v1.5",
        device: str = "cpu",
        # Accept both old `normalize` and new `normalize_embeddings`
        normalize: bool = True,
        normalize_embeddings: Optional[bool] = None,
        batch_size: int = 32,
    ):
        # normalize_embeddings wins if explicitly provided
        effective_normalize = normalize_embeddings if normalize_embeddings is not None else normalize

        self._cfg = EmbeddingConfig(
            model=model_name,
            normalize_embeddings=effective_normalize,
            batch_size=batch_size,
            device=device,
        )
        self._model = None  # lazy load
        logger.info(
            "EmbeddingModel configured: model=%s device=%s normalize=%s "
            "query_prefix=%r passage_prefix=%r",
            self._cfg.model,
            self._cfg.device,
            self._cfg.normalize_embeddings,
            self._cfg.query_prefix,
            self._cfg.passage_prefix,
        )

    # ------------------------------------------------------------------
    # Factory
    # ------------------------------------------------------------------

    @classmethod
    def from_config(cls, cfg: dict) -> "EmbeddingModel":
        """
        Construct from config dict (supports both `embedding:` and legacy
        `embeddings:` YAML blocks).
        """
        ec = EmbeddingConfig.from_dict(cfg)
        return cls(
            model_name=ec.model,
            device=ec.device,
            normalize_embeddings=ec.normalize_embeddings,
            batch_size=ec.batch_size,
        )

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _load(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            logger.info(
                "Loading embedding model '%s' on %s ...",
                self._cfg.model, self._cfg.device,
            )
            self._model = SentenceTransformer(
                self._cfg.model,
                device=self._cfg.device,
            )
            detected_dim = self._model.get_sentence_embedding_dimension()
            logger.info(
                "Model loaded: %s | dim=%d | normalize=%s",
                self._cfg.model, detected_dim, self._cfg.normalize_embeddings,
            )

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def model_name(self) -> str:
        return self._cfg.model

    @property
    def dim(self) -> int:
        """Embedding dimension -- detected DYNAMICALLY from model, never hardcoded."""
        self._load()
        return self._model.get_sentence_embedding_dimension()

    @property
    def config(self) -> EmbeddingConfig:
        return self._cfg

    # ------------------------------------------------------------------
    # Encoding
    # ------------------------------------------------------------------

    def _apply_prefix(self, texts: List[str], prefix: str) -> List[str]:
        if not prefix:
            return texts
        return [prefix + t for t in texts]

    def encode(
        self,
        texts: List[str],
        batch_size: Optional[int] = None,
        is_query: bool = False,
    ) -> np.ndarray:
        """
        Encode texts. If is_query=True, applies query_prefix; else passage_prefix.
        This is the generic interface -- prefer encode_query / encode_passages for clarity.
        """
        self._load()
        prefix = self._cfg.query_prefix if is_query else self._cfg.passage_prefix
        prefixed = self._apply_prefix(texts, prefix)
        bs = batch_size or self._cfg.batch_size
        embs = self._model.encode(
            prefixed,
            batch_size=bs,
            show_progress_bar=len(texts) > 200,
            normalize_embeddings=self._cfg.normalize_embeddings,
            convert_to_numpy=True,
        )
        return np.asarray(embs, dtype=np.float32)

    def encode_passages(
        self,
        texts: List[str],
        batch_size: Optional[int] = None,
    ) -> np.ndarray:
        """
        Encode corpus passages (documents). Applies passage_prefix if needed.
        Use this when building the FAISS index.
        """
        return self.encode(texts, batch_size=batch_size, is_query=False)

    def encode_query(self, text: str) -> np.ndarray:
        """
        Encode a single query string. Applies query_prefix if needed.
        Returns shape (dim,).
        """
        return self.encode([text], is_query=True)[0]

    def encode_single(self, text: str) -> np.ndarray:
        """
        Backward-compatible alias for encode_query.
        Existing callers (evaluate.py, routes_search.py, etc.) use encode_single().
        """
        return self.encode_query(text)

    def encode_queries(self, texts: List[str], batch_size: Optional[int] = None) -> np.ndarray:
        """Encode a batch of query strings."""
        return self.encode(texts, batch_size=batch_size, is_query=True)

    # ------------------------------------------------------------------
    # Serialisable repr for index_meta.json
    # ------------------------------------------------------------------

    def to_meta(self) -> dict:
        """Return a JSON-serialisable snapshot for index_meta.json."""
        return {
            "model": self._cfg.model,
            "dim": self.dim,
            "normalize_embeddings": self._cfg.normalize_embeddings,
            "device": self._cfg.device,
            "query_prefix": self._cfg.query_prefix,
            "passage_prefix": self._cfg.passage_prefix,
        }
