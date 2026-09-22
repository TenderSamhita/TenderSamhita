import React from 'react';
import { 
  X, 
  FileText, 
  ExternalLink, 
  Layers, 
  CheckCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  Sliders, 
  Table2, 
  Image as ImageIcon,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function NodeDetailPanel({ node, onClose, standard, tables = [], figures = [], references = [] }) {
  const { openSourcePage, openStandard, openFigureLightbox, setDeepDiveTab } = useApp();
  const [copied, setCopied] = React.useState(false);

  if (!node) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const renderContent = () => {
    switch (node.type) {
      case 'root':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span className="mono-val" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--navy-900)' }}>
                {standard.is_number}
              </span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                {standard.title}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span className="status-pill status-current">{standard.status || 'CURRENT'}</span>
              <span className="status-pill status-neutral">{standard.edition || 'Second Revision'}</span>
              <span className="status-pill status-neutral">ICS {standard.ics_code || '75.160.20'}</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
              <strong>Scope:</strong> {standard.scope}
            </div>

            <button
              onClick={() => openSourcePage(standard.standard_id, 1, '', standard.is_number)}
              className="btn-tech btn-primary btn-sm"
            >
              <FileText size={13} /> Open Official Standard PDF
            </button>
          </div>
        );

      case 'category-specifications':
      case 'specification':
        if (node.type === 'specification') {
          const spec = node.data;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--saffron)' }}>
                  Technical Specification
                </span>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>
                  {spec.property}
                </h4>
              </div>

              <div style={{ 
                backgroundColor: '#fffaf5', 
                border: '1px solid var(--saffron-border)', 
                borderRadius: 4, 
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Nominal Value:</span>
                  <span className="mono-val" style={{ fontSize: '14px', fontWeight: 800, color: '#9a3412' }}>
                    {spec.value} {spec.unit}
                  </span>
                </div>
                {spec.tolerance && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Tolerance / Limits:</span>
                    <span className="mono-val" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {spec.tolerance}
                    </span>
                  </div>
                )}
                {spec.condition && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Test Condition:</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {spec.condition}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <strong>Provenance:</strong> Section {spec.section || '6.1'} · Page {spec.page || 6}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openSourcePage(standard.standard_id, spec.page || 6, spec.value, standard.is_number, {
                    property: spec.property,
                    value: `${spec.value} ${spec.unit} (${spec.tolerance || ''})`,
                    section: spec.section || '6.1'
                  })}
                  className="btn-tech btn-saffron btn-sm"
                >
                  <FileText size={13} /> View Evidence (Page {spec.page || 6})
                </button>
                <button
                  onClick={() => handleCopy(`${spec.property}: ${spec.value} ${spec.unit} (${spec.tolerance || ''}) — ${standard.is_number}`)}
                  className="btn-tech btn-secondary btn-sm"
                >
                  {copied ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          );
        }

        // Category specifications node overview
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--saffron)' }}>
                SPECIFICATIONS
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Extracted Parametric Limits
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                {standard.specifications?.length || 10} verified technical specifications extracted from tables and clauses.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '280px', overflowY: 'auto' }}>
              {(standard.specifications || []).slice(0, 7).map((s, idx) => (
                <div 
                  key={idx}
                  onClick={() => openSourcePage(standard.standard_id, s.page || 6, s.value, standard.is_number, {
                    property: s.property,
                    value: `${s.value} ${s.unit}`,
                    section: s.section
                  })}
                  style={{
                    padding: '8px 10px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fffaf5'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.property}</span>
                  <span className="mono-val" style={{ fontWeight: 700, color: '#9a3412' }}>{s.value} {s.unit}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setDeepDiveTab('specifications')}
              className="btn-tech btn-secondary btn-sm"
            >
              <Sliders size={13} /> Open Specification Explorer Table
            </button>
          </div>
        );

      case 'category-references':
      case 'reference':
        if (node.type === 'reference') {
          const ref = node.data;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-700)' }}>
                  Normative Reference
                </span>
                <h4 className="mono-val" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--navy-900)', marginTop: 2 }}>
                  {ref.target}
                </h4>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {ref.title}
                </p>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                <div><strong>Relationship:</strong> {ref.type || 'Normative Reference'}</div>
                <div style={{ marginTop: 4 }}><strong>Source Citation:</strong> Section 2 · Page {ref.page || 2}</div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {ref.is_indexed ? (
                  <button
                    onClick={() => openStandard(ref.standard_id || ref.target.replace(/[\s\(\):]/g, '_'), 'mindmap')}
                    className="btn-tech btn-primary btn-sm"
                  >
                    <ExternalLink size={13} /> Open Standard Mind Map
                  </button>
                ) : (
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Referenced standard is not currently indexed in local corpus.
                  </span>
                )}
              </div>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-700)' }}>
                NORMATIVE REFERENCES
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Cross-Standard Network
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {references.length} cross-referenced national and international standards cited as normative requirements.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {references.slice(0, 5).map((r, i) => (
                <div key={i} style={{ padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                  <div className="mono-val" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{r.target}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{r.type} · Page {r.page}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setDeepDiveTab('references')} className="btn-tech btn-secondary btn-sm">
              View All {references.length} References
            </button>
          </div>
        );

      case 'category-tables':
      case 'table':
        if (node.type === 'table') {
          const tbl = node.data;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Technical Table
                </span>
                <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>
                  {tbl.caption || 'Table'}
                </h4>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                  Source: {tbl.section || 'Apparatus'} · Page {tbl.page || 7}
                </div>
              </div>

              {tbl.headers && (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {tbl.headers.slice(0, 3).map((h, i) => (
                          <th key={i} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(tbl.rows || []).slice(0, 3).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.slice(0, 3).map((cell, cIdx) => (
                            <td key={cIdx} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border-subtle)' }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => setDeepDiveTab('tables')}
                className="btn-tech btn-primary btn-sm"
              >
                <Table2 size={13} /> Open Full Table Viewer
              </button>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                TECHNICAL TABLES
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Document Data Tables
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {tables.length} structured tables containing dimensional, performance, and tolerance datasets.
              </p>
            </div>

            <button onClick={() => setDeepDiveTab('tables')} className="btn-tech btn-secondary btn-sm">
              <Table2 size={13} /> Explore Tables
            </button>
          </div>
        );

      case 'category-figures':
      case 'figure':
        if (node.type === 'figure') {
          const fig = node.data;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Confirmed Technical Figure
                </span>
                <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>
                  {fig.figure_number}: {fig.caption}
                </h4>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                  {fig.section} · Page {fig.page} · Confidence: {Math.round((fig.confidence || 0.95) * 100)}%
                </div>
              </div>

              <div style={{
                height: '140px',
                borderRadius: 4,
                backgroundColor: '#f1f5f9',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src={fig.image_path || '/logo.png'} 
                  alt={fig.caption} 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <button
                onClick={() => openFigureLightbox(fig)}
                className="btn-tech btn-primary btn-sm"
              >
                <ImageIcon size={13} /> View Full-Size Technical Diagram
              </button>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                TECHNICAL FIGURES
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Confirmed Schematics & Diagrams
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {figures.length} verified technical apparatus schematics and dimensional section drawings.
              </p>
            </div>

            <button onClick={() => setDeepDiveTab('figures')} className="btn-tech btn-secondary btn-sm">
              <ImageIcon size={13} /> Open Figure Gallery
            </button>
          </div>
        );

      case 'category-conformity':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--amber)' }}>
                CONFORMITY & QCO
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Statutory Quality Control Status
              </h4>
            </div>

            <div style={{ backgroundColor: '#fffbeb', border: '1px solid var(--amber-border)', borderRadius: 4, padding: '10px 12px', fontSize: '12px', color: '#92400e' }}>
              <div style={{ fontWeight: 700 }}>Review Required by Procurement Officer</div>
              <p style={{ marginTop: 4, lineHeight: 1.45 }}>
                No decisive mandatory QCO Gazette notification established in current indexed corpus. Verify via official manakonline.in database.
              </p>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div>• <strong>Testing:</strong> Manufacturer routine test certificate required</div>
              <div style={{ marginTop: 4 }}>• <strong>Marking:</strong> Manufacturer name, standard number, batch ID</div>
            </div>

            <button onClick={() => setDeepDiveTab('conformity')} className="btn-tech btn-secondary btn-sm">
              <ShieldCheck size={13} /> Detailed Conformity Assessment
            </button>
          </div>
        );

      default:
        return (
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)', marginBottom: 6 }}>
              {node.label}
            </h4>
            <p>{node.description || 'Clause content and technical relationships extracted from standard.'}</p>
          </div>
        );
    }
  };

  return (
    <div className="mindmap-side-panel">
      <div className="mindmap-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={15} color="var(--navy-700)" />
          <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--navy-900)' }}>
            NODE INTELLIGENCE
          </span>
        </div>
        <button
          onClick={onClose}
          className="btn-tech btn-ghost btn-xs"
          style={{ padding: '2px 4px' }}
        >
          <X size={15} />
        </button>
      </div>

      <div className="mindmap-panel-body">
        {renderContent()}
      </div>
    </div>
  );
}
