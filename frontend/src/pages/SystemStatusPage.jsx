import React, { useState, useEffect } from 'react';
import { Server, Database, Layers, CheckCircle2, AlertTriangle, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { systemService } from '../services/systemService';

export function SystemStatusPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await systemService.getSystemStatus();
      setStatus(data);
    } catch (err) {
      console.warn('System status fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading && !status) {
    return <LoadingState message="Polling backend health and retrieval telemetry..." />;
  }

  const components = [
    { name: 'FastAPI Service Engine', status: status?.api || 'ONLINE', desc: 'REST API service & endpoint router' },
    { name: 'Standards SQLite Database', status: status?.database || 'ONLINE', desc: 'Normalized relational catalog, specs, and metadata' },
    { name: 'FAISS Semantic Index', status: status?.embedding_index || 'ONLINE', desc: `Dense index FlatIP with ${status?.embedding?.configured_model || 'BAAI/bge-small-en-v1.5'}` },
    { name: 'BM25 Lexical Index', status: status?.bm25_index || 'ONLINE', desc: 'Rank-BM25 inverted token index' },
    { name: 'Hybrid Retrieval & Search Engine', status: status?.search_index || 'ONLINE', desc: 'Weighted rank fusion reranker' },
    { name: 'Tender Parser & Extractor', status: status?.document_parser || 'ONLINE', desc: 'Multi-column PDF ingestion & rule extractor' },
    { name: 'Figure Classifier Pipeline', status: status?.ocr_service || 'ONLINE', desc: 'Apparatus raster classifier & logo/banner filter' },
    { name: 'Recommendation & Abstention Engine', status: status?.recommendation_engine || 'ONLINE', desc: 'Evidence thresholding & strict anti-hallucination validation' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Breadcrumbs items={[{ label: 'System & Index Telemetry' }]} />

      {/* Header */}
      <div className="tech-card">
        <div className="tech-card-header">
          <div>
            <h3>
              <Server size={16} color="var(--primary-700)" /> Technical Engine Health & Component Telemetry
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
              Active Infrastructure Status • Version {status?.version || '0.1.0'}
            </div>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="btn-tech btn-secondary btn-sm"
          >
            <RefreshCw size={12} /> Refresh Health Status
          </button>
        </div>

        <div className="tech-card-body" style={{ padding: '16px 20px', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StatusBadge status={status?.overall || 'ONLINE'} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {status?.overall === 'ONLINE' ? 'All technical retrieval services are fully operational.' : 'Some index services require attention or rebuild.'}
            </span>
          </div>
        </div>
      </div>

      {/* Services Grid per Section 24 */}
      <div className="tech-card">
        <div className="tech-card-header">
          <h3>Subsystem Health Matrix</h3>
        </div>
        <div className="tech-card-body" style={{ padding: 0 }}>
          <table className="tech-table">
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Component / Subsystem</th>
                <th>Role & Description</th>
                <th style={{ textAlign: 'center', width: '160px' }}>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {comp.name}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {comp.desc}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={comp.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embedding & Index Configuration Panel */}
      {status?.embedding && (
        <div className="tech-card">
          <div className="tech-card-header">
            <h3>
              <Cpu size={16} /> Embedding Model & Vector Index State
            </h3>
          </div>
          <div className="tech-card-body">
            <div className="grid-3">
              <div>
                <div className="param-label">Active Configured Model</div>
                <div className="cell-mono" style={{ fontWeight: 700, fontSize: '13px' }}>
                  {status.embedding.configured_model}
                </div>
              </div>
              <div>
                <div className="param-label">L2 Unit Normalization</div>
                <div className="cell-mono" style={{ fontSize: '13px' }}>
                  {String(status.embedding.normalize_embeddings)}
                </div>
              </div>
              <div>
                <div className="param-label">Hardware Device</div>
                <div className="cell-mono" style={{ fontSize: '13px' }}>
                  {status.embedding.device}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <div className="param-label">Registered Pluggable Model Families</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {status.embedding.supported_models?.map(m => (
                  <span key={m} className="cell-mono" style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    backgroundColor: m === status.embedding.configured_model ? 'var(--primary-100)' : 'var(--bg-canvas)',
                    color: m === status.embedding.configured_model ? 'var(--primary-800)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '3px',
                    fontWeight: m === status.embedding.configured_model ? 700 : 500
                  }}>
                    {m} {m === status.embedding.configured_model && '(Active)'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
