import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle2, 
  GitCompare, 
  Bookmark, 
  Search, 
  Server, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useReview } from '../../context/ReviewContext';

export function AppSidebar() {
  const { currentView, navigateTo, sidebarCollapsed, toggleSidebar } = useApp();
  const { savedStandards, pinnedEvidence } = useReview();

  const totalDossierItems = savedStandards.length + pinnedEvidence.length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tender', label: 'Tender Analysis', icon: FileText },
    { id: 'recommendations', label: 'Recommended Standards', icon: CheckCircle2 },
    { id: 'compare', label: 'Tender vs Standard', icon: GitCompare },
    { id: 'search', label: 'Standards Directory', icon: Search },
    { 
      id: 'review', 
      label: 'Review Workspace', 
      icon: Bookmark, 
      badge: totalDossierItems > 0 ? totalDossierItems : null 
    },
  ];

  return (
    <aside 
      className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : 'expanded'}`}
      aria-label="Application Navigation"
    >
      <div className="sidebar-nav">
        {!sidebarCollapsed && (
          <div className="sidebar-section-title">
            Workspaces
          </div>
        )}

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <div
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => navigateTo(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <div className="sidebar-icon-wrap">
                <Icon size={16} />
              </div>
              
              {!sidebarCollapsed && (
                <>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-badge has-items">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        {/* Telemetry link */}
        <div
          className={`sidebar-item ${currentView === 'system' ? 'active' : ''}`}
          onClick={() => navigateTo('system')}
          title={sidebarCollapsed ? 'System & Index Status' : undefined}
        >
          <div className="sidebar-icon-wrap">
            <Server size={15} color="var(--text-muted)" />
          </div>
          {!sidebarCollapsed && <span>System Health</span>}
        </div>

        {/* Collapse / Expand Toggle */}
        <button
          onClick={toggleSidebar}
          className="btn-tech btn-ghost"
          style={{ 
            width: '100%', 
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            padding: '7px 8px',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-subtle)',
            borderRadius: 0,
            marginTop: '4px'
          }}
          title={sidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : (
            <>
              <ChevronLeft size={15} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Collapse Menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
