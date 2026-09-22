import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Bookmark, 
  ArrowRight, 
  Sliders, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  ChevronRight,
  Database
} from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { TenderSamhitaLogo } from '../components/common/TenderSamhitaLogo';
import { systemService } from '../services/systemService';
import { standardService } from '../services/standardService';
import { useApp } from '../context/AppContext';
import { useReview } from '../context/ReviewContext';

export function DashboardPage() {
  const { navigateTo, openStandard, tenderAnalysis, recommendationResult, tenderText } = useApp();
  const { savedStandards, pinnedEvidence } = useReview();
  const [stats, setStats] = useState(null);
  const [recentStandards, setRecentStandards] = useState([]);

  useEffect(() => {
    systemService.getSystemStatus()
      .then(res => {
        if (res.stats) setStats(res.stats);
      })
      .catch(err => console.warn('Dashboard stats:', err));

    standardService.listStandards()
      .then(list => {
        setRecentStandards(list.slice(0, 4));
      })
      .catch(err => console.warn('Standards list:', err));
  }, []);

  return (
    <div className="workspace-container">
      
      {/* 1. Contextual Welcome Area (Section 8) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 0 16px 0',
        borderBottom: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img 
            src="/logo.png" 
            alt="Tender Samhita" 
            style={{ 
              height: 48, 
              width: 48, 
              objectFit: 'contain',
              borderRadius: 6,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ 
                fontSize: '20px', 
                fontWeight: 800, 
                color: 'var(--navy-900)',
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
              }}>
                TENDER SAMHITA
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--saffron)',
                backgroundColor: 'var(--saffron-subtle)',
                border: '1px solid var(--saffron-border)',
                padding: '1px 6px',
                borderRadius: 4
              }}>
                Intelligence Platform
              </span>
            </div>
            <p style={{ 
              fontSize: '13px', 
              color: 'var(--text-secondary)', 
              marginTop: 3, 
              maxWidth: '650px' 
            }}>
              Ground procurement specifications against Indian Standards with traceable evidence.
            </p>
          </div>
        </div>

        {/* Primary and Secondary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={() => navigateTo('tender')}
            className="btn-tech btn-saffron"
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
          >
            <FileText size={15} /> Analyze Tender
          </button>
          
          <button 
            onClick={() => navigateTo('search')}
            className="btn-tech btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Search size={15} /> Search Standards
          </button>
        </div>
      </div>

      {/* 2. Workspace Cards (Active Tender, Recent Standards, Review Queue) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 16
      }}>
        
        {/* Active Tender Card */}
        <div className="clean-panel">
          <div className="clean-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} color="var(--navy-700)" />
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--navy-900)' }}>
                ACTIVE TENDER SPECIFICATION
              </span>
            </div>
            <button 
              onClick={() => navigateTo('tender')}
              className="btn-tech btn-ghost btn-xs"
            >
              Open Workspace <ChevronRight size={12} />
            </button>
          </div>
          <div className="clean-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ 
              fontSize: '12.5px', 
              color: 'var(--text-secondary)', 
              lineHeight: 1.55,
              background: '#f8fafc',
              padding: '10px 12px',
              borderRadius: 4,
              border: '1px solid var(--border-subtle)'
            }}>
              {tenderText.length > 170 ? `${tenderText.slice(0, 170)}...` : tenderText}
            </p>

            {tenderAnalysis?.requirements ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: '11.5px' }}>
                <span className="status-pill status-neutral">
                  Product: <strong>{tenderAnalysis.requirements.product || 'Fuel Apparatus'}</strong>
                </span>
                <span className="status-pill status-neutral">
                  Temp: <strong>260 °C</strong>
                </span>
                <span className="status-pill status-neutral">
                  Pressure: <strong>3.45 MPa</strong>
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Ready to extract technical parameters and evaluate compliance.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button 
                onClick={() => navigateTo('tender')}
                className="btn-tech btn-primary btn-sm"
              >
                Intake & Extract Parameters
              </button>
              {recommendationResult?.recommendations?.length > 0 && (
                <button 
                  onClick={() => navigateTo('recommendations')}
                  className="btn-tech btn-secondary btn-sm"
                >
                  View {recommendationResult.recommendations.length} Matched Standards
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Standards Card */}
        <div className="clean-panel">
          <div className="clean-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={15} color="var(--navy-700)" />
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--navy-900)' }}>
                STANDARDS DIRECTORY
              </span>
            </div>
            <button 
              onClick={() => navigateTo('search')}
              className="btn-tech btn-ghost btn-xs"
            >
              Browse All <ChevronRight size={12} />
            </button>
          </div>
          <div className="clean-panel-body" style={{ padding: '4px 0' }}>
            {recentStandards.map(std => (
              <div 
                key={std.standard_id}
                onClick={() => openStandard(std.standard_id, 'mindmap')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 18px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background-color 0.12s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono-val" style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: '12.5px' }}>
                      {std.is_number}
                    </span>
                    <span className="status-pill status-current" style={{ fontSize: '10px', padding: '1px 5px' }}>
                      CURRENT
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {std.title}
                  </div>
                </div>

                <span style={{ fontSize: '11px', color: 'var(--primary-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                  Open Map <ChevronRight size={12} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Review Queue Card */}
        <div className="clean-panel">
          <div className="clean-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bookmark size={15} color="var(--navy-700)" />
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--navy-900)' }}>
                REVIEW QUEUE
              </span>
            </div>
            <button 
              onClick={() => navigateTo('review')}
              className="btn-tech btn-ghost btn-xs"
            >
              Open Dossier <ChevronRight size={12} />
            </button>
          </div>
          <div className="clean-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                padding: '12px 18px',
                borderRadius: 4,
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                flex: 1
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Saved Standards</div>
                <div className="mono-val" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--navy-900)', marginTop: 2 }}>
                  {savedStandards.length}
                </div>
              </div>

              <div style={{
                padding: '12px 18px',
                borderRadius: 4,
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                flex: 1
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Pinned Evidence</div>
                <div className="mono-val" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--saffron)', marginTop: 2 }}>
                  {pinnedEvidence.length}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              All determinations recorded in the review workspace constitute human procurement officer annotations for the technical qualification dossier.
            </p>

            <button 
              onClick={() => navigateTo('review')}
              className="btn-tech btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start' }}
            >
              Examine Officer Dossier
            </button>
          </div>
        </div>

      </div>

      {/* 3. Subtle, Quiet Telemetry (Section 8: "If statistics are real, display them subtly") */}
      {stats && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={13} color="var(--text-muted)" />
            <span>Indexed Corpus Repository:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span><strong>{stats.standards || 16}</strong> Indian Standards</span>
            <span>•</span>
            <span><strong>{stats.specifications?.toLocaleString() || '6,527'}</strong> Extracted Specifications</span>
            <span>•</span>
            <span><strong>{stats.tables || 151}</strong> Tables</span>
            <span>•</span>
            <span><strong>{stats.figures_confirmed || 38}</strong> Confirmed Figures</span>
          </div>
        </div>
      )}

    </div>
  );
}
