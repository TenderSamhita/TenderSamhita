import React, { useState } from 'react';
import { CheckSquare, AlertTriangle, ArrowRight, Edit3, Save, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function RequirementsViewer({ requirements: initialRequirements, versionWarnings = [], queryText }) {
  const { navigateTo } = useApp();
  const [requirements, setRequirements] = useState(initialRequirements || {});
  const [isEditing, setIsEditing] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  if (!requirements || Object.keys(requirements).length === 0) {
    return null;
  }

  const handleChange = (field, value) => {
    setRequirements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const dims = Array.isArray(requirements.dimensions) 
    ? requirements.dimensions.map(d => typeof d === 'object' ? d.value : d).join(', ')
    : (requirements.dimensions || '');

  const testingStr = Array.isArray(requirements.testing)
    ? requirements.testing.join(', ')
    : (requirements.testing || '');

  const rows = [
    { key: 'product', label: 'Product / Equipment', value: requirements.product || 'Not specified' },
    { key: 'application', label: 'Application / Duty', value: requirements.application || 'Not specified' },
    { key: 'material', label: 'Material / Metallurgy', value: requirements.material || 'Not specified' },
    { key: 'capacity', label: 'Capacity / Rating', value: requirements.capacity || '—' },
    { key: 'dimensions', label: 'Dimensions / Limits', value: dims || '—' },
    { key: 'performance', label: 'Performance / Operating', value: requirements.performance || '—' },
    { key: 'testing', label: 'Testing Protocols', value: testingStr || 'Routine test certificate required' },
    { key: 'safety', label: 'Safety / Markings', value: requirements.safety || 'ISI Standard Mark where mandatory' },
    { key: 'other', label: 'Other Requirements', value: requirements.other || 'Standard packaging & warranty' },
  ];

  return (
    <div className="clean-panel">
      {/* Header */}
      <div className="clean-panel-header" style={{ padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckSquare size={16} color="var(--navy-700)" />
          <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--navy-900)' }}>
            EXTRACTED REQUIREMENTS
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ({rows.length} parameters extracted)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditing ? (
            <button
              onClick={handleSave}
              className="btn-tech btn-primary btn-xs"
            >
              <Save size={12} /> Save Edits
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-tech btn-secondary btn-xs"
            >
              <Edit3 size={12} /> Edit Parameters
            </button>
          )}

          {savedFeedback && (
            <span style={{ fontSize: '11px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Check size={12} /> Saved
            </span>
          )}

          <button
            onClick={() => navigateTo('recommendations')}
            className="btn-tech btn-saffron btn-sm"
          >
            Recommended Standards <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Body: Warning and Compact Editable Rows */}
      <div style={{ padding: '0' }}>
        
        {/* Version Warning if outdated standards found */}
        {versionWarnings.length > 0 && (
          <div style={{
            padding: '10px 18px',
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertTriangle size={15} flexShrink={0} />
            <div>
              <strong>Superseded Standard Detected in Tender:</strong>
              {versionWarnings.map((w, i) => (
                <span key={i} style={{ marginLeft: 6 }}>
                  Tender cites <em>{w.tender_ref}</em>; latest standard in force is <strong>{w.latest_available}</strong>.
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Compact Parameter Rows (Section 9) */}
        <div>
          {rows.map(row => (
            <div key={row.key} className="editable-req-row">
              <div className="editable-req-label">
                {row.label}
              </div>

              <div className="editable-req-value">
                {isEditing ? (
                  <input
                    type="text"
                    className="editable-req-input"
                    value={row.value}
                    onChange={e => handleChange(row.key, e.target.value)}
                  />
                ) : (
                  <span>{row.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Standard Citations in Tender */}
        {requirements.is_references?.length > 0 && (
          <div style={{
            padding: '8px 18px',
            backgroundColor: '#fffbeb',
            borderTop: '1px solid #fef08a',
            fontSize: '11.5px',
            color: '#854d0e',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <strong>Direct Standard Citations in Tender:</strong>
            {requirements.is_references.map((r, i) => (
              <span key={i} className="mono-val" style={{ fontWeight: 700, backgroundColor: '#fef9c3', padding: '1px 6px', borderRadius: 3 }}>
                {r.value || r}
              </span>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
