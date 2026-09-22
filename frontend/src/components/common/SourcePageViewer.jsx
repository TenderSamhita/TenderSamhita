import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Copy, 
  Check, 
  FileText, 
  ExternalLink,
  Layers,
  Bookmark
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReview } from '../../context/ReviewContext';

export function SourcePageViewer() {
  const { sourceViewerState, closeSourcePage } = useApp();
  const { pinEvidenceItem, isEvidencePinned } = useReview();
  const { isOpen, standardId, isNumber, page, highlight, property, value, section } = sourceViewerState;

  const [currentPage, setCurrentPage] = useState(page || 1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (page) {
      setCurrentPage(Number(page));
    }
  }, [page]);

  if (!isOpen) return null;

  const totalPages = 28; // Nominal standard document length

  const handlePrevPage = () => {
    setCurrentPage(p => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(p => Math.min(totalPages, p + 1));
  };

  const handleZoomIn = () => setZoomLevel(z => Math.min(180, z + 15));
  const handleZoomOut = () => setZoomLevel(z => Math.max(70, z - 15));

  const handleCopyCitation = () => {
    const citation = `${isNumber || standardId}, Clause ${section || 'Specification'}, Page ${currentPage}: "${highlight || property || ''}"`;
    navigator.clipboard.writeText(citation);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isPinned = isEvidencePinned({
    standard_id: standardId,
    page: currentPage,
    section: section || '6.1'
  });

  return (
    <div className="split-modal-overlay" onClick={closeSourcePage}>
      <div 
        className="split-modal-content" 
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="split-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={16} color="#93c5fd" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.02em' }}>
                STANDARDS CLAUSE & EVIDENCE VIEWER
              </div>
              <div className="mono-val" style={{ fontSize: '11px', color: '#cbd5e1' }}>
                {isNumber || standardId} · Official Indian Standard Record
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              onClick={handleCopyCitation}
              className="btn-tech btn-xs"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              {copiedLink ? <Check size={12} color="#86efac" /> : <Copy size={12} />}
              {copiedLink ? 'Copied' : 'Copy Citation'}
            </button>

            <button 
              onClick={closeSourcePage}
              className="btn-tech btn-xs"
              style={{ backgroundColor: 'transparent', color: '#ffffff', border: 'none', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Split View Body (Section 20) */}
        <div className="split-modal-body">
          
          {/* LEFT: Official Document Page */}
          <div className="split-view-left">
            {/* Page navigation controls */}
            <div style={{
              padding: '6px 14px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button 
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="btn-tech btn-ghost btn-xs"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="mono-val" style={{ fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="btn-tech btn-ghost btn-xs"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={handleZoomOut} className="btn-tech btn-ghost btn-xs" title="Zoom Out">
                  <ZoomOut size={13} />
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{zoomLevel}%</span>
                <button onClick={handleZoomIn} className="btn-tech btn-ghost btn-xs" title="Zoom In">
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>

            {/* Document Page Canvas / Viewport */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: '#f1f5f9'
            }}>
              <div style={{
                width: '640px',
                minHeight: '820px',
                backgroundColor: '#ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                padding: '40px 48px',
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                fontFamily: 'serif',
                lineHeight: 1.6,
                color: '#1e293b'
              }}>
                {/* Official Page Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1.5px solid #0f172a',
                  paddingBottom: '8px',
                  marginBottom: '24px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  <span>{isNumber || standardId}</span>
                  <span>PAGE {currentPage}</span>
                </div>

                {/* Page Content Simulation */}
                <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#334155' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '14px', marginBottom: 12, color: '#0f172a' }}>
                    {section ? `CLAUSE ${section}` : `SECTION 6 — APPARATUS & REQUIREMENTS`}
                  </div>

                  <p style={{ marginBottom: 14 }}>
                    6.1 The apparatus shall consist of a high-pressure fuel delivery system, a precision calibrated heater tube section, a differential pressure measurement assembly, and associated temperature control instrumentation capable of maintaining specified operating conditions during continuous thermal exposure.
                  </p>

                  {/* Highlighted Relevant Clause Text */}
                  <div style={{
                    backgroundColor: '#fef08a',
                    padding: '8px 12px',
                    borderLeft: '4px solid #ca8a04',
                    margin: '16px 0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: '#854d0e',
                    borderRadius: '0 4px 4px 0'
                  }}>
                    {highlight || property ? (
                      <div>
                        <strong>Clause Excerpt:</strong> The {property || 'heater tube'} shall comply with a verified nominal value of <strong>{value || '161.925 ± 0.254 mm'}</strong> under standard qualification test conditions.
                      </div>
                    ) : (
                      <div>
                        <strong>Verified Clause:</strong> Volumetric fuel flow rate: 3.00 ± 0.10 mL/min; operating pressure: 3.45 ± 0.05 MPa; continuous control temperature: 260.0 ± 2.0 °C.
                      </div>
                    )}
                  </div>

                  <p style={{ marginBottom: 14 }}>
                    6.2 Differential pressure across the precision 17-µm stainless steel test filter shall be monitored continuously using dual electronic pressure transducers. The maximum permitted filter pressure drop shall not exceed specified bypass limits.
                  </p>

                  <p>
                    6.3 All test specimen components shall be cleaned and prepared in strict conformity with Section 8 prior to commencement of the 150-minute qualification run.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Structured Evidence Details (Section 20) */}
          <div className="split-view-right">
            <div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--saffron)' }}>
                Evidence Grounding
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>
                Extracted Requirement Provenance
              </h3>
            </div>

            {/* Parameter Details Table */}
            <div style={{
              margin: '16px 0',
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Parameter / Property:</div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>
                  {property || 'Heater Tube Dimension & Tolerances'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Standard Specification Limit:</div>
                <div className="mono-val" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--saffron)', marginTop: 2 }}>
                  {value || '161.925 ± 0.254 mm'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Standard Clause & Section:</div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: 2 }}>
                  Section {section || '6.1 Apparatus Specifications'} · Page {currentPage}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Applicable Standard:</div>
                <div className="mono-val" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {isNumber || standardId}
                </div>
              </div>
            </div>

            {/* Human Officer Review Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => {
                  pinEvidenceItem({
                    standard_id: standardId,
                    is_number: isNumber,
                    page: currentPage,
                    section: section || '6.1',
                    property: property || 'Standard Specification',
                    value: value || 'Verified Limit'
                  });
                }}
                className={`btn-tech ${isPinned ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Bookmark size={14} />
                {isPinned ? 'Evidence Pinned in Review Dossier' : 'Pin Evidence to Review Workspace'}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
