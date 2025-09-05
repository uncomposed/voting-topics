import React, { useState } from 'react';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';

interface Props {
  showCards: boolean;
  onToggleView: () => void;
}

export const MobileActionBar: React.FC<Props> = ({ showCards, onToggleView }) => {
  const addTopic = useStore(state => state.addTopic);
  const topics = useStore(state => state.topics);
  const ballotMode = useStore(state => state.ballotMode);
  const currentBallot = useStore(state => state.currentBallot);
  const [open, setOpen] = useState(false);

  const hasTopics = topics.length > 0;
  const anyUnratedTopic = topics.some(t => t.importance === 0);
  const hasEmptyDirections = topics.some(t => t.directions.length === 0);
  const anyUnratedDirections = topics.some(t => t.directions.some(d => d.stars === 0));
  const allTopicsRated = hasTopics && topics.every(t => t.importance > 0);

  const firstUnratedTopicId = topics.find(t => t.importance === 0)?.id;
  const firstNeedsDirectionsId = topics.find(t => t.directions.length === 0 || t.directions.some(d => d.stars === 0))?.id;

  const jumpToTopicId = (id?: string) => {
    if (!id) return;
    const target = document.querySelector(`[data-topic-id="${id}"]`) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = target.querySelector('input[data-field="title"]') as HTMLInputElement | null;
      if (input) setTimeout(() => input.focus(), 350);
    }
  };

  let nextLabel: string | null = null;
  let nextAction: (() => void) | null = null;
  if (!hasTopics) {
    nextLabel = 'Starter Pack';
    nextAction = () => {
      const el = document.getElementById('starter-pack');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  } else if (anyUnratedTopic) {
    nextLabel = 'Jump to Unrated';
    nextAction = () => jumpToTopicId(firstUnratedTopicId);
  } else if (hasEmptyDirections || anyUnratedDirections) {
    nextLabel = 'Jump to Unrated';
    nextAction = () => jumpToTopicId(firstNeedsDirectionsId);
  } else if (ballotMode !== 'ballot' && allTopicsRated) {
    nextLabel = 'Ballot';
    nextAction = () => { window.dispatchEvent(new Event('vt-create-ballot')); };
  } else if (ballotMode === 'ballot' && currentBallot) {
    const allOfficesSelected = currentBallot.offices.length > 0 && currentBallot.offices.every(o => !!o.selectedCandidateId);
    const allMeasuresPositioned = currentBallot.measures.every(m => !!m.position);
    const readyToShare = allOfficesSelected && allMeasuresPositioned;
    nextLabel = readyToShare ? 'Share / Export' : 'Preview Ballot';
    nextAction = () => { window.dispatchEvent(new Event('vt-open-ballot-preview')); };
  }

  return (
    <div className="mobile-action-bar" aria-label="Mobile actions">
      {nextLabel && nextAction && (
        <button className="btn primary" onClick={nextAction} aria-label="Next">
          {nextLabel}
        </button>
      )}
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
