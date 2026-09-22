import React from 'react';
import { Share2, GitBranch, ArrowRight, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function AlliedStandardsTab({ standard, alliedStandards = [] }) {
  const { openStandard } = useApp();

  return (
    <div className="tech-card">
      <div className="tech-card-header">
        <h3>
          <Share2 size={16} /> Allied & Connected Standards Tree
        </h3>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Direct Technical Dependencies & Relationships
        </span>
      </div>

      <div className="tech-card-body">
        {/* Clean Hierarchical Visual Representation per Section 13 */}
        <div style={{
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          marginBottom: '24px'
        }}>
          {/* Root Standard Node */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 18px',
            backgroundColor: 'var(--primary-900)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span>CURRENT STANDARD:</span>
            <span style={{ color: '#93c5fd' }}>{standard.is_number}</span>
          </div>

          {/* Connected Branches */}
          <div style={{
            margin: '16px 0 0 24px',
            borderLeft: '2px solid var(--primary-700)',
            paddingLeft: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {alliedStandards.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#ffffff',
                  padding: '10px 14px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Branch Connector Line */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '180px', flexShrink: 0 }}>
                  <GitBranch size={14} color="var(--primary-700)" />
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    color: 'var(--primary-700)',
                    letterSpacing: '0.03em'
                  }}>
                    {item.relationship || 'Related Standard'}
                  </span>
                </div>

                <ArrowRight size={14} color="var(--text-muted)" flexShrink={0} />

                {/* Target Standard Node */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                    {item.is_number}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    — {item.title}
                  </span>
                </div>

                {/* Navigation Button */}
                <button
                  onClick={() => openStandard(item.standard_id || item.is_number.replace(/[\s\(\):]/g, '_'), 'overview')}
                  className="btn-tech btn-primary btn-sm"
                  style={{ padding: '3px 10px', fontSize: '11px', flexShrink: 0 }}
                >
                  <ExternalLink size={11} /> Open Standard
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Relationship List Table */}
        <div className="table-container">
          <table className="tech-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Connected Indian Standard</th>
                <th>Relationship Category</th>
                <th>Scope of Allied Requirement</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {alliedStandards.map((item, idx) => (
                <tr key={idx}>
                  <td className="cell-mono" style={{ fontWeight: 700, color: 'var(--primary-800)' }}>
                    {item.is_number}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                    {item.relationship}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {item.title}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => openStandard(item.standard_id || item.is_number.replace(/[\s\(\):]/g, '_'), 'overview')}
                      className="btn-tech btn-secondary btn-sm"
                    >
                      Inspect Allied Spec
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
