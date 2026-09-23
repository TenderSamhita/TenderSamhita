import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ReviewProvider } from './context/ReviewContext';
import { AppHeader } from './components/layout/AppHeader';
import { SourcePageViewer } from './components/common/SourcePageViewer';
import { FigureLightbox } from './components/deepdive/FigureLightbox';

import { OverviewPage } from './pages/OverviewPage';
import { ProcurementWorkspace } from './pages/ProcurementWorkspace';
import { StandardsPage } from './pages/StandardsPage';
import { StandardDetailPage } from './pages/StandardDetailPage';
import { SearchPage } from './pages/SearchPage';
import { SystemPage } from './pages/SystemPage';

import './styles/workspace.css';

function AppNav() {
  const { currentView, navigateTo } = useApp();

  const navItems = [
    { id: 'overview', label: 'Home' },
    { id: 'procurement', label: 'Procurement' },
    { id: 'standards', label: 'Standards' },
    { id: 'search', label: 'Search' },
  ];

  return (
    <nav className="app-nav" role="navigation" aria-label="Primary">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${currentView === item.id ? 'active' : ''}`}
          onClick={() => navigateTo(item.id)}
        >
          {item.label}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button
        className={`nav-item ${currentView === 'system' ? 'active' : ''}`}
        onClick={() => navigateTo('system')}
        style={{ fontSize: '11.5px', color: '#66706A' }}
      >
        System
      </button>
    </nav>
  );
}

function AppContent() {
  const { currentView } = useApp();

  return (
    <div className="app-layout">
      <AppHeader />
      <AppNav />

      <main className="app-main" id="main-content" role="main">
        {currentView === 'overview' && <OverviewPage />}
        {currentView === 'procurement' && <ProcurementWorkspace />}
        {currentView === 'procurement-workspace' && <ProcurementWorkspace />}
        {currentView === 'standards' && <StandardsPage />}
        {currentView === 'standard-detail' && <StandardDetailPage />}
        {currentView === 'search' && <SearchPage />}
        {currentView === 'system' && <SystemPage />}
      </main>

      <SourcePageViewer />
      <FigureLightbox />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ReviewProvider>
        <AppContent />
      </ReviewProvider>
    </AppProvider>
  );
}
