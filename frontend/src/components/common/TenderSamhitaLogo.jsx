import React from 'react';

/**
 * Tender Samhita Official Logo Component
 * Variants:
 * - 'full': Logo emblem + Brand Title + Subtitle
 * - 'compact': Emblem + Brand Title
 * - 'emblem-only': Just the geometric emblem
 * - 'monochrome': Grayscale / subtle white variant
 */
export function TenderSamhitaLogo({ 
  variant = 'compact', 
  height = 36, 
  showTagline = true, 
  theme = 'dark', // 'dark' (on dark navy header) or 'light' (on white canvas)
  onClick,
  style = {} 
}) {
  const isLightText = theme === 'dark';

  if (variant === 'emblem-only') {
    return (
      <div 
        onClick={onClick}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          cursor: onClick ? 'pointer' : 'default',
          ...style 
        }}
        title="Tender Samhita"
      >
        <img 
          src="/logo.png" 
          alt="Tender Samhita" 
          style={{ 
            height: height, 
            width: height, 
            objectFit: 'contain',
            borderRadius: '4px'
          }} 
        />
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '10px', 
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...style 
      }}
      title="Tender Samhita — Procurement Standards Intelligence"
    >
      <img 
        src="/logo.png" 
        alt="Tender Samhita Emblem" 
        style={{ 
          height: height, 
          width: height, 
          objectFit: 'contain',
          borderRadius: '4px',
          backgroundColor: '#ffffff',
          padding: '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            fontFamily: 'var(--font-sans)', 
            fontWeight: 800, 
            fontSize: height > 34 ? '15px' : '14px', 
            letterSpacing: '0.04em',
            color: isLightText ? '#ffffff' : '#0b192c',
            textTransform: 'uppercase'
          }}>
            TENDER SAMHITA
          </span>
        </div>

        {showTagline && (
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: isLightText ? '#94a3b8' : '#64748b',
            whiteSpace: 'nowrap'
          }}>
            Procurement Standards Intelligence
          </span>
        )}
      </div>
    </div>
  );
}
