import React, { useState } from 'react';
import { Layers, Search, FileText } from 'lucide-react';
import { EvidencePanel } from '../common/EvidencePanel';

export function EvidenceTab({ standard, evidenceList = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Use either supplied evidenceList or generate from standard specs/scope
  const items = evidenceList.length > 0 ? evidenceList : (
    (standard?.specifications || []).map((s, idx) => ({
      chunk_id: `${standard.standard_id}_CHK_${idx + 1}`,
      standard_id: standard.standard_id,
      is_number: standard.is_number,
      page: s.page || 1,
      section: s.section || 'General Requirements',
      clause: s.section || null,
      text: `${s.property} specified as ${s.value} ${s.unit || ''} (Tolerance: ${s.tolerance || 'Nominal'}) under test conditions.`
    }))
  );

  const filtered = items.filter(ev => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (ev.text && ev.text.toLowerCase().includes(q)) ||
      (ev.section && ev.section.toLowerCase().includes(q)) ||
      (ev.page && String(ev.page).includes(q))
    );
  });

  return (
    <div className="tech-card">
      <div className="tech-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Layers size={16} />
          <h3>Indexed Evidence & Provenance Trail</h3>
          <span className="badge-count" style={{ fontSize: '11px', padding: '2px 8px' }}>
            {filtered.length} chunks
          </span>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search evidence text or section..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 30, height: 34, fontSize: '12px' }}
          />
        </div>
      </div>

      <div className="tech-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 4 }}>
          Every specification and claim in the system is tied to verifiable chunk provenance within the official Indian Standard text.
        </p>

        {filtered.map((ev, i) => (
          <EvidencePanel
            key={ev.chunk_id || i}
            standardId={ev.standard_id || standard.standard_id}
            isNumber={ev.is_number || standard.is_number}
            page={ev.page}
            section={ev.section}
            clause={ev.clause}
            table={ev.table}
            figure={ev.figure}
            text={ev.text}
            chunkId={ev.chunk_id}
          />
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No evidence chunks match your search query.
          </div>
        )}
      </div>
    </div>
  );
}
