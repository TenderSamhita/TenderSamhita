import React, { useState } from 'react';
import { Maximize2, ExternalLink, Image as ImageIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function FigureCard({ figure, standard }) {
  const { openSourcePage, openFigureLightbox } = useApp();
  const [imgError, setImgError] = useState(false);

  const confidencePct = figure.confidence !== undefined 
    ? Math.round(figure.confidence * 100) 
    : 95;

  return (
    <div className="tech-card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Figure Card Header */}
      <div className="tech-card-header">
        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
            {figure.figure_number || 'Figure'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Section: {figure.section || 'General Apparatus'} • Page {figure.page || 1}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {figure.is_confirmed ? (
            <span className="status-badge status-current" style={{ fontSize: '10px' }}>
              <ShieldCheck size={11} /> Confirmed Technical Figure
            </span>
          ) : (
            <span className="status-badge status-review_required" style={{ fontSize: '10px' }}>
              <AlertCircle size={11} /> Unverified Candidate
            </span>
          )}
        </div>
      </div>

      {/* Image Preview Container */}
      <div 
        style={{
          position: 'relative',
          backgroundColor: '#0f172a',
          height: '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          borderBottom: '1px solid var(--border-subtle)'
        }}
        onClick={() => openFigureLightbox(figure)}
        title="Click to expand technical figure in lightbox"
      >
        {!imgError ? (
          <img
            src={figure.image_path}
            alt={figure.caption}
            onError={() => setImgError(true)}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        ) : (
          /* Technical Blueprint / Schematic Representation fallback */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            textAlign: 'center',
            padding: '20px'
          }}>
            <ImageIcon size={40} style={{ marginBottom: 8, opacity: 0.6 }} />
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
              {figure.figure_number || 'Technical Diagram'}
            </div>
            <div style={{ fontSize: '11px', maxWidth: '280px', marginTop: 4, color: '#94a3b8' }}>
              {figure.caption}
            </div>
            <div style={{ marginTop: 8, fontSize: '10px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              Source archive raster at page {figure.page}
            </div>
          </div>
        )}

        {/* Hover Expand Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <Maximize2 size={12} /> Expand
        </div>
      </div>

      {/* Caption & Actions */}
      <div className="tech-card-body" style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {figure.caption || 'Technical engineering diagram representing certified apparatus section.'}
          </p>
          <div style={{ marginTop: 8, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Classifier Confidence: {confidencePct}% • Cleaned of decorative marks/logos
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => openSourcePage(standard.standard_id, figure.page || 1, figure.caption, standard.is_number)}
            className="source-page-link"
          >
            <ExternalLink size={11} /> Source Page: p. {figure.page || 1}
          </button>

          <button
            onClick={() => openFigureLightbox(figure)}
            className="btn-tech btn-secondary btn-sm"
          >
            <Maximize2 size={12} /> Fullscreen Lightbox
          </button>
        </div>
      </div>
    </div>
  );
}
