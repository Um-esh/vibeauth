import React from 'react';

export const DEFAULT_LANGUAGES = {
  en: 'English (Original)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  hi: 'Hindi (हिन्दी)',
  'zh-cn': 'Chinese (Simplified)',
  ja: 'Japanese (日本語)',
  pt: 'Portuguese (Português)',
  it: 'Italian (Italiano)',
  ru: 'Russian (Русский)',
  ar: 'Arabic (العربية)',
  ko: 'Korean (한국어)',
  nl: 'Dutch (Nederlands)',
  tr: 'Turkish (Türkçe)'
};

export default function LanguageSelector({ selectedLanguage, onSelectLanguage, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <label htmlFor="target-lang-select" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        Output Language:
      </label>
      <select
        id="target-lang-select"
        className="preset-select"
        value={selectedLanguage}
        onChange={(e) => onSelectLanguage(e.target.value)}
        disabled={disabled}
        style={{ minWidth: '160px', padding: '0.4rem 0.6rem', fontWeight: 500 }}
      >
        {Object.entries(DEFAULT_LANGUAGES).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      {selectedLanguage !== 'en' && (
        <span className="badge badge-neutral" style={{ fontSize: '0.7rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
          Google Translate Active
        </span>
      )}
    </div>
  );
}
