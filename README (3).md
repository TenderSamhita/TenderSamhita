# Tender Samhita

### Procurement Standards Intelligence

> **AI recommends. Evidence explains. Procurement officer decides.**

Tender Samhita is an AI-powered procurement standards recommendation and
verification platform developed for **Smart India Hackathon 2026 ---
Problem Statement SIH26108**.

## Smart India Hackathon 2026

  -----------------------------------------------------------------------
  Field                               Details
  ----------------------------------- -----------------------------------
  Problem Statement ID                SIH26108

  Problem Statement                   AI-Powered Recommendation Engine
                                      for Identifying Applicable Indian
                                      Standards for Procurement
                                      Specifications

  Theme                               Smart Automation

  Category                            Software

  Organization                        Ministry of Consumer Affairs, Food
                                      & Public Distribution (BIS)

  Team                                Sinister Six
  -----------------------------------------------------------------------

### Team

-   Raj Singh
-   Krish Khatik
-   Harsh Goswami
-   Ayush Thakur
-   Jiya Jamadar
-   Mahek Kadu

## 1. The Problem

Procurement officers preparing technical specifications may need to
search large collections of Indian Standards and determine which
standards actually apply to a tender.

The challenge is not simply finding a PDF. Officers may need to
determine:

-   Which Indian Standard applies?
-   Whether the scope matches the intended product or application
-   Whether normative or allied standards are relevant
-   Which test methods apply
-   Whether edition, revision or amendment information matters
-   Whether technical requirements are missing from the tender
-   Whether tender requirements potentially conflict with a standard
-   Whether conformity or QCO requirements are actually established by
    authoritative evidence
-   Where the supporting clause and page evidence can be verified

## 2. Solution

Tender Samhita converts the workflow into:

``` text
Tender
  ↓
Requirement Extraction
  ↓
Applicable Standard Discovery
  ↓
Hybrid Retrieval
  ↓
Reranking
  ↓
Evidence Verification
  ↓
Normative / Allied Reference Mapping
  ↓
Tender vs Standard Analysis
  ↓
Gap & Conflict Detection
  ↓
Human Officer Review
  ↓
Procurement Specification
```

The system assists the officer rather than silently rewriting the tender
or replacing human procurement judgment.

## 3. Core Capabilities

### Tender Understanding

Accepts tender PDFs, technical specifications, product descriptions and
natural-language requirements.

Extracts procurement-relevant information such as:

-   Product
-   Material
-   Grade
-   Dimensions
-   Capacity
-   Performance
-   Operating conditions
-   Testing
-   Inspection
-   Safety
-   Quality requirements
-   Installation
-   Certification/conformity information
-   Acceptance criteria

### Applicable Indian Standard Recommendation

Uses semantic retrieval, BM25/lexical retrieval, metadata filtering,
candidate reranking and evidence verification to identify potentially
applicable standards.

### Evidence-Grounded Recommendations

Recommendations are designed around:

``` text
Tender Requirement
        ↓
Recommended Standard
        ↓
Section / Clause
        ↓
Source Page
        ↓
Evidence
        ↓
Officer Review
```

### Normative and Allied Standards

The knowledge layer can represent relationships involving:

-   Normative references
-   Test methods
-   Terminology
-   Safety
-   Installation
-   Related products
-   Allied standards

### Tender vs Standard Verification

The platform compares what the tender asks for against what a relevant
standard specifies.

Example:

  Parameter   Tender          Standard     Review
  ----------- --------------- ------------ --------------------
  Material    SS 304          SS 304       Match
  Capacity    500 L           500 L        Match
  Testing     Not specified   Required     Potential Gap
  Diameter    100 mm          110 ± 2 mm   Potential Conflict

The system is designed to flag issues for review rather than silently
changing the tender.

### Gap Detection

If a standard contains a relevant requirement that is absent from the
tender, the system can surface it as a potential specification gap.

### Version and Amendment Awareness

The architecture tracks edition, revision and amendment information
where supported by available evidence.

### Conformity / QCO Intelligence

Where authoritative evidence supports it, the system can represent:

-   QCO applicability
-   BIS Licence
-   Certificate of Conformity
-   Standard Mark
-   Certification scheme
-   Testing and marking requirements

The existence of an Indian Standard alone is not treated as proof that
mandatory certification applies.

### Multilingual Workflow

Current target languages:

-   English
-   Hindi
-   Marathi

The multilingual layer is designed to support user interaction while
maintaining a consistent internal standards-retrieval representation.

## 4. Knowledge Graph

The Knowledge Map can connect:

``` text
Tender
 └── Requirement
      └── Recommended Standard
           ├── Specifications
           ├── Test Methods
           ├── Normative Standards
           ├── Allied Standards
           ├── Tables
           ├── Figures
           ├── Evidence
           └── Version / Amendments
```

