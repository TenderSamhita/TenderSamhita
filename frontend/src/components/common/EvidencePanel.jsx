import React from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReview } from '../../context/ReviewContext';

export function EvidencePanel({
  standardId,
  isNumber,
  page,
  section,
  clause,
  table,
  figure,
  text,
  score,
  chunkId
}) {
  const { openSourcePage } = useApp();
  const { isEvidencePinned, pinEvidenceItem, unpinEvidenceItem } = useReview();

  const isPinned = isEvidencePinned(text, standardId);

  const handleTogglePin = (e) => {
    e.stopPropagation();
    if (isPinned) {
      // Find and remove
      unpinEvidenceItem(chunkId || text);
    } else {
      pinEvidenceItem({
        id: chunkId || `ev-${Date.now()}`,
        standard_id: standardId,
        is_number: isNumber || standardId?.replace(/_/g, ' '),
        page: page || 1,
        section: section || 'General',
        clause: clause || null,
        table: table || null,
        figure: figure || null,
        text: text
      });
    }
  };

  const handleOpenPage = () => {
    openSourcePage(standardId, page || 1, text, isNumber);
  };

  return (
    <div className="evidence-panel-root">
      <div className="evidence-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--primary-800)', fontFamily: 'var(--font-mono)' }}>
            {isNumber || standardId}
          </span>
          {section && (
            <span style={{ color: 'var(--text-secondary)' }}>
              • Sec: <strong>{section}</strong>
            </span>
          )}
          {clause && (
            <span style={{ color: 'var(--text-secondary)' }}>
              • Cl: <strong>{clause}</strong>
            </span>
          )}
          {table && (
            <span style={{ color: 'var(--text-secondary)' }}>
              • <strong>{table}</strong>
            </span>
          )}
          {figure && (
            <span style={{ color: 'var(--text-secondary)' }}>
              • <strong>{figure}</strong>
            </span>
          )}
          {page && (
            <button
              onClick={handleOpenPage}
              className="source-page-link"
              title="Open source document at this page"
            >
              <FileText size={11} /> p.{page}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleTogglePin}
            className={`btn-tech btn-sm ${isPinned ? 'btn-primary' : 'btn-secondary'}`}
            title={isPinned ? 'Remove from review dossier' : 'Pin evidence to review dossier'}
            style={{ padding: '2px 8px', fontSize: '11px' }}
          >
            {isPinned ? (
              <>
                <BookmarkCheck size={12} color="#86efac" /> Pinned
              </>
            ) : (
              <>
                <Bookmark size={12} /> Pin Evidence
              </>
            )}
          </button>
          <button
            onClick={handleOpenPage}
            className="btn-tech btn-secondary btn-sm"
            style={{ padding: '2px 8px', fontSize: '11px' }}
            title="Inspect full page in document viewer"
          >
            <ExternalLink size={12} /> View Page
          </button>
        </div>
      </div>

      <div className="evidence-quote">
        "{text}"
      </div>
      
      {chunkId && (
        <div style={{ marginTop: 4, fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Provenance ID: {chunkId}
        </div>
      )}
    </div>
  );
}
