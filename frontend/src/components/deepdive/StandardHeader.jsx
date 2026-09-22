import React from 'react';
import { 
  FileText, 
  Bookmark, 
  BookmarkCheck, 
  GitCompare, 
  Info, 
  ExternalLink 
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';
import { useReview } from '../../context/ReviewContext';

export function StandardHeader({ standard }) {
  const { openSourcePage, navigateTo, setIsStandardInfoOpen } = useApp();
  const { isStandardSaved, toggleSaveStandard } = useReview();

  if (!standard) return null;

  const isSaved = isStandardSaved(standard.standard_id);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 18px',
      backgroundColor: '#ffffff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 6,
      flexWrap: 'wrap',
      gap: 12
    }}>
      {/* Left: Compact Identity & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="mono-val" style={{ 
            fontSize: '16px', 
            fontWeight: 800, 
            color: 'var(--navy-900)' 
          }}>
            {standard.is_number}
          </span>
          <span className="status-pill status-current">
            {standard.status || 'CURRENT'}
          </span>
          {standard.edition && (
            <span className="status-pill status-neutral">
              {standard.edition}
            </span>
          )}
        </div>

        <div style={{ 
          fontSize: '13px', 
          fontWeight: 500, 
          color: 'var(--text-secondary)',
          maxWidth: '560px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {standard.title}
        </div>
      </div>

      {/* Right: Actions (Standard Info Drawer, Open Source PDF, Compare, Save) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setIsStandardInfoOpen(true)}
          className="btn-tech btn-secondary btn-sm"
          title="Open complete standard metadata drawer"
        >
          <Info size={13} /> Standard Info
        </button>

        <button
          onClick={() => openSourcePage(standard.standard_id, 1, '', standard.is_number)}
          className="btn-tech btn-primary btn-sm"
        >
          <FileText size={13} /> Open Source PDF
        </button>

        <button
          onClick={() => navigateTo('compare', { standardId: standard.standard_id })}
          className="btn-tech btn-secondary btn-sm"
        >
          <GitCompare size={13} /> Compare vs Tender
        </button>

        <button
          onClick={() => toggleSaveStandard(standard.standard_id)}
          className={`btn-tech btn-sm ${isSaved ? 'btn-primary' : 'btn-secondary'}`}
        >
          {isSaved ? <BookmarkCheck size={13} color="#86efac" /> : <Bookmark size={13} />}
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}
