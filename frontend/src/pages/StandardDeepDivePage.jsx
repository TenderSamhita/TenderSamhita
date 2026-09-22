import React, { useState, useEffect } from 'react';
import { StandardHeader } from '../components/deepdive/StandardHeader';
import { DeepDiveNav } from '../components/deepdive/DeepDiveNav';
import { StandardKnowledgeMap } from '../components/deepdive/StandardKnowledgeMap';
import { StandardInfoDrawer } from '../components/deepdive/StandardInfoDrawer';
import { OverviewTab } from '../components/deepdive/OverviewTab';
import { ScopeTab } from '../components/deepdive/ScopeTab';
import { RequirementsTab } from '../components/deepdive/RequirementsTab';
import { SpecificationExplorerTab } from '../components/deepdive/SpecificationExplorerTab';
import { TableViewerTab } from '../components/deepdive/TableViewerTab';
import { FigureViewerTab } from '../components/deepdive/FigureViewerTab';
import { TestMethodsTab } from '../components/deepdive/TestMethodsTab';
import { ReferenceListTab } from '../components/deepdive/ReferenceListTab';
import { AlliedStandardsTab } from '../components/deepdive/AlliedStandardsTab';
import { ConformityTab } from '../components/deepdive/ConformityTab';
import { VersionTimelineTab } from '../components/deepdive/VersionTimelineTab';
import { EvidenceTab } from '../components/deepdive/EvidenceTab';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { standardService } from '../services/standardService';
import { useApp } from '../context/AppContext';

export function StandardDeepDivePage() {
  const { 
    activeStandardId, 
    deepDiveTab, 
    navigateTo, 
    isStandardInfoOpen, 
    setIsStandardInfoOpen 
  } = useApp();

  const [standard, setStandard] = useState(null);
  const [tables, setTables] = useState([]);
  const [figuresData, setFiguresData] = useState({ confirmed: [], candidates: [] });
  const [references, setReferences] = useState([]);
  const [alliedStandards, setAlliedStandards] = useState([]);
  const [conformity, setConformity] = useState(null);
  const [versionHistory, setVersionHistory] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      standardService.getStandard(activeStandardId),
      standardService.getTables(activeStandardId),
      standardService.getFigures(activeStandardId),
      standardService.getReferences(activeStandardId),
      standardService.getAlliedStandards(activeStandardId),
      standardService.getConformity(activeStandardId),
      standardService.getVersionHistory(activeStandardId)
    ]).then(([stdRes, tblRes, figRes, refRes, allRes, confRes, verRes]) => {
      if (!isMounted) return;

      if (stdRes.status === 'fulfilled' && stdRes.value) {
        setStandard(stdRes.value);
      } else {
        throw new Error(`Standard ${activeStandardId} could not be loaded from repository`);
      }

      setTables(tblRes.status === 'fulfilled' ? tblRes.value : []);
      setFiguresData(figRes.status === 'fulfilled' ? figRes.value : { confirmed: [], candidates: [] });
      setReferences(refRes.status === 'fulfilled' ? refRes.value : []);
      setAlliedStandards(allRes.status === 'fulfilled' ? allRes.value : []);
      setConformity(confRes.status === 'fulfilled' ? confRes.value : null);
      setVersionHistory(verRes.status === 'fulfilled' ? verRes.value : null);
      setLoading(false);
    }).catch(err => {
      if (isMounted) {
        setError(err.message);
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [activeStandardId]);

  if (loading) {
    return (
      <div className="workspace-container">
        <LoadingState message={`Retrieving specifications & knowledge relationships for ${activeStandardId}...`} />
      </div>
    );
  }

  if (error || !standard) {
    return (
      <div className="workspace-container">
        <div className="mini-breadcrumbs">
          <span className="crumb-link" onClick={() => navigateTo('search')}>Standards Directory</span>
          <span>/</span>
          <span className="crumb-current">{activeStandardId}</span>
        </div>
        <ErrorState
          title={`Standard Record Error: ${activeStandardId}`}
          message={error || 'Standard details not found in indexed corpus.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const tabCounts = {
    mindmap: null,
    specifications: standard.specifications?.length || standard.specifications_count || 0,
    tables: tables.length,
    figures: figuresData.confirmed?.length || 0,
    references: references.length,
    allied: alliedStandards.length,
    conformity: null,
    amendments: versionHistory?.timeline?.length || null,
    evidence: (standard.specifications || []).length,
    overview: null
  };

  return (
    <div className="workspace-container fluid" style={{ gap: 12 }}>
      
      {/* 1. Minimal Breadcrumb (Section 31: "Remove redundant breadcrumbs: Standards / IS 1448") */}
      <div className="mini-breadcrumbs" style={{ padding: '0 4px' }}>
        <span className="crumb-link" onClick={() => navigateTo('search')}>Standards Directory</span>
        <span>/</span>
        <span className="crumb-current mono-val">{standard.is_number}</span>
      </div>

      {/* 2. Compact Standard Identity Bar (Section 17 & 18) */}
      <StandardHeader standard={standard} />

      {/* 3. Secondary Local Navigation Tabs */}
      <DeepDiveNav counts={tabCounts} />

      {/* 4. Tab Workspace — Hero Mind Map by Default! */}
      <div style={{ flex: 1, minHeight: '520px' }}>
        {deepDiveTab === 'mindmap' && (
          <StandardKnowledgeMap 
            standard={standard}
            tables={tables}
            figures={figuresData.confirmed}
            references={references}
            alliedStandards={alliedStandards}
          />
        )}
        {deepDiveTab === 'specifications' && (
          <SpecificationExplorerTab standard={standard} />
        )}
        {deepDiveTab === 'tables' && (
          <TableViewerTab standard={standard} tables={tables} />
        )}
        {deepDiveTab === 'figures' && (
          <FigureViewerTab standard={standard} figuresData={figuresData} />
        )}
        {deepDiveTab === 'references' && (
          <ReferenceListTab standard={standard} references={references} />
        )}
        {deepDiveTab === 'allied' && (
          <AlliedStandardsTab standard={standard} alliedStandards={alliedStandards} />
        )}
        {deepDiveTab === 'conformity' && (
          <ConformityTab standard={standard} conformity={conformity} />
        )}
        {deepDiveTab === 'amendments' && (
          <VersionTimelineTab standard={standard} versionHistory={versionHistory} />
        )}
        {deepDiveTab === 'evidence' && (
          <EvidenceTab standard={standard} />
        )}
        {deepDiveTab === 'overview' && (
          <OverviewTab standard={standard} tables={tables} figures={figuresData.confirmed} references={references} />
        )}
      </div>

      {/* 5. Standard Info Slide-Over Drawer */}
      <StandardInfoDrawer 
        standard={standard}
        isOpen={isStandardInfoOpen}
        onClose={() => setIsStandardInfoOpen(false)}
      />

    </div>
  );
}
