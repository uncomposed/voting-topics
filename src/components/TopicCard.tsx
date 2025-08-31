import React from 'react';
import { Stars } from './Stars';
import type { Topic } from '../schema';

interface TopicCardProps {
  topic: Topic;
  onChange: (patch: Partial<Topic>) => void;
  onDelete: () => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, onChange, onDelete }) => {
  const dirLabel = (v: number) => ({
    '-2': 'Strongly Against',
    '-1': 'Lean Against',
    '0': 'Neutral',
    '1': 'Lean For',
    '2': 'Strongly For'
  }[String(v)]);

  return (
    <div className="topic" aria-label={`Topic ${topic.title || topic.id}`}>
      <div className="topic-header">
        <input
          className="input"
          placeholder="Topic title (e.g., School Bond Measure)"
          value={topic.title}
          onChange={e => onChange({ title: e.target.value })}
          aria-label="Topic title"
        />
        <div>
          <label className="muted">Importance</label>
          <Stars value={topic.importance} onChange={n => onChange({ importance: n })} />
        </div>
        <div>
          <label className="muted">Direction</label>
          <div className="row">
            <select
              value={topic.mode}
              onChange={e => {
                const mode = e.target.value as 'scale' | 'custom';
                onChange({ 
                  mode, 
                  direction: mode === 'scale' ? { scale: 0 } : { custom: '' } 
                });
              }}
              aria-label="Direction mode"
            >
              <option value="scale">Select (For/Against)</option>
              <option value="custom">Freeform</option>
            </select>

            {topic.mode === 'scale' ? (
              <select
                value={String(topic.direction.scale ?? 0)}
                onChange={e => onChange({ direction: { scale: Number(e.target.value) } })}
                aria-label="Direction scale"
              >
                <option value="-2">Strongly Against</option>
                <option value="-1">Lean Against</option>
                <option value="0">Neutral</option>
                <option value="1">Lean For</option>
                <option value="2">Strongly For</option>
              </select>
            ) : (
              <input
                className="input"
                placeholder="Describe your position…"
                value={topic.direction.custom ?? ''}
                onChange={e => onChange({ direction: { custom: e.target.value } })}
                aria-label="Direction freeform"
              />
            )}
          </div>
          <div className="muted" style={{ marginTop: '6px' }}>
            {topic.mode === 'scale' 
              ? `Selected: ${dirLabel(topic.direction.scale ?? 0)}` 
              : 'Custom description enabled'
            }
          </div>
        </div>
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
