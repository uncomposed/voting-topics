import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';

export const TemplateInfoPanel: React.FC = () => {
  const title = useStore(state => state.title);
  const notes = useStore(state => state.notes);
  const setTitle = useStore(state => state.setTitle);
  const setNotes = useStore(state => state.setNotes);

  const [container, setContainer] = useState<HTMLElement | null>(() => (
    typeof document !== 'undefined' ? document.getElementById('template-info') : null
  ));

  useEffect(() => {
    if (container || typeof document === 'undefined') return;
    let cancelled = false;
    const lookup = () => {
      if (cancelled) return;
      const el = document.getElementById('template-info');
      if (el) {
        setContainer(el);
      } else {
        requestAnimationFrame(lookup);
      }
    };
    lookup();
    return () => { cancelled = true; };
  }, [container]);

  if (!container) return null;

  return createPortal(
    <div className="grid">
      <label>Template Title
        <input
          className="input"
          placeholder="e.g., My 2025 Local Ballot Priorities"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>Notes (optional)
        <textarea
          placeholder="Context you want included in exports…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <div className="chips">
        <span className="chip">Anonymous by design</span>
        <span className="chip">Local-only storage</span>
        <span className="chip">No accounts</span>
      </div>
    </div>,
    container
  );
};
