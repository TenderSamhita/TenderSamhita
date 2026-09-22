import React, { useState, useEffect } from 'react';
import { Search, Bookmark, FileText, Sparkles, Terminal } from 'lucide-react';
import { TenderSamhitaLogo } from '../common/TenderSamhitaLogo';
import { useApp } from '../../context/AppContext';
import { useReview } from '../../context/ReviewContext';
import { systemService } from '../../services/systemService';

export function AppHeader() {
  const { navigateTo, currentView } = useApp();
  const { savedStandards, pinnedEvidence } = useReview();
  const [systemOnline, setSystemOnline] = useState(true);

  useEffect(() => {
    systemService.getSystemStatus()
      .then(status => {
        setSystemOnline(status.overall === 'ONLINE');
      })
      .catch(() => setSystemOnline(false));
  }, []);

  const totalDossierItems = savedStandards.length + pinnedEvidence.length;

  return (
    <header className="app-header">
      {/* Left: Brand Identity */}
      <div className="header-left">
        <TenderSamhitaLogo 
          variant="full" 
          height={32} 
          theme="dark" 
          onClick={() => navigateTo('dashboard')} 
        />

        {/* Global Standards Search Shortcut */}
        <div 
          className="header-search" 
          onClick={() => navigateTo('search')}
          title="Search Indian Standards catalog (Ctrl+K)"
        >
          <Search size={14} color="#94a3b8" />
          <span>Search standards, specifications, test methods...</span>
          <span className="header-search-kbd">⌘K</span>
        </div>
      </div>

      {/* Right: Technical Actions & Navigation */}
      <div className="header-right">
        {/* Tender Analysis Shortcut */}
        <button
          onClick={() => navigateTo('tender')}
          className={`btn-tech btn-sm ${currentView === 'tender' ? 'btn-saffron' : 'btn-ghost'}`}
          style={{ 
            color: currentView === 'tender' ? '#ffffff' : '#e2e8f0',
            backgroundColor: currentView === 'tender' ? 'var(--saffron)' : 'rgba(255,255,255,0.06)' 
          }}
        >
          <FileText size={13} />
          <span>Tender Analysis</span>
        </button>

        {/* Review Workspace (Dossier) */}
        <button
          onClick={() => navigateTo('review')}
          className="btn-tech btn-sm"
          style={{ 
            backgroundColor: currentView === 'review' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
            color: '#ffffff',
            borderColor: 'rgba(255,255,255,0.15)'
          }}
          title="Open procurement officer review workspace"
        >
          <Bookmark size={13} />
          <span>Review Dossier</span>
          {totalDossierItems > 0 && (
            <span style={{
              marginLeft: 4,
              backgroundColor: 'var(--saffron)',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 700,
              boxShadow: '0 0 8px var(--saffron-glow)'
            }}>
              {totalDossierItems}
            </span>
          )}
        </button>

        {/* Retrieval Debugger Shortcut (Per Section 28 of Audit) */}
        <button
          onClick={() => navigateTo('debug')}
          className="btn-tech btn-ghost btn-sm"
          style={{
            color: currentView === 'debug' ? '#93c5fd' : '#94a3b8',
            backgroundColor: currentView === 'debug' ? 'rgba(37,99,235,0.18)' : 'transparent',
            padding: '5px 8px'
          }}
          title="Open Retrieval Diagnostic Debugger (/debug/retrieval)"
        >
          <Terminal size={13} />
          <span style={{ fontSize: '11px' }}>RAG Debug</span>
        </button>

        {/* Live System Status Dot */}
        <div 
          onClick={() => navigateTo('system')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            fontSize: '11px',
            color: systemOnline ? '#86efac' : '#fca5a5',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
          title="Inspect backend retrieval index and service health"
        >
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: systemOnline ? '#22c55e' : '#ef4444',
            boxShadow: systemOnline ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
          }} />
          <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>
            {systemOnline ? 'System Online' : 'Index Degraded'}
          </span>
        </div>
      </div>
    </header>
  );
}
