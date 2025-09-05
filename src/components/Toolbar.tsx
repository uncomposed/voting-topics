import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';
import { parseIncomingPreferenceSet, parseIncomingBallot } from '../schema';
import { toast } from '../utils/toast';
import { scrollIntoViewSmart } from '../utils/scroll';

interface ToolbarProps {
  showCards: boolean;
  setShowCards: (v: boolean) => void;
  showDiffComparison: boolean;
  setShowDiffComparison: (v: boolean) => void;
  ballotMode: 'preference' | 'ballot';
  setBallotMode: (v: 'preference' | 'ballot') => void;
  showLLMIntegration: boolean;
  setShowLLMIntegration: (v: boolean) => void;
  setShowGettingStarted: (v: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  showCards,
  setShowCards,
  showDiffComparison,
  setShowDiffComparison,
  ballotMode,
  setBallotMode,
  showLLMIntegration,
  setShowLLMIntegration,
  setShowGettingStarted,
}) => {
  // Portal target resolution (after mount) so initial render doesn't miss it
  const [toolbarEl, setToolbarEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setToolbarEl(document.querySelector('.toolbar') as HTMLElement | null);
  }, []);

  const addTopic = useStore(s => s.addTopic);
  const clearAll = useStore(s => s.clearAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [starterSelectedCount, setStarterSelectedCount] = useState(0);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const prevOpenRef = useRef(false);
  useEffect(() => {
    // focus return when closing
    if (prevOpenRef.current && !moreOpen) {
      moreBtnRef.current?.focus();
    }
    prevOpenRef.current = moreOpen;
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!moreRef.current) return;
      const target = e.target as Node;
      if (!moreRef.current.contains(target)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  // Track starter pack selection count to surface Add Selected in nav
  useEffect(() => {
    const onSel = (e: Event) => {
      const ce = e as CustomEvent<{ count: number }>;
      setStarterSelectedCount(Math.max(0, Number(ce.detail?.count || 0)));
    };
    window.addEventListener('vt-starter-selection-changed', onSel as EventListener);
    return () => window.removeEventListener('vt-starter-selection-changed', onSel as EventListener);
  }, []);

  // Global event to open LLM Integration (used by guidance banner)
  useEffect(() => {
    const openLlm = () => {
      setMoreOpen(false);
      setShowDiffComparison(false);
      setBallotMode('preference');
      setShowLLMIntegration(true);
    };
    window.addEventListener('vt-open-llm', openLlm as EventListener);
    const openDiff = () => {
      setMoreOpen(false);
      setShowLLMIntegration(false);
      setBallotMode('preference');
      setShowDiffComparison(true);
    };
    const openGS = () => { setMoreOpen(false); setShowGettingStarted(true); };
    const createBallot = () => { setMoreOpen(false); setShowLLMIntegration(false); setShowDiffComparison(false); setBallotMode('ballot'); };
    const backPrefs = () => { setMoreOpen(false); setBallotMode('preference'); };
    window.addEventListener('vt-open-diff', openDiff as EventListener);
    window.addEventListener('vt-open-getting-started', openGS as EventListener);
    window.addEventListener('vt-create-ballot', createBallot as EventListener);
    window.addEventListener('vt-back-preferences', backPrefs as EventListener);
    const exitSpecial = () => { 
      setMoreOpen(false);
      setShowLLMIntegration(false); 
      setShowDiffComparison(false); 
      setBallotMode('preference'); 
      setShowCards(false);
    };
    window.addEventListener('vt-exit-special', exitSpecial as EventListener);
    const closeLlm = () => { setShowLLMIntegration(false); setBallotMode('preference'); };
    window.addEventListener('vt-close-llm', closeLlm as EventListener);
    return () => {
      window.removeEventListener('vt-open-llm', openLlm as EventListener);
      window.removeEventListener('vt-open-diff', openDiff as EventListener);
      window.removeEventListener('vt-open-getting-started', openGS as EventListener);
      window.removeEventListener('vt-create-ballot', createBallot as EventListener);
      window.removeEventListener('vt-back-preferences', backPrefs as EventListener);
      window.removeEventListener('vt-close-llm', closeLlm as EventListener);
      window.removeEventListener('vt-exit-special', exitSpecial as EventListener);
    };
  }, [setBallotMode, setShowDiffComparison, setShowLLMIntegration, setShowGettingStarted, setShowCards]);

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || '{}'));
        if (obj?.version === 'tsb.ballot.v1') {
          const ballot = parseIncomingBallot(obj);
          useStore.setState({ currentBallot: ballot });
          setShowLLMIntegration(false);
          setShowDiffComparison(false);
          toast.show({
            variant: 'success',
            title: 'Ballot imported',
            message: 'Review your ballot when ready',
            actionLabel: 'View Ballot',
            onAction: () => setBallotMode('ballot'),
            duration: 6000,
          });
        } else {
          const preferenceSet = parseIncomingPreferenceSet(obj);
          useStore.getState().importData({
            title: preferenceSet.title,
            notes: preferenceSet.notes || '',
            topics: preferenceSet.topics,
          });
          toast.show({
            variant: 'success',
            title: 'Preferences imported',
            message: 'Jump to your updated preferences',
            actionLabel: 'View Preferences',
            onAction: () => setBallotMode('preference'),
            duration: 6000,
          });
        }
      } catch (e: unknown) {
        alert('Import failed: ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const isInSpecialView = showDiffComparison || showLLMIntegration || ballotMode === 'ballot';
  const toggleViewLabel = isInSpecialView ? 'Back to Main View' : (showCards ? 'Show List View' : 'Show Card View');
  const ballotLabel = ballotMode === 'ballot' ? 'Back to Preferences' : 'Ballot';

  // Derive a suggested Next action based on current app state
  const topics = useStore(s => s.topics);
  const currentBallot = useStore(s => s.currentBallot);
  const hasTopics = topics.length > 0;
  const anyUnratedTopic = topics.some(t => t.importance === 0);
  const hasEmptyDirections = topics.some(t => t.directions.length === 0);
  const anyUnratedDirections = topics.some(t => t.directions.some(d => d.stars === 0));
  const allTopicsRated = hasTopics && topics.every(t => t.importance > 0);
  const hasSufficientPrefs = allTopicsRated; // lenient: directions may be intentionally left 0
  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

  const scrollToStarter = () => {
    const el = document.getElementById('starter-pack');
    if (el && 'scrollIntoView' in el) {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } catch (_e) { /* noop */ }
    }
    try { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); } catch (_e) { /* noop */ }
  };

  const jumpToTopicId = (id: string | undefined) => {
    if (!id) return;
    const target = document.querySelector(`[data-topic-id="${id}"]`) as HTMLElement | null;
    if (target) {
      scrollIntoViewSmart(target);
    }
  };

  const firstUnratedTopicId = topics.find(t => t.importance === 0)?.id;
  const firstNeedsDirectionsId = topics.find(t => t.directions.length === 0 || t.directions.some(d => d.stars === 0))?.id;

  type NextAction = { label: string; onClick: () => void } | null;
  let nextAction: NextAction = null;
  if (!hasTopics) {
    nextAction = {
      label: 'Get Started',
      onClick: () => {
        if (isInSpecialView) {
          setShowDiffComparison(false);
          setShowLLMIntegration(false);
          setBallotMode('preference');
          setShowCards(false);
          setTimeout(() => { scrollToStarter(); window.dispatchEvent(new Event('vt-open-starter')); }, 50);
        } else {
          scrollToStarter(); window.dispatchEvent(new Event('vt-open-starter'));
        }
      }
    };
  } else if (anyUnratedTopic) {
    // Encourage organizing priorities: card on desktop, list on mobile
    if (isMobile) {
      nextAction = {
        label: 'List View',
        onClick: () => { if (showCards) setShowCards(false); }
      };
    } else {
      nextAction = {
        label: 'Card View',
        onClick: () => { if (!showCards && !isInSpecialView) setShowCards(true); }
      };
    }
  } else if (hasEmptyDirections || anyUnratedDirections) {
    nextAction = {
      label: 'List View',
      onClick: () => { if (showCards) setShowCards(false); }
    };
  } else if (ballotMode !== 'ballot' && hasSufficientPrefs) {
    nextAction = {
      label: 'Ballot',
      onClick: () => { setShowLLMIntegration(false); setShowDiffComparison(false); setBallotMode('ballot'); }
    };
  } else if (ballotMode === 'ballot' && currentBallot) {
    const allOfficesSelected = currentBallot.offices.length > 0 && currentBallot.offices.every(o => !!o.selectedCandidateId);
    const allMeasuresPositioned = currentBallot.measures.every(m => !!m.position);
    const readyToShare = allOfficesSelected && allMeasuresPositioned;
    nextAction = readyToShare
      ? { label: 'Share / Export', onClick: () => window.dispatchEvent(new Event('vt-open-ballot-preview')) }
      : { label: 'Preview Ballot', onClick: () => window.dispatchEvent(new Event('vt-open-ballot-preview')) };
  }

  // If in empty state and there are selected starter topics, replace the Next CTA with Add (#)
  if (!hasTopics && starterSelectedCount > 0) {
    nextAction = {
      label: `Add (${starterSelectedCount})`,
      onClick: () => window.dispatchEvent(new Event('vt-starter-add-selected')),
    };
  }
  
  // If portal target not yet mounted, render nothing (avoid null target crash)
  if (!toolbarEl) return null;

  return createPortal(
    <>
      {nextAction && (
        <button className="btn primary" onClick={nextAction.onClick} id="btn-next-action">{nextAction.label}</button>
      )}
      {starterSelectedCount > 0 && hasTopics && !isInSpecialView ? (
        <button
          id="btn-add-selected"
          className="btn"
          onClick={() => window.dispatchEvent(new Event('vt-starter-add-selected'))}
        >
          Add ({starterSelectedCount})
        </button>
      ) : (
        !isInSpecialView && (
        <button
          id="btn-new-topic"
          className="btn"
          onClick={() => {
            const beforeFirst = useStore.getState().topics[0]?.id;
            addTopic(0);
            setTimeout(() => {
              const newFirst = useStore.getState().topics[0]?.id;
              if (newFirst && newFirst !== beforeFirst) {
                const target = document.querySelector(`[data-topic-id="${newFirst}"]`) as HTMLElement | null;
                if (target) {
                  scrollIntoViewSmart(target);
                }
              }
            }, 0);
          }}
        >
          New Topic
        </button>
      ))}
      {!hasTopics && ballotMode === 'preference' && (
        <button id="btn-import-inline" className="btn" onClick={() => fileRef.current?.click()}>Import</button>
      )}
      {hasTopics && (anyUnratedTopic || hasEmptyDirections || anyUnratedDirections) && (
        <button
          id="btn-jump-unrated"
          className="btn"
          onClick={() => {
            const targetId = firstUnratedTopicId || firstNeedsDirectionsId;
            if (isInSpecialView) {
              setShowDiffComparison(false);
              setShowLLMIntegration(false);
              setBallotMode('preference');
              setTimeout(() => jumpToTopicId(targetId), 60);
            } else {
              jumpToTopicId(targetId);
            }
          }}
        >
          Jump to Unrated
        </button>
      )}
      {/* Export JSON moved into the Menu */}

      <div className="toolbar-more" ref={moreRef}>
        <button ref={moreBtnRef} className="btn" aria-haspopup="true" aria-expanded={moreOpen} onClick={() => setMoreOpen(v => !v)}>
          ☰
        </button>
        {moreOpen && (
          <div className="toolbar-menu" role="menu">
            <div className="muted" style={{ padding: '4px 6px' }}>Menu</div>
            <button id="btn-import" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); fileRef.current?.click(); }}>Import JSON</button>
            {(() => {
              const hasAnyDirection = topics.some(t => t.directions.length > 0);
              const hasAnyRatedDirection = topics.some(t => t.directions.some(d => d.stars > 0));
              const exportReady = hasTopics && hasAnyDirection && hasAnyRatedDirection;
              return exportReady ? (
                <>
                  <button id="btn-export-json" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); try { exportJSON(); } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); } }}>Export JSON</button>
                  <button id="btn-export-pdf" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); exportPDF().catch(e => alert(String(e))); }}>Export PDF</button>
                  <button id="btn-export-jpeg" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); exportJPEG().catch(e => alert(String(e))); }}>Export JPEG</button>
                </>
              ) : null;
            })()}
            <button id="btn-llm-integration" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); setShowLLMIntegration(!showLLMIntegration); }}>LLM Integration</button>
            <button id="btn-getting-started" className="btn ghost" role="menuitem" onClick={() => { setMoreOpen(false); setShowGettingStarted(true); }}>Getting Started</button>
            <button
              id="btn-clear"
              className="btn danger"
              role="menuitem"
              onClick={() => {
                setMoreOpen(false);
                const state = useStore.getState();
                const snapshot = {
                  title: state.title,
                  notes: state.notes,
                  topics: state.topics,
                  __createdAt: state.__createdAt,
                  ballotMode: state.ballotMode,
                  currentBallot: state.currentBallot,
                  ballotHistory: state.ballotHistory,
                } as const;
                clearAll();
                toast.show({
                  variant: 'danger',
                  title: 'All data cleared',
                  message: 'Your browser data was cleared',
                  actionLabel: 'Undo',
                  onAction: () => {
                    useStore.setState({ ...snapshot });
                  },
                  duration: 7000,
                });
              }}
            >
              Clear All
            </button>
          </div>
        )}
        <input ref={fileRef} id="file-input" type="file" className="sr-only" accept="application/json" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) onImportFile(f); }} />
      </div>

      <button id="btn-toggle-view" className="btn" onClick={() => {
        if (isInSpecialView) {
          setShowDiffComparison(false);
          setShowLLMIntegration(false);
          setBallotMode('preference');
        } else {
          setShowCards(!showCards);
        }
      }}>{toggleViewLabel}</button>

      <button id="btn-diff-comparison" className="btn" onClick={() => setShowDiffComparison(!showDiffComparison)}>
        {showDiffComparison ? 'Close Comparison' : 'Compare Preference Sets'}
      </button>

      <button id="btn-ballot-mode" className="btn" onClick={() => {
        if (ballotMode === 'ballot') {
          setBallotMode('preference');
        } else {
          setShowLLMIntegration(false);
          setShowDiffComparison(false);
          setBallotMode('ballot');
        }
      }}>
        {ballotLabel}
      </button>

      {/* LLM + Getting Started moved into More menu */}
    </>,
    toolbarEl
  );
};
