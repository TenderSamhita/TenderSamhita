import React, { useMemo } from 'react';
import { Link2, ExternalLink, FileText, CheckCircle2, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ReferenceListTab({ standard, references = [] }) {
  const { openStandard, openSourcePage } = useApp();

  // Categorize references per Section 12
  const categorized = useMemo(() => {
    const groups = {
      normative: [],
      bibliographic: [],
      standards: [],
      other: []
    };

    references.forEach(r => {
      const typeStr = (r.type || '').toLowerCase();
      if (typeStr.includes('normative')) {
        groups.normative.push(r);
      } else if (typeStr.includes('biblio')) {
        groups.bibliographic.push(r);
      } else if (typeStr.includes('product') || typeStr.includes('test') || typeStr.includes('allied') || typeStr.includes('standard')) {
        groups.standards.push(r);
      } else {
        groups.other.push(r);
      }
    });

    return groups;
  }, [references]);

  const renderReferenceGroup = (title, items, badgeColor) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="tech-card" style={{ marginBottom: 16 }}>
        <div className="tech-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={15} color={badgeColor} />
            <h3 style={{ fontSize: '13px' }}>{title}</h3>
          </div>
          <span className="badge-count" style={{ fontSize: '11px', padding: '1px 7px' }}>
            {items.length} items
          </span>
        </div>

        <div className="tech-card-body" style={{ padding: 0 }}>
          <table className="tech-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Standard Identifier</th>
                <th>Standard Title / Clause Scope</th>
                <th>Relationship</th>
                <th style={{ textAlign: 'center' }}>Source Page</th>
                <th style={{ textAlign: 'center' }}>Corpus Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ref, idx) => {
                const isIndexed = ref.is_indexed !== false && ref.standard_id;

                return (
                  <tr key={idx}>
                    <td className="cell-mono" style={{ fontWeight: 700, color: 'var(--primary-800)' }}>
                      {ref.target}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {ref.title || 'Technical standard specification'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {ref.type || 'Referenced Standard'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openSourcePage(standard.standard_id, ref.page || 2, ref.target, standard.is_number)}
                        className="source-page-link"
                      >
                        <FileText size={11} /> p. {ref.page || 2}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isIndexed ? (
                        <button
                          onClick={() => openStandard(ref.standard_id, 'overview')}
                          className="btn-tech btn-primary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          <CheckCircle2 size={11} /> Open Standard
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <HelpCircle size={11} /> Referenced standard not currently indexed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {renderReferenceGroup('Normative References (Mandatory Compliance)', categorized.normative, 'var(--primary-700)')}
      {renderReferenceGroup('Referenced Standards & Test Methods', categorized.standards, '#2563eb')}
      {renderReferenceGroup('Bibliographic References & Publications', categorized.bibliographic, '#64748b')}
      {renderReferenceGroup('Other Technical References', categorized.other, '#475569')}

      {references.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No normative or bibliographic references recorded for this standard.
        </div>
      )}
    </div>
  );
}
