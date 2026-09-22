import React from 'react';
import { HelpCircle } from 'lucide-react';

export function EmptyState({ 
  title = "No data established", 
  message = "No matching records or extractions were found in the indexed corpus for this parameter.",
  action = null,
  icon: Icon = HelpCircle
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      backgroundColor: 'var(--bg-surface)',
      border: '1px dashed var(--border-medium)',
      borderRadius: 'var(--radius-md)',
      textAlign: 'center',
      color: 'var(--text-muted)'
    }}>
      <div style={{ 
        width: 44, 
        height: 44, 
        borderRadius: '50%', 
        backgroundColor: 'var(--bg-surface-subtle)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: 12
      }}>
        <Icon size={22} color="var(--text-muted)" />
      </div>
      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        {title}
      </h4>
      <p style={{ fontSize: '13px', maxWidth: '440px', lineHeight: 1.5, marginBottom: action ? 16 : 0 }}>
        {message}
      </p>
      {action && action}
    </div>
  );
}
