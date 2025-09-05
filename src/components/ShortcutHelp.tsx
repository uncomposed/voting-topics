import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

export const ShortcutHelp: React.FC = () => {
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const hintsEnabled = useStore(s => s.hintsEnabled);

  useEffect(() => {
    const toggle = () => setOpen(v => !v);
    window.addEventListener('vt-toggle-shortcuts', toggle as EventListener);
    return () => window.removeEventListener('vt-toggle-shortcuts', toggle as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => { document.removeEventListener('keydown', onKey); window.clearTimeout(id); };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" onClick={() => setOpen(false)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
          <div className="modal-header-actions">
            <button ref={closeBtnRef} className="btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="modal-body">
          <ul>
            <li><b>t</b>: Toggle List/Card (or exit to Preferences)</li>
            <li><b>b</b>: Toggle Ballot / Back to Preferences</li>
            <li><b>c</b>: Toggle Compare</li>
            <li><b>n</b>: New Topic</li>
            <li><b>?</b>: Toggle this Shortcuts overlay</li>
            <li><b>Esc</b>: Close menus, popovers, or overlays</li>
          </ul>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => useStore.setState(s => ({ hintsEnabled: !s.hintsEnabled }))}>
              {hintsEnabled ? 'Disable Hint Mode' : 'Enable Hint Mode'}
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={() => setOpen(false)}>Got it</button>
        </div>
      </div>
    </div>
  );
};

