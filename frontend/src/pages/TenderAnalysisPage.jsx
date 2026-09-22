import React from 'react';
import { TenderUploadAnalyze } from '../components/tender/TenderUploadAnalyze';
import { RequirementsViewer } from '../components/tender/RequirementsViewer';
import { useApp } from '../context/AppContext';

export function TenderAnalysisPage() {
  const { tenderAnalysis, recommendationResult, navigateTo } = useApp();

  return (
    <div className="workspace-container">
      <div className="mini-breadcrumbs">
        <span className="crumb-link" onClick={() => navigateTo('dashboard')}>Dashboard</span>
        <span>/</span>
        <span className="crumb-current">Tender Analysis</span>
      </div>

      {/* Tender Intake Component */}
      <TenderUploadAnalyze />

      {/* Extracted Requirements Component */}
      {tenderAnalysis && (
        <RequirementsViewer
          requirements={tenderAnalysis.requirements}
          versionWarnings={recommendationResult?.version_warnings || []}
          queryText={tenderAnalysis.query_text}
        />
      )}
    </div>
  );
}