The graph is intended as a deep-dive interface for technical
verification rather than the primary workflow.

## 5. Evidence-First AI

The system follows a retrieval-first design.

AI components assist with requirement extraction, query understanding,
semantic matching and explanation. The standards corpus remains the
source of truth.

The system should not invent:

-   IS numbers
-   Clauses
-   Dimensions
-   Technical specifications
-   Certifications
-   References
-   Amendments

When evidence is insufficient, the system should surface uncertainty or
abstain.

## 6. Technical Architecture

``` text
Tender Input
     ↓
Document Processing
     ↓
Requirement Extraction
     ↓
Hybrid Retrieval
     ├── Semantic Embeddings
     ├── BM25
     └── Metadata Filtering
     ↓
Candidate Standards
     ↓
Reranking
     ↓
Evidence Verification
     ↓
Standards Intelligence
     ├── Scope
     ├── Specifications
     ├── Tests
     ├── Normative References
     ├── Allied References
     ├── Tables / Figures
     └── Version Information
     ↓
Tender vs Standard Analysis
     ├── Gaps
     ├── Conflicts
     └── Conformity Information
     ↓
Human Officer Review
     ↓
Specification Builder
```

## 7. Hybrid Retrieval

### Semantic Retrieval

Embedding-based retrieval identifies conceptually related requirements
even when wording differs.

### BM25

Lexical retrieval preserves exact technical terminology, product names,
IS numbers and important keywords.

### Metadata Filtering

Candidate standards can be filtered using available metadata such as
standard number, year, category and status.

### Reranking

Candidate standards can be reranked using signals such as:

-   Scope match
-   Product/application match
-   Requirement coverage
-   Specification coverage
-   Test-method coverage
-   Version validity
-   Evidence quality
-   Reference completeness
-   Procurement relevance

## 8. Standards Knowledge Base

A processed standard can contain:

``` text
Standard
├── Metadata
├── Scope
├── Sections / Clauses
├── Specifications
├── Tables
├── Figures
├── Normative References
├── Allied References
├── Test Methods
├── Compliance / Conformity
├── Amendments
└── Search Chunks
```

The current SIH project deck identifies approximately **1,230 standards
in present corpus coverage**. Corpus coverage and retrieval performance
are treated as measurable engineering concerns.

## 9. Document Processing

``` text
PDF
 ↓
Metadata Discovery
 ↓
Native Text Extraction
 ↓
Page / Section Detection
 ↓
Table Extraction
 ↓
Technical Figure Detection
 ↓
OCR When Required
 ↓
Reference Extraction
 ↓
Specification Extraction
 ↓
Normalization
 ↓
Validation
 ↓
Structured Storage
 ↓
Search Indexes
```

Native text extraction is preferred before OCR.

Technical figures are separated from decorative images and repeated
headers/footers.

## 10. Technology Stack

### Frontend

-   React
-   Vite
-   Tailwind CSS

### Backend

-   Python
-   FastAPI

### Retrieval / NLP

-   Sentence Transformers
-   Embeddings
-   FAISS
-   BM25
-   Hybrid retrieval
-   Reranking

### Document Processing

-   PyMuPDF
-   PDF parsing
-   Table extraction
-   OCR fallback

### Storage

-   SQLite / structured local data
-   FAISS vector index
-   BM25 index
-   Processed JSON/text/figure/table artifacts

### Version Control

-   Git
-   GitHub

## 11. Repository Structure

``` text
TenderSamhita/
├── config/
├── data/
│   ├── raw_pdfs/
│   ├── processed/
│   │   ├── text/
│   │   ├── json/
│   │   ├── figures/
│   │   ├── tables/
│   │   └── ocr/
│   ├── embeddings/
│   ├── faiss/
│   └── logs/
├── docs/
├── frontend/
├── scripts/
├── src/
└── tests/
```

## 12. API Architecture

Representative backend routes include:

``` text
GET  /api/health
GET  /api/stats

POST /api/tender/upload
POST /api/tender/analyze
GET  /api/tender/jobs/{job_id}

POST /api/recommend
POST /api/search

GET  /api/standards/{standard_id}
GET  /api/standards/{standard_id}/graph
GET  /api/standards/{standard_id}/figures
GET  /api/standards/{standard_id}/tables
GET  /api/standards/{standard_id}/references

POST /api/compare
POST /api/tender/generate
```

## 13. Evaluation

Retrieval quality should be measured rather than assumed.

### Retrieval Metrics

-   Recall@5
-   Recall@10
-   Precision@5
-   Precision@10
-   Mean Reciprocal Rank (MRR)
-   Exact standard retrieval
-   False-positive rate

