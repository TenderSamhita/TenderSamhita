import React from 'react';
import { Compass, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ScopeTab({ standard }) {
  const { openSourcePage } = useApp();

  if (!standard) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Scope Section Card */}
      <div className="tech-card">
        <div className="tech-card-header">
          <h3>
            <Compass size={16} /> WHAT THIS STANDARD COVERS
          </h3>
          <button
            onClick={() => openSourcePage(standard.standard_id, 1, standard.scope, standard.is_number)}
            className="source-page-link"
          >
            <ExternalLink size={12} /> Source Page: p. 1 (Section 1)
          </button>
        </div>
        <div className="tech-card-body">
          <div style={{
            fontSize: '14px',
            lineHeight: '1.7',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-canvas)',
            padding: '20px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'serif'
          }}>
            {standard.scope || 'No explicit raw scope text extracted from indexed standard document.'}
          </div>
          <div style={{ marginTop: 10, fontSize: '11px', color: 'var(--text-muted)' }}>
            * Note: Displayed verbatim from Section 1 of the official Indian Standard publication.
          </div>
        </div>
      </div>

      {/* Application / Product Context */}
      <div className="tech-card">
        <div className="tech-card-header">
          <h3>
            <CheckCircle2 size={16} /> APPLICATION / PRODUCT CONTEXT
          </h3>
        </div>
        <div className="tech-card-body">
          {standard.product_context ? (
            <div className="grid-2">
              <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div className="param-label">Commodity / Material Classification</div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: 4 }}>
                  {standard.product_context.category || 'Not specified'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div className="param-label">Industrial & Procurement Application</div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: 4 }}>
                  {standard.product_context.application || 'Not specified'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div className="param-label">Test Apparatus / Laboratory Set-Up</div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: 4 }}>
                  {standard.product_context.apparatus || 'Not specified'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div className="param-label">Specified Grades / Sub-qualities</div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: 4 }}>
                  {standard.product_context.material || 'Not specified'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Structured product context not explicitly provided in database index. Refer to raw scope above.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
