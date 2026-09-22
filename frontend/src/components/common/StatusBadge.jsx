import React from 'react';

export function StatusBadge({ status, label, size = 'normal' }) {
  if (!status && !label) return null;

  const rawStatus = (status || label || '').toString().toUpperCase();
  let cssClass = 'status-neutral';
  let displayLabel = label || status;

  if (rawStatus === 'CURRENT' || rawStatus === 'MATCH' || rawStatus === 'STRONG MATCH' || rawStatus === 'APPLICABLE' || rawStatus === 'ONLINE') {
    cssClass = 'status-current';
  } else if (rawStatus === 'AMENDED' || rawStatus === 'RELEVANT' || rawStatus === 'HIGH') {
    cssClass = 'status-amended';
  } else if (
    rawStatus === 'REVIEW REQUIRED' || 
    rawStatus === 'REQUIRES_REVIEW' || 
    rawStatus === 'REQUIRES REVIEW' || 
    rawStatus === 'MEDIUM' || 
    rawStatus === 'DEGRADED' ||
    rawStatus === 'TENDER_NOT_SPECIFIED' ||
    rawStatus === 'POTENTIALLY RELEVANT'
  ) {
    cssClass = 'status-review_required';
    if (rawStatus === 'TENDER_NOT_SPECIFIED') {
      displayLabel = 'Tender: Not Specified';
    }
  } else if (rawStatus === 'SUPERSEDED' || rawStatus === 'MISMATCH' || rawStatus === 'LOW' || rawStatus === 'OFFLINE') {
    cssClass = 'status-superseded';
  } else if (rawStatus === 'NOT FOUND' || rawStatus === 'NOT_FOUND') {
    cssClass = 'status-neutral';
    displayLabel = 'Not established from indexed sources';
  }

  return (
    <span className={`status-badge ${cssClass}`} style={size === 'small' ? { fontSize: '10px', padding: '1px 6px' } : {}}>
      {displayLabel}
    </span>
  );
}
