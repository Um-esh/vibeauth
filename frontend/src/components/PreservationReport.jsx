import React from 'react';

export default function PreservationReport({ report }) {
  if (!report) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>No validation report available.</p>
          <span style={{ fontSize: '0.75rem' }}>Run a rewrite to inspect factual preservation checks.</span>
        </div>
      </div>
    );
  }

  const {
    passed,
    risk_level,
    entity_check,
    number_check,
    date_check,
    contact_check,
    constraint_check,
    semantic_similarity,
    warnings,
    disclaimer
  } = report;

  const simScore = semantic_similarity?.similarity_score ?? 0;
  const simPercent = Math.round(simScore * 100);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Meaning-Preservation Analysis</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={`badge ${
            risk_level === 'low' ? 'badge-success' :
            risk_level === 'medium' ? 'badge-warning' : 'badge-danger'
          }`}>
            {risk_level === 'low' ? 'Low Risk (Passed)' :
             risk_level === 'medium' ? 'Review Recommended' : 'High Preservation Risk'}
          </span>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {warnings && warnings.length > 0 && (
        <div className={`alert-box ${risk_level === 'high' ? 'alert-danger' : 'alert-warning'}`}>
          <div>
            <strong>Validation Alerts Detected:</strong>
            <ul style={{ marginTop: '0.35rem', paddingLeft: '1.25rem', fontSize: '0.8rem' }}>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Semantic Similarity Gauge */}
      <div style={{ marginBottom: '1.25rem', padding: '0.85rem', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Semantic Similarity Heuristic</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: simScore > 0.75 ? 'var(--success-text)' : 'var(--warning-text)' }}>
            {simPercent}% ({simScore})
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${simPercent}%`,
              height: '100%',
              backgroundColor: simScore > 0.75 ? '#10b981' : simScore > 0.5 ? '#f59e0b' : '#ef4444',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Engine: {semantic_similarity?.method} — {semantic_similarity?.explanation}
        </p>
      </div>

      {/* Preservation Dimension Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {/* 1. Named Entities */}
        <div className="history-card">
          <div className="history-header">
            <strong>1. Named Entities</strong>
            <span className={`badge ${entity_check?.passed ? 'badge-success' : 'badge-danger'}`}>
              {entity_check?.passed ? 'Preserved' : 'Missing Entity'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <p><strong>Original:</strong> {entity_check?.original_entities?.length ? entity_check.original_entities.join(', ') : 'None detected'}</p>
            {entity_check?.missing_entities?.length > 0 && (
              <p style={{ color: 'var(--danger-text)', marginTop: '0.25rem' }}>
                <strong>Missing:</strong> {entity_check.missing_entities.join(', ')}
              </p>
            )}
            {entity_check?.newly_introduced_entities?.length > 0 && (
              <p style={{ color: 'var(--warning-text)', marginTop: '0.25rem' }}>
                <strong>New:</strong> {entity_check.newly_introduced_entities.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* 2. Numbers & Amounts */}
        <div className="history-card">
          <div className="history-header">
            <strong>2. Numerical & Financial</strong>
            <span className={`badge ${number_check?.passed ? 'badge-success' : 'badge-danger'}`}>
              {number_check?.passed ? 'Preserved' : 'Modified / Missing'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <p><strong>Original:</strong> {number_check?.original_numbers?.length ? number_check.original_numbers.join(', ') : 'None detected'}</p>
            {number_check?.missing_numbers?.length > 0 && (
              <p style={{ color: 'var(--danger-text)', marginTop: '0.25rem' }}>
                <strong>Missing:</strong> {number_check.missing_numbers.join(', ')}
              </p>
            )}
            {number_check?.new_numbers?.length > 0 && (
              <p style={{ color: 'var(--warning-text)', marginTop: '0.25rem' }}>
                <strong>Introduced:</strong> {number_check.new_numbers.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* 3. Dates & Deadlines */}
        <div className="history-card">
          <div className="history-header">
            <strong>3. Dates & Deadlines</strong>
            <span className={`badge ${date_check?.passed ? 'badge-success' : 'badge-danger'}`}>
              {date_check?.passed ? 'Preserved' : 'Missing Date'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <p><strong>Original:</strong> {date_check?.original_dates?.length ? date_check.original_dates.join(', ') : 'None detected'}</p>
            {date_check?.missing_dates?.length > 0 && (
              <p style={{ color: 'var(--danger-text)', marginTop: '0.25rem' }}>
                <strong>Missing:</strong> {date_check.missing_dates.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* 4. Negation & Obligations */}
        <div className="history-card">
          <div className="history-header">
            <strong>4. Negation & Obligations</strong>
            <span className={`badge ${constraint_check?.passed ? 'badge-success' : 'badge-warning'}`}>
              {constraint_check?.passed ? 'Polarity Invariant' : 'Tone Shift'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            <p><strong>Negations:</strong> {constraint_check?.negation_check?.original_negations?.join(', ') || 'None in original'}</p>
            <p><strong>Obligations:</strong> {constraint_check?.obligation_check?.original_obligations?.obligations?.join(', ') || 'None in original'}</p>
            {constraint_check?.negation_check?.warning && (
              <p style={{ color: 'var(--danger-text)', marginTop: '0.25rem' }}>{constraint_check.negation_check.warning}</p>
            )}
            {constraint_check?.obligation_check?.warning && (
              <p style={{ color: 'var(--warning-text)', marginTop: '0.25rem' }}>{constraint_check.obligation_check.warning}</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
        <strong>Compliance Notice:</strong> {disclaimer}
      </div>
    </div>
  );
}
