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
    <div className="workspace-container" style={{ maxWidth: 900, margin: '0 auto', paddingTop: 48 }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img
          src="/logo.png"
          alt="Tender Samhita"
          style={{ height: 56, width: 56, objectFit: 'contain', borderRadius: 8, marginBottom: 16 }}
        />
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy-900)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          TENDER SAMHITA
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Procurement Standards Intelligence
        </p>
      </div>

      {/* Primary Input */}
      <div className="clean-panel" style={{ marginBottom: 32 }}>
        <div className="clean-panel-body" style={{ padding: 24 }}>
          <textarea
            rows={3}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Describe your procurement requirement..."
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: 'var(--font-sans)',
              resize: 'vertical',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--navy-700)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setTenderText(inputText); navigateTo('procurement'); }}
                className="btn-tech btn-secondary btn-sm"
              >
                <FileText size={14} /> Upload Tender PDF
              </button>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim()}
              className="btn-tech btn-saffron"
              style={{ padding: '9px 24px', fontSize: 13, fontWeight: 600 }}
            >
              Analyze <ArrowRight size={15} />
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
