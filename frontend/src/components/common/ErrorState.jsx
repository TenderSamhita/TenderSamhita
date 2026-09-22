import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ErrorState({ 
  title = "Backend Service Error", 
  message = "An error occurred while communicating with the technical standards indexing service.",
  onRetry = null 
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '36px 24px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 'var(--radius-md)',
      textAlign: 'center',
      color: '#991b1b'
    }}>
      <AlertTriangle size={32} style={{ marginBottom: 12, color: '#dc2626' }} />
      <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: 6 }}>
        {title}
      </h4>
      <p style={{ fontSize: '13px', maxWidth: '480px', lineHeight: 1.5, color: '#7f1d1d', marginBottom: onRetry ? 16 : 0 }}>
        {message}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="btn-tech btn-secondary btn-sm"
          style={{ borderColor: '#fca5a5', color: '#991b1b', backgroundColor: '#fff' }}
        >
          <RefreshCw size={13} /> Retry Operation
        </button>
      )}
    </div>
  );
}

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
