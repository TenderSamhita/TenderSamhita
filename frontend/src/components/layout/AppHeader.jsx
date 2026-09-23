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
          theme="light" 
          onClick={() => navigateTo('overview')} 
        />

        {/* Global Standards Search Shortcut */}
        <div 
          className="header-search" 
          onClick={() => navigateTo('search')}
          title="Search Indian Standards catalog"
        >
          <Search size={14} color="#66706A" />
          <span>Search standards, specifications, test methods...</span>
          <span className="header-search-kbd">⌘K</span>
        </div>
      </div>

      {/* Right: Technical Actions */}
      <div className="header-right">
        <button
          onClick={() => navigateTo('procurement')}
          className={`btn-tech btn-sm ${currentView === 'procurement' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ 
            color: currentView === 'procurement' ? '#ffffff' : '#202522',
            backgroundColor: currentView === 'procurement' ? '#245B4A' : 'transparent',
            border: currentView === 'procurement' ? 'none' : '1px solid #D8D7D1'
          }}
        >
          <FileText size={13} />
          <span>Procurement</span>
        </button>

        <button
          onClick={() => navigateTo('search')}
          className={`btn-tech btn-sm ${currentView === 'search' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ 
            color: currentView === 'search' ? '#ffffff' : '#202522',
            backgroundColor: currentView === 'search' ? '#245B4A' : 'transparent',
            border: currentView === 'search' ? 'none' : '1px solid #D8D7D1'
          }}
        >
          <Search size={13} />
          <span>Search</span>
        </button>

        <button
          onClick={() => navigateTo('review')}
          className="btn-tech btn-sm btn-ghost"
          style={{ color: '#202522', border: '1px solid #D8D7D1' }}
          title="Open procurement officer review workspace"
        >
          <Bookmark size={13} />
          <span>Review</span>
          {totalDossierItems > 0 && (
            <span style={{
              marginLeft: 4,
              backgroundColor: '#B85C38',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 700,
            }}>
              {totalDossierItems}
            </span>
          )}
        </button>

        <div 
          onClick={() => navigateTo('system')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: '#F1EFE9',
            border: '1px solid #D8D7D1',
            cursor: 'pointer',
            fontSize: '11px',
            color: systemOnline ? '#2F6B4F' : '#B64235',
          }}
          title="Inspect backend health"
        >
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: systemOnline ? '#2F6B4F' : '#B64235',
          }} />
          <span style={{ fontWeight: 600 }}>
            {systemOnline ? 'Online' : 'Degraded'}
          </span>
        </div>
      </div>
    </header>
  );
}
