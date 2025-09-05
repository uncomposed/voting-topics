import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';
import { parseIncomingPreferenceSet, parseIncomingBallot } from '../schema';
import { toast } from '../utils/toast';

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
    const closeLlm = () => { setShowLLMIntegration(false); setBallotMode('preference'); };
    window.addEventListener('vt-close-llm', closeLlm as EventListener);
    return () => {
      window.removeEventListener('vt-open-llm', openLlm as EventListener);
      window.removeEventListener('vt-open-diff', openDiff as EventListener);
      window.removeEventListener('vt-open-getting-started', openGS as EventListener);
      window.removeEventListener('vt-create-ballot', createBallot as EventListener);
      window.removeEventListener('vt-back-preferences', backPrefs as EventListener);
      window.removeEventListener('vt-close-llm', closeLlm as EventListener);
    };
  }, [setBallotMode, setShowDiffComparison, setShowLLMIntegration, setShowGettingStarted]);

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

  if (!toolbarEl) return null;

  const isInSpecialView = showDiffComparison || showLLMIntegration || ballotMode === 'ballot';
  const toggleViewLabel = isInSpecialView ? 'Back to Main View' : (showCards ? 'Show List View' : 'Show Card View');
  const ballotLabel = ballotMode === 'ballot' ? 'Back to Preferences' : 'Create Ballot';


  return createPortal(
    <>
      <button id="btn-new-topic" className="btn" onClick={() => addTopic(0)}>New Topic</button>
      <button id="btn-export-json" className="btn primary" onClick={() => { try { exportJSON(); } catch (e) { alert(e instanceof Error ? e.message : String(e)); } }}>Export JSON</button>

      <div className="toolbar-more" ref={moreRef}>
        <button ref={moreBtnRef} className="btn" aria-haspopup="true" aria-expanded={moreOpen} onClick={() => setMoreOpen(v => !v)}>
          More ▾
        </button>
        {moreOpen && (
          <div className="toolbar-menu" role="menu">
            <button id="btn-import" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); fileRef.current?.click(); }}>Import JSON</button>
            <button id="btn-export-pdf" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); exportPDF().catch(e => alert(String(e))); }}>Export PDF</button>
            <button id="btn-export-jpeg" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); exportJPEG().catch(e => alert(String(e))); }}>Export JPEG</button>
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
