import React from 'react';
import { Stars } from './Stars';
import { DirectionsList } from './DirectionsList';
import type { Topic, Stance } from '../schema';

interface TopicCardProps {
  topic: Topic;
  onChange: (patch: Partial<Topic>) => void;
  onDelete: () => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, onChange, onDelete }) => {
  const stanceLabels: Record<Stance, string> = {
    'against': 'Strongly Against',
    'lean_against': 'Lean Against',
    'neutral': 'Neutral',
    'lean_for': 'Lean For',
    'for': 'Strongly For'
  };

  return (
    <div className="topic" aria-label={`Topic ${topic.title || topic.id}`}>
      <div className="topic-header">
        <input
          className="input"
          placeholder="Topic title (e.g., Firearms Policy)"
          value={topic.title}
          onChange={e => onChange({ title: e.target.value })}
          aria-label="Topic title"
          data-field="title"
        />
        <div>
          <label className="muted">Topic Importance</label>
          <Stars value={topic.importance} onChange={n => onChange({ importance: n })} />
        </div>
        <div>
          <label className="muted">Stance</label>
          <select
            value={topic.stance}
            onChange={e => onChange({ stance: e.target.value as Stance })}
            aria-label="Stance"
            className="border rounded px-3 py-2"
          >
            <option value="against">Strongly Against</option>
            <option value="lean_against">Lean Against</option>
            <option value="neutral">Neutral</option>
            <option value="lean_for">Lean For</option>
            <option value="for">Strongly For</option>
          </select>
          <div className="muted" style={{ marginTop: '6px' }}>
            Selected: {stanceLabels[topic.stance]}
          </div>
        </div>
      </div>

      <div>
        <label className="muted">Directions</label>
        <div className="text-sm text-gray-600 mb-2">
          Add specific outcomes or changes you want to see within this topic. Each direction gets its own importance rating.
        </div>
        <DirectionsList 
          directions={topic.directions}
          onChange={(directions) => onChange({ directions })}
        />
      </div>

      <label>Notes
        <textarea
          placeholder="Why you feel this way; tradeoffs; personal thresholds…"
          value={topic.notes ?? ''}
          onChange={e => onChange({ notes: e.target.value })}
          aria-label="Notes"
        ></textarea>
      </label>

      <div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="muted">Sources (up to 5)</div>
          <button 
            className="btn ghost" 
            onClick={() => onChange({ 
              sources: [...topic.sources, { label: '', url: '' }].slice(0, 5) 
            })}
          >
            Add Source
          </button>
        </div>
        <div className="grid">
          {topic.sources.map((source, i) => (
            <div className="row" key={i} style={{ alignItems: 'center' }}>
              <input 
                className="input" 
                placeholder="Label" 
                value={source.label} 
                onChange={e => onChange({ 
                  sources: topic.sources.map((x, idx) => 
                    idx === i ? { ...x, label: e.target.value } : x
                  ) 
                })} 
                aria-label={`Source ${i + 1} label`} 
              />
              <input 
                className="input" 
                placeholder="https://…" 
                value={source.url} 
                onChange={e => onChange({ 
                  sources: topic.sources.map((x, idx) => 
                    idx === i ? { ...x, url: e.target.value } : x
                  ) 
                })} 
                aria-label={`Source ${i + 1} URL`} 
              />
              <button 
                className="btn ghost danger" 
                onClick={() => onChange({ 
                  sources: topic.sources.filter((_, idx) => idx !== i) 
                })} 
                aria-label={`Remove source ${i + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="muted">ID: {topic.id}</div>
        <button className="btn ghost danger" onClick={onDelete}>Delete Topic</button>
      </div>
    </div>
  );
};

