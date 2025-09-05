import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';
import { scrollIntoViewSmart } from '../utils/scroll';

interface Props {
  showCards: boolean;
  onToggleView: () => void;
}

export const MobileActionBar: React.FC<Props> = ({ showCards, onToggleView, showDiffComparison, showLLMIntegration }) => {
  const addTopic = useStore(state => state.addTopic);
  const topics = useStore(state => state.topics);
  const ballotMode = useStore(state => state.ballotMode);
  const currentBallot = useStore(state => state.currentBallot);
  const [open, setOpen] = useState(false);
  const [starterSelectedCount, setStarterSelectedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onSel = (e: Event) => {
      const ce = e as CustomEvent<{ count: number }>;
      setStarterSelectedCount(Math.max(0, Number(ce.detail?.count || 0)));
    };
    window.addEventListener('vt-starter-selection-changed', onSel as EventListener);
    return () => window.removeEventListener('vt-starter-selection-changed', onSel as EventListener);
  }, []);

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
      scrollIntoViewSmart(target);
    }
  };

  let nextLabel: string | null = null;
  let nextAction: (() => void) | null = null;
  if (!hasTopics && starterSelectedCount > 0) {
    nextLabel = `Add (${starterSelectedCount})`;
    nextAction = () => window.dispatchEvent(new Event('vt-starter-add-selected'));
  } else if (!hasTopics) {
    nextLabel = 'Start';
    nextAction = () => {
      // Exit special views and center on topics list header
      window.dispatchEvent(new Event('vt-exit-special'));
      setTimeout(() => {
        const header = document.querySelector('.panel-header-with-controls') as HTMLElement | null;
        if (header) header.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const el = document.getElementById('starter-pack');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); window.dispatchEvent(new Event('vt-open-starter')); }
      }, 50);
    };
  } else if (anyUnratedTopic) {
    nextLabel = 'Unrated';
    nextAction = () => {
      // Ensure we're in preferences, then jump to first unrated topic
      if (ballotMode === 'ballot') window.dispatchEvent(new Event('vt-back-preferences'));
      if (showLLMIntegration || showDiffComparison) window.dispatchEvent(new Event('vt-exit-special'));
      setTimeout(() => jumpToTopicId(firstUnratedTopicId), 60);
    };
  } else if (hasEmptyDirections || anyUnratedDirections) {
    nextLabel = 'Unrated';
    nextAction = () => {
      if (ballotMode === 'ballot') window.dispatchEvent(new Event('vt-back-preferences'));
      if (showLLMIntegration || showDiffComparison) window.dispatchEvent(new Event('vt-exit-special'));
      setTimeout(() => jumpToTopicId(firstNeedsDirectionsId), 60);
    };
  } else if (ballotMode !== 'ballot' && allTopicsRated) {
    nextLabel = 'Ballot';
    nextAction = () => { window.dispatchEvent(new Event('vt-create-ballot')); };
  } else if (ballotMode === 'ballot' && currentBallot) {
    const allOfficesSelected = currentBallot.offices.length > 0 && currentBallot.offices.every(o => !!o.selectedCandidateId);
    const allMeasuresPositioned = currentBallot.measures.every(m => !!m.position);
    const readyToShare = allOfficesSelected && allMeasuresPositioned;
    nextLabel = readyToShare ? 'Share' : 'Preview';
    nextAction = () => { window.dispatchEvent(new Event('vt-open-ballot-preview')); };
  }

  // Export gating: only show when there is at least one topic with at least one rated direction
  const hasAnyDirection = topics.some(t => t.directions.length > 0);
  const hasAnyRatedDirection = topics.some(t => t.directions.some(d => d.stars > 0));
  const exportReady = hasTopics && hasAnyDirection && hasAnyRatedDirection;

  return (
    <div className="mobile-action-bar" aria-label="Mobile actions">
      {nextLabel && nextAction && (
        <button className="btn primary" onClick={nextAction} aria-label="Next">
          {nextLabel}
        </button>
      )}
      {ballotMode !== 'ballot' && !showDiffComparison && !showLLMIntegration && (
        <button
          className="btn"
          onClick={() => {
            const before = useStore.getState().topics[0]?.id;
            addTopic(0);
            setTimeout(() => {
              const newFirst = useStore.getState().topics[0]?.id;
              if (newFirst && newFirst !== before) {
                const target = document.querySelector(`[data-topic-id="${newFirst}"]`) as HTMLElement | null;
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }, 0);
          }}
          aria-label="New Topic"
        >
          + New
        </button>
      )}
      {hasTopics && (
        <button
          className="btn"
          onClick={() => {
            if (ballotMode === 'ballot') {
              window.dispatchEvent(new Event('vt-back-preferences'));
            } else {
              onToggleView();
            }
          }}
          aria-label="Toggle View"
        >
          {ballotMode === 'ballot' ? 'Back' : (showCards ? 'List' : 'Card')}
        </button>
      )}
      <div className="mobile-export">
        {exportReady && (
          <>
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
          </>
        )}
      </div>

      {/* Import button for empty state */}
      {!hasTopics && (
        <>
          <button className="btn" onClick={() => fileRef.current?.click()} aria-label="Import">Import</button>
          <input ref={fileRef} type="file" accept="application/json" className="sr-only" onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const obj = JSON.parse(String(reader.result || '{}'));
                const { parseIncomingPreferenceSet, parseIncomingBallot } = require('../schema');
                if (obj?.version === 'tsb.ballot.v1') {
                  useStore.setState({ currentBallot: parseIncomingBallot(obj) });
                  window.dispatchEvent(new Event('vt-create-ballot'));
                } else {
                  const preferenceSet = parseIncomingPreferenceSet(obj);
                  useStore.getState().importData({ title: preferenceSet.title, notes: preferenceSet.notes || '', topics: preferenceSet.topics });
                }
              } catch (e) {
                alert('Import failed: ' + (e instanceof Error ? e.message : String(e)));
              } finally {
                e.currentTarget.value = '';
              }
            };
            reader.readAsText(f);
          }} />
        </>
      )}

      {/* Hamburger to open mobile menu */}
      <button className="btn" aria-label="Menu" onClick={() => window.dispatchEvent(new Event('vt-open-mobile-menu'))}>☰</button>
    </div>
  );
};
