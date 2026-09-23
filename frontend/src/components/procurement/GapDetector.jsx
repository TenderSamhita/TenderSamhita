import React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { className: 'intel-card critical', icon: AlertCircle, label: 'Critical' },
  important: { className: 'intel-card warning', icon: AlertTriangle, label: 'Important' },
  info: { className: 'intel-card info', icon: Info, label: 'Info' },
};

export function GapDetector({ gaps = [] }) {
  if (!gaps || gaps.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><AlertTriangle size={24} color="var(--green)" /></div>
        <div className="empty-state-title">No Gaps Detected</div>
        <div className="empty-state-desc">All critical procurement parameters appear to be specified.</div>
      </div>
    );
  }

  const critical = gaps.filter(g => g.severity === 'critical');
  const important = gaps.filter(g => g.severity === 'important');
  const info = gaps.filter(g => g.severity === 'info');

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 4 }}>
        Specification Gap Analysis
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {gaps.length} potential gap{gaps.length !== 1 ? 's' : ''} detected in tender specification.
      </p>

      {critical.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Critical ({critical.length})
          </div>
          {critical.map((gap, i) => (
            <GapCard key={i} gap={gap} />
          ))}
        </div>
      )}

      {important.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Important ({important.length})
          </div>
          {important.map((gap, i) => (
            <GapCard key={i} gap={gap} />
          ))}
        </div>
      )}

      {info.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Informational ({info.length})
          </div>
          {info.map((gap, i) => (
            <GapCard key={i} gap={gap} />
          ))}
        </div>
      )}
    </div>
  );
}

function GapCard({ gap }) {
  const cfg = SEVERITY_CONFIG[gap.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className={cfg.className}>
      <div className="intel-card-header">
        <span className="intel-card-title">{gap.parameter}</span>
        <span className={`status-pill status-${gap.severity === 'critical' ? 'superseded' : gap.severity === 'important' ? 'review' : 'amended'}`}>
          {cfg.label}
        </span>
      </div>
      <div className="intel-card-body">{gap.description}</div>
      {gap.evidence && (
        <div className="intel-card-evidence">{gap.evidence}</div>
      )}
      {gap.suggestion && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Suggestion: {gap.suggestion}
        </div>
      )}
    </div>
  );
}
