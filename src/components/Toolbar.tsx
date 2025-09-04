import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';
import { parseIncomingPreferenceSet, parseIncomingBallot } from '../schema';

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
  const addTopic = useStore(s => s.addTopic);
  const clearAll = useStore(s => s.clearAll);
  const fileRef = useRef<HTMLInputElement>(null);

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
          setBallotMode('ballot');
        } else {
          const preferenceSet = parseIncomingPreferenceSet(obj);
          useStore.getState().importData({
            title: preferenceSet.title,
            notes: preferenceSet.notes || '',
            topics: preferenceSet.topics,
          });
          setBallotMode('preference');
        }
      } catch (e: unknown) {
        alert('Import failed: ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const toolbar = typeof document !== 'undefined' ? document.querySelector('.toolbar') : null;
  if (!toolbar) return null;

  const isInSpecialView = showDiffComparison || showLLMIntegration || ballotMode === 'ballot';
  const toggleViewLabel = isInSpecialView ? 'Back to Main View' : (showCards ? 'Show List View' : 'Show Card View');
  const ballotLabel = ballotMode === 'ballot' ? 'Back to Preferences' : 'Create Ballot';
  const llmLabel = showLLMIntegration ? 'Close LLM Integration' : 'LLM Integration';

  return createPortal(
    <>
      <button id="btn-new-topic" className="btn" onClick={() => addTopic(0)}>New Topic</button>
      <button id="btn-clear" className="btn ghost danger" onClick={() => { if (confirm('Clear all data? This only affects your browser.')) clearAll(); }}>Clear All</button>
      <button id="btn-import" className="btn ghost" onClick={() => fileRef.current?.click()}>Import JSON</button>
      <input ref={fileRef} id="file-input" type="file" className="sr-only" accept="application/json" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) onImportFile(f); }} />
      <button id="btn-export-json" className="btn primary" onClick={() => { try { exportJSON(); } catch (e) { alert(e instanceof Error ? e.message : String(e)); } }}>Export JSON</button>
      <button id="btn-export-pdf" className="btn" onClick={() => exportPDF().catch(e => alert(String(e)))}>Export PDF</button>
      <button id="btn-export-jpeg" className="btn" onClick={() => exportJPEG().catch(e => alert(String(e)))}>Export JPEG</button>

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

      <button id="btn-llm-integration" className="btn" onClick={() => setShowLLMIntegration(!showLLMIntegration)}>
        {llmLabel}
      </button>

      <button id="btn-getting-started" className="btn ghost" onClick={() => setShowGettingStarted(true)}>Getting Started</button>
    </>,
    toolbar
  );
};
