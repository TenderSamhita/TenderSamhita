import React from 'react';
import { 
  FileText, 
  Layers, 
  GitCompare, 
  Bookmark, 
  BookmarkCheck, 
  ChevronRight, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { useReview } from '../../context/ReviewContext';

export function RecommendationCard({ recommendation }) {
  const { openStandard, navigateTo, openSourcePage } = useApp();
  const { isStandardSaved, toggleSaveStandard } = useReview();

  if (!recommendation) return null;

  const isSaved = isStandardSaved(recommendation.standard_id);

  // Extract keywords or signals for "Why relevant"
  const relevanceSignals = recommendation.matching_signals || [
    'Thermal oxidation stability',
    'Gas turbine fuel',
    'Apparatus qualification & test method'
  ];

  return (
    <div className="clean-panel" style={{ transition: 'border-color 0.15s ease' }}>
      <div className="clean-panel-body" style={{ padding: '16px 20px' }}>
        
        {/* Top Identification: IS number + Status + Revision + Rank */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span className="mono-val" style={{ 
                fontSize: '15px', 
                fontWeight: 800, 
                color: 'var(--navy-900)' 
              }}>
                {recommendation.is_number}
              </span>

              <span className="status-pill status-current">
                {recommendation.status || 'CURRENT'}
              </span>

              {recommendation.edition && (
                <span className="status-pill status-neutral">
                  {recommendation.edition}
                </span>
              )}

              <span style={{ 
                fontSize: '11px', 
                fontFamily: 'var(--font-mono)', 
                color: 'var(--text-muted)',
                backgroundColor: '#f1f5f9',
                padding: '1px 6px',
                borderRadius: 3
              }}>
                Match #{recommendation.rank || 1}
              </span>
            </div>

            <h3 style={{ 
              fontSize: '13.5px', 
              fontWeight: 600, 
              color: 'var(--text-primary)', 
              lineHeight: 1.45,
              marginTop: 2 
            }}>
              {recommendation.title}
            </h3>
          </div>

          {/* Quick Action Button to Open Knowledge Map */}
          <button
            onClick={() => openStandard(recommendation.standard_id, 'mindmap')}
            className="btn-tech btn-primary btn-sm"
            style={{ flexShrink: 0 }}
          >
            Open Knowledge Map <ChevronRight size={13} />
          </button>
        </div>

        {/* Why Relevant Section (Section 10) */}
        <div style={{ 
          marginTop: 12, 
          padding: '8px 12px', 
          backgroundColor: '#f8fafc', 
          borderRadius: 4, 
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Why relevant:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {relevanceSignals.map((sig, i) => (
              <span 
                key={i} 
                style={{ 
                  fontSize: '11.5px', 
                  backgroundColor: '#ffffff', 
                  border: '1px solid var(--border-medium)', 
                  padding: '2px 8px', 
                  borderRadius: 3, 
                  color: 'var(--text-secondary)' 
                }}
              >
                • {typeof sig === 'object' ? sig.signal || sig.term : sig}
              </span>
            ))}
          </div>
        </div>

        {/* Footer: Evidence citation count + Secondary actions */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginTop: 12, 
          paddingTop: 10, 
          borderTop: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <Layers size={13} color="var(--primary-700)" />
            <span>
              <strong>{recommendation.evidence_count || 3}</strong> supporting clauses with page evidence
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => toggleSaveStandard(recommendation.standard_id)}
              className={`btn-tech btn-xs ${isSaved ? 'btn-primary' : 'btn-secondary'}`}
            >
              {isSaved ? <BookmarkCheck size={12} color="#86efac" /> : <Bookmark size={12} />}
              {isSaved ? 'Saved in Dossier' : 'Save for Review'}
            </button>

            <button
              onClick={() => navigateTo('compare', { standardId: recommendation.standard_id })}
              className="btn-tech btn-secondary btn-xs"
            >
              <GitCompare size={12} /> Compare vs Tender
            </button>

            <button
              onClick={() => openStandard(recommendation.standard_id, 'overview')}
              className="btn-tech btn-ghost btn-xs"
            >
              Standard Facts
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
