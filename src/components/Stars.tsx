import React, { useEffect, useState } from 'react';
import { clamp } from '../utils';

interface StarsProps {
  value: number;
  onChange: (value: number) => void;
}

const starMeanings = [
  "0 stars – Not rated yet / skip for now",
  "Low importance - Barely relevant",
  "Moderate importance - Somewhat relevant", 
  "High importance - Very relevant",
  "Critical importance - Essential",
  "Maximum importance - Absolutely critical"
];

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

  const meaning = starMeanings[value] ?? '';

  return (
    <div className="stars" role="group" aria-label="Importance 0 to 5" onKeyDown={handleKey}>
      {Array.from({ length: 6 }, (_, n) => (
        <button
          key={n}
          className={`star-btn ${n <= value ? 'filled' : ''}`}
          type="button"
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          aria-pressed={value === n}
          title={starMeanings[n]}
          onMouseEnter={() => setActive(n)}
          onMouseLeave={() => setActive(value)}
          onClick={() => onChange(n)}
          data-value={n}
        >
          {n === 0 ? '–' : (n <= active ? '★' : '☆')}
        </button>
      ))}
      {meaning && (
        <span className="star-meaning" style={{ 
          marginLeft: '8px', 
          fontSize: '0.85rem', 
          color: 'var(--muted)',
          fontStyle: 'italic'
        }}>
          {meaning}
        </span>
      )}
    </div>
  );
};
