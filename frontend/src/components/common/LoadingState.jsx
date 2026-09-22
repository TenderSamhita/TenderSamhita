import React from 'react';

export function LoadingState({ message = "Querying indexed standard corpus..." }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      color: 'var(--text-muted)'
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid var(--border-medium)',
        borderTopColor: 'var(--primary-700)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: 16
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {message}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
        Deterministic evidence verification in progress
      </div>
    </div>
  );
}
