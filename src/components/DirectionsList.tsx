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
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addDirection()}
          placeholder="Add a direction (e.g., 'much less death by firearms')"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={addDirection}
          className="px-3 py-2 rounded bg-black text-white hover:bg-gray-800"
        >
          Add
        </button>
      </div>
      
      {directions.map(direction => (
        <div key={direction.id} className="border rounded p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-gray-900">{direction.text}</div>
            <button
              onClick={() => removeDirection(direction.id)}
              className="text-red-600 hover:text-red-800 text-sm"
              aria-label="Remove direction"
            >
              Remove
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Importance:</span>
            <Stars 
              value={direction.stars} 
              onChange={(stars) => updateDirection(direction.id, { stars })}
            />
          </div>
          
          {direction.notes && (
            <div className="mt-2 text-sm text-gray-700">
              <strong>Notes:</strong> {direction.notes}
            </div>
          )}
          
          {direction.sources.length > 0 && (
            <div className="mt-2 text-sm text-gray-700">
              <strong>Sources:</strong> {direction.sources.length} source(s)
            </div>
          )}
        </div>
      ))}
      
      {directions.length === 0 && (
        <div className="text-gray-500 text-sm italic">
          No directions added yet. Add your first direction above.
        </div>
      )}
    </div>
  );
};
