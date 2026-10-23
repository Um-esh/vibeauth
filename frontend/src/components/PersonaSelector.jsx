import React from 'react';

export const PERSONA_DEFAULTS = {
  executive: { formality: 5, conciseness: 5, friendliness: 2, energy: 3, persuasiveness: 4, technical_depth: 3 },
  peer: { formality: 2, conciseness: 3, friendliness: 5, energy: 4, persuasiveness: 3, technical_depth: 3 },
  legal: { formality: 5, conciseness: 3, friendliness: 1, energy: 2, persuasiveness: 3, technical_depth: 5 },
  casual: { formality: 1, conciseness: 4, friendliness: 5, energy: 5, persuasiveness: 3, technical_depth: 1 }
};

export const PERSONAS = [
  {
    id: 'executive',
    icon: '👔',
    title: 'Executive / C-Level',
    badge: 'Outcome & Impact',
    desc: 'Concise, professional, decision-focused. Prioritizes deadlines, risks, actions, and milestones without background fluff.'
  },
  {
    id: 'peer',
    icon: '🤝',
    title: 'Supportive Peer',
    badge: 'Empathetic & Constructive',
    desc: 'Friendly, empathetic, and collaborative. Maintains shared commitments and tasks using constructive language.'
  },
  {
    id: 'legal',
    icon: '⚖️',
    title: 'Legal & Compliance',
    badge: 'Formal & Unambiguous',
    desc: 'Precise, rigorous, and unambiguous. Safeguards all dates, restrictions, and mandatory obligations.'
  },
  {
    id: 'casual',
    icon: '⚡',
    title: 'Gen-Z / Casual',
    badge: 'Modern & Energetic',
    desc: 'Conversational, energetic, and contemporary without forced cringe slang. Preserves core facts in a relaxed vibe.'
  }
];

export default function PersonaSelector({ selectedPersona, onSelectPersona }) {
  return (
    <div>
      <div className="card-header" style={{ marginBottom: '0.85rem' }}>
        <span className="card-title">
          <span>🎭</span> Target Audience Persona
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Click to adapt tone & writing attributes automatically
        </span>
      </div>
      <div className="personas-grid">
        {PERSONAS.map((p) => {
          const isSelected = selectedPersona === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`persona-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectPersona(p.id)}
            >
              <div className="persona-card-top">
                <span className="persona-icon-avatar">{p.icon}</span>
                <span className={`badge ${isSelected ? 'badge-primary' : 'badge-neutral'}`}>
                  {p.badge}
                </span>
              </div>
              <div className="persona-title">
                <span>{p.title}</span>
              </div>
              <p className="persona-desc">{p.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
