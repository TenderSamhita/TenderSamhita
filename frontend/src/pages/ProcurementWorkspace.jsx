import React, { useState } from 'react';
import { 
  FileText, ArrowRight, ChevronRight, RefreshCw, AlertTriangle, WifiOff
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { workspaceService } from '../services/workspaceService';
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

const LOADING_STAGES = [
  'Extracting tender requirements...',
  'Searching standards corpus...',
  'Ranking candidate standards...',
  'Assembling evidence...',
  'Running intelligence analysis...',
  'Building knowledge graph...',
];

export function ProcurementWorkspace() {
  const { tenderText, setTenderText, navigateTo } = useApp();
  const [inputText, setInputText] = useState(tenderText || '');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setTenderText(inputText);
    setLoadingStage(0);

    const stageInterval = setInterval(() => {
      setLoadingStage(prev => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 3000);

    try {
      const res = await workspaceService.fullAnalysis(inputText);
      if (res.status === 'error' && !res.recommendations?.length) {
        setError(res.errors?.[0]?.error || 'Analysis failed. Please try again.');
      } else {
        setResult(res);
        if (res.status === 'partial') {
          setError('Some analysis stages had issues. Results may be incomplete.');
        }
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      if (err.message?.includes('timed out')) {
        setError('Analysis took too long. The server may be processing a large corpus. Please try again.');
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Cannot reach the backend server. Please check that the API is running.');
      } else {
        setError(err.message || 'Analysis failed. Please try again.');
      }
    } finally {
      clearInterval(stageInterval);
      setLoading(false);
      setLoadingStage(0);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleAnalyze();
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'traceability', label: 'Traceability' },
    { id: 'gaps', label: 'Gaps', count: result?.gaps?.length },
    { id: 'conflicts', label: 'Conflicts', count: result?.conflicts?.length },
    { id: 'specification', label: 'Specification' },
    { id: 'quality', label: 'Quality' },
  ];

  // Auto-populate from AppContext when navigating from Home with tender text
  React.useEffect(() => {
    if (tenderText && !inputText) setInputText(tenderText);
  }, []); // run once on mount; tenderText already from context

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)' }}>
      {/* Top: Procurement Workspace Input — proper multi-line, not single-line cramped */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #D8D7D1', backgroundColor: '#FFFFFF', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <textarea
            rows={3}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste tender text, upload PDF, or describe requirement — e.g. Grade 304 stainless steel water storage tank 500 litre for drinking water"
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #D8D7D1',
              borderRadius: 6,
              fontSize: 13,
              lineHeight: 1.5,
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              outline: 'none',
              minHeight: 72,
              backgroundColor: '#F7F4EE',
              color: '#202522',
            }}
            onFocus={e => e.target.style.borderColor = '#245B4A'}
            onBlur={e => e.target.style.borderColor = '#D8D7D1'}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim()}
            className="btn-tech"
            style={{ padding: '10px 18px', fontWeight: 700, flexShrink: 0, backgroundColor: '#245B4A', color: '#FFFFFF', border: 'none', borderRadius: 6 }}
          >
            {loading ? 'Analyzing…' : 'Analyze Procurement'} <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#245B4A', border: '1px solid #B9C1BC', backgroundColor: '#E8F0EC', padding: '2px 8px', borderRadius: 10 }}>Upload Tender PDF — coming via text paste</span>
          <label style={{ fontSize: 11, color: '#66706A', display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" defaultChecked /> Latest edition</label>
          <label style={{ fontSize: 11, color: '#66706A', display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" defaultChecked /> Include allied standards</label>
          <label style={{ fontSize: 11, color: '#66706A', display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" defaultChecked /> Include normative references</label>
          <label style={{ fontSize: 11, color: '#66706A', display: 'flex', alignItems: 'center', gap: 4 }}><input type="checkbox" /> Strict evidence mode</label>
        </div>
        {!result && !loading && (
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

      {/* Loading State — shows progress, not infinite spinner */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #E6E4DF', borderTopColor: '#245B4A', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 14px' }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#202522', marginBottom: 6 }}>
              {LOADING_STAGES[loadingStage]}
            </p>
            <p style={{ fontSize: 11, color: '#66706A' }}>
              {loadingStage + 1} / {LOADING_STAGES.length} · This may take 15–30 seconds. If this persists beyond 90s, check backend logs.
            </p>
          </div>
        </div>
      )}

      {/* Error State — actionable, not blank */}
      {error && !loading && !result && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 440, padding: 24, border: '1px solid #E8D4A8', backgroundColor: '#F7EFD9', borderRadius: 8 }}>
            <AlertTriangle size={28} color="#A66A18" style={{ marginBottom: 10 }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#202522', marginBottom: 6 }}>Analysis Issue</h3>
            <p style={{ fontSize: 12, color: '#3A4440', marginBottom: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>{error}</p>
            <button onClick={handleRetry} className="btn-tech btn-primary btn-sm" style={{ padding: '8px 16px', backgroundColor: '#245B4A', color: '#FFFFFF', border: 'none', borderRadius: 6 }}>
              <RefreshCw size={13} /> Retry
            </button>
            <p style={{ fontSize: 11, color: '#66706A', marginTop: 10 }}>If this persists, check /api/health and backend logs.</p>
          </div>
        </div>
      )}
      {error && result && !loading && (
        <div style={{ padding: '8px 20px', backgroundColor: '#F7EFD9', borderBottom: '1px solid #E8D4A8', fontSize: 11, color: '#7A5210', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={13} /> {error}
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

          {/* Center: Analysis Tabs — clean, not congested */}
          <div className="workspace-center">
            <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid #D8D7D1', backgroundColor: '#F1EFE9', flexShrink: 0, overflowX: 'auto' }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn-tech btn-sm ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11.5,
                    borderRadius: 6,
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    backgroundColor: activeTab === tab.id ? '#245B4A' : 'transparent',
                    color: activeTab === tab.id ? '#FFFFFF' : '#66706A',
                    border: activeTab === tab.id ? 'none' : '1px solid transparent',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 10, fontFamily: 'var(--font-mono)', opacity: 0.85, backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#E6E4DF', padding: '1px 5px', borderRadius: 10 }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

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

          {/* Right: Evidence Panel — collapsible, not permanently eating screen */}
          <div className={`workspace-right ${rightPanelOpen ? '' : 'collapsed'}`}>
            <div className="pane-header" style={{ backgroundColor: '#F1EFE9' }}>
              <span className="pane-title">Evidence</span>
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="btn-tech btn-ghost btn-xs"
                style={{ color: '#245B4A', fontWeight: 600 }}
                title={rightPanelOpen ? 'Collapse panel' : 'Expand panel'}
              >
                {rightPanelOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {rightPanelOpen ? (
              <div className="pane-body">
                <EvidencePanel recommendations={result.recommendations} navigateTo={navigateTo} />
              </div>
            ) : (
              <div style={{ padding: 16, fontSize: 11, color: '#66706A', textAlign: 'center' }}>
                Select a node to inspect evidence and relationships.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementOutline({ requirements }) {
  if (!requirements) return <div style={{ fontSize: 12, color: '#66706A' }}>Not established from available evidence.</div>;
  const groups = [
    { key: 'product', label: 'Product' },
    { key: 'material', label: 'Material' },
    { key: 'application', label: 'Application' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'dimensions', label: 'Dimensions' },
    { key: 'testing', label: 'Testing' },
    { key: 'safety', label: 'Safety' },
    { key: 'environment', label: 'Environment' },
    { key: 'installation', label: 'Installation' },
    { key: 'documentation', label: 'Documentation' },
    { key: 'compliance', label: 'Compliance' },
  ];

  const items = groups.map(g => {
    const val = requirements[g.key];
    if (!val || (Array.isArray(val) && val.length === 0)) return null;
    const displayVal = Array.isArray(val)
      ? val.slice(0, 3).map(v => typeof v === 'object' ? (v.value || v.parameter || JSON.stringify(v)) : String(v)).join(', ')
      : String(val);
    return (
      <div key={g.key} className="req-item">
        <div className="req-item-dot specified" />
        <div>
          <div className="req-item-label">{g.label}</div>
          <div className="req-item-value">{displayVal || 'Not specified'}</div>
        </div>
      </div>
    );
  }).filter(Boolean);

  if (items.length === 0 && (!requirements.is_references || requirements.is_references.length === 0)) {
    return <div style={{ fontSize: 12, color: '#66706A' }}>Tender text did not specify structured requirements. Try more detailed spec (capacity, dimensions, material, testing).</div>;
  }

  return (
    <div>
      {items}
      {requirements.is_references && requirements.is_references.length > 0 && (
        <div className="req-item">
          <div className="req-item-dot specified" />
          <div>
            <div className="req-item-label">Referenced Standards</div>
            <div className="req-item-value">
              {requirements.is_references.slice(0, 5).map(r => r.value || r.target || r).join(', ')}
            </div>
          </div>
        </div>
      )}
      {requirements.keywords && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#66706A', borderTop: '1px solid #E6E4DF', paddingTop: 8 }}>
          <strong>Keywords:</strong> {Array.isArray(requirements.keywords) ? requirements.keywords.slice(0,6).join(', ') : String(requirements.keywords).slice(0,120)}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ result, navigateTo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <div className="clean-panel" style={{ padding: 14, borderLeft: '3px solid #245B4A' }}>
          <div style={{ fontSize: 10, color: '#66706A', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Standards Found</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#245B4A' }}>
            {result.recommendations?.length || 0}
          </div>
        </div>
        <div className="clean-panel" style={{ padding: 14, borderLeft: `3px solid ${result.gaps?.length > 0 ? '#C88A2A' : '#2F6B4F'}` }}>
          <div style={{ fontSize: 10, color: '#66706A', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Gaps Detected</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: result.gaps?.length > 0 ? '#A66A18' : '#2F6B4F' }}>
            {result.gaps?.length || 0}
          </div>
        </div>
        <div className="clean-panel" style={{ padding: 14, borderLeft: `3px solid ${result.conflicts?.length > 0 ? '#B64235' : '#2F6B4F'}` }}>
          <div style={{ fontSize: 10, color: '#66706A', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Conflicts</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: result.conflicts?.length > 0 ? '#B64235' : '#2F6B4F' }}>
            {result.conflicts?.length || 0}
          </div>
        </div>
        <div className="clean-panel" style={{ padding: 14, borderLeft: '3px solid #B85C38' }}>
          <div style={{ fontSize: 10, color: '#66706A', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Quality Score</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#245B4A' }}>
            {result.quality?.score ?? '—'}
          </div>
          {result.quality?.level && <div style={{ fontSize: 10, color: '#66706A' }}>{result.quality.level}</div>}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#202522', marginBottom: 10 }}>Recommended Standards — Why These Standards</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result.recommendations?.map((rec, i) => (
            <div key={rec.standard_id || i} className="clean-panel" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="mono-val" style={{ fontWeight: 700, fontSize: 13, color: '#245B4A' }}>{rec.is_number || rec.standard_id}</span>
                    {rec.score !== undefined && <span style={{ fontSize: 11, backgroundColor: '#E8F0EC', color: '#245B4A', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>score {Number(rec.score).toFixed(3)}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#202522', marginTop: 4, fontWeight: 600 }}>{rec.title || 'Not established from available evidence.'}</div>
                  {rec.why && rec.why.length > 0 && <div style={{ fontSize: 11, color: '#66706A', marginTop: 6 }}>{rec.why.slice(0,2).join(' · ')}</div>}
                  {rec.evidence && rec.evidence.length > 0 && (
                    <div style={{ marginTop: 8, padding: '8px 10px', backgroundColor: '#F1EFE9', borderRadius: 6, border: '1px solid #E6E4DF', fontSize: 11, color: '#3A4440', lineHeight: 1.5 }}>
                      <strong>Evidence:</strong> {rec.evidence[0].text?.slice(0, 180) || 'Not established from available evidence.'}
                      {rec.evidence[0].page && <span style={{ color: '#66706A' }}> — Page {rec.evidence[0].page} · {rec.evidence[0].section || 'Clause'}</span>}
                    </div>
                  )}
                  {rec.references && rec.references.length > 0 && (
                    <div style={{ fontSize: 11, color: '#66706A', marginTop: 6 }}>
                      Normative refs: {rec.references.slice(0,3).map(r=>r.target||r.target_identifier||r).join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigateTo('standard-detail', { standardId: rec.standard_id })}
                  className="btn-tech btn-primary btn-xs"
                  style={{ flexShrink: 0, backgroundColor: '#245B4A', color: '#FFFFFF', border: 'none', borderRadius: 6 }}
                >
                  View <ChevronRight size={12} />
                </button>
              </div>
            </div>
          ))}
          {(!result.recommendations || result.recommendations.length === 0) && (
            <div style={{ fontSize: 12, color: '#66706A', padding: 16, textAlign: 'center', border: '1px dashed #D8D7D1', borderRadius: 8 }}>
              No sufficiently supported standards found for this tender. Try broader terms or check corpus coverage at /api/stats.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvidencePanel({ recommendations, navigateTo }) {
  if (!recommendations || recommendations.length === 0) {
    return <div style={{ fontSize: 12, color: '#66706A', textAlign: 'center', padding: 24 }}>No evidence available. Run analysis to see grounded evidence.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {recommendations.slice(0, 4).map((rec, i) => (
        <div key={rec.standard_id || i} style={{ borderBottom: '1px solid #E6E4DF', paddingBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#245B4A', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="mono-val">{rec.is_number || rec.standard_id}</span>
            <button
              onClick={() => navigateTo('standard-detail', { standardId: rec.standard_id })}
              className="btn-tech btn-ghost btn-xs"
              style={{ fontSize: 10, color: '#245B4A' }}
            >
              Open
            </button>
          </div>
          {rec.evidence && rec.evidence.length > 0 ? rec.evidence.slice(0, 2).map((ev, j) => (
            <div key={j} style={{ padding: '8px 10px', backgroundColor: '#F1EFE9', borderRadius: 6, marginBottom: 4, fontSize: 11, color: '#3A4440', lineHeight: 1.5, border: '1px solid #E6E4DF' }}>
              <div style={{ fontSize: 10, color: '#66706A', marginBottom: 2 }}>
                Page {ev.page || '?'} · {ev.section || 'Clause'} · {ev.chunk_id ? `Chunk ${ev.chunk_id.slice(-8)}` : ''}
              </div>
              {ev.text?.slice(0, 180) || 'Not established from available evidence.'}
            </div>
          )) : <div style={{ fontSize: 11, color: '#66706A', fontStyle: 'italic' }}>Insufficient evidence in the available standards corpus.</div>}
          {rec.specifications?.slice(0, 2).map((spec, j) => (
            <div key={`spec-${j}`} style={{ padding: '6px 10px', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#202522', backgroundColor: '#F7EFD9', borderRadius: 4, marginTop: 4 }}>
              {spec.property}: {spec.value} {spec.unit || ''} <span style={{ color: '#66706A' }}>· p.{spec.page || '—'}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
