import React from 'react';
import { 
  Sparkles, 
  FileText, 
  Sliders, 
  Table2, 
  Image as ImageIcon, 
  Link2, 
  Share2, 
  ShieldCheck, 
  History, 
  Layers 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DEEP_DIVE_TABS = [
  { id: 'mindmap', label: 'Knowledge Map (Mind Map)', icon: Sparkles, hero: true },
  { id: 'specifications', label: 'Specifications', icon: Sliders },
  { id: 'tables', label: 'Tables', icon: Table2 },
  { id: 'figures', label: 'Figures', icon: ImageIcon },
  { id: 'references', label: 'Normative References', icon: Link2 },
  { id: 'allied', label: 'Allied Standards', icon: Share2 },
  { id: 'conformity', label: 'Conformity & QCO', icon: ShieldCheck },
  { id: 'amendments', label: 'Versions & History', icon: History },
  { id: 'evidence', label: 'Evidence Trail', icon: Layers },
  { id: 'overview', label: 'Overview & Facts', icon: FileText },
];

export function DeepDiveNav({ counts = {} }) {
  const { deepDiveTab, setDeepDiveTab } = useApp();

  return (
    <div 
      className="no-scrollbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        overflowX: 'auto',
        padding: '6px 2px',
        borderBottom: '1px solid var(--border-subtle)',
        userSelect: 'none'
      }}
    >
      {DEEP_DIVE_TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = deepDiveTab === tab.id;
        const count = counts[tab.id];

        return (
          <button
            key={tab.id}
            onClick={() => setDeepDiveTab(tab.id)}
            className={`btn-tech btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              borderRadius: '20px',
              fontWeight: isActive ? 600 : 500,
              backgroundColor: isActive ? 'var(--navy-900)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              border: isActive ? '1px solid var(--navy-950)' : '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap',
              boxShadow: isActive ? '0 2px 8px rgba(11, 25, 44, 0.16)' : 'none',
              transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <Icon size={13} color={tab.hero && !isActive ? 'var(--saffron)' : undefined} />
            <span>{tab.label}</span>
            {count !== undefined && count > 0 && (
              <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                padding: '1px 6px',
                borderRadius: '8px',
                backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : 'var(--bg-active)',
                color: isActive ? '#ffffff' : 'var(--text-muted)'
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
