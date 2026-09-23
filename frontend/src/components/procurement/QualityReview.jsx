import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export function QualityReview({ quality = {} }) {
  const { score = 0, issues = [], summary = {} } = quality;

  const getScoreColor = (s) => {
    if (s >= 80) return 'var(--green)';
    if (s >= 60) return 'var(--amber)';
    return '#ef4444';
  };

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 16 }}>
        Tender Quality Review
      </h3>

      {/* Score */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div className="quality-score-ring" style={{ borderColor: getScoreColor(score) }}>
          <div className="quality-score-value" style={{ color: getScoreColor(score) }}>{score}</div>
          <div className="quality-score-label">Quality</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ color: '#ef4444' }}>{summary.critical || 0} critical</span>
          <span style={{ color: 'var(--amber)' }}>{summary.warnings || 0} warnings</span>
          <span style={{ color: 'var(--primary-600)' }}>{summary.info || 0} info</span>
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {issues.map((issue, i) => {
            const isCritical = issue.severity === 'critical';
            const isWarning = issue.severity === 'warning';
            return (
              <div key={i} className={`intel-card ${isCritical ? 'critical' : isWarning ? 'warning' : 'info'}`}>
                <div className="intel-card-header">
                  <span className="intel-card-title">{issue.category.replace(/_/g, ' ')}</span>
                  <span className={`status-pill ${isCritical ? 'status-superseded' : isWarning ? 'status-review' : 'status-amended'}`}>
                    {issue.severity}
                  </span>
                </div>
                <div className="intel-card-body">{issue.description}</div>
                {issue.evidence && (
                  <div className="intel-card-evidence">{issue.evidence}</div>
                )}
                {issue.suggestion && (
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {issue.suggestion}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>
          No issues found.
        </div>
      )}
    </div>
  );
}
