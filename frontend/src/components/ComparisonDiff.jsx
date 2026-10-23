import React, { useState } from 'react';

export default function ComparisonDiff({ diff, originalText, rewrittenText }) {
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side', 'inline', 'clean'

  if (!diff || !originalText || !rewrittenText) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>No comparison available yet.</p>
          <span style={{ fontSize: '0.75rem' }}>Run a transformation first to inspect the token-level differences.</span>
        </div>
      </div>
    );
  }

  const {
    original_word_count,
    rewritten_word_count,
    word_count_delta,
    words_added,
    words_removed,
    modified_phrases_count,
    words_changed_percent,
    inline_tokens,
    original_annotated,
    rewritten_annotated,
    formula_explanation
  } = diff;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Lexical Change & Diff Inspector</span>
        <div className="nav-tabs" style={{ padding: '0.15rem' }}>
          <button
            className={`nav-tab-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => setViewMode('side-by-side')}
          >
            Side-by-Side
          </button>
          <button
            className={`nav-tab-btn ${viewMode === 'inline' ? 'active' : ''}`}
            onClick={() => setViewMode('inline')}
          >
            Inline Diff
          </button>
          <button
            className={`nav-tab-btn ${viewMode === 'clean' ? 'active' : ''}`}
            onClick={() => setViewMode('clean')}
          >
            Clean Output
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-val">{words_changed_percent}%</div>
          <div className="metric-label" title={formula_explanation}>Words Changed</div>
        </div>
        <div className="metric-card">
          <div className="metric-val">{original_word_count} → {rewritten_word_count}</div>
          <div className="metric-label">Word Count (Delta {word_count_delta >= 0 ? `+${word_count_delta}` : word_count_delta})</div>
        </div>
        <div className="metric-card">
          <div className="metric-val" style={{ color: 'var(--diff-add-text)' }}>+{words_added}</div>
          <div className="metric-label">Words Added</div>
        </div>
        <div className="metric-card">
          <div className="metric-val" style={{ color: 'var(--diff-remove-text)' }}>-{words_removed}</div>
          <div className="metric-label">Words Removed</div>
        </div>
        <div className="metric-card">
          <div className="metric-val" style={{ color: 'var(--diff-modify-text)' }}>{modified_phrases_count}</div>
          <div className="metric-label">Phrases Modified</div>
        </div>
      </div>

      {/* Legend */}
      <div className="diff-controls-row">
        <div className="diff-legend">
          <span className="legend-item">
            <span className="legend-swatch added" /> Added Text
          </span>
          <span className="legend-item">
            <span className="legend-swatch removed" /> Removed Text
          </span>
          <span className="legend-item">
            <span className="legend-swatch modified" /> Modified Wording
          </span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Edit metric: (removed + modified) / original * 100
        </span>
      </div>

      {/* View Mode: Side-by-Side */}
      {viewMode === 'side-by-side' && (
        <div className="diff-container">
          <div className="diff-pane">
            <div className="diff-pane-title">Original Message</div>
            <div>
              {original_annotated.map((tok, i) => (
                <span key={i} className={`diff-token ${tok.type}`}>
                  {tok.text}{' '}
                </span>
              ))}
            </div>
          </div>
          <div className="diff-pane">
            <div className="diff-pane-title">Transformed Message</div>
            <div>
              {rewritten_annotated.map((tok, i) => (
                <span key={i} className={`diff-token ${tok.type}`}>
                  {tok.text}{' '}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Mode: Inline Diff */}
      {viewMode === 'inline' && (
        <div className="diff-pane" style={{ maxHeight: '450px' }}>
          <div className="diff-pane-title">Unified Inline Stream</div>
          <div>
            {inline_tokens.map((tok, i) => (
              <span key={i} className={`diff-token ${tok.type}`}>
                {tok.text}{' '}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* View Mode: Clean */}
      {viewMode === 'clean' && (
        <div className="diff-pane">
          <div className="diff-pane-title">Final Clean Output</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{rewrittenText}</div>
        </div>
      )}
    </div>
  );
}
