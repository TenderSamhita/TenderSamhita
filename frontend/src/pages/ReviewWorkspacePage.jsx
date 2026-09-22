import React, { useState } from 'react';
import { 
  Bookmark, 
  FileText, 
  Download, 
  Trash2, 
  CheckSquare, 
  ExternalLink, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit2
} from 'lucide-react';
import { useReview } from '../context/ReviewContext';
import { useApp } from '../context/AppContext';

export function ReviewWorkspacePage() {
  const { 
    savedStandards, 
    pinnedEvidence, 
    officerNotes, 
    standardStatuses, 
    toggleSaveStandard, 
    unpinEvidenceItem, 
    updateNote, 
    setOfficerReviewStatus, 
    clearDossier 
  } = useReview();

  const { openStandard, openSourcePage, navigateTo } = useApp();

  const handleExportDossier = () => {
    const report = {
      title: "Tender Samhita — Technical Standards Review Dossier",
      generated_at: new Date().toISOString(),
      officer_disclaimer: "Prepared by Technical Evaluation Committee. Human officer decision record.",
      saved_standards: savedStandards.map(id => ({
        standard_id: id,
        status: standardStatuses[id] || 'REVIEW_PENDING',
        officer_note: officerNotes[id] || ''
      })),
      pinned_evidence: pinnedEvidence
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tender_Samhita_Review_Dossier_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="workspace-container">
      {/* Header & Export Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="mini-breadcrumbs">
            <span className="crumb-link" onClick={() => navigateTo('dashboard')}>Dashboard</span>
            <span>/</span>
            <span className="crumb-current">Review Workspace</span>
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
            Officer Review Dossier
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Human Procurement Officer Decision Record • Evaluated standards and pinned evidence.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExportDossier}
            disabled={savedStandards.length === 0 && pinnedEvidence.length === 0}
            className="btn-tech btn-saffron btn-sm"
          >
            <Download size={13} /> Export Technical Dossier
          </button>
          <button
            onClick={clearDossier}
            disabled={savedStandards.length === 0 && pinnedEvidence.length === 0}
            className="btn-tech btn-secondary btn-sm"
            title="Clear all saved standards and pinned evidence"
          >
            <Trash2 size={13} /> Clear Workspace
          </button>
        </div>
      </div>

      {/* 1. Saved Standards Section */}
      <div className="clean-panel">
        <div className="clean-panel-header" style={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bookmark size={15} color="var(--navy-700)" />
            <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy-900)' }}>
              1. Evaluated Indian Standards ({savedStandards.length})
            </h3>
          </div>
        </div>

        <div style={{ padding: 0 }}>
          {savedStandards.length > 0 ? (
            <div>
              {savedStandards.map(standardId => {
                const isNum = standardId.replace(/_/g, ' ');
                const status = standardStatuses[standardId] || 'REVIEW_PENDING';
                const note = officerNotes[standardId] || '';

                return (
                  <div 
                    key={standardId}
                    style={{
                      padding: '16px 18px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="mono-val" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--navy-900)' }}>
                          {isNum}
                        </span>

                        {/* Officer Status Selector */}
                        <select
                          value={status}
                          onChange={e => setOfficerReviewStatus(standardId, e.target.value)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            borderRadius: 4,
                            border: '1px solid var(--border-medium)',
                            backgroundColor: '#ffffff',
                            fontWeight: 600,
                            color: 'var(--navy-900)'
                          }}
                        >
                          <option value="REVIEW_PENDING">Pending Officer Review</option>
                          <option value="ACCEPTED_APPLICABLE">Accepted: Applicable Standard</option>
                          <option value="NEEDS_CLARIFICATION">Needs Clarification from Bidder</option>
                          <option value="NON_APPLICABLE">Non-Applicable to Tender</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openStandard(standardId, 'mindmap')}
                          className="btn-tech btn-primary btn-xs"
                        >
                          Knowledge Map
                        </button>
                        <button
                          onClick={() => toggleSaveStandard(standardId)}
                          className="btn-tech btn-ghost btn-xs"
                          style={{ color: '#ef4444' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Officer Notes Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Edit2 size={13} color="var(--text-muted)" />
                      <input
                        type="text"
                        placeholder="Add procurement officer note or evaluation rationale..."
                        value={note}
                        onChange={e => updateNote(standardId, e.target.value)}
                        style={{
                          flex: 1,
                          padding: '5px 10px',
                          fontSize: '12px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 4,
                          outline: 'none',
                          backgroundColor: '#f8fafc'
                        }}
                        onFocus={e => { e.target.style.backgroundColor = '#ffffff'; e.target.style.borderColor = 'var(--navy-700)'; }}
                        onBlur={e => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.borderColor = 'var(--border-subtle)'; }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
              No standards saved yet. Explore the Knowledge Map or Recommendations to save standards for evaluation.
            </div>
          )}
        </div>
      </div>

      {/* 2. Pinned Evidence Excerpts */}
      <div className="clean-panel">
        <div className="clean-panel-header" style={{ padding: '12px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} color="var(--navy-700)" />
            <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy-900)' }}>
              2. Pinned Evidence Excerpts ({pinnedEvidence.length})
            </h3>
          </div>
        </div>

        <div style={{ padding: 0 }}>
          {pinnedEvidence.length > 0 ? (
            <div>
              {pinnedEvidence.map((ev, idx) => (
                <div 
                  key={idx}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12.5px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono-val" style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                        {ev.is_number || ev.standard_id}
                      </span>
                      <span className="status-pill status-neutral">
                        Section {ev.section || 'Clause'} · Page {ev.page || 1}
                      </span>
                    </div>
                    <div style={{ marginTop: 3, color: 'var(--text-secondary)' }}>
                      <strong>{ev.property || 'Requirement'}:</strong> {ev.value || 'Verified in standard'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => openSourcePage(ev.standard_id, ev.page || 1, ev.value, ev.is_number, {
                        property: ev.property,
                        value: ev.value,
                        section: ev.section
                      })}
                      className="btn-tech btn-secondary btn-xs"
                    >
                      Inspect Source Page
                    </button>
                    <button
                      onClick={() => unpinEvidenceItem(ev)}
                      className="btn-tech btn-ghost btn-xs"
                      style={{ color: '#ef4444' }}
                    >
                      Unpin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
              No evidence excerpts pinned. Open any standard clause or PDF viewer and click "Pin Evidence" to collect citations here.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
