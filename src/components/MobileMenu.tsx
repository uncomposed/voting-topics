import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';
import { parseIncomingPreferenceSet, parseIncomingBallot } from '../schema';
import { encodeStarterPreferences, buildShareUrl, decodeStarterPreferences, applyStarterPreferences, topicIndex, topicTitleIndex } from '../utils/share';
import { IconShare, IconBraces, IconFile, IconImage, IconLink } from './icons';
import { toast } from '../utils/toast';

export const MobileMenu: React.FC = () => {
  const addTopic = useStore(s => s.addTopic);
  const clearAll = useStore(s => s.clearAll);
  const ballotMode = useStore(s => s.ballotMode);
  const currentBallot = useStore(s => s.currentBallot);
  const topics = useStore(s => s.topics);
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const ignoreNextDocClick = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (ignoreNextDocClick.current) { ignoreNextDocClick.current = false; return; }
      if (panelRef.current && !panelRef.current.contains(t)) setOpen(false);
    };
    const onOpen = () => { setOpen(true); ignoreNextDocClick.current = true; };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    window.addEventListener('vt-open-mobile-menu', onOpen as EventListener);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      window.removeEventListener('vt-open-mobile-menu', onOpen as EventListener);
    };
  }, [open]);

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || '{}'));
        if (obj?.version === 'tsb.ballot.v1') {
          const ballot = parseIncomingBallot(obj);
          useStore.setState({ currentBallot: ballot });
          toast.show({
            variant: 'success',
            title: 'Ballot imported',
            message: 'Review your ballot when ready',
            actionLabel: 'View Ballot',
            onAction: () => { window.dispatchEvent(new Event('vt-create-ballot')); },
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
            onAction: () => { window.dispatchEvent(new Event('vt-back-preferences')); },
            duration: 6000,
          });
        }
        setOpen(false);
      } catch (e: unknown) {
        alert('Import failed: ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
  };
  reader.readAsText(file);
};

  // Export readiness + share gating
  const hasTopics = topics.length > 0;
  const hasAnyDirection = topics.some(t => t.directions.length > 0);
  const hasAnyRatedDirection = topics.some(t => t.directions.some(d => d.stars > 0));
  const exportReady = hasTopics && hasAnyDirection && hasAnyRatedDirection;
  const hasStarterTopics = topics.some(t => topicIndex.includes(t.id) || topicTitleIndex.includes((t.title || '').toLowerCase()));

  // Determine if comparison view is currently active (DOM check is fine for SPA)
  const isComparing = typeof document !== 'undefined' && !!document.querySelector('.diff-container');

  return (
    <>
      {open && (
        <div className="mobile-menu-overlay" role="dialog" aria-modal="true">
          <div className="mobile-menu-panel" ref={panelRef}>
            <div className="mobile-menu-header">
              <div className="title">Menu</div>
              <button className="btn ghost" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="mobile-menu-items">
              <button className="btn" onClick={() => { addTopic(0); setOpen(false); }}>New Topic</button>
              {exportReady && (
                <div style={{ position: 'relative' }}>
                  <button className="btn" onClick={() => setExportOpen(v => !v)} aria-expanded={exportOpen} aria-label="Export options" title="Export"><IconShare /></button>
                  {exportOpen && (
                    <div className="mobile-export-menu" role="menu" style={{ right: 0, position: 'absolute' }}>
                      <button className="btn" aria-label="Export JSON" title="Export JSON" onClick={() => { setExportOpen(false); try { exportJSON(); } catch (e) { alert(String(e)); } }} role="menuitem"><IconBraces /></button>
                      <button className="btn" aria-label="Export PDF" title="Export PDF" onClick={() => { setExportOpen(false); exportPDF().catch(e => alert(String(e))); }} role="menuitem"><IconFile /></button>
                      <button className="btn" aria-label="Export JPEG" title="Export JPEG" onClick={() => { setExportOpen(false); exportJPEG().catch(e => alert(String(e))); }} role="menuitem"><IconImage /></button>
                      {hasStarterTopics && (
                        <button className="btn" aria-label="Copy Share Link" title="Copy Share Link" onClick={async () => {
                          try {
                            const payload = encodeStarterPreferences(useStore.getState().topics);
                            const url = buildShareUrl(payload);
                            await navigator.clipboard.writeText(url);
                            toast.show({ variant: 'success', title: 'Link copied', message: 'Starter preferences link copied', duration: 4000 });
                          } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); }
                          finally { setExportOpen(false); setOpen(false); }
                        }} role="menuitem"><IconLink /></button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Copy Share Link now lives inside Export… submenu to save space */}
              <button className="btn" onClick={() => {
                const url = prompt('Paste share link (or URL with #sp=...)');
                if (!url) return;
                try {
                  const m = url.match(/[#&]sp=([^&]+)/);
                  if (!m) { alert('No share payload found'); return; }
                  const data = decodeStarterPreferences(m[1]);
                  if (!data) { alert('Invalid share payload'); return; }
                  const { applied } = applyStarterPreferences(data);
                  toast.show({ variant: 'success', title: 'Preferences applied', message: `${applied} topics updated`, duration: 4000 });
                } catch (e) { alert(String(e instanceof Error ? e.message : String(e))); }
                finally { setOpen(false); }
              }}>Apply from Link…</button>
              <button className="btn" onClick={() => { window.dispatchEvent(new Event('vt-open-diff')); setOpen(false); }}>Compare Preferences</button>
              <button className="btn" onClick={() => { window.dispatchEvent(new Event('vt-open-llm')); setOpen(false); }}>LLM Integration</button>
              <button className="btn" onClick={() => { window.dispatchEvent(new Event('vt-open-getting-started')); setOpen(false); }}>Getting Started</button>
              <button className="btn" onClick={() => { useStore.setState(s => ({ hintsEnabled: !s.hintsEnabled })); setOpen(false); }}>{useStore.getState().hintsEnabled ? 'Disable Hint Mode' : 'Enable Hint Mode'}</button>
              <button className="btn" onClick={() => {
                if (ballotMode === 'ballot') { window.dispatchEvent(new Event('vt-back-preferences')); }
                else { window.dispatchEvent(new Event('vt-create-ballot')); }
                setOpen(false);
              }}>{ballotMode === 'ballot' ? 'Back to Preferences' : 'Create Ballot'}</button>
              <button
                className="btn danger"
                onClick={() => {
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
                    onAction: () => { useStore.setState({ ...snapshot }); },
                    duration: 7000,
                  });
                  setOpen(false);
                }}
              >
                Clear All
              </button>
              {ballotMode !== 'ballot' && (
                <button className="btn danger" onClick={() => {
                  const state = useStore.getState();
                  const snapshot = { title: state.title, notes: state.notes, topics: state.topics, __createdAt: state.__createdAt } as const;
                  useStore.setState({ title: '', notes: '', topics: [], __createdAt: undefined });
                  toast.show({ variant: 'danger', title: 'Preferences cleared', message: 'Your preference set was cleared', actionLabel: 'Undo', onAction: () => { useStore.setState({ ...snapshot }); }, duration: 7000 });
                  setOpen(false);
                }}>Clear Preferences</button>
              )}
              {ballotMode === 'ballot' && currentBallot && (
                <button className="btn danger" onClick={() => {
                  const prev = useStore.getState().currentBallot;
                  useStore.getState().clearBallot();
                  toast.show({ variant: 'danger', title: 'Ballot cleared', message: 'Your ballot was cleared', actionLabel: 'Undo', onAction: () => { useStore.setState({ currentBallot: prev }); }, duration: 7000 });
                  setOpen(false);
                }}>Clear Ballot</button>
              )}
              {isComparing && (
                <button className="btn" onClick={() => { window.dispatchEvent(new Event('vt-clear-comparison')); setOpen(false); }}>Clear Comparison</button>
              )}
              <hr />
              <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON…</button>
              <input ref={fileRef} type="file" className="sr-only" accept="application/json" aria-label="Import JSON" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) onImportFile(f); }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
