# PRODUCT ARCHITECTURE — Tender Samhita 2.0

## 1. Product Positioning

**Tender Samhita** is an AI-powered procurement standards recommendation, verification, and technical specification intelligence platform.

Core question: *Given this procurement requirement, which standards, requirements, tests and evidence are relevant, what is missing or conflicting, and how can the officer review and construct a technically defensible specification?*

**Principle:** AI recommends. Evidence explains. The procurement officer decides.

---

## 2. Core Workflow

```
Tender / Procurement Requirement
        ↓
Requirement Understanding
        ↓
Requirement Extraction
        ↓
Standards Discovery
        ↓
Hybrid Retrieval
        ↓
Reranking
        ↓
Standards Relationship Graph
        ↓
Evidence Verification
        ↓
Version / Amendment Verification
        ↓
Conformity / QCO Verification
        ↓
Gap Detection
        ↓
Conflict Detection
        ↓
Evidence-backed Technical Specification
        ↓
Human Officer Review
        ↓
Export / Decision
```

---

## 3. Product Workspaces

### 3.1 Primary Navigation
- **Overview** — Landing + recent procurements
- **Procurements** — Workspace list + active analysis
- **Standards** — Standards directory + knowledge graph
- **Search** — Technical search

### 3.2 Procurement Workspace (3-Pane)
- **Left:** Requirement outline (extracted from tender)
- **Center:** Analysis / knowledge map / specification
- **Right:** Evidence / source panel (collapsible)

### 3.3 Inside a Procurement
- Overview
- Requirements
- Standards
- Knowledge Map
- Evidence
- Specification
- Review

---

## 4. Backend API Design

### 4.1 Existing Endpoints (Preserved)
All current `/api/*` endpoints remain functional.

### 4.2 New Endpoints

#### Procurement Workspaces
```
POST   /api/workspaces                    — Create workspace
GET    /api/workspaces                    — List workspaces
GET    /api/workspaces/{id}               — Get workspace
PUT    /api/workspaces/{id}               — Update workspace
DELETE /api/workspaces/{id}               — Delete workspace
```

#### Enhanced Tender Analysis
```
POST   /api/tender/full-analysis          — Complete procurement analysis pipeline
POST   /api/tender/gaps                   — Gap detection
POST   /api/tender/conflicts              — Conflict detection
POST   /api/tender/quality                — Tender quality review
```

#### Specification Builder
```
POST   /api/specification/build           — Build draft specification
PUT    /api/specification/{id}/item       — Update specification item
POST   /api/specification/{id}/export     — Export specification
```

#### Knowledge Graph
```
GET    /api/graph/standards               — Standards relationship graph
GET    /api/graph/standard/{id}           — Subgraph for specific standard
GET    /api/graph/relationships           — All relationship types
```

#### Traceability
```
POST   /api/traceability/matrix           — Generate traceability matrix
GET    /api/traceability/{workspace_id}   — Get traceability for workspace
```

---

## 5. Data Model Extensions

### 5.1 New Tables

```sql
-- Procurement Workspaces
CREATE TABLE workspaces (
    workspace_id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    tender_text TEXT,
    tender_pdf_path TEXT,
    status TEXT DEFAULT 'active',  -- active, review, completed, archived
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Extracted Requirements (per workspace)
CREATE TABLE workspace_requirements (
    req_id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(workspace_id),
    category TEXT,  -- product, material, application, capacity, dimension, testing, safety, certification
    parameter TEXT,
    value TEXT,
    unit TEXT,
    source_page INTEGER,
    source_text TEXT,
    is_specified BOOLEAN DEFAULT 1,
    created_at TIMESTAMP
);

-- Standards Relationships (knowledge graph edges)
CREATE TABLE standard_relationships (
    relationship_id TEXT PRIMARY KEY,
    source_standard_id TEXT REFERENCES standards(standard_id),
    target_standard_id TEXT,
    target_identifier TEXT,
    relationship_type TEXT,  -- normative_reference, test_method, allied, amendment, supersedes, superseded_by, terminology, safety
    evidence_page INTEGER,
    evidence_section TEXT,
    evidence_text TEXT,
    confidence REAL,
    created_at TIMESTAMP
);

-- Traceability Matrix
CREATE TABLE traceability (
    trace_id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(workspace_id),
    requirement_id TEXT,
    tender_parameter TEXT,
    tender_value TEXT,
    matched_standard_id TEXT,
    matched_clause TEXT,
    evidence_page INTEGER,
    evidence_text TEXT,
    status TEXT,  -- supported, partially_supported, unverified, conflict, not_found, review_required
    officer_decision TEXT,
    officer_notes TEXT,
    created_at TIMESTAMP
);

-- Officer Actions Audit Trail
CREATE TABLE officer_actions (
    action_id TEXT PRIMARY KEY,
    workspace_id TEXT,
    action_type TEXT,  -- decision, note, export, review
    target_type TEXT,  -- requirement, standard, specification, evidence
    target_id TEXT,
    action_value TEXT,
    created_at TIMESTAMP
);

-- Specification Items
CREATE TABLE specification_items (
    item_id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(workspace_id),
    parameter TEXT,
    requirement TEXT,
    unit TEXT,
    condition TEXT,
    applicable_standard_id TEXT,
    clause TEXT,
    evidence_page INTEGER,
    evidence_text TEXT,
    status TEXT,  -- supported, unsupported, requires_input
    officer_decision TEXT,
    sort_order INTEGER,
    created_at TIMESTAMP
);
```

