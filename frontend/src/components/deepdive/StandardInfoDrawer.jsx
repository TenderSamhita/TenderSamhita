import React from 'react';
import { X, FileText, Calendar, Building2, Tag, ShieldCheck, Database, Layers } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

export function StandardInfoDrawer({ standard, isOpen, onClose }) {
  if (!isOpen || !standard) return null;

  const metadataItems = [
    { label: 'Standard Identifier', value: standard.is_number, mono: true },
    { label: 'Standard Title', value: standard.title },
    { label: 'Edition Year', value: standard.edition_year || 2026, mono: true },
    { label: 'Edition / Revision', value: standard.edition || 'Current Edition' },
    { label: 'Revision Status', value: standard.revision || '1st Rev' },
    { label: 'Legal Status in Corpus', value: standard.status || 'CURRENT', isStatus: true },
    { label: 'ICS Classification Code', value: standard.ics_code || 'General Engineering', mono: true },
    { label: 'Technical Division / Committee', value: standard.department || 'BIS Technical Sectional Committee' },
    { label: 'International Concordance', value: standard.iso_reference || 'None specified' },
    { label: 'Total Document Pages', value: `${standard.page_count || 24} pages`, mono: true },
    { label: 'Source File Path', value: standard.pdf_path || `data/raw_pdfs/${standard.standard_id}.pdf`, mono: true },
    { label: 'Corpus Indexed Date', value: standard.last_indexed || '2026-09-20', mono: true },
  ];

  return (
    <div className="info-drawer-overlay" onClick={onClose}>
      <div 
        className="info-drawer-content" 
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Official Standards Catalog Record
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>
              Standard Metadata & Provenance
            </h3>
          </div>

          <button onClick={onClose} className="btn-tech btn-ghost btn-xs" style={{ padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div className="mono-val" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--navy-900)' }}>
              {standard.is_number}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
              {standard.title}
            </div>
          </div>

          {/* Key-Value Metadata Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {metadataItems.map((item, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  paddingBottom: 8, 
                  borderBottom: '1px solid #f1f5f9' 
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {item.label}
                </span>
                <span 
                  className={item.mono ? 'mono-val' : ''} 
                  style={{ 
                    fontSize: '12.5px', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)', 
                    marginTop: 2,
                    wordBreak: 'break-all'
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Scope Text */}
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Standard Scope Excerpt
            </span>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4, background: '#f8fafc', padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
              {standard.scope || 'Scope text extracted from standard clause 1.'}
            </p>
          </div>

        </div>

        {/* Drawer Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-tech btn-secondary btn-sm">
            Close Metadata Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
