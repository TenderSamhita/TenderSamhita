import React from 'react';
import { CheckCircle2, Layers, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function WhyThisStandard({ standardId, isNumber, signals = [], why = [], evidence = [] }) {
  const { openSourcePage } = useApp();

  const primaryEvidence = evidence && evidence.length > 0 ? evidence[0] : null;

  return (
    <div style={{
      backgroundColor: 'var(--bg-canvas)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      padding: '12px 16px',
      marginTop: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary-800)' }}>
          Retrieval Evidence & Matching Signals
        </span>
        {primaryEvidence && (
          <button
            onClick={() => openSourcePage(standardId, primaryEvidence.page || 1, primaryEvidence.text, isNumber)}
            className="source-page-link"
            style={{ fontSize: '10px' }}
          >
            <FileText size={10} /> Page {primaryEvidence.page} ({primaryEvidence.section || 'Scope'})
          </button>
        )}
      </div>

      {/* Signal Badges per Section 20 */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {signals.map((sig, idx) => (
          <div 
            key={idx} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              fontSize: '11px', 
              fontWeight: 600,
              color: 'var(--primary-700)',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '2px 8px',
              borderRadius: '3px'
            }}
          >
            <CheckCircle2 size={12} color="#2563eb" />
            <span>{sig.label || sig}</span>
          </div>
        ))}
      </div>

      {/* Explanatory bullets */}
      {why.length > 0 && (
        <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {why.map((item, i) => (
            <li key={i} style={{ marginBottom: 2 }}>{item}</li>
          ))}
        </ul>
      )}

      {/* Verbatim Supporting Chunk */}
      {primaryEvidence && primaryEvidence.text && (
        <div style={{
          marginTop: 8,
          fontSize: '11px',
          color: 'var(--text-muted)',
          backgroundColor: '#ffffff',
          padding: '6px 10px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '3px',
          fontStyle: 'italic'
        }}>
          "{primaryEvidence.text.slice(0, 220)}..."
        </div>
      )}
    </div>
  );
}
