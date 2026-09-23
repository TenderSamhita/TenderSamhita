import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, ArrowRight, CheckCircle2, AlertTriangle, 
  Layers, ChevronRight, RefreshCw, Bookmark, GitCompare 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { workspaceService } from '../services/workspaceService';
import { recommendationService } from '../services/recommendationService';
import { intelligenceService } from '../services/intelligenceService';
import { TraceabilityMatrix } from '../components/analysis/TraceabilityMatrix';
import { GapDetector } from '../components/procurement/GapDetector';
import { ConflictDetector } from '../components/procurement/ConflictDetector';
import { QualityReview } from '../components/procurement/QualityReview';
import { SpecificationBuilder } from '../components/specification/SpecificationBuilder';

const SAMPLE_QUERIES = [
  { label: 'Jet Fuel Test Apparatus', text: 'Procurement of Jet Fuel Thermal Oxidation Stability Test Apparatus and consumables. Requirements: Heater tube diameter 4.737 mm, test temperature 260 deg C, operating pressure 3.45 MPa, volumetric fuel flow 3.0 mL/min for aviation turbine fuel qualification.' },
  { label: 'SS Water Tank', text: 'Supply of Grade 304 Stainless Steel water storage tanks for public drinking distribution. Capacity 500 liters, nominal wall thickness 2.5 mm, hydrostatic test pressure 0.5 MPa, food-grade sanitary finish.' },
  { label: 'Carbon Steel Flanges', text: 'Procurement of forged carbon steel pipe flanges for high-pressure steam line service. Rating Class 300, weld neck design, nominal bore 150 mm, conforming to mandatory hydrostatic and tensile testing.' },
];

