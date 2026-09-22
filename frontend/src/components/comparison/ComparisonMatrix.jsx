import React from 'react';
import { GitCompare, FileText, AlertCircle, CheckCircle2, ChevronRight, Bookmark } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReview } from '../../context/ReviewContext';

export function ComparisonMatrix({ comparisonData }) {
  const { openSourcePage, openStandard } = useApp();
  const { pinEvidenceItem } = useReview();

  if (!comparisonData || !comparisonData.comparison) {
    return (
      <div className="clean-panel">
        <div className="clean-panel-body" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No active comparison dataset. Select a standard to evaluate against the tender.
        </div>
      </div>
    );
  }

  const rows = comparisonData.comparison || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'MATCH':
      case 'EXACT_MATCH':
        return <span className="status-pill status-current">Match</span>;
      case 'TENDER_NOT_SPECIFIED':
        return <span className="status-pill status-neutral">Tender Unspecified</span>;
      case 'POTENTIAL_MISMATCH':
      case 'REVIEW_REQUIRED':
      default:
        return <span className="status-pill status-review">Requires Review</span>;
    }
  };

  return (
    <div className="clean-panel">
      {/* Header */}
      <div className="clean-panel-header" style={{ padding: '14px 20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitCompare size={16} color="var(--navy-700)" />
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--navy-900)' }}>
              Tender vs Standard Compliance Evaluation
            </h3>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
            Evaluation Target: <span className="mono-val" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{comparisonData.is_number}</span>
          </div>
        </div>

        <button
          onClick={() => openStandard(comparisonData.standard_id, 'mindmap')}
          className="btn-tech btn-primary btn-sm"
        >
          Open Standard Knowledge Map <ChevronRight size={13} />
        </button>
      </div>

      <div style={{ padding: 0 }}>
        {/* Officer Directive Notice */}
        <div style={{
          padding: '9px 18px',
          backgroundColor: '#fffbeb',
          borderBottom: '1px solid #fde68a',
          fontSize: '12px',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <AlertCircle size={15} flexShrink={0} />
          <span>
            <strong>Officer Review Directive:</strong> Mismatches are potential flags requiring procurement officer review. The system provides traceable evidence; the officer makes the final decision.
          </span>
        </div>

        {/* Clean Comparison Table */}
        <div className="tech-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="tech-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Technical Parameter</th>
                <th style={{ width: '24%', backgroundColor: '#f8fafc' }}>Tender Specification</th>
                <th style={{ width: '24%', backgroundColor: '#f1f5f9' }}>Indian Standard Requirement</th>
                <th style={{ width: '18%' }}>Clause Provenance</th>
                <th style={{ textAlign: 'center', width: '12%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isNotSpecified = row.status === 'TENDER_NOT_SPECIFIED';

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                      {row.requirement}
                    </td>

                    {/* Tender Specification Value */}
                    <td style={{ 
                      backgroundColor: isNotSpecified ? '#fafafa' : '#ffffff',
                      fontFamily: isNotSpecified ? 'var(--font-sans)' : 'var(--font-mono)',
                      color: isNotSpecified ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontStyle: isNotSpecified ? 'italic' : 'normal',
                      fontWeight: isNotSpecified ? 400 : 600
                    }}>
                      {row.tender}
                    </td>

                    {/* Standard Requirement Value */}
                    <td className="mono-val" style={{ fontWeight: 700, color: 'var(--navy-900)', backgroundColor: '#f8fafc' }}>
                      {row.standard}
                    </td>

                    {/* Clause Provenance / Source */}
                    <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {row.evidence && row.evidence !== 'No evidence' ? (
                        <button
                          onClick={() => openSourcePage(comparisonData.standard_id, 6, row.standard, comparisonData.is_number, {
                            property: row.requirement,
                            value: row.standard
                          })}
                          className="btn-tech btn-ghost btn-xs"
                          style={{ padding: '2px 6px', color: 'var(--primary-700)', fontWeight: 600 }}
                        >
                          <FileText size={11} /> {row.evidence}
                        </button>
                      ) : (
                        <span>Verified in standard</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td style={{ textAlign: 'center' }}>
                      {getStatusBadge(row.status)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
