import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';
import { isPreferenceExportReady, isBallotShareReady } from '../utils/readiness';
import { parseIncomingPreferenceSet, parseIncomingBallot } from '../schema';
import { toast } from '../utils/toast';
import { scrollIntoViewSmart } from '../utils/scroll';
import { encodeStarterPreferencesV2, buildShareUrlV2, topicIndex, topicTitleIndex, extractAndDecodeFromUrl, applyStarterPreferences } from '../utils/share';
import { emitHint } from '../utils/hints';

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
  const [exportOpen, setExportOpen] = useState(false);
  const [importInlineOpen, setImportInlineOpen] = useState(false);
  const [menuExportOpen, setMenuExportOpen] = useState(false);
  const [collapseCompare, setCollapseCompare] = useState(false);
  const [collapseToggle, setCollapseToggle] = useState(false);
  const [starterSelectedCount, setStarterSelectedCount] = useState(0);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const importRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(false);
  const hintsEnabled = useStore(s => s.hintsEnabled);
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
      if (e.key === 'Tab') {
        // Focus trap inside menu
        const container = moreRef.current?.querySelector('.toolbar-menu') as HTMLElement | null;
        if (!container) return;
        const focusables = Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const activeEl = document.activeElement as HTMLElement | null;
        const shift = (e as KeyboardEvent).shiftKey;
        if (!shift && activeEl === last) { e.preventDefault(); first.focus(); }
        else if (shift && activeEl === first) { e.preventDefault(); last.focus(); }
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  // Close Export dropdown on outside click / ESC
  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!exportRef.current) return;
      const target = e.target as Node;
      if (!exportRef.current.contains(target)) setExportOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false);
      if (e.key === 'Tab') {
        const container = exportRef.current?.querySelector('.toolbar-menu') as HTMLElement | null;
        if (!container) return;
        const focusables = Array.from(container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const activeEl = document.activeElement as HTMLElement | null;
        const shift = (e as KeyboardEvent).shiftKey;
        if (!shift && activeEl === last) { e.preventDefault(); first.focus(); }
        else if (shift && activeEl === first) { e.preventDefault(); last.focus(); }
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [exportOpen]);

  // Close Import dropdown on outside click / ESC (inline import button in empty state)
  useEffect(() => {
    if (!importInlineOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!importRef.current) return;
      const target = e.target as Node;
      if (!importRef.current.contains(target)) setImportInlineOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setImportInlineOpen(false); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [importInlineOpen]);

  // Close menus when major UI state changes to avoid stale popovers
  // Note: intentionally do not include `moreOpen`/`exportOpen` as deps to avoid
  // immediately re-closing after toggling open.
  useEffect(() => {
    if (exportOpen) setExportOpen(false);
    if (moreOpen) setMoreOpen(false);
    if (importInlineOpen) setImportInlineOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCards, showDiffComparison, showLLMIntegration, ballotMode]);

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
          // Move user to Card View to sort priorities after import
          window.dispatchEvent(new Event('vt-open-card-view'));
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
  const toggleViewLabel = isInSpecialView ? 'Back to Main View' : (showCards ? 'List View' : 'Card View');
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

  // Export availability (mirror mobile logic)
  const exportReady = isPreferenceExportReady(topics);
  const ballotReadyToShare = isBallotShareReady(currentBallot);
  const hasStarterTopics = topics.some(t => topicIndex.includes(t.id) || topicTitleIndex.includes((t.title || '').toLowerCase()));

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
    if (starterSelectedCount > 0) {
      nextAction = {
        label: `Add (${starterSelectedCount})`,
        onClick: () => window.dispatchEvent(new Event('vt-starter-add-selected')),
      };
    } else {
      nextAction = { label: 'Start Here', onClick: () => setShowGettingStarted(true) };
    }
  } else if (anyUnratedTopic) {
    // Encourage organizing priorities: card on desktop, list on mobile
    if (isMobile) {
      // Only suggest List View if currently in Card View
      if (showCards) {
        nextAction = {
          label: 'List View',
          onClick: () => { setShowCards(false); }
        };
      }
    } else {
      // Only suggest Card View if currently in List View
      if (!showCards && !isInSpecialView) {
        nextAction = {
          label: 'Card View',
          onClick: () => { setShowCards(true); }
        };
      }
    }
  } else if (hasEmptyDirections || anyUnratedDirections) {
    // Only suggest List View if currently in Card View
    if (showCards) {
      nextAction = {
        label: 'List View',
        onClick: () => { setShowCards(false); }
      };
    }
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
      ? { label: 'Preview', onClick: () => window.dispatchEvent(new Event('vt-open-ballot-preview')) }
      : { label: 'Preview Ballot', onClick: () => window.dispatchEvent(new Event('vt-open-ballot-preview')) };
  }

  // If in empty state and there are selected starter topics, replace the Next CTA with Add (#)
  if (!hasTopics && starterSelectedCount > 0) {
    nextAction = {
      label: `Add (${starterSelectedCount})`,
      onClick: () => window.dispatchEvent(new Event('vt-starter-add-selected')),
    };
  }
  
  // Progressive collapse: keep toolbar to max two rows on desktop
  useEffect(() => {
    if (!toolbarEl) return;
    const isMobileWidth = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
    if (isMobileWidth) { setCollapseCompare(false); setCollapseToggle(false); return; }

    const measure = () => {
      if (!toolbarEl) return;
      const children = Array.from(toolbarEl.children) as HTMLElement[];
      const rowCount = new Set(children.map(c => c.offsetTop)).size;
      if (rowCount <= 2) { setCollapseCompare(false); setCollapseToggle(false); return; }
      // Start by collapsing Compare
      setCollapseCompare(true);
      requestAnimationFrame(() => {
        const rowCount2 = new Set(Array.from(toolbarEl.children).map(c => (c as HTMLElement).offsetTop)).size;
        if (rowCount2 > 2) setCollapseToggle(true); else setCollapseToggle(false);
      });
    };
    const r = requestAnimationFrame(measure);
    const onResize = () => requestAnimationFrame(measure);
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(r); window.removeEventListener('resize', onResize); };
  }, [toolbarEl, showCards, showDiffComparison, showLLMIntegration, ballotMode, exportReady, ballotReadyToShare, starterSelectedCount]);

  // If portal target not yet mounted, render nothing (avoid null target crash)
  if (!toolbarEl) return null;

  return createPortal(
    <>
      {nextAction && (
        <button className="btn primary" onClick={nextAction.onClick} id="btn-next-action"
          onMouseEnter={() => emitHint('next-action', 'btn-next-action', 'Smart next step based on your progress.')}
        >{nextAction.label}</button>
      )}

      {/* Desktop: surface Export when preferences are export-ready (parity with mobile) */}
      {ballotMode !== 'ballot' && exportReady && (
        <div className="toolbar-more" ref={exportRef}>
          <button id="btn-export-inline" ref={exportBtnRef} className="btn" aria-haspopup="true" aria-expanded={exportOpen} aria-label="Share or Export" onClick={(e) => { e.stopPropagation(); setExportOpen(v => !v); }}
            onMouseEnter={() => emitHint('export', 'btn-export-inline', 'Export or share your work once you’ve rated items.')}
          >
            Share / Export
          </button>
          {exportOpen && (
            <div className="toolbar-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              <div className="muted" style={{ padding: '4px 6px' }}>Export</div>
              <button id="btn-export-json-inline" className="btn" role="menuitem" onClick={() => { setExportOpen(false); try { exportJSON(); } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); } }}>Export JSON</button>
              <button id="btn-export-pdf-inline" className="btn" role="menuitem" onClick={() => { setExportOpen(false); exportPDF().catch(e => alert(String(e))); }}>Export PDF</button>
              <button id="btn-export-jpeg-inline" className="btn" role="menuitem" onClick={() => { setExportOpen(false); exportJPEG().catch(e => alert(String(e))); }}>Export JPEG</button>
              {hasStarterTopics && (
                <button id="btn-export-copy-share-inline" className="btn" role="menuitem" onClick={async () => {
                  try {
                    const payload = encodeStarterPreferencesV2(useStore.getState().topics);
                    const url = buildShareUrlV2(payload);
                    await navigator.clipboard.writeText(url);
                    toast.show({ variant: 'success', title: 'Link copied', message: 'Starter preferences link copied to clipboard', duration: 4000 });
                  } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); }
                  finally { setExportOpen(false); }
                }}>Copy Share Link</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop: show Export in ballot view when ballot is complete */}
      {ballotMode === 'ballot' && ballotReadyToShare && (
        <div className="toolbar-more" ref={exportRef}>
          <button ref={exportBtnRef} className="btn" aria-label="Share or Export" aria-haspopup="true" aria-expanded={exportOpen} onClick={(e) => { e.stopPropagation(); setExportOpen(v => !v); }}>
            Share / Export
          </button>
          {exportOpen && (
            <div className="toolbar-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              <div className="muted" style={{ padding: '4px 6px' }}>Export</div>
              <button id="btn-export-json-inline-ballot" className="btn" role="menuitem" onClick={() => { setExportOpen(false); try { exportJSON(); } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); } }}>Export JSON</button>
              <button id="btn-export-pdf-inline-ballot" className="btn" role="menuitem" onClick={() => { setExportOpen(false); exportPDF().catch(e => alert(String(e))); }}>Export PDF</button>
              <button id="btn-export-jpeg-inline-ballot" className="btn" role="menuitem" onClick={() => { setExportOpen(false); exportJPEG().catch(e => alert(String(e))); }}>Export JPEG</button>
              {hasStarterTopics && (
              <button id="btn-export-copy-share-inline-ballot" className="btn" role="menuitem" onClick={async () => {
                  try {
                    const payload = encodeStarterPreferencesV2(useStore.getState().topics);
                    const url = buildShareUrlV2(payload);
                    await navigator.clipboard.writeText(url);
                    toast.show({ variant: 'success', title: 'Link copied', message: 'Starter preferences link copied to clipboard', duration: 4000 });
                  } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); }
                  finally { setExportOpen(false); }
                }}>Copy Share Link</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ballot view: if not ready to share, surface Import Ballot */}
      {ballotMode === 'ballot' && !ballotReadyToShare && (
        <div className="toolbar-more">
          <button id="btn-import-ballot-inline" className="btn" onClick={() => fileRef.current?.click()}
            onMouseEnter={() => emitHint('import-ballot', 'btn-import-ballot-inline', 'Load a ballot JSON to continue work.')}
          >Import</button>
        </div>
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
        <div className="toolbar-more" ref={importRef}>
          <button id="btn-import-inline" className="btn" aria-haspopup="true" aria-expanded={importInlineOpen} onClick={() => setImportInlineOpen(v => !v)}>Import</button>
          {importInlineOpen && (
            <div className="toolbar-menu" role="menu">
              <button className="btn" role="menuitem" onClick={() => { setImportInlineOpen(false); fileRef.current?.click(); }}>Import JSON…</button>
              <button className="btn" role="menuitem" onClick={() => {
                const url = prompt('Paste share link (supports #sp2= or #sp=)');
                if (!url) return;
                try {
                  const data = extractAndDecodeFromUrl(url);
                  if (!data) { alert('Invalid share payload'); return; }
                  const { applied } = applyStarterPreferences(data);
                  toast.show({ variant: 'success', title: 'Preferences applied', message: `${applied} topics updated`, duration: 4000 });
                } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); }
                finally { setImportInlineOpen(false); }
              }}>Apply from Link…</button>
            </div>
          )}
        </div>
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


      {hasTopics && !collapseToggle && ballotMode !== 'ballot' && (!nextAction || nextAction.label !== toggleViewLabel) && (
      <button id="btn-toggle-view" className="btn" onClick={() => {
        if (isInSpecialView) {
          setShowDiffComparison(false);
          setShowLLMIntegration(false);
          setBallotMode('preference');
        } else {
          setShowCards(!showCards);
        }
      }}
        onMouseEnter={() => emitHint('toggle-view', 'btn-toggle-view', 'Switch between List and Card views.')}
      >{toggleViewLabel}</button>
      )}

      {hasTopics && !collapseCompare && (
        <button id="btn-diff-comparison" className="btn" onClick={() => setShowDiffComparison(!showDiffComparison)}
          onMouseEnter={() => emitHint('compare', 'btn-diff-comparison', 'Compare two preference sets side by side.')}
        >
          {showDiffComparison ? 'Close Comparison' : 'Compare Preferences'}
        </button>
      )}

      {hasTopics && (!nextAction || nextAction.label !== ballotLabel) && (
      <button id="btn-ballot-mode" className="btn" onClick={() => {
        if (ballotMode === 'ballot') {
          setBallotMode('preference');
        } else {
          setShowLLMIntegration(false);
          setShowDiffComparison(false);
          setBallotMode('ballot');
        }
      }}
        onMouseEnter={() => emitHint('ballot', 'btn-ballot-mode', 'Build and preview your sample ballot.')}
      >
        {ballotLabel}
      </button>
      )}

      {/* Move the menu/hamburger to the end so it stays at the right */}
      <div className="toolbar-more pin-right" ref={moreRef}>
        <button id="btn-menu" ref={moreBtnRef} className="btn" aria-haspopup="true" aria-expanded={moreOpen} onClick={() => setMoreOpen(v => !v)}
          onMouseEnter={() => emitHint('menu', 'btn-menu', 'More actions live here. We move extras here on small screens.')}
        >
          ☰
        </button>
        {moreOpen && (
          <div className="toolbar-menu" role="menu">
            <div className="muted" style={{ padding: '4px 6px' }}>Menu</div>
            {ballotMode === 'ballot' && (
              <button id="btn-import-ballot" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); fileRef.current?.click(); }}>Import Ballot</button>
            )}
            <button id="btn-toggle-hints" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); useStore.setState(s => ({ hintsEnabled: !s.hintsEnabled })); }}>
              {hintsEnabled ? 'Disable Hint Mode' : 'Enable Hint Mode'}
            </button>
            {showDiffComparison && (
              <button
                id="btn-clear-comparison"
                className="btn"
                role="menuitem"
                onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event('vt-clear-comparison')); }}
              >
                Clear Comparison
              </button>
            )}
            {/* Collapsed items will be injected here via conditions below */}
            {/* Collapsed Toggle / Compare shortcuts */}
            {hasTopics && collapseToggle && (
              <button id="btn-toggle-view-menu" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); if (isInSpecialView) { setShowDiffComparison(false); setShowLLMIntegration(false); setBallotMode('preference'); } else { setShowCards(!showCards); } }}>{toggleViewLabel}</button>
            )}
            {hasTopics && collapseCompare && (
              <button id="btn-diff-menu" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); setShowDiffComparison(!showDiffComparison); }}>{showDiffComparison ? 'Close Comparison' : 'Compare Preferences'}</button>
            )}
            <button id="btn-import" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); fileRef.current?.click(); }}>Import JSON</button>
            <button id="btn-import-from-link" className="btn" role="menuitem" onClick={() => {
              setMoreOpen(false);
              const url = prompt('Paste share link (supports #sp2= or #sp=)');
              if (!url) return;
              try {
                const data = extractAndDecodeFromUrl(url);
                if (!data) { alert('Invalid share payload'); return; }
                const { applied } = applyStarterPreferences(data);
                toast.show({ variant: 'success', title: 'Preferences applied', message: `${applied} topics updated`, duration: 4000 });
                window.dispatchEvent(new Event('vt-open-card-view'));
              } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); }
            }}>Apply from Link…</button>
            {hasStarterTopics && (
              <button
                id="btn-copy-share"
                className="btn"
                role="menuitem"
                onClick={async () => {
                  try {
                    const payload = encodeStarterPreferencesV2(useStore.getState().topics);
                    const url = buildShareUrlV2(payload);
                    await navigator.clipboard.writeText(url);
                    toast.show({ variant: 'success', title: 'Link copied', message: 'Starter preferences link copied to clipboard', duration: 4000 });
                  } catch (e) {
                    alert('Copy failed: ' + (e instanceof Error ? e.message : String(e)));
                  } finally {
                    setMoreOpen(false);
                  }
                }}
              >
                Copy Share Link
              </button>
            )}
            {ballotMode !== 'ballot' && (
              <button
                id="btn-clear-preferences"
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
                  } as const;
                  useStore.setState({ title: '', notes: '', topics: [], __createdAt: undefined });
                  toast.show({
                    variant: 'danger',
                    title: 'Preferences cleared',
                    message: 'Your preference set was cleared',
                    actionLabel: 'Undo',
                    onAction: () => { useStore.setState({ ...snapshot }); },
                    duration: 7000,
                  });
                }}
              >
                Clear Preferences
              </button>
            )}
            {ballotMode === 'ballot' && useStore.getState().currentBallot && (
              <button
                id="btn-clear-ballot"
                className="btn danger"
                role="menuitem"
                onClick={() => {
                  setMoreOpen(false);
                  const prev = useStore.getState().currentBallot;
                  useStore.getState().clearBallot();
                  toast.show({
                    variant: 'danger',
                    title: 'Ballot cleared',
                    message: 'Your ballot was cleared',
                    actionLabel: 'Undo',
                    onAction: () => { useStore.setState({ currentBallot: prev }); },
                    duration: 7000,
                  });
                }}
              >
                Clear Ballot
              </button>
            )}
            {(() => {
              const hasAnyDirection = topics.some(t => t.directions.length > 0);
              const hasAnyRatedDirection = topics.some(t => t.directions.some(d => d.stars > 0));
              const exportReadyMenu = hasTopics && hasAnyDirection && hasAnyRatedDirection;
              const inlineExportVisible = ballotMode !== 'ballot' && exportReady;
              // Avoid redundancy: only show Export submenu in More when inline Share/Export is not visible
              return exportReadyMenu && !inlineExportVisible ? (
                <div className="toolbar-submenu">
                  <button className="btn" role="menuitem" onClick={() => setMenuExportOpen(v => !v)} aria-expanded={menuExportOpen}>Export…</button>
                  {menuExportOpen && (
                    <div className="toolbar-menu" role="menu" style={{ position: 'static', marginTop: 6 }}>
                      <button id="btn-export-json" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); setMenuExportOpen(false); try { exportJSON(); } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); } }}>Export JSON</button>
                      <button id="btn-export-pdf" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); setMenuExportOpen(false); exportPDF().catch(e => alert(String(e))); }}>Export PDF</button>
                      <button id="btn-export-jpeg" className="btn" role="menuitem" onClick={() => { setMoreOpen(false); setMenuExportOpen(false); exportJPEG().catch(e => alert(String(e))); }}>Export JPEG</button>
                    </div>
                  )}
                </div>
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
        <input ref={fileRef} id="file-input" type="file" className="sr-only" accept="application/json" aria-label="Import JSON" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) onImportFile(f); }} />
      </div>

      {/* LLM + Getting Started moved into More menu */}
    </>,
    toolbarEl
  );
};
