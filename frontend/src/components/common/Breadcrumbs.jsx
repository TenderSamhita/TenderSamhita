import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Breadcrumbs({ items = [] }) {
  const { navigateTo } = useApp();

  return (
    <nav className="breadcrumb-bar" aria-label="Breadcrumb">
      <span 
        className="breadcrumb-link" 
        onClick={() => navigateTo('dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Home size={13} /> Dashboard
      </span>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight size={12} style={{ opacity: 0.5 }} />
            {isLast || !item.onClick ? (
              <span className="breadcrumb-current">{item.label}</span>
            ) : (
              <span className="breadcrumb-link" onClick={item.onClick}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