### 5.2 Extended Standard Model
Add to `standards` table:
```sql
ALTER TABLE standards ADD COLUMN scope_text TEXT;
ALTER TABLE standards ADD COLUMN keywords TEXT;  -- JSON array
ALTER TABLE standards ADD COLUMN ics_code_description TEXT;
```

---

## 6. Knowledge Graph Schema

### 6.1 Node Types
- `standard` — IS/ISO/ASTM standard
- `section` — Standard section/clause
- `specification` — Technical parameter
- `test_method` — Test procedure
- `table` — Data table
- `figure` — Technical figure
- `requirement` — Procurement requirement (from tender)

### 6.2 Edge Types
- `CONTAINS` — Standard → Section
- `SPECIFIES` — Section → Specification
- `USES_TEST` — Standard → Test Method
- `REFERENCES` — Standard → Standard (normative)
- `ALLIED` — Standard → Standard (related)
- `SUPERSEDES` — Standard → Standard (version)
- `AMENDED_BY` — Standard → Standard (amendment)
- `APPLIES_TO` — Standard → Requirement
- `EVIDENCE_FOR` — Section/Spec → Requirement

### 6.3 Graph Query API
```python
# Get all standards related to a requirement
GET /api/graph/related?requirement_id=xxx

# Get path between two standards
GET /api/graph/path?from=IS_1448_P97&to=IS_15261

# Get subgraph for workspace
GET /api/graph/workspace/{workspace_id}
```

---

## 7. Frontend Architecture

### 7.1 Component Structure

```
frontend/src/
├── App.jsx                          (root, routing)
├── main.jsx
├── index.css                        (design system)
├── context/
│   ├── AppContext.jsx               (navigation, global state)
│   └── ReviewContext.jsx            (review workspace state)
├── pages/
│   ├── OverviewPage.jsx             (landing + recent)
│   ├── ProcurementsPage.jsx         (workspace list)
│   ├── ProcurementWorkspace.jsx     (3-pane workspace)
│   ├── StandardsPage.jsx            (standards directory)
│   ├── StandardDetailPage.jsx       (standard + knowledge map)
│   ├── SearchPage.jsx               (technical search)
│   └── SystemPage.jsx               (admin/health)
├── components/
│   ├── layout/
│   │   ├── AppHeader.jsx
│   │   └── AppNavigation.jsx        (top nav, not sidebar)
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Badge.jsx
│   │   ├── StatusIndicator.jsx
│   │   ├── EmptyState.jsx
│   │   ├── LoadingSkeleton.jsx
│   │   ├── ErrorState.jsx
│   │   ├── EvidenceCard.jsx
│   │   ├── RequirementRow.jsx
│   │   ├── StandardRow.jsx
│   │   ├── SidePanel.jsx
│   │   ├── Modal.jsx
│   │   ├── Drawer.jsx
│   │   ├── Tabs.jsx
│   │   ├── Breadcrumb.jsx
│   │   ├── Toast.jsx
│   │   ├── Tooltip.jsx
│   │   └── PDFViewer.jsx
│   ├── procurement/
│   │   ├── TenderInput.jsx          (upload/text)
│   │   ├── RequirementOutline.jsx   (left pane)
│   │   ├── ProcurementSummary.jsx   (overview stats)
│   │   ├── GapDetector.jsx
│   │   ├── ConflictDetector.jsx
│   │   └── TenderQualityReview.jsx
│   ├── standards/
│   │   ├── StandardsList.jsx
│   │   ├── StandardCard.jsx
│   │   ├── StandardHeader.jsx
│   │   └── StandardsKnowledgeGraph.jsx
│   ├── analysis/
│   │   ├── TraceabilityMatrix.jsx
│   │   ├── WhyRelevant.jsx
│   │   ├── RecommendationCard.jsx
│   │   └── ComparisonMatrix.jsx
│   ├── knowledge/
│   │   ├── KnowledgeMap.jsx         (interactive graph)
│   │   ├── NodeDetailPanel.jsx
│   │   ├── GraphControls.jsx
│   │   └── GraphFilters.jsx
│   ├── evidence/
│   │   ├── EvidencePanel.jsx        (right pane)
│   │   ├── EvidenceCard.jsx
│   │   ├── PDFEvidenceViewer.jsx
│   │   ├── TableViewer.jsx
│   │   └── FigureViewer.jsx
│   ├── specification/
│   │   ├── SpecificationBuilder.jsx
│   │   ├── SpecificationTable.jsx
│   │   └── SpecificationExport.jsx
│   └── review/
│       ├── ReviewWorkspace.jsx
│       ├── OfficerDecisions.jsx
│       └── DossierExport.jsx
├── services/
│   ├── apiClient.js
│   ├── workspaceService.js
│   ├── tenderService.js
│   ├── recommendationService.js
│   ├── searchService.js
│   ├── standardService.js
│   ├── graphService.js
│   ├── specificationService.js
│   ├── comparisonService.js
│   └── systemService.js
└── styles/
    ├── index.css                    (design system)
    ├── components.css               (component styles)
    └── workspace.css                (workspace layout)
```

