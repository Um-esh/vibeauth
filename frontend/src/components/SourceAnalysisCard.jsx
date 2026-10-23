import React from 'react';

export default function SourceAnalysisCard({ sourceAnalysis }) {
  if (!sourceAnalysis) return null;

  const {
    statistics,
    classification,
    extracted_entities,
    extracted_numbers,
    extracted_dates
  } = sourceAnalysis;

  const intent = classification?.detected_intent || 'unknown';
  const formality = classification?.detected_formality || 'neutral';
  const intentConf = classification?.intent_confidence ? Math.round(classification.intent_confidence * 100) : 50;
  const formalityConf = classification?.formality_confidence ? Math.round(classification.formality_confidence * 100) : 50;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-header">
        <span className="card-title">Source Text Diagnostic Analysis (Stage 1 & 2)</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Local scikit-learn classifier & syntax extractors
        </span>
      </div>

      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-val" style={{ textTransform: 'capitalize', fontSize: '1rem' }}>
            {intent.replace('_', ' ')}
          </div>
          <div className="metric-label">Detected Intent ({intentConf}%)</div>
        </div>

        <div className="metric-card">
          <div className="metric-val" style={{ textTransform: 'capitalize', fontSize: '1rem' }}>
            {formality}
          </div>
          <div className="metric-label">Source Formality ({formalityConf}%)</div>
        </div>

        <div className="metric-card">
          <div className="metric-val">
            Grade {statistics?.readability_grade ?? 0}
          </div>
          <div className="metric-label">Coleman-Liau Index</div>
        </div>

        <div className="metric-card">
          <div className="metric-val">
            {statistics?.avg_sentence_length ?? 0}
          </div>
          <div className="metric-label">Words / Sentence</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
        <span className="badge badge-neutral">
          Entities: {extracted_entities?.length ?? 0}
        </span>
        <span className="badge badge-neutral">
          Numbers: {extracted_numbers?.length ?? 0}
        </span>
        <span className="badge badge-neutral">
          Dates: {extracted_dates?.length ?? 0}
        </span>
        <span className="badge badge-neutral">
          Sentences: {statistics?.sentence_count ?? 1}
        </span>
      </div>
    </div>
  );
}
