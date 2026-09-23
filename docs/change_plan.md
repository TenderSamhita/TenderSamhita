# CHANGE PLAN — Tender Samhita 2.0 Implementation

## Priority Order

Changes are ordered by: (1) preserve working backend, (2) extend data model, (3) add intelligence APIs, (4) transform UI, (5) polish.

Each phase is independently deployable. No phase breaks working functionality.

---

## PHASE 1: Backend Foundation (No UI Changes)

**Goal:** Extend database schema and add workspace/intelligence APIs without touching frontend.

### 1.1 Database Schema Extensions
**File:** `src/storage/models.py`
- Add `Workspace` model
- Add `WorkspaceRequirement` model
- Add `StandardRelationship` model
- Add `Traceability` model
- Add `SpecificationItem` model
- Add `OfficerAction` model
- Add `scope_text`, `keywords` columns to `Standard`

### 1.2 Workspace API
**New file:** `src/api/routes_workspaces.py`
- `POST /api/workspaces` — Create workspace from tender text/URL
- `GET /api/workspaces` — List workspaces
- `GET /api/workspaces/{id}` — Get workspace with requirements
- `PUT /api/workspaces/{id}` — Update workspace
- `DELETE /api/workspaces/{id}` — Delete workspace

### 1.3 Full Analysis Endpoint
**New file:** `src/api/routes_analysis.py`
- `POST /api/tender/full-analysis` — Runs complete pipeline:
  1. Parse tender
  2. Extract requirements
  3. Retrieve candidates
  4. Rerank
  5. Assemble evidence
  6. Detect gaps
  7. Detect conflicts
  8. Generate traceability matrix
  9. Save to workspace

### 1.4 Knowledge Graph Data
**New file:** `src/storage/graph_repository.py`
- `get_standard_graph(standard_id)` — Subgraph for one standard
- `get_workspace_graph(workspace_id)` — Graph for workspace analysis
- `get_related_standards(standard_id)` — All related standards
- Populate `standard_relationships` from existing `references` table

### 1.5 Wiring
**Modified:** `src/api/main.py`
- Include new routers
- Ensure backward compatibility

**Validation:** All existing endpoints continue to work. Frontend unchanged.

---

## PHASE 2: Intelligence APIs

**Goal:** Add gap detection, conflict detection, traceability, specification builder.

### 2.1 Gap Detection Engine
**New file:** `src/intelligence/gap_detector.py`
- Analyze extracted requirements against best practices
- Flag missing: capacity, test methods, acceptance criteria, inspection refs, standard refs
- Return list of gaps with explanations and supporting evidence

### 2.2 Conflict Detection Engine
**New file:** `src/intelligence/conflict_detector.py`
- Compare tender values vs standard specifications
- Detect: value mismatches, unit conflicts, material conflicts, version conflicts
- Return list of conflicts with evidence

### 2.3 Traceability Matrix Generator
**New file:** `src/intelligence/traceability.py`
- Map each tender requirement to matched standard clause
- Generate status: supported, partially_supported, unverified, conflict, not_found
- Persist to `traceability` table

### 2.4 Specification Builder
**New file:** `src/intelligence/specification_builder.py`
- Generate draft technical specification from evidence
- Mark each item: supported, unsupported, requires_input
- Never fabricate requirements
- Return specification items with evidence

### 2.5 Tender Quality Review
**New file:** `src/intelligence/quality_review.py`
- Analyze tender for completeness
- Check: measurable params, units, ambiguous language, outdated refs
- Generate quality score and recommendations

### 2.6 API Routes
**Modified:** `src/api/routes_analysis.py`
- `POST /api/tender/gaps` — Gap detection
- `POST /api/tender/conflicts` — Conflict detection
- `POST /api/tender/quality` — Quality review
- `POST /api/specification/build` — Build specification
- `POST /api/traceability/matrix` — Generate traceability

**Validation:** All APIs return real data from backend. Frontend still unchanged.

---

## PHASE 3: Knowledge Graph Backend

