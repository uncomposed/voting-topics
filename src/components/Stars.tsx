import React, { useEffect, useState } from 'react';
import { clamp } from '../utils';

interface StarsProps {
  value: number;
  onChange: (value: number) => void;
}

export const Stars: React.FC<StarsProps> = ({ value, onChange }) => {
  const [active, setActive] = useState(value);
  
  useEffect(() => setActive(value), [value]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { 
      e.preventDefault(); 
      onChange(clamp(value + 1, 0, 5)); 
    }
    if (e.key === 'ArrowLeft') { 
      e.preventDefault(); 
      onChange(clamp(value - 1, 0, 5)); 
    }
  };

  return (
    <div className="stars" role="group" aria-label="Importance 0 to 5" onKeyDown={handleKey}>
      {Array.from({ length: 6 }, (_, n) => (
        <button
          key={n}
          className="star-btn"
          type="button"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          aria-pressed={value === n}
          onMouseEnter={() => setActive(n)}
          onMouseLeave={() => setActive(value)}
          onClick={() => onChange(n)}
          data-value={n}
        >
          {n === 0 ? '–' : (n <= active ? '★' : '☆')}
        </button>
      ))}
    </div>
  );
};
