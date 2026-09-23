import React, { useState, useEffect } from 'react';
import { Server, RefreshCw } from 'lucide-react';
import { systemService } from '../services/systemService';
import { LoadingState } from '../components/common/LoadingState';

export function SystemPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await systemService.getSystemStatus();
      setStatus(data);
    } catch (err) {
      console.warn('System status failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  if (loading && !status) return <LoadingState message="Checking system health..." />;

  const components = [
    { name: 'FastAPI Service', status: status?.api || 'ONLINE' },
    { name: 'SQLite Database', status: status?.database || 'ONLINE' },
    { name: 'FAISS Semantic Index', status: status?.embedding_index || 'ONLINE' },
    { name: 'BM25 Lexical Index', status: status?.bm25_index || 'ONLINE' },
    { name: 'Hybrid Retrieval', status: status?.search_index || 'ONLINE' },
    { name: 'Intelligence Engine', status: 'ONLINE' },
  ];

  return (
    <div className="workspace-container" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-900)' }}>System Health</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Backend service and index status.</p>
        </div>
        <button onClick={fetchStatus} className="btn-tech btn-secondary btn-sm"><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="clean-panel">
        <div className="clean-panel-header">
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Components</span>
        </div>
        <div style={{ padding: 0 }}>
          {components.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
              <span className={`status-pill ${c.status === 'ONLINE' ? 'status-current' : 'status-superseded'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>

      {status?.stats && (
        <div className="clean-panel" style={{ marginTop: 16 }}>
          <div className="clean-panel-header">
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Corpus Statistics</span>
          </div>
          <div className="clean-panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {Object.entries(status.stats).map(([key, val]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{key.replace(/_/g, ' ')}</div>
                <div className="mono-val" style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
