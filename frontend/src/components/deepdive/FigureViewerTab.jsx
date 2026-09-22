import React, { useState } from 'react';
import { Image as ImageIcon, ShieldCheck, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { FigureCard } from './FigureCard';
import { EmptyState } from '../common/EmptyState';

export function FigureViewerTab({ standard, figuresData = { confirmed: [], candidates: [] } }) {
  const [showCandidates, setShowCandidates] = useState(false);

  const confirmed = figuresData.confirmed || [];
  const candidates = figuresData.candidates || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Policy Notice Bar */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderLeft: '4px solid var(--primary-700)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="var(--primary-700)" />
          <span>
            <strong>Confirmed Technical Figures Only:</strong> Decorative marks, institutional emblems, watermarks, and header/footer graphics are filtered out.
          </span>
        </div>

        {/* Toggle for Unverified Candidates */}
        {candidates.length > 0 && (
          <button
            onClick={() => setShowCandidates(!showCandidates)}
            className="btn-tech btn-secondary btn-sm"
          >
            {showCandidates ? <EyeOff size={13} /> : <Eye size={13} />}
            {showCandidates ? 'Hide Candidates' : `Inspect Candidates (${candidates.length})`}
          </button>
        )}
      </div>

      {/* Confirmed Technical Figures Grid */}
      {confirmed.length > 0 ? (
        <div className="grid-2">
          {confirmed.map(fig => (
            <FigureCard key={fig.figure_id} figure={fig} standard={standard} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ImageIcon}
          title="No confirmed technical figures found"
          message="No figures were confirmed for this standard. Peripheral non-technical graphics have been filtered out."
        />
      )}

      {/* Internal Admin / Review Section for Candidates per Section 10 */}
      {showCandidates && candidates.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 20, borderTop: '2px dashed var(--border-medium)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ShieldAlert size={16} color="#d97706" />
            <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: '#92400e' }}>
              Unverified Figure Candidates (Internal Technical Review Only)
            </h4>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 16 }}>
            These image objects were extracted by the PDF parser but have not achieved the confidence threshold required for automatic inclusion as verified apparatus figures.
          </p>
          <div className="grid-2">
            {candidates.map(fig => (
              <FigureCard key={fig.figure_id} figure={fig} standard={standard} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
