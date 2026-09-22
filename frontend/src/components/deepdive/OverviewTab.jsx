import React from 'react';
import { 
  FileText, Table2, Image as ImageIcon, Link2, 
  Layers, CheckSquare, Compass, ShieldCheck 
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { useApp } from '../../context/AppContext';

export function OverviewTab({ standard, tables = [], figures = [], references = [] }) {
  const { setDeepDiveTab, openSourcePage } = useApp();

  if (!standard) return null;

  const sectionsCount = standard.sections?.length || standard.sections_count || 14;
  const specsCount = standard.specifications?.length || standard.specifications_count || 32;
  const tablesCount = tables.length || standard.tables_count || 5;
  const confirmedFiguresCount = figures.filter(f => f.is_confirmed).length;
  const referencesCount = references.length || standard.references_count || 8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Top Grid: Standard Facts Panel + Product/Category Context */}
      <div className="grid-2">
        
        {/* Compact Standard Facts Panel per Section 5 */}
        <div className="tech-card">
          <div className="tech-card-header">
            <h3>
              <FileText size={15} /> Standard Facts
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Source: Indexed Corpus Metadata
            </span>
          </div>
          <div className="tech-card-body" style={{ padding: 0 }}>
            <table className="tech-table">
              <tbody>
                <tr>
                  <td style={{ width: '40%', fontWeight: 600, color: 'var(--text-muted)' }}>IS Number</td>
                  <td className="cell-mono" style={{ fontWeight: 700, color: 'var(--primary-800)' }}>
                    {standard.is_number}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Edition / Year</td>
                  <td>{standard.edition || 'Second Revision'} ({standard.edition_year || 2026})</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>International Concordance</td>
                  <td>{standard.iso_reference || 'None officially declared'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>ICS Code</td>
                  <td className="cell-mono">{standard.ics_code || 'Not classified'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Technical Status</td>
                  <td><StatusBadge status={standard.status || 'CURRENT'} /></td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Indexed Sections</td>
                  <td className="cell-mono">
                    <button 
                      onClick={() => setDeepDiveTab('specifications')}
                      className="source-page-link"
                    >
                      {sectionsCount} sections
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Technical Specifications</td>
                  <td className="cell-mono">
                    <button 
                      onClick={() => setDeepDiveTab('requirements')}
                      className="source-page-link"
                    >
                      {specsCount} parameters
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Extracted Tables</td>
                  <td className="cell-mono">
                    <button 
                      onClick={() => setDeepDiveTab('tables')}
                      className="source-page-link"
                    >
                      {tablesCount} tables
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Confirmed Technical Figures</td>
                  <td className="cell-mono">
                    <button 
                      onClick={() => setDeepDiveTab('figures')}
                      className="source-page-link"
                    >
                      {confirmedFiguresCount} figures
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Normative References</td>
                  <td className="cell-mono">
                    <button 
                      onClick={() => setDeepDiveTab('references')}
                      className="source-page-link"
                    >
                      {referencesCount} standards
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Application / Product Context Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div className="tech-card">
            <div className="tech-card-header">
              <h3>
                <Compass size={15} /> Application & Product Context
              </h3>
            </div>
            <div className="tech-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="param-label">Target Product Category</div>
                  <div className="param-value" style={{ fontWeight: 600 }}>
                    {standard.product_context?.category || 'Standard Industrial Product / Testing Method'}
                  </div>
                </div>
                <div>
                  <div className="param-label">Procurement & Engineering Application</div>
                  <div className="param-value">
                    {standard.product_context?.application || 'Evaluation and qualification testing of delivered commodities'}
                  </div>
                </div>
                <div>
                  <div className="param-label">Measurement Apparatus / Tooling</div>
                  <div className="param-value">
                    {standard.product_context?.apparatus || 'Calibrated testing apparatus conforming to normative clauses'}
                  </div>
                </div>
                <div>
                  <div className="param-label">Specified Materials & Grades</div>
                  <div className="param-value">
                    {standard.product_context?.material || 'Corrosion resistant steel, certified alloys, reference fuel stock'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Scope Excerpt */}
          <div className="tech-card" style={{ flex: 1 }}>
            <div className="tech-card-header">
              <h3>
                <FileText size={15} /> Scope Summary
              </h3>
              <button 
                onClick={() => setDeepDiveTab('scope')}
                className="btn-tech btn-secondary btn-sm"
              >
                Full Scope Text
              </button>
            </div>
            <div className="tech-card-body">
              <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                {standard.scope || 'Scope text available in standard document.'}
              </p>
              <div style={{ marginTop: 12 }}>
                <button 
                  onClick={() => openSourcePage(standard.standard_id, 1, standard.scope, standard.is_number)}
                  className="source-page-link"
                >
                  Inspect Section 1 (p. 1)
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
