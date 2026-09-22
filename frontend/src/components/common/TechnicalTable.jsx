import React from 'react';

export function TechnicalTable({ headers = [], rows = [], caption = null, onRowClick = null, className = '' }) {
  if (!headers.length && !rows.length) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        No table data extracted for this section.
      </div>
    );
  }

  return (
    <div className="table-container">
      {caption && (
        <div style={{ 
          padding: '10px 14px', 
          backgroundColor: 'var(--bg-surface-subtle)', 
          borderBottom: '1px solid var(--border-subtle)',
          fontWeight: 600,
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          {caption}
        </div>
      )}
      <table className={`tech-table ${className}`}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr 
              key={rIdx} 
              onClick={onRowClick ? () => onRowClick(row, rIdx) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : {}}
            >
              {Array.isArray(row) ? (
                row.map((cell, cIdx) => (
                  <td key={cIdx}>
                    {typeof cell === 'object' && cell !== null ? JSON.stringify(cell) : String(cell !== undefined && cell !== null ? cell : '—')}
                  </td>
                ))
              ) : (
                <td colSpan={headers.length}>{JSON.stringify(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
