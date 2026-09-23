import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { standardService } from '../services/standardService';
import { LoadingState } from '../components/common/LoadingState';

export function StandardsPage() {
  const { navigateTo, openStandard } = useApp();
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    standardService.listStandards()
      .then(list => setStandards(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = standards.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (s.is_number || '').toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q);
  });

  return (
    <div className="workspace-container" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-900)' }}>Standards Directory</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Browse indexed Indian Standards and technical specifications.</p>
      </div>

      <div className="clean-panel" style={{ marginBottom: 16 }}>
        <div className="clean-panel-body" style={{ padding: '12px 16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by IS number or title..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {loading && <LoadingState message="Loading standards directory..." />}

      {!loading && (
        <div className="clean-panel">
          <div style={{ padding: 0 }}>
            {filtered.map(std => (
              <div
                key={std.standard_id}
                className="workspace-list-item"
                onClick={() => openStandard(std.standard_id, 'mindmap')}
              >
                <div>
                  <span className="mono-val" style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>
                    {std.is_number}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {std.title}
                  </span>
                </div>
                <ChevronRight size={14} color="var(--text-muted)" />
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No standards found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
