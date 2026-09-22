"""
storage/database.py — Engine + session factory
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base

logger = logging.getLogger(__name__)


def get_engine(db_path: Path | str, echo: bool = False):
    db_path = Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    url = f"sqlite:///{db_path.resolve()}"
    engine = create_engine(url, echo=echo, connect_args={"check_same_thread": False})
    return engine


def init_db(db_path: Path | str):
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)
    logger.info("DB initialized at %s", db_path)
    return engine


def get_session_factory(db_path: Path | str):
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session(db_path: Path | str):
    """Generator for FastAPI Depends."""
    factory = get_session_factory(db_path)
    session = factory()
    try:
        yield session
    finally:
        session.close()
