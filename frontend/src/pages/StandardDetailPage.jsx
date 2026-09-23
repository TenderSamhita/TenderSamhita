import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { standardService } from '../services/standardService';
import { graphService } from '../services/graphService';
import { StandardKnowledgeMap } from '../components/deepdive/StandardKnowledgeMap';
import { StandardHeader } from '../components/deepdive/StandardHeader';
import { DeepDiveNav } from '../components/deepdive/DeepDiveNav';
import { OverviewTab } from '../components/deepdive/OverviewTab';
import { SpecificationExplorerTab } from '../components/deepdive/SpecificationExplorerTab';
import { TableViewerTab } from '../components/deepdive/TableViewerTab';
import { FigureViewerTab } from '../components/deepdive/FigureViewerTab';
import { ReferenceListTab } from '../components/deepdive/ReferenceListTab';
import { AlliedStandardsTab } from '../components/deepdive/AlliedStandardsTab';
import { ConformityTab } from '../components/deepdive/ConformityTab';
import { VersionTimelineTab } from '../components/deepdive/VersionTimelineTab';
import { EvidenceTab } from '../components/deepdive/EvidenceTab';
import { LoadingState } from '../components/common/LoadingState';

export function StandardDetailPage() {
  const { activeStandardId, deepDiveTab, navigateTo, isStandardInfoOpen, setIsStandardInfoOpen } = useApp();
  const [standard, setStandard] = useState(null);
  const [tables, setTables] = useState([]);
  const [figuresData, setFiguresData] = useState({ confirmed: [], candidates: [] });
  const [references, setReferences] = useState([]);
  const [alliedStandards, setAlliedStandards] = useState([]);
  const [conformity, setConformity] = useState(null);
  const [versionHistory, setVersionHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      standardService.getStandard(activeStandardId),
      standardService.getTables(activeStandardId),
      standardService.getFigures(activeStandardId),
      standardService.getReferences(activeStandardId),
      standardService.getAlliedStandards(activeStandardId),
      standardService.getConformity(activeStandardId),
      standardService.getVersionHistory(activeStandardId),
    ]).then(([std, tbl, fig, ref, all, conf, ver]) => {
      if (std.status === 'fulfilled') setStandard(std.value);
      setTables(tbl.status === 'fulfilled' ? tbl.value : []);
      setFiguresData(fig.status === 'fulfilled' ? fig.value : { confirmed: [], candidates: [] });
      setReferences(ref.status === 'fulfilled' ? ref.value : []);
      setAlliedStandards(all.status === 'fulfilled' ? all.value : []);
      setConformity(conf.status === 'fulfilled' ? conf.value : null);
      setVersionHistory(ver.status === 'fulfilled' ? ver.value : null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [activeStandardId]);

  if (loading) return <div className="workspace-container"><LoadingState message="Loading standard..." /></div>;
  if (!standard) return <div className="workspace-container"><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Standard not found.</div></div>;

  const tabCounts = {
    specifications: standard.specifications?.length || 0,
    tables: tables.length,
    figures: figuresData.confirmed?.length || 0,
    references: references.length,
    allied: alliedStandards.length,
  };

  return (
    <div className="workspace-container fluid" style={{ gap: 12 }}>
      <div className="mini-breadcrumbs" style={{ padding: '0 4px' }}>
        <span className="crumb-link" onClick={() => navigateTo('standards')}>Standards</span>
        <span>/</span>
        <span className="crumb-current mono-val">{standard.is_number}</span>
      </div>

      <StandardHeader standard={standard} />
      <DeepDiveNav counts={tabCounts} />

      <div style={{ flex: 1, minHeight: 520 }}>
        {deepDiveTab === 'mindmap' && (
          <StandardKnowledgeMap standard={standard} tables={tables} figures={figuresData.confirmed} references={references} alliedStandards={alliedStandards} />
        )}
        {deepDiveTab === 'overview' && <OverviewTab standard={standard} tables={tables} figures={figuresData.confirmed} references={references} />}
        {deepDiveTab === 'specifications' && <SpecificationExplorerTab standard={standard} />}
        {deepDiveTab === 'tables' && <TableViewerTab standard={standard} tables={tables} />}
        {deepDiveTab === 'figures' && <FigureViewerTab standard={standard} figuresData={figuresData} />}
        {deepDiveTab === 'references' && <ReferenceListTab standard={standard} references={references} />}
        {deepDiveTab === 'allied' && <AlliedStandardsTab standard={standard} alliedStandards={alliedStandards} />}
        {deepDiveTab === 'conformity' && <ConformityTab standard={standard} conformity={conformity} />}
        {deepDiveTab === 'amendments' && <VersionTimelineTab standard={standard} versionHistory={versionHistory} />}
        {deepDiveTab === 'evidence' && <EvidenceTab standard={standard} />}
      </div>
    </div>
  );
}
