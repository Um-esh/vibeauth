import React, { useState } from 'react';
import { DEFAULT_LANGUAGES } from './LanguageSelector';

export default function OutputPanel({
  rewrittenText,
  translatedText,
  targetLanguage,
  targetPersonaTitle = 'Audience',
  selectedPersona = 'executive',
  onOpenSendModal,
  onTranslate,
  isTranslating,
  isLoading,
  processingTimeMs,
  modelInfo,
  preservationReport,
  diff
}) {
  const [copied, setCopied] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState('auto'); // 'en' or 'translated'

  const hasTranslation = Boolean(translatedText && targetLanguage !== 'en');
  
  // Decide which text to show
  const currentTextToShow = (hasTranslation && activeLangTab !== 'en')
    ? translatedText
    : (rewrittenText || '');

  const safeText = typeof currentTextToShow === 'string' ? currentTextToShow : '';
  const wordCount = safeText.trim() ? safeText.trim().split(/\s+/).length : 0;
  const isHighRisk = preservationReport?.risk_level === 'high';

  const handleCopy = async () => {
    if (!safeText) return;
    try {
      await navigator.clipboard.writeText(safeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleQuickTranslate = (langCode) => {
    if (onTranslate && rewrittenText) {
      onTranslate(langCode);
      setActiveLangTab('translated');
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="card-title">
            <span>✨</span> Transformed Communication
          </span>
          {safeText && (
            <span className={`badge ${isHighRisk ? 'badge-danger' : 'badge-success'}`}>
              {isHighRisk ? '⚠️ Preservation Warning' : '✓ Validated Output'}
            </span>
          )}
          {hasTranslation && (
            <span className="badge badge-neutral" style={{ color: '#38bdf8' }}>
              {DEFAULT_LANGUAGES[targetLanguage] || targetLanguage}
            </span>
          )}
        </div>

        {safeText && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {hasTranslation && (
              <div className="nav-tabs" style={{ padding: '0.15rem' }}>
                <button
                  type="button"
                  className={`nav-tab-btn ${activeLangTab === 'en' ? 'active' : ''}`}
                  onClick={() => setActiveLangTab('en')}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`nav-tab-btn ${activeLangTab !== 'en' ? 'active' : ''}`}
                  onClick={() => setActiveLangTab('translated')}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                >
                  Translated
                </button>
              </div>
            )}
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleCopy}
            >
              {copied ? '✓ Copied' : 'Copy Text'}
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={onOpenSendModal}
            >
              <span>📤</span>
              <span>Send to {targetPersonaTitle}</span>
            </button>
          </div>
        )}
      </div>

      <div className="output-box">
        {isLoading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 24, height: 24 }} />
            <p>Executing offline Seq2Seq transformer inference...</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Preserving entities, dates, obligations & formatting tone
            </span>
          </div>
        ) : isTranslating ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 24, height: 24 }} />
            <p>Translating via Google Translate...</p>
          </div>
        ) : safeText ? (
          <div>{safeText}</div>
        ) : (
          <div className="empty-state">
            <p>Your transformed communication will appear here.</p>
            <span style={{ fontSize: '0.75rem' }}>
              Choose a target persona, adjust attributes, and click Transform Message.
            </span>
          </div>
        )}
      </div>

      {safeText && (
        <div style={{ marginTop: '0.85rem' }}>
          <button
            type="button"
            className="btn-primary"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: '#059669',
              color: '#fff',
              fontSize: '0.92rem',
              fontWeight: 600,
              padding: '0.65rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              cursor: 'pointer'
            }}
            onClick={onOpenSendModal}
          >
            <span>📤</span>
            <span>Send to {targetPersonaTitle} (WhatsApp / Email)</span>
          </button>
        </div>
      )}

      {safeText && (
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="textarea-footer" style={{ margin: 0 }}>
            <span>
              {wordCount} words ({diff?.word_count_delta >= 0 ? `+${diff.word_count_delta}` : (diff?.word_count_delta || 0)}) |{' '}
              {diff?.words_changed_percent || 0}% words changed
            </span>
            <span style={{ marginLeft: '0.75rem' }}>
              Inference: {processingTimeMs ? `${processingTimeMs}ms` : ''} ({modelInfo?.name || 'flan-t5'})
            </span>
          </div>

          {/* Quick Translate dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Translate to:</span>
            <select
              className="preset-select"
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
              value={targetLanguage || 'en'}
              onChange={(e) => handleQuickTranslate(e.target.value)}
              disabled={isTranslating || !rewrittenText}
            >
              {Object.entries(DEFAULT_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
