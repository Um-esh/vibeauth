import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import PersonaSelector, { PERSONA_DEFAULTS, PERSONAS } from './components/PersonaSelector';
import AttributeSliders from './components/AttributeSliders';
import TextInputPanel from './components/TextInputPanel';
import OutputPanel from './components/OutputPanel';
import SourceAnalysisCard from './components/SourceAnalysisCard';
import HistoryDrawer from './components/HistoryDrawer';
import ErrorBanner from './components/ErrorBanner';
import SendModal from './components/SendModal';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('transformer');
  const [inputText, setInputText] = useState(
    'We must submit the Q3 financial report to Sarah by Friday October 30 at 5:00 PM with the $450,000 revised budget. The unexpected database migration caused a 15% delay, but all core deliverables will remain intact.'
  );
  const [selectedPersona, setSelectedPersona] = useState('executive');
  const [attributes, setAttributes] = useState(PERSONA_DEFAULTS.executive);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const [rewrittenText, setRewrittenText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [diff, setDiff] = useState(null);
  const [preservationReport, setPreservationReport] = useState(null);
  const [sourceAnalysis, setSourceAnalysis] = useState(null);
  const [processingTimeMs, setProcessingTimeMs] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

  const [systemStatus, setSystemStatus] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch health and initial history
  useEffect(() => {
    async function init() {
      try {
        const health = await api.getHealth();
        setSystemStatus(health);
      } catch (err) {
        console.warn('Backend not yet reachable:', err.message);
      }
      loadHistory();
    }
    init();
  }, []);

  const loadHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const items = await api.getHistory(30);
      setHistoryItems(items || []);
    } catch (err) {
      console.warn('Failed to load history:', err.message);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSelectPersona = (personaId) => {
    setSelectedPersona(personaId);
    if (PERSONA_DEFAULTS[personaId]) {
      setAttributes(PERSONA_DEFAULTS[personaId]);
    }
  };

  const handleAttributeChange = (key, value) => {
    setAttributes((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTransform = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.rewrite({
        text: inputText,
        persona: selectedPersona,
        attributes,
        target_language: selectedLanguage,
        enable_regeneration: true,
        save_to_history: true,
      });

      // Defensive unpacking supporting both schemas
      const textOut = result?.rewritten_text || result?.rewritten || '';
      const transOut = result?.translated_text || '';
      const diffOut = result?.diff || null;
      const presOut = result?.preservation_report || result?.validation || null;
      const srcOut = result?.source_analysis || null;
      const timeMs = result?.processing_time_ms || result?.processing_ms || null;
      const modInfo = result?.model_info || result?.model || null;

      setRewrittenText(textOut);
      setTranslatedText(transOut);
      setDiff(diffOut);
      setPreservationReport(presOut);
      setSourceAnalysis(srcOut);
      setProcessingTimeMs(timeMs);
      setModelInfo(modInfo);

      // Refresh history list
      loadHistory();
    } catch (err) {
      console.error('Transform error:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async (langCode) => {
    setSelectedLanguage(langCode);
    if (!rewrittenText) return;
    if (langCode === 'en') {
      setTranslatedText('');
      return;
    }
    setIsTranslating(true);
    try {
      const res = await api.translate({
        text: rewrittenText,
        target_lang: langCode,
      });
      setTranslatedText(res.translated_text || '');
    } catch (err) {
      console.error('Translation error:', err);
      setError(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setRewrittenText('');
    setTranslatedText('');
    setDiff(null);
    setPreservationReport(null);
    setSourceAnalysis(null);
    setError(null);
  };

  const handleRestoreFromHistory = (item) => {
    setInputText(item.original_text);
    setRewrittenText(item.rewritten_text);
    setSelectedPersona(item.persona);
    if (item.attributes) {
      setAttributes(item.attributes);
    }
    setDiff(item.diff_summary);
    setPreservationReport(item.preservation_report);
    setActiveTab('transformer');
  };

  const handleDeleteHistory = async (id) => {
    try {
      await api.deleteHistoryItem(id);
      setHistoryItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await api.clearAllHistory();
      setHistoryItems([]);
    } catch (err) {
      setError(err);
    }
  };

  const targetPersonaTitle = PERSONAS.find((p) => p.id === selectedPersona)?.title || 'Audience';
  const textToSend = (translatedText && selectedLanguage !== 'en') ? translatedText : rewrittenText;

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        historyCount={historyItems.length}
      />

      <main className="main-content">
        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {/* Tab 1: Transformer */}
        {activeTab === 'transformer' && (
          <div>
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <PersonaSelector
                selectedPersona={selectedPersona}
                onSelectPersona={handleSelectPersona}
              />
              <AttributeSliders
                attributes={attributes}
                onChangeAttribute={handleAttributeChange}
              />
            </div>

            <div className="workspace-grid">
              <TextInputPanel
                text={inputText}
                onChangeText={setInputText}
                onClear={handleClear}
                onSubmit={handleTransform}
                isLoading={isLoading}
                error={error}
              />
              <OutputPanel
                rewrittenText={rewrittenText}
                translatedText={translatedText}
                targetLanguage={selectedLanguage}
                targetPersonaTitle={targetPersonaTitle}
                selectedPersona={selectedPersona}
                onOpenSendModal={() => setIsSendModalOpen(true)}
                onTranslate={handleTranslate}
                isTranslating={isTranslating}
                isLoading={isLoading}
                processingTimeMs={processingTimeMs}
                modelInfo={modelInfo}
                preservationReport={preservationReport}
                diff={diff}
              />
            </div>

            {sourceAnalysis && (
              <SourceAnalysisCard sourceAnalysis={sourceAnalysis} />
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <HistoryDrawer
            historyItems={historyItems}
            onRestore={handleRestoreFromHistory}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearAllHistory}
            isLoading={isHistoryLoading}
          />
        )}
      </main>

      <SendModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        targetPersonaTitle={targetPersonaTitle}
        transformedText={textToSend}
        selectedPersona={selectedPersona}
      />
    </div>
  );
}
