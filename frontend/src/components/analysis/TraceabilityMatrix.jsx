import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Eye } from 'lucide-react';

const STATUS_CONFIG = {
  supported: { label: 'Supported', className: 'trace-status supported', icon: CheckCircle2 },
  partially_supported: { label: 'Partial', className: 'trace-status partially_supported', icon: AlertTriangle },
  unverified: { label: 'Unverified', className: 'trace-status unverified', icon: Eye },
  conflict: { label: 'Conflict', className: 'trace-status conflict', icon: XCircle },
  not_found: { label: 'Not Found', className: 'trace-status not_found', icon: HelpCircle },
  review_required: { label: 'Review Required', className: 'trace-status review_required', icon: Eye },
};

export function TraceabilityMatrix({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Eye size={24} color="var(--text-muted)" /></div>
        <div className="empty-state-title">No Traceability Data</div>
        <div className="empty-state-desc">Run a procurement analysis to generate the tender-to-standard traceability matrix.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 4 }}>
        Tender → Standard Traceability Matrix
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        Every tender requirement traced to matching standard evidence.
      </p>

      <div className="tech-table-wrap">
        <table className="trace-matrix">
          <thead>
            <tr>
              <th>Tender Parameter</th>
              <th>Value</th>
              <th>Matched Standard</th>
              <th>Clause / Page</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.not_found;
              const Icon = cfg.icon;
              return (
                <tr key={row.trace_id || i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.tender_parameter}</td>
                  <td className="mono-val" style={{ fontSize: 12 }}>{row.tender_value || '—'}</td>
                  <td>
                    <span className="mono-val" style={{ fontWeight: 600, fontSize: 12 }}>
                      {row.matched_standard_id ? row.matched_standard_id.replace(/_/g, ' ') : '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {row.matched_clause || '—'}
                    {row.evidence_page && <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 4 }}>p.{row.evidence_page}</span>}
                  </td>
                  <td>
                    <span className={cfg.className}>
                      <Icon size={11} />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
