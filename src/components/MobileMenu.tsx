import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { exportJSON, exportPDF, exportJPEG } from '../exporters';
import { parseIncomingPreferenceSet, parseIncomingBallot } from '../schema';
import { toast } from '../utils/toast';

export const MobileMenu: React.FC = () => {
  const addTopic = useStore(s => s.addTopic);
  const clearAll = useStore(s => s.clearAll);
  const ballotMode = useStore(s => s.ballotMode);
  const [open, setOpen] = useState(false);
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
              <button className="btn" onClick={() => { try { exportJSON(); } catch (e) { alert(String(e)); } setOpen(false); }}>Export JSON</button>
              <button className="btn" onClick={() => { exportPDF().catch(e => alert(String(e))); setOpen(false); }}>Export PDF</button>
              <button className="btn" onClick={() => { exportJPEG().catch(e => alert(String(e))); setOpen(false); }}>Export JPEG</button>
              <button className="btn" onClick={() => { window.dispatchEvent(new Event('vt-open-diff')); setOpen(false); }}>Compare Preferences</button>
              <button className="btn" onClick={() => { window.dispatchEvent(new Event('vt-open-llm')); setOpen(false); }}>LLM Integration</button>
              <button className="btn" onClick={() => { window.dispatchEvent(new Event('vt-open-getting-started')); setOpen(false); }}>Getting Started</button>
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
              <hr />
              <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON…</button>
              <input ref={fileRef} type="file" className="sr-only" accept="application/json" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) onImportFile(f); }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
