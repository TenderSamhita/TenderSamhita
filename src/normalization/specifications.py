"""
normalization/specifications.py — thin re-export and dedup logic
"""
from ..ingestion.specification_extractor import extract_specifications  # re-export

__all__ = ["extract_specifications"]