**Goal:** Build cross-standards relationship graph.

### 3.1 Relationship Extraction
**Modified:** `src/ingestion/pipeline.py`
- Extract normative references → `standard_relationships`
- Extract allied standards → `standard_relationships`
- Extract test method references → `standard_relationships`
- Extract version/supersession → `standard_relationships`

### 3.2 Graph API
**New file:** `src/api/routes_graph.py`
- `GET /api/graph/standards` — Full standards graph (paginated)
- `GET /api/graph/standard/{id}` — Subgraph for standard
- `GET /api/graph/related?requirement_id=xxx` — Related standards for requirement
- `GET /api/graph/path?from=X&to=Y` — Path between standards

### 3.3 Graph Query Engine
**New file:** `src/retrieval/graph_query.py`
- BFS/DFS traversal for related standards
- Path finding between standards
- Subgraph extraction for workspace

**Validation:** Graph API returns real relationship data.

---

## PHASE 4: UI Transformation — Design System

**Goal:** Overhaul visual identity without breaking functionality.

### 4.1 Design Tokens
**Modified:** `frontend/src/styles/index.css`
- Update color palette (derived from logo)
- Refine typography scale
- Update spacing system
- Remove AI-slop visual elements (glowing borders, excessive gradients)
- Add status color tokens (green/amber/red/blue)
- Professional component styles

### 4.2 Component Library
**New files:** `frontend/src/components/common/`
- `Button.jsx` — Consistent button component
- `Input.jsx` — Text input with labels
- `Badge.jsx` — Status badges
- `StatusIndicator.jsx` — Color-coded status
- `EmptyState.jsx` — Redesigned empty states
- `LoadingSkeleton.jsx` — Professional skeletons
- `ErrorState.jsx` — Actionable error messages
- `SidePanel.jsx` — Collapsible side panel
- `Modal.jsx` — Focused modal
- `Drawer.jsx` — Slide-in drawer
- `Tabs.jsx` — Tab navigation
- `Toast.jsx` — Notification toasts

### 4.3 Navigation Restructure
**Modified:** `frontend/src/components/layout/`
- Replace sidebar with top navigation bar
- Primary: Overview | Procurements | Standards | Search
- Secondary: Contextual within workspace
- Reduce from 6+ items to 4 primary items

**Validation:** Existing pages still work, just look different.

---

## PHASE 5: UI Transformation — Pages

**Goal:** Rebuild pages around procurement workflow.

### 5.1 Overview/Landing Page
**New file:** `frontend/src/pages/OverviewPage.jsx`
- Clean CTA-focused landing
- Primary: "Describe procurement requirement" input
- Secondary: "Upload Tender" button
- Recent procurements list (small)
- System indicators (subtle)
- No dashboard KPI cards

### 5.2 Procurement Workspace
**New file:** `frontend/src/pages/ProcurementWorkspace.jsx`
- 3-pane layout (left: requirements, center: analysis, right: evidence)
- Left pane: Extracted requirements outline
- Center pane: Tabbed (Overview | Standards | Knowledge Map | Specification | Review)
- Right pane: Evidence panel (collapsible)
- Top: Procurement title + status + actions

### 5.3 Procurement List
**New file:** `frontend/src/pages/ProcurementsPage.jsx`
- List of procurement workspaces
- Status indicators
- Last analyzed date
- Quick actions

### 5.4 Standards Page
**Modified:** `frontend/src/pages/SearchPage.jsx` → `StandardsPage.jsx`
- Standards directory with search
- Standards knowledge graph view
- Standard detail with knowledge map

### 5.5 Standard Detail
**Modified:** `frontend/src/pages/StandardDeepDivePage.jsx` → `StandardDetailPage.jsx`
- Header with standard identity
- Knowledge map as primary view
- Tabbed secondary navigation
- Evidence panel

**Validation:** All workflows accessible. No broken navigation.

---

## PHASE 6: Feature UI Components

**Goal:** Build UI for new intelligence features.

