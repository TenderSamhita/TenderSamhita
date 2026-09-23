import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

const STATUS_CONFIG = {
  supported: { label: 'Supported', className: 'spec-status supported' },
  unsupported: { label: 'Unsupported', className: 'spec-status unsupported' },
  requires_input: { label: 'Requires Input', className: 'spec-status requires_input' },
};

export function SpecificationBuilder({ specification = [] }) {
  if (!specification || specification.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><FileText size={24} color="var(--text-muted)" /></div>
        <div className="empty-state-title">No Specification Generated</div>
        <div className="empty-state-desc">Run a procurement analysis to build an evidence-grounded technical specification.</div>
      </div>
    );
  }

  const supported = specification.filter(s => s.status === 'supported');
  const requiresInput = specification.filter(s => s.status === 'requires_input');

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 4 }}>
        Evidence-Grounded Technical Specification
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {supported.length} of {specification.length} parameters backed by standard evidence.
        {requiresInput.length > 0 && ` ${requiresInput.length} require officer input.`}
      </p>

      <div className="tech-table-wrap">
        <table className="spec-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Parameter</th>
              <th>Requirement</th>
              <th>Standard</th>
              <th>Evidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {specification.map((item, i) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.requires_input;
              return (
                <tr key={item.item_id || i}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.parameter}</td>
                  <td className="mono-val" style={{ fontSize: 12 }}>{item.requirement}</td>
                  <td>
                    {item.applicable_standard_id ? (
                      <span className="mono-val" style={{ fontSize: 11, fontWeight: 600 }}>
                        {item.applicable_standard_id.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {item.evidence_text ? (
                      <span>
                        {item.evidence_text.slice(0, 60)}
                        {item.evidence_page && <span style={{ fontFamily: 'var(--font-mono)' }}> p.{item.evidence_page}</span>}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={cfg.className}>{cfg.label}</span>
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