export function ProcurementWorkspace() {
  const { tenderText, setTenderText, navigateTo } = useApp();
  const [inputText, setInputText] = useState(tenderText || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setTenderText(inputText);
    try {
      const res = await workspaceService.fullAnalysis(inputText);
      setResult(res);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'traceability', label: 'Traceability' },
    { id: 'gaps', label: 'Gaps', count: result?.gaps?.length },
    { id: 'conflicts', label: 'Conflicts', count: result?.conflicts?.length },
    { id: 'specification', label: 'Specification' },
    { id: 'quality', label: 'Quality' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)' }}>
      {/* Top: Input Bar */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: '#ffffff', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <textarea
            rows={1}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste procurement specification or tender text..."
            style={{
              flex: 1,
              padding: '8px 14px',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              resize: 'none',
              outline: 'none',
              minHeight: 36,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--navy-700)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim()}
            className="btn-tech btn-saffron"
            style={{ padding: '8px 18px', fontWeight: 600, flexShrink: 0 }}
          >
            {loading ? 'Analyzing...' : 'Analyze'} <ArrowRight size={14} />
          </button>
        </div>
        {!result && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Try:</span>
            {SAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => { setInputText(q.text); setTenderText(q.text); }}
                className="btn-tech btn-ghost btn-xs"
                style={{ fontSize: 11, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
              >
                {q.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="skeleton skeleton-line long" style={{ width: 200, margin: '0 auto 12px' }} />
            <div className="skeleton skeleton-line medium" style={{ width: 160, margin: '0 auto' }} />
            <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              Analyzing procurement requirements and finding relevant standards...
            </p>
          </div>
        </div>
      )}

      {/* Results: 3-Pane Workspace */}
      {result && !loading && (
        <div className="workspace-3pane">
          {/* Left: Requirements */}
          <div className="workspace-left">
            <div className="pane-header">
              <span className="pane-title">Requirements</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {Object.keys(result.requirements || {}).filter(k => result.requirements[k]).length} extracted
              </span>
            </div>
            <div className="pane-body">
              <RequirementOutline requirements={result.requirements} />
            </div>
          </div>

          {/* Center: Analysis Tabs */}
          <div className="workspace-center">
            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 2, padding: '8px 24px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: '#ffffff', flexShrink: 0 }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn-tech btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 10, fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              {activeTab === 'overview' && (
                <OverviewTab result={result} navigateTo={navigateTo} />
              )}
              {activeTab === 'traceability' && (
                <TraceabilityMatrix data={result.traceability} />
              )}
              {activeTab === 'gaps' && (
                <GapDetector gaps={result.gaps} />
              )}
              {activeTab === 'conflicts' && (
                <ConflictDetector conflicts={result.conflicts} />
              )}
              {activeTab === 'specification' && (
                <SpecificationBuilder specification={result.specification} />
              )}
              {activeTab === 'quality' && (
                <QualityReview quality={result.quality} />
              )}
            </div>
          </div>

          {/* Right: Evidence Panel */}
          <div className={`workspace-right ${rightPanelOpen ? '' : 'collapsed'}`}>
            <div className="pane-header">
              <span className="pane-title">Evidence</span>
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="btn-tech btn-ghost btn-xs"
              >
                {rightPanelOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {rightPanelOpen && (
              <div className="pane-body">
                <EvidencePanel recommendations={result.recommendations} navigateTo={navigateTo} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementOutline({ requirements }) {
  if (!requirements) return null;
  const groups = [
    { key: 'product', label: 'Product' },
    { key: 'material', label: 'Material' },
    { key: 'application', label: 'Application' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'dimensions', label: 'Dimensions' },
    { key: 'testing', label: 'Testing' },
    { key: 'safety', label: 'Safety' },
  ];

  return (
    <div>
      {groups.map(g => {
        const val = requirements[g.key];
        if (!val || (Array.isArray(val) && val.length === 0)) return null;
        const displayVal = Array.isArray(val)
          ? val.slice(0, 3).map(v => typeof v === 'object' ? v.value || v : v).join(', ')
          : String(val);
        return (
          <div key={g.key} className="req-item">
            <div className="req-item-dot specified" />
            <div>
              <div className="req-item-label">{g.label}</div>
              <div className="req-item-value">{displayVal}</div>
            </div>
          </div>
        );
      })}
      {requirements.is_references && requirements.is_references.length > 0 && (
        <div className="req-item">
          <div className="req-item-dot specified" />
          <div>
            <div className="req-item-label">IS References</div>
            <div className="req-item-value">
              {requirements.is_references.slice(0, 3).map(r => r.value || r).join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ result, navigateTo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="clean-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Standards Found</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--navy-900)' }}>
            {result.recommendations?.length || 0}
          </div>
        </div>
        <div className="clean-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Gaps Detected</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: result.gaps?.length > 0 ? 'var(--amber)' : 'var(--green)' }}>
            {result.gaps?.length || 0}
          </div>
        </div>
        <div className="clean-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Conflicts</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: result.conflicts?.length > 0 ? '#ef4444' : 'var(--green)' }}>
            {result.conflicts?.length || 0}
          </div>
        </div>
        <div className="clean-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Quality Score</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--navy-900)' }}>
            {result.quality?.score || '—'}
          </div>
        </div>
      </div>

      {/* Recommended Standards */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 12 }}>Recommended Standards</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {result.recommendations?.map((rec, i) => (
            <div key={rec.standard_id || i} className="clean-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="mono-val" style={{ fontWeight: 700, fontSize: 13 }}>{rec.is_number}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>{rec.title}</span>
              </div>
              <button
                onClick={() => navigateTo('standard-detail', { standardId: rec.standard_id })}
                className="btn-tech btn-primary btn-xs"
              >
                View <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EvidencePanel({ recommendations, navigateTo }) {
  if (!recommendations || recommendations.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No evidence available.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {recommendations.slice(0, 3).map((rec, i) => (
        <div key={rec.standard_id || i}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mono-val">{rec.is_number}</span>
            <button
              onClick={() => navigateTo('standard-detail', { standardId: rec.standard_id })}
              className="btn-tech btn-ghost btn-xs"
              style={{ fontSize: 10 }}
            >
              Open
            </button>
          </div>
          {rec.evidence?.slice(0, 2).map((ev, j) => (
            <div key={j} style={{ padding: '8px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-xs)', marginBottom: 4, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
                Page {ev.page || '?'} · {ev.section || 'Clause'}
              </div>
              {ev.text?.slice(0, 150)}
            </div>
          ))}
          {rec.specifications?.slice(0, 2).map((spec, j) => (
            <div key={`spec-${j}`} style={{ padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {spec.property}: {spec.value} {spec.unit || ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
