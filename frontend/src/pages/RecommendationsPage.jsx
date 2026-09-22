import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  Filter, 
  ChevronRight,
  Search
} from 'lucide-react';
import { RecommendationCard } from '../components/recommendations/RecommendationCard';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { recommendationService } from '../services/recommendationService';
import { useApp } from '../context/AppContext';

export function RecommendationsPage() {
  const { tenderText, recommendationResult, setRecommendationResult, navigateTo } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minScore, setMinScore] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');

  const handleRefresh = async () => {
    if (!tenderText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const recs = await recommendationService.getRecommendations(tenderText, 6);
      setRecommendationResult(recs);
    } catch (err) {
      setError(err.message || 'Failed to refresh recommendations');
    } finally {
      setLoading(false);
    }
  };

  const rawRecs = recommendationResult?.recommendations || [];
  const abstention = recommendationResult?.abstention;
  const isAbstained = abstention?.decision === 'ABSTAIN';

  const filteredRecs = useMemo(() => {
    return rawRecs.filter(r => {
      if (statusFilter !== 'ALL' && (r.status || 'CURRENT') !== statusFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchNumber = r.is_number?.toLowerCase().includes(q);
        const matchTitle = r.title?.toLowerCase().includes(q);
        if (!matchNumber && !matchTitle) return false;
      }
      return true;
    });
  }, [rawRecs, statusFilter, searchFilter]);

  return (
    <div className="workspace-container">
      
      {/* Top Breadcrumbs & Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="mini-breadcrumbs">
            <span className="crumb-link" onClick={() => navigateTo('dashboard')}>Dashboard</span>
            <span>/</span>
            <span className="crumb-link" onClick={() => navigateTo('tender')}>Tender Analysis</span>
            <span>/</span>
            <span className="crumb-current">Recommendations</span>
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
            Recommended Indian Standards
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Grounded against indexed standards repository with clause-level verification.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigateTo('tender')}
            className="btn-tech btn-secondary btn-sm"
          >
            <FileText size={13} /> Refine Tender Query
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading || !tenderText.trim()}
            className="btn-tech btn-primary btn-sm"
          >
            <RefreshCw size={13} /> Re-evaluate
          </button>
        </div>
      </div>

      {loading && <LoadingState message="Conducting hybrid semantic & lexical retrieval over Indian Standards..." />}

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

      {/* Abstention Banner if not enough evidence */}
      {isAbstained && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontWeight: 700, fontSize: '14px' }}>
            <AlertCircle size={18} />
            <span>Abstention: Insufficient Corpus Evidence</span>
          </div>
          <p style={{ marginTop: 6, fontSize: '12.5px', color: '#78350f', lineHeight: 1.5 }}>
            {abstention.reason || 'The system could not establish decisive clause-level evidence for this requirement in the indexed repository. The system abstains from forcing speculative recommendations.'}
          </p>
        </div>
      )}

      {/* Research-Oriented Two-Column Layout (Section 10) */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        
        {/* Left Column: FILTERS */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          <div className="clean-panel">
            <div className="clean-panel-header" style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={14} color="var(--navy-700)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy-900)' }}>
                  FILTERS
                </span>
              </div>
              {(statusFilter !== 'ALL' || searchFilter) && (
                <button
                  onClick={() => { setStatusFilter('ALL'); setSearchFilter(''); }}
                  className="btn-tech btn-ghost btn-xs"
                  style={{ fontSize: '10.5px' }}
                >
                  Reset
                </button>
              )}
            </div>

            <div className="clean-panel-body" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Quick Search */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Filter In Results
                </label>
                <div style={{ position: 'relative', marginTop: 4 }}>
                  <Search size={12} style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="IS or keyword..."
                    style={{
                      width: '100%',
                      padding: '4px 8px 4px 26px',
                      fontSize: '11.5px',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 4,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Standard Status
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  {[
                    { id: 'ALL', label: 'All Standards' },
                    { id: 'CURRENT', label: 'Active / In Force' },
                    { id: 'AMENDED', label: 'Amended' }
                  ].map(opt => (
                    <label 
                      key={opt.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        fontSize: '12px', 
                        color: statusFilter === opt.id ? 'var(--navy-900)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: statusFilter === opt.id ? 600 : 400
                      }}
                    >
                      <input
                        type="radio"
                        name="status"
                        checked={statusFilter === opt.id}
                        onChange={() => setStatusFilter(opt.id)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Evidence Note */}
              <div style={{
                padding: '8px 10px',
                backgroundColor: '#f8fafc',
                borderRadius: 4,
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.45
              }}>
                <strong>Evidence Rule:</strong> All recommendations are backed by verbatim clause citations from official standards documents.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: RECOMMENDED STANDARDS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRecs.length > 0 ? (
            filteredRecs.map((rec, idx) => (
              <RecommendationCard key={rec.standard_id || idx} recommendation={rec} />
            ))
          ) : (
            <div className="clean-panel">
              <div className="clean-panel-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <CheckCircle2 size={32} color="var(--text-subtle)" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--navy-900)' }}>
                  No Standards Matching Filter Criteria
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
                  Adjust your filter options or re-run the tender specification analysis.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
