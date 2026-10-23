import React, { useState } from 'react';

export default function HistoryDrawer({
  historyItems,
  onRestore,
  onDelete,
  onClearAll,
  isLoading
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Transformation History (SQLite)</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {historyItems.length > 0 && (
            confirmClear ? (
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--danger-text)' }}>Confirm delete all?</span>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                >
                  Yes, Clear All
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setConfirmClear(true)}
              >
                Clear History
              </button>
            )
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <span className="spinner" />
          <p>Loading records...</p>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="empty-state">
          <p>No saved transformations yet.</p>
          <span style={{ fontSize: '0.75rem' }}>
            Transform messages to persist them to the local SQLite database.
          </span>
        </div>
      ) : (
        <div className="history-list">
          {historyItems.map((item) => {
            const timeStr = item.created_at ? new Date(item.created_at).toLocaleString() : '';
            return (
              <div key={item.id} className="history-card">
                <div className="history-header">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                      {item.persona}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{timeStr}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge ${item.passed_validation ? 'badge-success' : 'badge-warning'}`}>
                      {item.passed_validation ? 'Preserved' : 'Review'}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => onDelete(item.id)}
                      title="Delete record"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="history-preview">
                  <strong style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Original:</strong>{' '}
                  {item.original_text.length > 110 ? item.original_text.substring(0, 110) + '...' : item.original_text}
                </div>

                <div className="history-preview">
                  <strong style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Rewritten:</strong>{' '}
                  {item.rewritten_text.length > 110 ? item.rewritten_text.substring(0, 110) + '...' : item.rewritten_text}
                </div>

                <div className="history-actions" style={{ justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{item.words_changed_percent ?? 0}% words changed</span>
                    <span>•</span>
                    <span>Similarity: {item.similarity_score ?? 0}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => onRestore(item)}
                  >
                    Restore in Editor ↺
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
