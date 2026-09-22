import React from 'react';
import { Table2, ExternalLink, FileText } from 'lucide-react';
import { TechnicalTable } from '../common/TechnicalTable';
import { EmptyState } from '../common/EmptyState';
import { useApp } from '../../context/AppContext';

export function TableViewerTab({ standard, tables = [] }) {
  const { openSourcePage } = useApp();

  if (!tables || tables.length === 0) {
    return (
      <EmptyState
        icon={Table2}
        title="No extracted tables found"
        message="No tabular data extractions exist for this standard in the indexed repository."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {tables.map((tbl, idx) => {
        const page = tbl.page || 1;
        const caption = tbl.caption || `Table ${idx + 1}`;
        const tableId = tbl.table_id || `TBL_${idx + 1}`;

        return (
          <div key={tableId} className="tech-card">
            <div className="tech-card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Table2 size={16} color="var(--primary-700)" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {caption}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  Table ID: {tableId} • Section: {tbl.section || 'General'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => openSourcePage(standard.standard_id, page, caption, standard.is_number)}
                  className="btn-tech btn-secondary btn-sm"
                >
                  <ExternalLink size={12} /> View Source Page (p. {page})
                </button>
              </div>
            </div>

            <div className="tech-card-body" style={{ padding: 0 }}>
              <TechnicalTable
                headers={tbl.headers || []}
                rows={tbl.rows || []}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
