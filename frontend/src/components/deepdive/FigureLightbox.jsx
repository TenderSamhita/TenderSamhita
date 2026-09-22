import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, FileText, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function FigureLightbox() {
  const { lightboxState, closeFigureLightbox, activeStandardId, openSourcePage } = useApp();
  const { isOpen, figure } = lightboxState;

  const [zoomLevel, setZoomLevel] = useState(100);
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !figure) return null;

  const handleZoomIn = () => setZoomLevel(z => Math.min(300, z + 25));
  const handleZoomOut = () => setZoomLevel(z => Math.max(50, z - 25));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div className="modal-overlay" onClick={closeFigureLightbox} style={{ zIndex: 120 }}>
      <div 
        className="modal-content"
        style={{ width: '92vw', maxWidth: '1100px', height: '88vh', backgroundColor: '#0f172a', color: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Lightbox Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#020617'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
              {figure.figure_number || 'Technical Diagram'} — {figure.caption}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              Standard: {activeStandardId.replace(/_/g, ' ')} • Section: {figure.section || 'Apparatus'} • Page {figure.page}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1e293b', padding: '3px 8px', borderRadius: 4 }}>
              <button 
                onClick={handleZoomOut}
                className="btn-tech btn-sm"
                style={{ background: 'transparent', color: '#fff', border: 'none' }}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', width: '36px', textAlign: 'center' }}>
                {zoomLevel}%
              </span>
              <button 
                onClick={handleZoomIn}
                className="btn-tech btn-sm"
                style={{ background: 'transparent', color: '#fff', border: 'none' }}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button 
                onClick={handleResetZoom}
                className="btn-tech btn-sm"
                style={{ background: 'transparent', color: '#fff', border: 'none' }}
                title="Reset Zoom"
              >
                <Maximize2 size={13} />
              </button>
            </div>

            <button
              onClick={() => {
                closeFigureLightbox();
                openSourcePage(activeStandardId, figure.page, figure.caption);
              }}
              className="btn-tech btn-secondary btn-sm"
              style={{ background: '#1e293b', borderColor: '#475569', color: '#fff' }}
            >
              <FileText size={12} /> View Page
            </button>

            <button 
              onClick={closeFigureLightbox}
              className="btn-tech btn-sm"
              style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '4px' }}
              title="Close Lightbox (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Technical Canvas */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: '#090d16'
        }}>
          {!imgError ? (
            <img
              src={figure.image_path}
              alt={figure.caption}
              onError={() => setImgError(true)}
              style={{
                width: `${zoomLevel}%`,
                maxWidth: zoomLevel <= 100 ? '100%' : 'none',
                maxHeight: zoomLevel <= 100 ? '100%' : 'none',
                objectFit: 'contain',
                transition: 'width 0.15s ease'
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
              <ImageIcon size={64} style={{ opacity: 0.5, marginBottom: 16 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                {figure.figure_number}: {figure.caption}
              </div>
              <div style={{ fontSize: '12px', maxWidth: '460px', margin: '8px auto', color: '#cbd5e1' }}>
                Full technical resolution raster referenced from certified standard apparatus section at page {figure.page}.
              </div>
            </div>
          )}
        </div>

        {/* Lightbox Footer */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid #334155',
          backgroundColor: '#020617',
          fontSize: '11px',
          color: '#94a3b8',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Source: BIS Technical Document Archive</span>
          <span>Verified Non-Decorative Technical Apparatus Raster</span>
        </div>
      </div>
    </div>
  );
}
