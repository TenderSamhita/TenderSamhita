import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowRight, Layers, ChevronRight, BookOpen, Tag } from 'lucide-react';
import { LoadingState } from '../components/common/LoadingState';
import { searchService } from '../services/searchService';
import { standardService } from '../services/standardService';
import { useApp } from '../context/AppContext';

// Helper to format raw database standard IDs into official Indian Standard citations
function formatStandardIdentifier(id, fallbackIsNumber) {
  if (fallbackIsNumber && fallbackIsNumber.includes(':')) return fallbackIsNumber;
  if (!id) return fallbackIsNumber || 'Indian Standard';
  
  // Example: IS_10870_2026 -> IS 10870:2026
  // Example: IS_1448_Part_97_2026 -> IS 1448 (Part 97):2026
  let formatted = id.replace(/^IS_/, 'IS ');
  if (formatted.includes('_Part_')) {
    formatted = formatted.replace(/_Part_(\d+)_(\d{4})$/, ' (Part $1):$2');
  } else {
    formatted = formatted.replace(/_(\d{4})$/, ':$1');
    formatted = formatted.replace(/_/g, ' ');
  }
  return formatted;
}

export function SearchPage() {
  const { openStandard, navigateTo, openSourcePage } = useApp();
  const [query, setQuery] = useState('petrol');
  const [searchMode, setSearchMode] = useState('hybrid');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const exampleSearches = [
    'thermal oxidation stability gas turbine fuel',
    'stainless steel water tank',
    'pressure vessel test method',
    'petrol'
  ];

  const executeSearch = async (overrideQuery) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await searchService.search(q, searchMode, 15);
      setResults(data.results || []);
    } catch (err) {
      console.warn('Backend search fallback:', err);
      const list = await standardService.listStandards(q);
      setResults(list.map(s => ({
        chunk_id: s.standard_id,
        standard_id: s.standard_id,
        is_number: s.is_number,
        title: s.title,
        page: 1,
        section: 'Scope & Application',
        text: s.relevance_hint || s.title,
        score: 0.95
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, [searchMode]);

  return (
    <div className="workspace-container">
      
      {/* Top Header */}
      <div>
        <div className="mini-breadcrumbs">
          <span className="crumb-link" onClick={() => navigateTo('dashboard')}>Dashboard</span>
          <span>/</span>
          <span className="crumb-current">Standards Directory</span>
        </div>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
          Indian Standards Research Catalog
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Search indexed standards, clauses, apparatus specifications, and test methods.
        </p>
      </div>

      {/* Large Search Input */}
      <div className="clean-panel">
        <div className="clean-panel-body" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && executeSearch()}
                placeholder="Search Indian Standards (e.g. thermal oxidation stability, petrol, IS 1448)..."
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  fontSize: '13px',
                  borderRadius: 6,
                  border: '1px solid var(--border-medium)',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--navy-700)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
              />
            </div>

            <button
              onClick={() => executeSearch()}
              disabled={loading}
              className="btn-tech btn-primary"
              style={{ height: '40px', padding: '0 20px', fontWeight: 600 }}
            >
              Search Database
            </button>
          </div>

          {/* Example Search Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Try searching:
            </span>
            {exampleSearches.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(ex);
                  executeSearch(ex);
                }}
                className="btn-tech btn-ghost btn-xs"
                style={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px'
                }}
              >
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two-Column Search Layout */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        
        {/* Left: Compact Filter Side Panel */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          <div className="clean-panel">
            <div className="clean-panel-header" style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={13} color="var(--navy-700)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy-900)' }}>
                  SEARCH FILTERS
                </span>
              </div>
            </div>

            <div className="clean-panel-body" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Retrieval Algorithm
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {[
                    { id: 'hybrid', label: 'Hybrid (FAISS + BM25)' },
                    { id: 'semantic', label: 'Dense Semantic (FAISS)' },
                    { id: 'lexical', label: 'Exact Lexical (BM25)' }
                  ].map(m => (
                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', cursor: 'pointer', color: searchMode === m.id ? 'var(--navy-900)' : 'var(--text-secondary)', fontWeight: searchMode === m.id ? 600 : 400 }}>
                      <input
                        type="radio"
                        name="searchMode"
                        checked={searchMode === m.id}
                        onChange={() => setSearchMode(m.id)}
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{
                padding: '10px',
                backgroundColor: '#f8fafc',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.5
              }}>
                <strong>Catalog Scope:</strong> Covers petroleum, metallurgy, apparatus, and testing standards indexed in local repository.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <LoadingState message="Querying indexed standards and clause excerpts..." />}

          {!loading && results.map((item, idx) => {
            const formattedIS = formatStandardIdentifier(item.standard_id, item.is_number);

            return (
              <div 
                key={idx} 
                className="clean-panel interactive-card"
                style={{ 
                  borderRadius: 8,
                  padding: '16px 20px',
                  borderLeft: '4px solid var(--navy-800)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span className="mono-val" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--navy-900)' }}>
                        {formattedIS}
                      </span>
                      {item.section && (
                        <span className="status-pill status-neutral" style={{ fontSize: '10.5px' }}>
                          Clause: {item.section}
                        </span>
                      )}
                      {item.page && (
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: '#f1f5f9', padding: '1px 6px', borderRadius: 3 }}>
                          Page {item.page}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                      {item.title}
                    </h4>

                    {/* Excerpt snippet */}
                    <p style={{ 
                      fontSize: '12.5px', 
                      color: 'var(--text-secondary)', 
                      marginTop: 8, 
                      lineHeight: 1.55,
                      backgroundColor: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {item.text}
                    </p>
                  </div>

                  <button
                    onClick={() => openStandard(item.standard_id, 'mindmap')}
                    className="btn-tech btn-primary btn-sm"
                    style={{ flexShrink: 0 }}
                  >
                    Open Knowledge Map <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && results.length === 0 && (
            <div className="clean-panel">
              <div className="clean-panel-body" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                No standards found matching "{query}". Try a different keyword or IS number.
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
