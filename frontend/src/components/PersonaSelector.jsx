import React from 'react';

export const PERSONA_DEFAULTS = {
  executive: { formality: 5, conciseness: 5, friendliness: 2, energy: 3, persuasiveness: 4, technical_depth: 3 },
  peer: { formality: 2, conciseness: 3, friendliness: 5, energy: 4, persuasiveness: 3, technical_depth: 3 },
  legal: { formality: 5, conciseness: 3, friendliness: 1, energy: 2, persuasiveness: 3, technical_depth: 5 },
  casual: { formality: 1, conciseness: 4, friendliness: 5, energy: 5, persuasiveness: 3, technical_depth: 1 }
};

const PERSONAS = [
  {
    id: 'executive',
    title: 'Executive / C-Level',
    badge: 'Outcome & Impact',
    desc: 'Concise, professional, decision-focused. Prioritizes deadlines, risks, actions, and milestones without background fluff.'
  },
  {
    id: 'peer',
    title: 'Supportive Peer',
    badge: 'Empathetic & Constructive',
    desc: 'Friendly, empathetic, and collaborative. Maintains shared commitments and tasks using constructive language.'
  },
  {
    id: 'legal',
    title: 'Legal & Compliance',
    badge: 'Formal & Unambiguous',
    desc: 'Precise, rigorous, and unambiguous. Safeguards all dates, restrictions, and mandatory obligations.'
  },
  {
    id: 'casual',
    title: 'Gen-Z / Casual',
    badge: 'Modern & Energetic',
    desc: 'Conversational, energetic, and contemporary without forced cringe slang. Preserves core facts in a relaxed vibe.'
  }
];

export default function PersonaSelector({ selectedPersona, onSelectPersona }) {
  return (
    <div>
      <label className="card-title" style={{ marginBottom: '0.5rem', display: 'block' }}>
        Target Persona
      </label>
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
              <div className="persona-title">
                <span>{p.title}</span>
              </div>
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>
                {p.badge}
              </span>
              <p className="persona-desc">{p.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
