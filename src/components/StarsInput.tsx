interface StarsInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function StarsInput({ label, value, onChange, disabled }: StarsInputProps) {
  return (
    <fieldset className="stars-input">
      <legend>{label}</legend>
      <div className="star-buttons">
        {[0, 1, 2, 3, 4, 5].map((stars) => (
          <button
            aria-pressed={value === stars}
            className={value === stars ? 'star active' : 'star'}
            disabled={disabled}
            key={stars}
            onClick={() => onChange(stars)}
            type="button"
          >
            {stars}<span className="sr-only"> stars</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
