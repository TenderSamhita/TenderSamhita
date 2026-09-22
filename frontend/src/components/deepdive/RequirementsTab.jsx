import React, { useState } from 'react';
import { ListChecks, Search, FileText, BookmarkPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReview } from '../../context/ReviewContext';

export function RequirementsTab({ standard }) {
  const { openSourcePage } = useApp();
  const { pinEvidenceItem, isEvidencePinned } = useReview();
  const [searchTerm, setSearchTerm] = useState('');

  const rawSpecs = standard?.specifications || [];

  const filteredSpecs = rawSpecs.filter(item => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (item.property && item.property.toLowerCase().includes(q)) ||
      (item.value && item.value.toLowerCase().includes(q)) ||
      (item.unit && item.unit.toLowerCase().includes(q)) ||
      (item.condition && item.condition.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="tech-card">
      <div className="tech-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3>
            <ListChecks size={16} /> Technical Requirements & Limits
          </h3>
          <span className="badge-count" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 10, background: 'var(--bg-surface-active)' }}>
            {filteredSpecs.length} items
          </span>
        </div>

        {/* Search inside requirements */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search requirement, unit, property..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 30, height: 32, fontSize: '12px' }}
          />
        </div>
      </div>

      <div className="tech-card-body" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="tech-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Requirement / Property</th>
                <th>Specified Value</th>
                <th>Unit</th>
                <th>Tolerance / Limit</th>
                <th>Condition / Method</th>
                <th>Section</th>
                <th style={{ textAlign: 'center' }}>Source</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpecs.length > 0 ? (
                filteredSpecs.map((spec, idx) => {
                  const page = spec.page || 1;
                  const quote = `${spec.property}: ${spec.value} ${spec.unit || ''} (Tolerance: ${spec.tolerance || 'Nominal'})`;
                  const isPinned = isEvidencePinned(quote, standard.standard_id);

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {spec.property}
                        {spec.category && (
                          <span style={{ 
                            marginLeft: 8, 
                            fontSize: '10px', 
                            padding: '1px 5px', 
                            borderRadius: 2, 
                            backgroundColor: 'var(--bg-surface-subtle)', 
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {spec.category}
                          </span>
                        )}
                      </td>
                      <td className="cell-mono" style={{ fontWeight: 700, color: 'var(--primary-800)' }}>
                        {spec.value}
                      </td>
                      <td className="cell-mono">{spec.unit || '—'}</td>
                      <td className="cell-mono" style={{ color: '#b45309', fontWeight: 600 }}>
                        {spec.tolerance || 'Nominal'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {spec.condition || '—'}
                      </td>
                      <td className="cell-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {spec.section || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => openSourcePage(standard.standard_id, page, quote, standard.is_number)}
                          className="source-page-link"
                          title={`Inspect source document at page ${page}`}
                        >
                          <FileText size={11} /> p.{page}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            if (!isPinned) {
                              pinEvidenceItem({
                                standard_id: standard.standard_id,
                                is_number: standard.is_number,
                                page: page,
                                section: spec.section,
                                text: quote
                              });
                            }
                          }}
                          className={`btn-tech btn-sm ${isPinned ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                          title="Pin requirement to officer review dossier"
                        >
                          {isPinned ? 'Pinned' : 'Pin'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No requirements matched the search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
