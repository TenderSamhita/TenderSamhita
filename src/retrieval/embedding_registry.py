"""
retrieval/embedding_registry.py -- Registry of supported embedding models

Each entry defines:
  dim_hint      : expected embedding dimension (verified dynamically at load time)
  query_prefix  : prefix prepended to QUERY text before encoding
  passage_prefix: prefix prepended to PASSAGE/DOCUMENT text before encoding
  family        : model family for logging / diagnostics
  notes         : usage notes

BGE models: recommended to use instruction prefix for queries.
E5 models:  MUST use "query: " / "passage: " prefixes.
MiniLM:     no prefix needed.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class ModelEntry:
    dim_hint: int
    query_prefix: str
    passage_prefix: str
    family: str
    notes: str = ""


#: Canonical registry of supported models.
#: Keys must match HuggingFace model IDs exactly.
REGISTRY: dict[str, ModelEntry] = {
    "BAAI/bge-small-en-v1.5": ModelEntry(
        dim_hint=384,
        query_prefix="Represent this sentence: ",
        passage_prefix="",
        family="bge",
        notes="Default MVP. 384d, ~33M params, CPU-friendly. Best balance for BIS corpus.",
    ),
    "BAAI/bge-base-en-v1.5": ModelEntry(
        dim_hint=768,
        query_prefix="Represent this sentence: ",
        passage_prefix="",
        family="bge",
        notes="768d, ~109M params. Higher quality, ~3? slower than bge-small.",
    ),
    "sentence-transformers/all-MiniLM-L6-v2": ModelEntry(
        dim_hint=384,
        query_prefix="",
        passage_prefix="",
        family="minilm",
        notes="384d, ~22M params. Fastest CPU inference. No prefix needed.",
    ),
    "intfloat/e5-base-v2": ModelEntry(
        dim_hint=768,
        query_prefix="query: ",
        passage_prefix="passage: ",
        family="e5",
        notes="768d, ~109M params. MUST use query:/passage: prefixes. Strong passage retrieval.",
    ),
}

# Default model for MVP
DEFAULT_MODEL = "BAAI/bge-small-en-v1.5"


def get_entry(model_name: str) -> ModelEntry:
    """
    Return registry entry for model_name.
    If model is not registered, returns a permissive entry with no prefixes.
    Logs a warning so operators know to register new models.
    """
    import logging
    logger = logging.getLogger(__name__)
    if model_name in REGISTRY:
        return REGISTRY[model_name]
    logger.warning(
        "Model '%s' not in embedding registry -- using no-prefix defaults. "
        "Add it to embedding_registry.py for optimal performance.",
        model_name,
    )
    return ModelEntry(
        dim_hint=0,  # will be detected dynamically
        query_prefix="",
        passage_prefix="",
        family="unknown",
        notes="Unregistered model -- no prefix applied.",
    )


def list_supported() -> list[str]:
    """Return list of registered model IDs."""
    return list(REGISTRY.keys())
