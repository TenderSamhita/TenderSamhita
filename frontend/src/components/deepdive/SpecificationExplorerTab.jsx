import React, { useState, useMemo } from 'react';
import { Sliders, Search, ArrowUpDown, Download, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CATEGORIES = [
  'ALL', 'Dimension', 'Performance', 'Temperature', 'Pressure', 
  'Capacity', 'Mechanical', 'Chemical', 'Electrical', 'Testing', 'Safety', 'Material', 'Other'
];

export function SpecificationExplorerTab({ standard }) {
  const { openSourcePage } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('property');
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const rawSpecs = standard?.specifications || [];

  const filteredSpecs = useMemo(() => {
    let result = [...rawSpecs];

    // Filter by Category
    if (selectedCategory !== 'ALL') {
      result = result.filter(item => 
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase()) ||
        (item.property && item.property.toLowerCase().includes(selectedCategory.toLowerCase()))
      );
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.property && item.property.toLowerCase().includes(q)) ||
        (item.value && item.value.toLowerCase().includes(q)) ||
        (item.unit && item.unit.toLowerCase().includes(q)) ||
        (item.condition && item.condition.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [rawSpecs, selectedCategory, searchQuery, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(filteredSpecs.length / itemsPerPage) || 1;
  const paginatedSpecs = filteredSpecs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Property', 'Value', 'Unit', 'Tolerance', 'Condition', 'Section', 'Page'];
    const rows = filteredSpecs.map(s => [
      `"${s.property || ''}"`,
      `"${s.value || ''}"`,
      `"${s.unit || ''}"`,
      `"${s.tolerance || ''}"`,
      `"${s.condition || ''}"`,
      `"${s.section || ''}"`,
      s.page || 1
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${standard.standard_id}_specifications.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tech-card">
      <div className="tech-card-header">
        <h3>
          <Sliders size={16} /> Specification Explorer
        </h3>
        <button onClick={handleExportCSV} className="btn-tech btn-secondary btn-sm">
          <Download size={13} /> Export Specifications (CSV)
        </button>
      </div>

      <div className="tech-card-body">
        {/* Category Filters Bar per Section 8 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              className={`btn-tech btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search and Sort Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Filter specifications..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: 30, height: 34, fontSize: '12px' }}
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {paginatedSpecs.length} of {filteredSpecs.length} specifications
          </div>
        </div>

        {/* Specifications Table */}
        <div className="table-container">
          <table className="tech-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('property')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Property / Characteristic <ArrowUpDown size={11} />
                  </div>
                </th>
                <th onClick={() => toggleSort('value')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Nominal Value <ArrowUpDown size={11} />
                  </div>
                </th>
                <th>Unit</th>
                <th>Tolerance</th>
                <th>Test Condition / Standard Reference</th>
                <th>Section</th>
                <th style={{ textAlign: 'center' }}>Source Page</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSpecs.length > 0 ? (
                paginatedSpecs.map((spec, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {spec.property}
                    </td>
                    <td className="cell-mono" style={{ fontWeight: 700, color: 'var(--primary-800)' }}>
                      {spec.value}
                    </td>
                    <td className="cell-mono">{spec.unit || '—'}</td>
                    <td className="cell-mono" style={{ color: '#b45309' }}>{spec.tolerance || '—'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {spec.condition || 'Conforms to normative clause'}
                    </td>
                    <td className="cell-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {spec.section || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => openSourcePage(standard.standard_id, spec.page || 1, `${spec.property}: ${spec.value} ${spec.unit || ''}`, standard.is_number)}
                        className="source-page-link"
                      >
                        <FileText size={11} /> p.{spec.page || 1}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No specifications match the selected category and filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="btn-tech btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="btn-tech btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
