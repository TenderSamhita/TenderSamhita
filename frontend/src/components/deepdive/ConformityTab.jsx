import React from 'react';
import { ShieldCheck, AlertCircle, FileText, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export function ConformityTab({ standard, conformity }) {
  if (!conformity) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No conformity or QCO records established from indexed sources.
      </div>
    );
  }

  const isQcoApplicable = conformity.qco_applicable === 'APPLICABLE';
  const isNotFound = conformity.qco_applicable === 'NOT FOUND' || !conformity.qco_applicable;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* QCO Status Banner */}
      <div className="tech-card" style={{ 
        borderLeft: isQcoApplicable ? '4px solid #16a34a' : '4px solid #d97706',
        backgroundColor: isQcoApplicable ? '#f0fdf4' : '#fffbeb'
      }}>
        <div className="tech-card-body" style={{ padding: '18px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isQcoApplicable ? (
                <ShieldCheck size={28} color="#15803d" />
              ) : (
                <AlertCircle size={28} color="#b45309" />
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="param-label" style={{ color: isQcoApplicable ? '#166534' : '#92400e', marginBottom: 0 }}>
                    QUALITY CONTROL ORDER (QCO) REGULATORY STATUS:
                  </span>
                  <StatusBadge status={conformity.qco_applicable} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: isQcoApplicable ? '#14532d' : '#78350f', marginTop: 4 }}>
                  {conformity.qco_status_label || 'Status established from official indexed gazette sources'}
                </div>
              </div>
            </div>

            {conformity.qco_reference && (
              <div style={{ textAlign: 'right' }}>
                <div className="param-label" style={{ color: 'var(--text-muted)' }}>Gazette Notification Reference</div>
                <div className="cell-mono" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {conformity.qco_reference}
                </div>
              </div>
            )}
          </div>

          <div style={{ 
            marginTop: 12, 
            paddingTop: 10, 
            borderTop: '1px solid rgba(0,0,0,0.08)', 
            fontSize: '12px', 
            color: isQcoApplicable ? '#166534' : '#92400e' 
          }}>
            <strong>Important Procurement Officer Guidance:</strong> In terms of the BIS Act, 2016, where an Indian Standard is brought under mandatory Quality Control Order by the Central Government, no product may be procured, supplied, or used without a valid BIS Certification Licence / Standard ISI Mark.
          </div>
        </div>
      </div>

      {/* Structured Conformity Evidence Matrix */}
      <div className="tech-card">
        <div className="tech-card-header">
          <h3>
            <ShieldCheck size={16} /> Conformity Assessment & Certification Parameters
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Statutory Verification Framework
          </span>
        </div>

        <div className="tech-card-body" style={{ padding: 0 }}>
          <table className="tech-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Regulatory / Conformity Parameter</th>
                <th style={{ width: '45%' }}>Indexed Evidence / Specification</th>
                <th>Enforcement Condition</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>BIS Licence Requirement</td>
                <td style={{ fontWeight: 600, color: 'var(--primary-800)' }}>
                  {conformity.bis_licence_required || 'Not established from indexed sources'}
                </td>
                <td className="cell-mono" style={{ fontSize: '12px' }}>
                  {conformity.certification_scheme || 'Scheme I'}
                </td>
              </tr>

              <tr>
                <td style={{ fontWeight: 600 }}>Standard ISI Mark Required</td>
                <td>{conformity.standard_mark_required || 'Verification pending with technical bid'}</td>
                <td className="cell-mono" style={{ fontSize: '12px' }}>Mandatory if QCO is active</td>
              </tr>

              <tr>
                <td style={{ fontWeight: 600 }}>Certificate of Conformity (CoC) / Batch CoA</td>
                <td>{conformity.coc_required || 'Manufacturer test certificate with NABL traceability'}</td>
                <td className="cell-mono" style={{ fontSize: '12px' }}>Per delivery consignment</td>
              </tr>

              <tr>
                <td style={{ fontWeight: 600 }}>Marking & Labeling Requirements</td>
                <td>{conformity.marking_requirements || 'Manufacturer name, Standard number, Grade, Cast/Batch number'}</td>
                <td className="cell-mono" style={{ fontSize: '12px' }}>Product stamping / stencil</td>
              </tr>

              <tr>
                <td style={{ fontWeight: 600 }}>Statutory Inspection Requirements</td>
                <td>{conformity.inspection_requirements || 'Factory production control plus surveillance audits'}</td>
                <td className="cell-mono" style={{ fontSize: '12px' }}>Prior to warehouse dispatch</td>
              </tr>

              <tr>
                <td style={{ fontWeight: 600 }}>Sampling Protocol & Batching</td>
                <td>{conformity.sampling_requirements || 'Random sampling per standard normative clauses'}</td>
                <td className="cell-mono" style={{ fontSize: '12px' }}>Lot inspection plan</td>
              </tr>

              <tr>
                <td style={{ fontWeight: 600 }}>Routine Testing Requirements</td>
                <td>{conformity.testing_requirements || 'Routine chemical, mechanical, and qualification tests'}</td>
                <td className="cell-mono" style={{ fontSize: '12px' }}>NABL accredited lab</td>
              </tr>

              <tr>
                <td style={{ fontWeight: 600 }}>Effective Regulatory Date</td>
                <td className="cell-mono">{conformity.effective_date || 'Not established'}</td>
                <td className="cell-mono" style={{ fontSize: '12px' }}>Gazette enforcement date</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
