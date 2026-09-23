import React from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';

export function ConflictDetector({ conflicts = [] }) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><XCircle size={24} color="var(--green)" /></div>
        <div className="empty-state-title">No Conflicts Detected</div>
        <div className="empty-state-desc">No value mismatches found between tender requirements and matched standards.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 4 }}>
        Conflict Detection
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {conflicts.length} potential conflict{conflicts.length !== 1 ? 's' : ''} found.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {conflicts.map((conflict, i) => (
          <div key={i} className={`intel-card ${conflict.severity === 'high' ? 'critical' : 'warning'}`}>
            <div className="intel-card-header">
              <span className="intel-card-title">
                {conflict.type === 'value_mismatch' && 'Value Mismatch'}
                {conflict.type === 'unit_conflict' && 'Unit Conflict'}
                {conflict.type === 'material_conflict' && 'Material Conflict'}
                {conflict.type === 'version_conflict' && 'Version Conflict'}
              </span>
              <span className={`status-pill ${conflict.severity === 'high' ? 'status-superseded' : 'status-review'}`}>
                {conflict.severity === 'high' ? 'High' : 'Medium'}
              </span>
            </div>

            <div className="intel-card-body">
              <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tender</div>
                  <div className="mono-val" style={{ fontSize: 12 }}>{conflict.tender_value || conflict.tender_parameter}</div>
                </div>
                <div style={{ fontSize: 16, color: 'var(--text-subtle)' }}>→</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Standard</div>
                  <div className="mono-val" style={{ fontSize: 12 }}>{conflict.standard_value || '—'}</div>
                </div>
              </div>
              {conflict.standard_id && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Standard: <span className="mono-val">{conflict.standard_id.replace(/_/g, ' ')}</span>
                </div>
              )}
            </div>

            {conflict.evidence && (
              <div className="intel-card-evidence">{conflict.evidence}</div>
            )}

            {conflict.recommendation && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {conflict.recommendation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
