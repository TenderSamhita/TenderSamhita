"""
storage/models.py — SQLite schema via SQLAlchemy (MVP)

Entities per spec 22: standards, sections, chunks, specifications, tables, figures, references, compliance, documents

Simpler for MVP: use SQLite + SQLAlchemy 2.0.
"""
from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlalchemy import (Column, DateTime, Float, ForeignKey, Integer, String, Text,
                        create_engine)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Standard(Base):
    __tablename__ = "standards"
    standard_id = Column(String, primary_key=True)  # normalized IS_1448_Part_97_2026
    is_number = Column(String, nullable=True)
    raw_identifier = Column(String, nullable=True)
    normalized_identifier = Column(String, nullable=True)
    title = Column(Text, nullable=True)
    edition_year = Column(Integer, nullable=True)
    revision = Column(String, nullable=True)
    iso_reference = Column(String, nullable=True)
    ics_code = Column(String, nullable=True)
    status = Column(String, default="active")
    scope = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    pdf_path = Column(String, nullable=True)
    page_count = Column(Integer, nullable=True)
    full_text = Column(Text, nullable=True)
    source_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    sections = relationship("Section", back_populates="standard", cascade="all, delete-orphan")
    chunks = relationship("Chunk", back_populates="standard", cascade="all, delete-orphan")


class Section(Base):
    __tablename__ = "sections"
    section_id = Column(String, primary_key=True)
    standard_id = Column(String, ForeignKey("standards.standard_id"))
    parent_section_id = Column(String, nullable=True)
    section_number = Column(String, nullable=True)
    title = Column(String, nullable=True)
    page_start = Column(Integer, nullable=True)
    page_end = Column(Integer, nullable=True)
    text = Column(Text, nullable=True)

    standard = relationship("Standard", back_populates="sections")


class Chunk(Base):
    __tablename__ = "chunks"
    chunk_id = Column(String, primary_key=True)
    standard_id = Column(String, ForeignKey("standards.standard_id"))
    section_id = Column(String, ForeignKey("sections.section_id"), nullable=True)
    page = Column(Integer, nullable=True)
    section_title = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    chunk_type = Column(String, default="general")
    embedding_id = Column(Integer, nullable=True)  # vector id in FAISS

    standard = relationship("Standard", back_populates="chunks")


class Specification(Base):
    __tablename__ = "specifications"
    spec_id = Column(String, primary_key=True)
    standard_id = Column(String, ForeignKey("standards.standard_id"))
    page = Column(Integer)
    section = Column(String, nullable=True)
    property = Column(String)
    value = Column(String)
    nominal = Column(Float, nullable=True)
    minimum = Column(Float, nullable=True)
    maximum = Column(Float, nullable=True)
    tolerance = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    material = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    condition = Column(String, nullable=True)
    test_method = Column(String, nullable=True)
    raw_text = Column(Text)
    confidence = Column(Float, default=0.5)


class Table(Base):
    __tablename__ = "tables"
    table_id = Column(String, primary_key=True)
    standard_id = Column(String, ForeignKey("standards.standard_id"))
    page = Column(Integer)
    section = Column(String, nullable=True)
    caption = Column(Text, nullable=True)
    headers = Column(Text, nullable=True)  # JSON string
    rows = Column(Text, nullable=True)  # JSON string
    raw_text = Column(Text, nullable=True)
    confidence = Column(Float, default=0.5)
    status = Column(String, default="SUCCESS")


class Figure(Base):
    __tablename__ = "figures"
    figure_id = Column(String, primary_key=True)
    standard_id = Column(String, ForeignKey("standards.standard_id"))
    page = Column(Integer)
    section = Column(String, nullable=True)
    figure_number = Column(String, nullable=True)
    caption = Column(Text, nullable=True)
    image_path = Column(String, nullable=True)
    bbox = Column(String, nullable=True)
    confidence = Column(Float, default=0.5)
    is_confirmed = Column(Integer, default=0)  # bool as int for SQLite
    duplicate_group = Column(String, nullable=True)
    source_method = Column(String, nullable=True)


class Reference(Base):
    __tablename__ = "references"
    reference_id = Column(String, primary_key=True)
    source_standard_id = Column(String, ForeignKey("standards.standard_id"))
    target_identifier = Column(String)
    relationship_type = Column(String)
    raw_text = Column(Text)
    page = Column(Integer)
    confidence = Column(Float, default=0.5)


class Compliance(Base):
    __tablename__ = "compliance"
    compliance_id = Column(String, primary_key=True)
    standard_id = Column(String, ForeignKey("standards.standard_id"))
    type = Column(String)
    value = Column(Text)
    source = Column(Text)
    page = Column(Integer)
    confidence = Column(Float, default=0.5)


class Document(Base):
    __tablename__ = "documents"
    document_id = Column(String, primary_key=True)  # sha256 or path hash
    file_name = Column(String)
    path = Column(String)
    hash = Column(String)
    page_count = Column(Integer, nullable=True)
    parse_status = Column(String)
    ocr_required = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
