"""
storage/database.py — Engine + session factory with connection pooling
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .models import Base

logger = logging.getLogger(__name__)

# Module-level engine cache: one engine per DB path
_engines = {}
_session_factories = {}


def get_engine(db_path: Path | str, echo: bool = False):
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    key = str(db_path.resolve())
    if key not in _engines:
        url = f"sqlite:///{db_path.resolve()}"
        _engines[key] = create_engine(
            url,
            echo=echo,
            connect_args={"check_same_thread": False},
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
    return _engines[key]


def init_db(db_path: Path | str):
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)
    logger.info("DB initialized at %s", db_path)
    return engine


def get_session_factory(db_path: Path | str):
    key = str(Path(db_path).resolve())
    if key not in _session_factories:
        engine = get_engine(db_path)
        Base.metadata.create_all(engine)
        _session_factories[key] = sessionmaker(
            bind=engine, autoflush=False, autocommit=False
        )
    return _session_factories[key]


def get_session(db_path: Path | str) -> Generator[Session, None, None]:
    """Generator for FastAPI Depends."""
    factory = get_session_factory(db_path)
    session = factory()
    try:
        yield session
    finally:
        session.close()
