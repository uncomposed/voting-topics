import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { FAQContent } from './FAQContent';

type HintEventDetail = { key: string; anchorId: string; content: string; source?: 'auto' | 'manual' };

interface HintRecord extends HintEventDetail {
  lastSeenAt: number;
}

const shortcuts = [
  ['t', 'Toggle List/Card or return to Preferences'],
  ['b', 'Toggle Ballot'],
  ['c', 'Toggle Compare'],
  ['n', 'Add a new topic'],
  ['?', 'Toggle keyboard shortcuts overlay'],
  ['Esc', 'Close menus and overlays'],
];

export const HintManager: React.FC = () => {
  const seenHints = useStore((state) => state.seenHints);
  const markHintSeen = useStore((state) => state.markHintSeen);
  const hintsEnabled = useStore((state) => state.hintsEnabled);
  const setHintsEnabled = useStore((state) => state.setHintsEnabled);

  const [open, setOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tips' | 'faq' | 'shortcuts'>('tips');
  const [registry, setRegistry] = useState<Record<string, HintRecord>>({});

  useEffect(() => {
    const onAvail = (event: Event) => {
      const detail = (event as CustomEvent<HintEventDetail>).detail;
      if (!detail?.key || !detail.anchorId) return;
      setRegistry((current) => ({
        ...current,
        [detail.key]: {
          ...detail,
          lastSeenAt: Date.now(),
        },
      }));
    };
    const onOpenFaq = () => setFaqOpen(true);
    window.addEventListener('vt-hint-available', onAvail as EventListener);
    window.addEventListener('vt-open-faq', onOpenFaq as EventListener);
    return () => {
      window.removeEventListener('vt-hint-available', onAvail as EventListener);
      window.removeEventListener('vt-open-faq', onOpenFaq as EventListener);
    };
  }, []);

  const visibleHints = useMemo(() => Object.values(registry).filter((hint) => {
    const element = document.getElementById(hint.anchorId);
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }), [registry]);

  const unseenVisibleHints = visibleHints.filter((hint) => !seenHints.includes(hint.key));
  const hasNewGuidance = hintsEnabled && unseenVisibleHints.length > 0;
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  const markVisibleHintsSeen = () => {
    unseenVisibleHints.forEach((hint) => markHintSeen(hint.key));
  };

  const TipsPanel = (
    <div className="help-text">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Contextual Tips</h3>
          <div className="muted" style={{ fontSize: '0.9rem' }}>
            Guidance for the controls currently visible on screen.
          </div>
        </div>
        {unseenVisibleHints.length > 0 && (
          <button className="btn small" onClick={markVisibleHintsSeen}>Mark Seen</button>
        )}
      </div>
      {visibleHints.length === 0 ? (
        <div className="empty">No contextual tips are registered for this screen yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {visibleHints.map((hint) => {
            const unseen = !seenHints.includes(hint.key);
            return (
              <div key={hint.key} className="panel" style={{ padding: 12, borderColor: unseen ? 'var(--accent)' : 'var(--border)' }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong>{hint.content.split('\n')[0]}</strong>
                  {unseen && <span className="chip">New</span>}
                </div>
                {hint.content.includes('\n') && (
                  <p className="muted" style={{ marginBottom: 0 }}>{hint.content.split('\n').slice(1).join('\n')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        id="global-help-button"
        className={`btn ${hasNewGuidance ? 'primary' : 'ghost'}`}
        style={{
          position: 'fixed',
          right: 16,
          bottom: isMobile ? 72 : 20,
          zIndex: 1800,
          borderRadius: '999px',
          minWidth: 48,
          minHeight: 48,
          boxShadow: hasNewGuidance ? '0 0 0 6px rgba(139, 211, 255, 0.18)' : '0 6px 18px rgba(0,0,0,0.18)',
        }}
        aria-label="Open help"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) setActiveTab('tips');
        }}
      >
        {hasNewGuidance ? '? *' : '?'}
      </button>

      {open && (
        <div
          className="modal-overlay"
          onClick={() => setOpen(false)}
          style={{
            alignItems: isMobile ? 'flex-end' : 'stretch',
            justifyContent: isMobile ? 'stretch' : 'flex-end',
            background: 'rgba(5, 8, 20, 0.22)',
            zIndex: 1750,
          }}
        >
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: isMobile ? '100%' : 420,
              maxWidth: '100%',
              minHeight: isMobile ? '58vh' : '100vh',
              maxHeight: isMobile ? '80vh' : '100vh',
              borderRadius: isMobile ? '18px 18px 0 0' : 0,
              overflowY: 'auto',
            }}
          >
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Help</h2>
              <div className="modal-header-actions">
                <button className="btn ghost" onClick={() => setHintsEnabled(!hintsEnabled)}>
                  {hintsEnabled ? 'Mute Alerts' : 'Enable Alerts'}
                </button>
                <button className="btn" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>

            <div className="diff-tabs" style={{ marginBottom: 16 }}>
              <button className={`tab ${activeTab === 'tips' ? 'active' : ''}`} onClick={() => setActiveTab('tips')}>Tips</button>
              <button className={`tab ${activeTab === 'faq' ? 'active' : ''}`} onClick={() => setActiveTab('faq')}>FAQ</button>
              <button className={`tab ${activeTab === 'shortcuts' ? 'active' : ''}`} onClick={() => setActiveTab('shortcuts')}>Shortcuts</button>
            </div>

            {activeTab === 'tips' && TipsPanel}
            {activeTab === 'faq' && (
              <div>
                <FAQContent />
                <button className="btn" onClick={() => setFaqOpen(true)}>Open Full FAQ</button>
              </div>
            )}
            {activeTab === 'shortcuts' && (
              <div className="help-text">
                <h3>Keyboard Shortcuts</h3>
                <ul>
                  {shortcuts.map(([key, description]) => (
                    <li key={key}><strong>{key}</strong>: {description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {faqOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setFaqOpen(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>FAQ</h2>
              <div className="modal-header-actions">
                <button className="btn" onClick={() => setFaqOpen(false)}>Close</button>
              </div>
            </div>
            <div className="modal-body">
              <FAQContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
