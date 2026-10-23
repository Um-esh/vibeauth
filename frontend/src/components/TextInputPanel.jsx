import React from 'react';

const PRESETS = [
  {
    title: '-- Select an Example Message --',
    text: ''
  },
  {
    title: 'Project Delay & Budget Notice (Executive / High Stakes)',
    text: 'We must submit the Q3 financial report to Sarah by Friday October 30 at 5:00 PM with the $450,000 revised budget. The unexpected database migration caused a 15% delay, but all core deliverables will remain intact.'
  },
  {
    title: 'Security Compliance Notice (Legal / Mandatory Rules)',
    text: 'Pursuant to updated GDPR guidelines, all developers must encrypt production credentials at rest. Do not commit .env files to public repositories. All vendor keys will expire automatically after 90 days on November 15.'
  },
  {
    title: 'Engineering Architecture Decision (Peer Collaboration)',
    text: 'Hey everyone, the core team decided to migrate our analytics storage from MongoDB to PostgreSQL by next Tuesday. Please test your query endpoints in staging and report any latency regression in the Slack channel.'
  },
  {
    title: 'Informal Hackathon & Social Event (Casual)',
    text: 'Good news team! Leadership approved our Q4 internal hackathon for December 12. First prize is $1,500 and free tacos for everybody who participates. Make sure you register your squad by December 5.'
  }
];

export default function TextInputPanel({
  text,
  onChangeText,
  onClear,
  onSubmit,
  isLoading,
  error
}) {
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSelectPreset = (e) => {
    const selected = PRESETS.find((p) => p.title === e.target.value);
    if (selected && selected.text) {
      onChangeText(selected.text);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Original Text</span>
        <select
          className="preset-select"
          onChange={handleSelectPreset}
          defaultValue=""
          aria-label="Load example message"
        >
          {PRESETS.map((p, idx) => (
            <option key={idx} value={p.title}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      <div className="textarea-wrapper">
        <textarea
          className="editor-textarea"
          placeholder="Paste or write the original communication here (e.g. email, status update, compliance directive, or Slack message)..."
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          maxLength={2500}
        />
        <div className="textarea-footer">
          <span>{wordCount} words | {charCount} / 2500 characters</span>
          {text && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={onClear}
              disabled={isLoading}
            >
              Clear Text
            </button>
          )}
        </div>
      </div>

      <div className="btn-row">
        <button
          type="button"
          className="btn-primary"
          onClick={onSubmit}
          disabled={isLoading || !text.trim()}
          style={{ width: '100%' }}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              <span>Running Local Inference Pipeline...</span>
            </>
          ) : (
            <span>Transform Message</span>
          )}
        </button>
      </div>
    </div>
  );
}
