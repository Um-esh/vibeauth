import React from 'react';

const ATTRIBUTE_CONFIGS = [
  { key: 'formality', label: 'Formality', minLabel: 'Casual', maxLabel: 'Formal' },
  { key: 'conciseness', label: 'Conciseness', minLabel: 'Detailed', maxLabel: 'Brevity' },
  { key: 'friendliness', label: 'Friendliness', minLabel: 'Neutral', maxLabel: 'Warm' },
  { key: 'energy', label: 'Energy', minLabel: 'Measured', maxLabel: 'High Energy' },
  { key: 'persuasiveness', label: 'Persuasiveness', minLabel: 'Informational', maxLabel: 'Compelling' },
  { key: 'technical_depth', label: 'Technical Depth', minLabel: 'Simple', maxLabel: 'Deep Tech' }
];

export default function AttributeSliders({ attributes, onChangeAttribute }) {
  return (
    <div>
      <div className="card-header" style={{ marginBottom: '0.75rem' }}>
        <span className="card-title">Adjustable Writing Attributes</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fine-tune generation tone (1-5)</span>
      </div>
      <div className="sliders-grid">
        {ATTRIBUTE_CONFIGS.map((cfg) => {
          const val = attributes[cfg.key] || 3;
          return (
            <div key={cfg.key} className="slider-group">
              <div className="slider-label-row">
                <span className="slider-name">{cfg.label}</span>
                <span className="slider-val-badge">{val} / 5</span>
              </div>
              <input
                type="range"
                className="range-slider"
                min="1"
                max="5"
                step="1"
                value={val}
                onChange={(e) => onChangeAttribute(cfg.key, parseInt(e.target.value, 10))}
                aria-label={cfg.label}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                <span>{cfg.minLabel}</span>
                <span>{cfg.maxLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
