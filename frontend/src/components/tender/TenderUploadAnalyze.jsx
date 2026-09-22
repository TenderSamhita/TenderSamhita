import React, { useState } from 'react';
import { Upload, FileText, Send, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { tenderService } from '../../services/tenderService';
import { recommendationService } from '../../services/recommendationService';
import { useApp } from '../../context/AppContext';

export function TenderUploadAnalyze({ onAnalysisComplete }) {
  const { 
    tenderText, 
    setTenderText, 
    setTenderAnalysis, 
    setRecommendationResult,
    navigateTo 
  } = useApp();

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('text'); // 'text' | 'upload'

  const sampleQueries = [
    {
      label: 'Jet Fuel Thermal Oxidation Apparatus',
      text: 'Procurement of Jet Fuel Thermal Oxidation Stability Test Apparatus and consumables. Requirements: Heater tube diameter 4.737 mm, test temperature 260 deg C, operating pressure 3.45 MPa, volumetric fuel flow 3.0 mL/min for aviation turbine fuel qualification.'
    },
    {
      label: 'Stainless Steel Water Storage Tank',
      text: 'Supply of Grade 304 Stainless Steel water storage tanks for public drinking distribution. Capacity 500 liters, nominal wall thickness 2.5 mm, hydrostatic test pressure 0.5 MPa, food-grade sanitary finish.'
    },
    {
      label: 'Pressure Vessel Carbon Steel Flanges',
      text: 'Procurement of forged carbon steel pipe flanges for high-pressure steam line service. Rating Class 300, weld neck design, nominal bore 150 mm, conforming to mandatory hydrostatic and tensile testing.'
    }
  ];

  const handleAnalyze = async () => {
    if (!tenderText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Analyze tender text
      const analysis = await tenderService.analyzeText(tenderText);
      setTenderAnalysis(analysis);

      // 2. Automatically retrieve evidence-grounded recommendations
      const recs = await recommendationService.getRecommendations(tenderText, 5);
      setRecommendationResult(recs);

      if (onAnalysisComplete) onAnalysisComplete({ analysis, recs });
    } catch (err) {
      console.error('Tender analysis failed:', err);
      setError(err.message || 'Failed to analyze tender requirements.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    setError(null);

    try {
      const uploadResult = await tenderService.uploadPdf(selectedFile);
      setTenderAnalysis(uploadResult);

      const queryForRecs = uploadResult.query_text || uploadResult.requirements?.product || selectedFile.name;
      setTenderText(queryForRecs);

      const recs = await recommendationService.getRecommendations(queryForRecs, 5);
      setRecommendationResult(recs);

      if (onAnalysisComplete) onAnalysisComplete({ analysis: uploadResult, recs });
    } catch (err) {
      console.error('PDF upload failed:', err);
      setError(err.message || 'Failed to process tender PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clean-panel">
      {/* Workspace Header */}
      <div className="clean-panel-header" style={{ padding: '14px 20px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--navy-900)' }}>
            Tender Analysis Workspace
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
            Extract procurement requirements and identify applicable Indian Standards.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setMode('text')}
            className={`btn-tech btn-sm ${mode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileText size={13} /> Specification Text
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`btn-tech btn-sm ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Upload size={13} /> Upload PDF
          </button>
        </div>
      </div>

      <div className="clean-panel-body" style={{ padding: '18px 20px' }}>
        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 4,
            color: '#991b1b',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '12.5px'
          }}>
            <AlertCircle size={15} flexShrink={0} />
            <span>{error}</span>
          </div>
        )}

        {mode === 'text' ? (
          <div>
            <textarea
              id="tender-text-input"
              rows={4}
              value={tenderText}
              onChange={e => setTenderText(e.target.value)}
              placeholder="Paste procurement specification text, technical clauses, or bill of quantities..."
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid var(--border-medium)',
                borderRadius: 6,
                fontSize: '13px',
                lineHeight: 1.5,
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
                outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--navy-700)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
            />

            {/* Quick Preset Queries */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Preset Examples:
              </span>
              {sampleQueries.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTenderText(q.text)}
                  className="btn-tech btn-ghost btn-xs"
                  style={{
                    backgroundColor: '#f1f5f9',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Deterministic extraction across indexed Indian Standards and technical clauses.
              </span>

              <button
                onClick={handleAnalyze}
                disabled={loading || !tenderText.trim()}
                className="btn-tech btn-saffron"
                style={{ padding: '7px 18px', fontWeight: 600 }}
              >
                {loading ? 'Extracting Requirements...' : 'Analyze Tender'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div 
              style={{
                border: '1.5px dashed var(--border-medium)',
                borderRadius: 6,
                padding: '32px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('tender-pdf-input')?.click()}
            >
              <Upload size={28} color="var(--navy-700)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--navy-900)' }}>
                Click to upload Tender Specification PDF
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 4 }}>
                Supports standard GeM, PSU, CPWD, Railway, and State PWD technical tender documents (Max 25 MB).
              </p>

              <input
                type="file"
                accept=".pdf"
                id="tender-pdf-input"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                }}
              />

              {file && (
                <div style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 4,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--navy-900)'
                }}>
                  <FileText size={14} />
                  <span>{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              )}
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Parsing document & extracting technical clauses...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