### 7.2 Design System

**Color Palette (derived from logo):**
- Primary: Deep navy (#0b192c → #102a43)
- Accent: Derived from logo (saffron #ea580c preserved)
- Background: Off-white (#f8fafc)
- Surface: White (#ffffff)
- Borders: Slate (#e2e8f0)
- Text: Navy (#0f172a), Secondary (#334155), Muted (#64748b)

**Status Colors:**
- Green (#10b981): verified, supported, complete
- Amber (#d97706): review required, uncertain
- Red (#ef4444): conflict, failed, unsupported
- Blue (#2563eb): interactive, selected, informational

**Typography:**
- Inter (UI text)
- JetBrains Mono (technical values)

**Components:**
- Buttons: Primary (navy), Secondary (white), Ghost, Saffron (CTA)
- Inputs: Text, Textarea, Select, Search
- Cards: Clean panels with subtle borders
- Tables: Compact, monospace values
- Badges: Status pills (current, review, amended, superseded)
- Modals: Focused overlays
- Drawers: Slide-in side panels
- Skeletons: Loading placeholders

### 7.3 Workspace Layout (3-Pane)

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER: Logo │ Procurement Title │ Status │ Actions           │
├──────────────────────────────────────────────────────────────┤
│ NAV: Overview │ Requirements │ Standards │ Map │ Spec │ Review│
├──────────┬──────────────────────────────┬────────────────────┤
│ LEFT     │ CENTER                       │ RIGHT              │
│          │                              │                    │
│ Req List │ Analysis / Knowledge Map     │ Evidence Panel     │
│ (240px)  │ (flex)                       │ (320px, collapse)  │
│          │                              │                    │
│ • Product│ [Map / Matrix / Spec]        │ • Source page      │
│ • Material│                             │ • Clause text      │
│ • Capacity│                            │ • Table data       │
│ • Testing│                              │ • Figure           │
│ • Safety │                              │ • Reference        │
│          │                              │                    │
├──────────┴──────────────────────────────┴────────────────────┤
│ FOOTER: Status bar / Export actions                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Key Feature Implementations

### 8.1 Tender → Standard Traceability Matrix

```typescript
interface TraceabilityRow {
  tenderParameter: string;
  tenderValue: string;
  matchedStandard: string;
  matchedClause: string;
  evidencePage: number;
  evidenceText: string;
  status: 'supported' | 'partially_supported' | 'unverified' | 'conflict' | 'not_found' | 'review_required';
}
```

### 8.2 Gap Detection

Analyzes tender for:
- Missing measurable parameters
- Ambiguous requirements
- Missing units
- Outdated standard references
- Missing test methods
- Missing acceptance criteria
- Missing inspection references

### 8.3 Conflict Detection

Detects:
- Tender vs Standard value conflicts
- Standard vs Standard version conflicts
- Current vs superseded editions
- Unit mismatches
- Material mismatches
- Testing method conflicts

### 8.4 Specification Builder

Generates evidence-grounded technical specification:
```typescript
interface SpecificationItem {
  parameter: string;
  requirement: string;
  unit: string;
  condition: string;
  applicableStandard: string;
  clause: string;
  evidencePage: number;
  evidenceText: string;
  status: 'supported' | 'unsupported' | 'requires_input';
}
```

### 8.5 Why This Standard?

For each recommendation:
- Scope match explanation
- Product match explanation
- Application match explanation
- Technical requirement match
- Test method match
- Evidence citations

---

## 9. Implementation Phases

### Phase 1: Foundation (Backend)
- Database schema extensions
- Workspace CRUD API
- Enhanced tender analysis endpoint
- Knowledge graph data model
- Standards relationship extraction

### Phase 2: Intelligence (Backend)
- Gap detection engine
- Conflict detection engine
- Traceability matrix generation
- Specification builder
- Tender quality review

### Phase 3: Knowledge Graph
- Standards relationship graph API
- Graph visualization backend
- Cross-standard relationship queries

### Phase 4: UI Transformation
- Design system overhaul
- Navigation restructuring
- 3-pane workspace layout
- New component library
- Responsive design

### Phase 5: Feature UI
- Traceability matrix UI
- Gap/conflict detector UI
- Specification builder UI
- Tender quality review UI
- Knowledge graph visualization

### Phase 6: Polish
- Loading/error/empty states
- Animation refinement
- Accessibility
- Performance optimization
- Responsive behavior

---

*Architecture designed. Ready for implementation planning.*
