import React, { useState } from 'react';
import { Terminal, Search, Play, Layers, Database, ArrowRight, CheckCircle2 } from 'lucide-react';
import { request } from '../services/apiClient';
import { LoadingState } from '../components/common/LoadingState';

export function RetrievalDebugPage() {
  const [query, setQuery] = useState('thermal oxidation stability of gas turbine fuels');
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState(null);
  const [error, setError] = useState(null);

  const runDiagnostic = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch BM25 only
      const bm25Res = await request('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query, mode: 'lexical', top_k: 8 })
      }).catch(err => ({ results: [], error: err.message }));

      // 2. Fetch Dense only
      const denseRes = await request('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query, mode: 'semantic', top_k: 8 })
      }).catch(err => ({ results: [], error: err.message }));

      // 3. Fetch Hybrid (FAISS + BM25)
      const hybridRes = await request('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query, mode: 'hybrid', top_k: 8 })
      }).catch(err => ({ results: [], error: err.message }));

      setDebugData({
        query,
        bm25: bm25Res.results || [],
        dense: denseRes.results || [],
        hybrid: hybridRes.results || [],
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Retrieval diagnostic failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          backgroundColor: 'var(--navy-900)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#38bdf8'
        }}>
          <Terminal size={18} />
        </div>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy-900)' }}>
            Retrieval Engine Diagnostic View (/debug/retrieval)
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Side-by-side technical inspection of BM25, Dense Semantic (FAISS), and Hybrid Fusion scores.
          </p>
        </div>
      </div>

      {/* Query Bar */}
      <div className="clean-panel">
        <div className="clean-panel-body" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runDiagnostic()}
              placeholder="Enter technical query for retrieval pipeline inspection..."
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                border: '1px solid var(--border-medium)',
                borderRadius: 6,
                outline: 'none'
              }}
            />
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="btn-tech btn-primary"
              style={{ padding: '0 18px', fontWeight: 600 }}
            >
              <Play size={13} /> Execute Pipeline
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingState message="Querying BM25, Dense Vector FAISS, and Hybrid Fusion engines..." />}

      {error && (
        <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#991b1b', fontSize: '12.5px' }}>
          {error}
        </div>
      )}

      {debugData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          
          {/* Column 1: BM25 Lexical */}
          <div className="clean-panel">
            <div className="clean-panel-header" style={{ padding: '10px 14px', backgroundColor: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--navy-900)' }}>
                1. BM25 LEXICAL RETRIEVAL
              </div>
              <span className="mono-val" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {debugData.bm25.length} candidates
              </span>
            </div>
            <div className="clean-panel-body" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {debugData.bm25.map((item, i) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)', backgroundColor: '#ffffff', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong className="mono-val" style={{ color: 'var(--navy-900)' }}>{item.standard_id}</strong>
                    <span className="mono-val" style={{ color: '#059669', fontWeight: 700 }}>
                      BM25: {item.bm25_score?.toFixed(2) || item.score?.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Sec: {item.section || 'Scope'} · Page {item.page || 1}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Dense Semantic FAISS */}
          <div className="clean-panel">
            <div className="clean-panel-header" style={{ padding: '10px 14px', backgroundColor: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--navy-900)' }}>
                2. DENSE SEMANTIC (FAISS)
              </div>
              <span className="mono-val" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {debugData.dense.length} candidates
              </span>
            </div>
            <div className="clean-panel-body" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {debugData.dense.map((item, i) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)', backgroundColor: '#ffffff', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong className="mono-val" style={{ color: 'var(--navy-900)' }}>{item.standard_id}</strong>
                    <span className="mono-val" style={{ color: '#2563eb', fontWeight: 700 }}>
                      Cosine: {item.semantic_score?.toFixed(3) || item.score?.toFixed(3)}
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Sec: {item.section || 'Scope'} · Page {item.page || 1}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Hybrid Fusion */}
          <div className="clean-panel">
            <div className="clean-panel-header" style={{ padding: '10px 14px', backgroundColor: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--saffron)' }}>
                3. HYBRID FUSION (FINAL RANK)
              </div>
              <span className="mono-val" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {debugData.hybrid.length} ranked
              </span>
            </div>
            <div className="clean-panel-body" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {debugData.hybrid.map((item, i) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--saffron-border)', backgroundColor: '#fffaf5', fontSize: '11.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong className="mono-val" style={{ color: 'var(--navy-900)' }}>#{i + 1} {item.standard_id}</strong>
                    <span className="mono-val" style={{ color: '#ea580c', fontWeight: 800 }}>
                      Score: {item.score?.toFixed(3)}
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                    Sec: {item.section} · Page {item.page} · Sources: {item.sources ? item.sources.join(' + ') : 'hybrid'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
