import React, { useState, useEffect } from 'react';
import { GitCompare, RefreshCw, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { ComparisonMatrix } from '../components/comparison/ComparisonMatrix';
import { LoadingState } from '../components/common/LoadingState';
import { comparisonService } from '../services/comparisonService';
import { useApp } from '../context/AppContext';

export function ComparisonPage() {
  const { 
    tenderText, 
    activeStandardId, 
    comparisonResult, 
    setComparisonResult,
    navigateTo, 
    openStandard 
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runComparison = async () => {
    if (!tenderText.trim() || !activeStandardId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await comparisonService.compareTenderWithStandard(tenderText, activeStandardId);
      setComparisonResult(res);
    } catch (err) {
      setError(err.message || 'Comparison operation failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!comparisonResult || comparisonResult.standard_id !== activeStandardId) {
      runComparison();
    }
  }, [activeStandardId]);

  return (
    <div className="workspace-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="mini-breadcrumbs">
            <span className="crumb-link" onClick={() => navigateTo('dashboard')}>Dashboard</span>
            <span>/</span>
            <span className="crumb-link" onClick={() => navigateTo('tender')}>Tender Analysis</span>
            <span>/</span>
            <span className="crumb-current">Tender vs Standard</span>
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
            Tender vs Standard Parameter Cross-Evaluation
          </h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Evaluating against <strong className="mono-val">{activeStandardId.replace(/_/g, ' ')}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={runComparison}
            disabled={loading}
            className="btn-tech btn-secondary btn-sm"
          >
            <RefreshCw size={12} /> Re-run Evaluation
          </button>
          <button
            onClick={() => openStandard(activeStandardId, 'mindmap')}
            className="btn-tech btn-primary btn-sm"
          >
            Open Standard Knowledge Map <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {loading && <LoadingState message={`Running parameter cross-matching against ${activeStandardId}...`} />}

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 4,
          color: '#991b1b',
          fontSize: '12.5px'
        }}>
          {error}
        </div>
      )}

      {!loading && comparisonResult && (
        <ComparisonMatrix comparisonData={comparisonResult} />
      )}
    </div>
  );
}
