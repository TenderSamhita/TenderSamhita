import React from 'react';
import { History, CheckCircle, AlertTriangle, ArrowDown } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export function VersionTimelineTab({ standard, versionHistory }) {
  if (!versionHistory || !versionHistory.timeline || versionHistory.timeline.length === 0) {
    return (
      <div className="tech-card">
        <div className="tech-card-body" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Version history not available in indexed corpus.
        </div>
      </div>
    );
  }

  const timeline = versionHistory.timeline;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Current Version Overview */}
      <div className="tech-card">
        <div className="tech-card-header">
          <h3>
            <History size={16} /> CURRENT VERSION & REVIEW STATUS
          </h3>
          <StatusBadge status={standard.status || 'CURRENT'} />
        </div>
        <div className="tech-card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              padding: '12px 20px',
              backgroundColor: 'var(--status-current-bg)',
              border: '1px solid var(--status-current-border)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div className="param-label" style={{ color: 'var(--status-current-text)' }}>Active Governing Standard</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 800, color: 'var(--status-current-text)' }}>
                {standard.is_number}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                {versionHistory.edition_info || standard.edition || 'Current Active Revision'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
                This is the authoritative active text recognized by the Bureau of Indian Standards for technical procurement.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revision History Timeline per Section 15 */}
      <div className="tech-card">
        <div className="tech-card-header">
          <h3>
            <History size={16} /> Standard Evolution & Amendment Timeline
          </h3>
        </div>
        <div className="tech-card-body">
          <div style={{
            position: 'relative',
            paddingLeft: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Continuous Vertical Timeline Line */}
            <div style={{
              position: 'absolute',
              left: '11px',
              top: '8px',
              bottom: '8px',
              width: '2px',
              backgroundColor: 'var(--border-medium)'
            }} />

            {timeline.map((item, idx) => {
              const isCurrent = item.status === 'CURRENT';

              return (
                <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Dot Node */}
                  <div style={{
                    position: 'absolute',
                    left: '-32px',
                    top: '4px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? 'var(--primary-700)' : '#ffffff',
                    border: isCurrent ? '2px solid #ffffff' : '2px solid var(--border-strong)',
                    boxShadow: '0 0 0 2px var(--border-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isCurrent ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    zIndex: 2
                  }}>
                    {idx + 1}
                  </div>

                  {/* Card Content */}
                  <div style={{
                    flex: 1,
                    backgroundColor: isCurrent ? '#f8fafc' : '#ffffff',
                    border: isCurrent ? '1px solid var(--primary-700)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px 18px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="cell-mono" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--primary-800)' }}>
                          {item.year}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.label}
                        </span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    {item.note && (
                      <div style={{ marginTop: 6, fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