### System Evaluation

-   Requirement extraction accuracy
-   Requirement-to-standard mapping
-   Evidence traceability
-   Normative reference coverage
-   Gap detection
-   Conflict detection
-   Version awareness
-   Conformity verification
-   Evidence-backed specification generation

## 14. Reliability Principles

### Evidence over generation

Retrieved evidence is preferred over unsupported model output.

### No invented standards

IS numbers and references must be grounded in the corpus.

### No invented specifications

Dimensions, tolerances, materials and tests must be supported by
evidence.

### No automatic tender rewriting

The original tender remains intact.

### Human-in-the-loop

The procurement officer retains decision control.

### Explicit uncertainty

Insufficient evidence should be surfaced rather than hidden.

## 15. Procurement Officer Workflow

``` text
1. Upload Tender
       ↓
2. Review Extracted Requirements
       ↓
3. Inspect Recommended Standards
       ↓
4. Understand Why They Apply
       ↓
5. Open Evidence
       ↓
6. Review Normative / Allied References
       ↓
7. Compare Tender vs Standard
       ↓
8. Review Gaps / Conflicts
       ↓
9. Accept / Review / Reject
       ↓
10. Generate Procurement Specification
```

## 16. Future Procurement Integration

The architecture can support authorized integration with procurement
platforms:

``` text
Tender Samhita
      ↓
Verified Procurement Package
      ↓
┌─────┴─────┐
│           │
GeM        CPPP
│           │
└─────┬─────┘
      ↓
Procurement Workflow
```

This repository does not claim live write access to government
procurement platforms unless the required institutional authorization
and technical access are actually available.

## 17. Future Scope

-   Bidder Compliance Matrix
-   Tender Amendment Impact Analyzer
-   Standards change monitoring
-   Expanded multilingual interaction
-   Larger standards corpus
-   Advanced reranking
-   Improved technical figure extraction
-   Automated evidence dossiers
-   Procurement analytics
-   Authorized GeM / CPPP integrations
-   Standards lifecycle monitoring

## 18. Impact

Tender Samhita is intended to support:

### Better Specifications

Identify complete and relevant technical requirements.

### Applicable Standards

Reduce dependence on manual keyword-only standards searches.

### Traceable Decisions

Connect recommendations to clauses, pages and source evidence.

### Better Procurement

Surface potential gaps and conflicts before they propagate into
procurement workflows.

Pilot evaluation should measure actual improvements rather than assume
them.

## 19. Research Foundation

### Policy / Procurement

-   General Financial Rules (GFR) 2017
-   Department of Expenditure, Manual for Procurement of Goods, 2nd
    Edition (2024)
-   BIS Quality Control Order guidance
-   BIS standards and certification resources
-   MeitY Bhashini

### Technical Literature

-   Lewis et al. (2020), Retrieval-Augmented Generation for
    Knowledge-Intensive NLP
-   Reimers & Gurevych (2019), Sentence-BERT
-   Johnson, Douze & Jégou (2019), FAISS
-   Robertson & Zaragoza (2009), BM25

## 20. Current Limitations

Tender Samhita is a prototype/research implementation and should not be
treated as an autonomous procurement authority.

Known limitations include:

-   Corpus coverage is not equivalent to the complete universe of Indian
    Standards.
-   Retrieval quality depends on corpus quality and indexing.
-   Complex/scanned PDFs may require OCR.
-   Version and amendment interpretation depends on available source
    evidence.
-   QCO/conformity determination requires authoritative source
    verification.
-   Multilingual support is limited to implemented languages.
-   Government procurement-platform integration requires appropriate
    authorization and technical access.
-   Pilot metrics must be measured on representative evaluation sets
    before performance claims are made.

## 21. Disclaimer

Tender Samhita is a research and prototype system developed for Smart
India Hackathon 2026.

Recommendations generated by the system are intended to assist
procurement professionals and must be independently reviewed against
authoritative standards, amendments, government notifications, QCOs and
applicable procurement rules before official use.

The system does not replace the authority or professional judgment of
procurement officers, technical committees, standards experts or
competent government authorities.

## 22. Vision

``` text
TENDER
  ↓
REQUIREMENT
  ↓
APPLICABLE INDIAN STANDARD
  ↓
EVIDENCE
  ↓
GAP / CONFLICT REVIEW
  ↓
OFFICER DECISION
  ↓
PROCUREMENT SPECIFICATION
```

> **Tender Samhita --- From tender requirements to verified Indian
> Standards and procurement-ready specifications.**

------------------------------------------------------------------------

## Smart India Hackathon 2026

**Problem Statement:** SIH26108\
**Project:** Tender Samhita\
**Team:** Sinister Six

**AI recommends. Evidence explains. Procurement officer decides.**
