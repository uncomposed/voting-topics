import React, { useState } from 'react';
import { Stars } from './Stars';
import type { Direction } from '../schema';
import { uid } from '../utils';

interface DirectionsListProps {
  directions: Direction[];
  onChange: (directions: Direction[]) => void;
}

export const DirectionsList: React.FC<DirectionsListProps> = ({ directions, onChange }) => {
  const [text, setText] = useState("");

  const addDirection = () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    
    const newDirection: Direction = {
      id: uid(),
      text: trimmedText,
      stars: 0,
      sources: [],
      tags: []
    };
    
    onChange([...directions, newDirection]);
    setText("");
  };

  const updateDirection = (directionId: string, patch: Partial<Direction>) => {
    onChange(directions.map(d => 
      d.id === directionId ? { ...d, ...patch } : d
    ));
  };

  const removeDirection = (directionId: string) => {
    onChange(directions.filter(d => d.id !== directionId));
  };

  return (
    <div>
      <div className="direction-controls">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addDirection()}
          placeholder="Add a direction (e.g., 'much less death by firearms')"
          className="input"
        />
        <button
          onClick={addDirection}
          className="btn"
          type="button"
        >
          Add
        </button>
      </div>

      {directions.map(direction => (
        <div key={direction.id} className="direction-item">
          <div className="direction-item-header">
            <div>{direction.text}</div>
            <button
              onClick={() => removeDirection(direction.id)}
              className="btn ghost danger"
              aria-label="Remove direction"
              type="button"
            >
              Remove
            </button>
          </div>

          <div className="row">
            <span className="muted">Importance:</span>
            <Stars
              value={direction.stars}
              onChange={(stars) => updateDirection(direction.id, { stars })}
            />
          </div>

          {direction.notes && (
            <div className="muted" style={{ marginTop: 4 }}>
              <strong>Notes:</strong> {direction.notes}
            </div>
          )}

          {direction.sources.length > 0 && (
            <div className="muted" style={{ marginTop: 4 }}>
              <strong>Sources:</strong> {direction.sources.length} source(s)
            </div>
          )}
        </div>
      ))}

      {directions.length === 0 && (
        <div className="empty" style={{ marginTop: 8 }}>
          No directions added yet. Add your first direction above.
        </div>
      )}
    </div>
  );
};