### 6.1 Traceability Matrix UI
**New file:** `frontend/src/components/analysis/TraceabilityMatrix.jsx`
- Table: Tender Req | Standard | Clause | Evidence | Status
- Color-coded status
- Clickable rows → evidence
- Filter by status

### 6.2 Gap Detector UI
**New file:** `frontend/src/components/procurement/GapDetector.jsx`
- List of gaps with explanations
- Supporting evidence links
- Officer action recommendations

### 6.3 Conflict Detector UI
**New file:** `frontend/src/components/procurement/ConflictDetector.jsx`
- Conflict cards with tender vs standard values
- Evidence citations
- Officer decision buttons

### 6.4 Specification Builder UI
**New file:** `frontend/src/components/specification/SpecificationBuilder.jsx`
- Editable specification table
- Status per item (supported/unsupported/requires_input)
- Evidence links
- Export functionality

### 6.5 Why Relevant UI
**New file:** `frontend/src/components/analysis/WhyRelevant.jsx`
- Detailed relevance explanation per standard
- Scope match, product match, technical match
- Evidence citations

### 6.6 Tender Quality Review UI
**New file:** `frontend/src/components/procurement/TenderQualityReview.jsx`
- Quality score
- List of issues
- Recommendations

**Validation:** All features work end-to-end.

---

## PHASE 7: Polish & Performance

### 7.1 Loading States
- Replace ad-hoc spinners with skeleton components
- Progressive loading for knowledge graph
- Streaming analysis progress

### 7.2 Error States
- Actionable error messages
- Retry mechanisms
- Graceful degradation

### 7.3 Empty States
- Guided empty states with CTAs
- Contextual help text

### 7.4 Responsive Design
- Desktop-first (1440px+)
- Tablet support (768px-1024px)
- 3-pane collapses to 2-pane on tablet
- Mobile: single pane with navigation

### 7.5 Animation
- Subtle panel transitions
- Hover states only
- No decorative animations
- Graph expansion animation

### 7.6 Accessibility
- Keyboard navigation
- Visible focus states
- ARIA labels
- Contrast ratios
- Screen reader support

### 7.7 Performance
- Lazy load knowledge graph
- Paginate standards list
- Cache API responses
- Virtual scroll for large lists

**Validation:** Full application works smoothly.

---

## Phase Dependencies

```
Phase 1 (Backend Foundation)
    ↓
Phase 2 (Intelligence APIs) ← depends on Phase 1
    ↓
Phase 3 (Knowledge Graph) ← depends on Phase 1
    ↓
Phase 4 (Design System) ← independent, can run in parallel
    ↓
Phase 5 (Page Transformation) ← depends on Phase 4
    ↓
Phase 6 (Feature UI) ← depends on Phases 2, 3, 5
    ↓
Phase 7 (Polish) ← depends on all above
```

---

## Estimated Effort

| Phase | Focus | Key Files | Est. Complexity |
|-------|-------|-----------|-----------------|
| 1 | Backend Foundation | models.py, routes_workspaces.py, routes_analysis.py | Medium |
| 2 | Intelligence APIs | gap_detector.py, conflict_detector.py, traceability.py, specification_builder.py | High |
| 3 | Knowledge Graph | graph_repository.py, routes_graph.py, graph_query.py | Medium |
| 4 | Design System | index.css, component library | Medium |
| 5 | Page Transformation | All page components | High |
| 6 | Feature UI | TraceabilityMatrix, GapDetector, ConflictDetector, SpecificationBuilder | High |
| 7 | Polish | Loading/error/empty states, responsive, accessibility | Medium |

---

## Risk Mitigation

1. **Backend preservation:** All new endpoints are additive. Existing endpoints unchanged.
2. **Frontend preservation:** Old pages remain functional during transition. New pages added alongside.
3. **Data safety:** Schema migrations are additive (new tables/columns only).
4. **Rollback:** Each phase can be reverted independently.
5. **Testing:** Each phase validates independently before proceeding.

---

*Change plan established. Ready for implementation.*
