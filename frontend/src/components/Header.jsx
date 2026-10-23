import React from 'react';

export default function Header({ activeTab, setActiveTab, systemStatus, historyCount }) {
  const isOffline = systemStatus?.offline_mode;
  const isReady = systemStatus?.models_ready;

  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand-wrapper">
          <div className="logo-badge">IP</div>
          <div>
            <h1 className="brand-title">Instant Persona & Communication Transformer</h1>
            <p className="brand-subtitle">Local NLP / ML Style Adaptation & Preservation Engine</p>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Main application tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'transformer' ? 'active' : ''}`}
            onClick={() => setActiveTab('transformer')}
          >
            Transformer
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History {historyCount > 0 ? `(${historyCount})` : ''}
          </button>
        </nav>

        <div className="system-status-wrapper">
          {isReady ? (
            <div className={`status-indicator ${isOffline ? 'offline-badge' : ''}`}>
              <span className={`status-dot ${isOffline ? 'offline' : ''}`} />
              <span>{isOffline ? '100% Offline (Local ML)' : 'Local ML Engine Active'}</span>
            </div>
          ) : (
            <div className="status-indicator" style={{ borderColor: '#eab308', color: '#facc15' }}>
              <span className="status-dot" style={{ backgroundColor: '#facc15' }} />
              <span>Initializing Models...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
