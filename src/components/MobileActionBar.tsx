import React, { useState } from 'react';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';

interface Props {
  showCards: boolean;
  onToggleView: () => void;
}

export const MobileActionBar: React.FC<Props> = ({ showCards, onToggleView }) => {
  const addTopic = useStore(state => state.addTopic);
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-action-bar" aria-label="Mobile actions">
      <button
        className="btn"
        onClick={() => addTopic(0)}
        aria-label="New Topic"
      >
        + New
      </button>
      <button
        className="btn"
        onClick={onToggleView}
        aria-label="Toggle View"
      >
        {showCards ? 'List View' : 'Card View'}
      </button>
      <div className="mobile-export">
        <button
          className="btn"
          onClick={() => setOpen(v => !v)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Export options"
        >
          Export
        </button>
        {open && (
          <div className="mobile-export-menu" role="menu">
            <button className="btn" onClick={() => { setOpen(false); try { exportJSON(); } catch (e) { alert(String(e)); } }} role="menuitem">JSON</button>
            <button className="btn" onClick={() => { setOpen(false); exportPDF().catch(e => alert(String(e))); }} role="menuitem">PDF</button>
            <button className="btn" onClick={() => { setOpen(false); exportJPEG().catch(e => alert(String(e))); }} role="menuitem">JPEG</button>
          </div>
        )}
      </div>
    </div>
  );
};

