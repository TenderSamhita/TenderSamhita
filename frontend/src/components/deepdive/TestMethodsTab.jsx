import React from 'react';
import { FlaskConical, FileText, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function TestMethodsTab({ standard }) {
  const { openSourcePage } = useApp();

  const testSpecs = (standard?.specifications || []).filter(
    s => (s.category && s.category.toLowerCase().includes('test')) || 
         (s.property && s.property.toLowerCase().includes('test')) ||
         (s.condition && s.condition.toLowerCase().includes('test'))
  );

  return (
    <div className="tech-card">
      <div className="tech-card-header">
        <h3>
          <FlaskConical size={16} /> Test Methods, Apparatus & Verification Protocols
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Laboratory Standard Operating Procedures
        </span>
      </div>

      <div className="tech-card-body">
        <div style={{ marginBottom: 16, padding: '14px', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div className="param-label">Prescribed Testing Apparatus</div>
          <div style={{ fontSize: '13px', fontWeight: 600, marginTop: 4 }}>
            {standard.product_context?.apparatus || 'Calibrated testing apparatus conforming strictly to normative sections.'}
          </div>
        </div>

        <div className="table-container">
          <table className="tech-table">
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Standard Value / Criterion</th>
                <th>Prescribed Condition</th>
                <th>Section</th>
                <th style={{ textAlign: 'center' }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {testSpecs.length > 0 ? (
                testSpecs.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.property}</td>
                    <td className="cell-mono" style={{ fontWeight: 700, color: 'var(--primary-800)' }}>
                      {item.value} {item.unit || ''}
                    </td>
                    <td style={{ fontSize: '12px' }}>{item.condition || '—'}</td>
                    <td className="cell-mono" style={{ fontSize: '11px' }}>{item.section || 'Sec 10'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openSourcePage(standard.standard_id, item.page || 1, `${item.property}: ${item.value}`, standard.is_number)}
                        className="source-page-link"
                      >
                        <FileText size={11} /> p.{item.page || 1}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Refer to individual specifications for test conditions and acceptance criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
