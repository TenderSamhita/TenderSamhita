import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ReviewProvider } from './context/ReviewContext';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { SourcePageViewer } from './components/common/SourcePageViewer';
import { FigureLightbox } from './components/deepdive/FigureLightbox';

import { DashboardPage } from './pages/DashboardPage';
import { TenderAnalysisPage } from './pages/TenderAnalysisPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { StandardDeepDivePage } from './pages/StandardDeepDivePage';
import { ComparisonPage } from './pages/ComparisonPage';
import { SearchPage } from './pages/SearchPage';
import { ReviewWorkspacePage } from './pages/ReviewWorkspacePage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { RetrievalDebugPage } from './pages/RetrievalDebugPage';

function AppContent() {
  const { currentView } = useApp();

  return (
    <div className="app-layout">
      {/* 1. Official Government Header */}
      <AppHeader />

      {/* 2. Main Workspace Layout */}
      <div className="app-body">
        {/* Desktop Sidebar Navigation with Progressive Disclosure */}
        <AppSidebar />

        {/* Dynamic Main Workspace Content */}
        <main className="app-main" id="main-content" role="main">
          {currentView === 'dashboard' && <DashboardPage />}
          {currentView === 'tender' && <TenderAnalysisPage />}
          {currentView === 'recommendations' && <RecommendationsPage />}
          {currentView === 'deepdive' && <StandardDeepDivePage />}
          {currentView === 'compare' && <ComparisonPage />}
          {currentView === 'search' && <SearchPage />}
          {currentView === 'review' && <ReviewWorkspacePage />}
          {currentView === 'system' && <SystemStatusPage />}
          {currentView === 'debug' && <RetrievalDebugPage />}
        </main>
      </div>

      {/* 3. Global Technical Modals & Viewers */}
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
