import React from 'react';

export default function ErrorBanner({ error, onDismiss }) {
  if (!error) return null;

  return (
    <div className="alert-box alert-danger" style={{ marginBottom: '1rem' }}>
      <div style={{ flex: 1 }}>
        <strong>Processing Error:</strong>
        <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{error.message || String(error)}</p>
        {error.details && (
          <pre style={{ marginTop: '0.5rem', fontSize: '0.75rem', overflowX: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 4 }}>
            {JSON.stringify(error.details, null, 2)}
          </pre>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{ background: 'transparent', color: 'var(--danger-text)', fontSize: '1rem', border: 'none', cursor: 'pointer' }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
