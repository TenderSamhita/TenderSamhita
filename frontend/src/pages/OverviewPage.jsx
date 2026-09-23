import React, { useState, useEffect } from 'react';
import { FileText, Search, ArrowRight, Database, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { workspaceService } from '../services/workspaceService';
import { systemService } from '../services/systemService';

export function OverviewPage() {
  const { navigateTo, setTenderText } = useApp();
  const [inputText, setInputText] = useState('');
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    workspaceService.list().then(ws => setRecentWorkspaces(ws.slice(0, 5))).catch(() => {});
    systemService.getSystemStatus().then(s => setStats(s.stats)).catch(() => {});
  }, []);

  const handleAnalyze = () => {
    if (!inputText.trim()) return;
    setTenderText(inputText);
    navigateTo('procurement', { tenderText: inputText });
  };

  return (
    <div className="workspace-container" style={{ maxWidth: 860, margin: '0 auto', paddingTop: 36 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img
          src="/logo.png"
          alt="Tender Samhita"
          style={{ height: 48, width: 48, objectFit: 'contain', borderRadius: 6, marginBottom: 12, border: '1px solid #D8D7D1' }}
        />
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#245B4A', letterSpacing: '0.04em', marginBottom: 4 }}>
          TENDER SAMHITA
        </h1>
        <p style={{ fontSize: 13, color: '#66706A', letterSpacing: '0.02em', textTransform: 'uppercase', fontWeight: 600 }}>
          Procurement Standards Intelligence
        </p>
        <p style={{ fontSize: 14, color: '#66706A', maxWidth: 520, margin: '8px auto 0', lineHeight: 1.6 }}>
          Find the standards behind your procurement requirements.
        </p>
      </div>

      {/* Primary Actions */}
      <div className="clean-panel" style={{ marginBottom: 24 }}>
        <div className="clean-panel-body" style={{ padding: 20 }}>
          <textarea
            rows={3}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Describe your procurement requirement…  e.g. Grade 304 stainless steel water storage tank 500 litre for drinking water"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #D8D7D1',
              borderRadius: 8,
              fontSize: 13.5,
              lineHeight: 1.6,
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              color: '#202522',
            }}
            onFocus={e => e.target.style.borderColor = '#245B4A'}
            onBlur={e => e.target.style.borderColor = '#D8D7D1'}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim()}
              className="btn-tech"
              style={{ padding: '10px 22px', fontSize: 13, fontWeight: 700, backgroundColor: '#245B4A', color: '#FFFFFF', border: 'none', borderRadius: 6 }}
            >
              Analyze Tender <ArrowRight size={15} />
            </button>
            <button
              onClick={() => navigateTo('search')}
              className="btn-tech"
              style={{ padding: '10px 18px', fontSize: 13, fontWeight: 600, backgroundColor: '#FFFFFF', color: '#245B4A', border: '1px solid #D8D7D1', borderRadius: 6 }}
            >
              <Search size={14} /> Search Standards
            </button>
            <button
              onClick={() => { setTenderText(inputText); navigateTo('procurement'); }}
              className="btn-tech btn-ghost btn-sm"
              style={{ marginLeft: 'auto', color: '#66706A' }}
            >
              <FileText size={13} /> Upload Tender PDF
            </button>
          </div>
        </div>
      </div>

      {/* Recent Workspaces */}
      {recentWorkspaces.length > 0 && (
        <div className="clean-panel" style={{ marginBottom: 24 }}>
          <div className="clean-panel-header">
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Recent Procurements
            </span>
          </div>
          <div style={{ padding: 0 }}>
            {recentWorkspaces.map(ws => (
              <div
                key={ws.workspace_id}
                className="workspace-list-item"
                onClick={() => navigateTo('procurement-workspace', { workspaceId: ws.workspace_id })}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{ws.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {ws.status} · {ws.created_at ? new Date(ws.created_at).toLocaleDateString() : ''}
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtle Stats */}
      {stats && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, fontSize: 11.5, color: 'var(--text-muted)' }}>
          <span><strong>{stats.standards || 0}</strong> Standards</span>
          <span>·</span>
          <span><strong>{stats.specifications || 0}</strong> Specifications</span>
          <span>·</span>
          <span><strong>{stats.tables || 0}</strong> Tables</span>
          <span>·</span>
          <span><strong>{stats.figures_confirmed || 0}</strong> Figures</span>
        </div>
      )}
    </div>
  );
}
