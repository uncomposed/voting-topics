import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

type HintEventDetail = { key: string; anchorId: string; content: string; source?: 'auto' | 'manual' };

interface ActiveHint {
  key: string;
  anchorId: string;
  content: string;
  rect: DOMRect;
  placement: 'top' | 'bottom';
}

export const HintManager: React.FC = () => {
  const hintsEnabled = useStore(s => s.hintsEnabled);
  const seenHints = useStore(s => s.seenHints);
  const markHintSeen = useStore(s => s.markHintSeen);
  const setHintsEnabled = useStore(s => s.setHintsEnabled);

  const [active, setActive] = useState<ActiveHint | null>(null);
  const pending = useRef<Map<string, HintEventDetail>>(new Map());
  // Hooks below must be declared unconditionally (rules of hooks)
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 20, left: 20 });

  // Throttle repeated show/dismiss per key and gate auto/manual
  const recent = useRef<Map<string, number>>(new Map());
  const cooldownMs = 1500;
  const canShow = (d: HintEventDetail) => {
    if (hintsEnabled && d.source === 'auto') return false; // in hint mode, ignore auto hints
    if (!hintsEnabled && seenHints.includes(d.key)) return false;
    const now = Date.now();
    const last = recent.current.get(d.key) || 0;
    if (now - last < cooldownMs) return false;
    return true;
  };

  const getSafeBottom = (): number => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom').trim();
    if (!v) return 0;
    const n = Number(v.replace('px',''));
    return isNaN(n) ? 0 : n;
  };

  const computePlacement = (rect: DOMRect): 'top' | 'bottom' => {
    const header = document.querySelector('header') as HTMLElement | null;
    const headerH = header ? header.offsetHeight : 0;
    const safeB = getSafeBottom();
    const spaceAbove = rect.top - headerH;
    const spaceBelow = (window.innerHeight - safeB) - rect.bottom;
    return spaceAbove > spaceBelow ? 'top' : 'bottom';
  };

  const showFor = (detail: HintEventDetail) => {
    const el = document.getElementById(detail.anchorId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    recent.current.set(detail.key, Date.now());
    setActive({ key: detail.key, anchorId: detail.anchorId, content: detail.content, rect, placement: computePlacement(rect) });
  };

  useEffect(() => {
    const onAvail = (e: Event) => {
      const ce = e as CustomEvent<HintEventDetail>;
      const d = ce.detail;
      if (!d || !d.key || !d.anchorId) return;
      if (!canShow(d)) return;
      // If a hint is already showing, ignore duplicates for the same key; otherwise queue
      if (active) {
        if (active.key !== d.key) pending.current.set(d.key, d);
      } else {
        showFor(d);
      }
    };
    window.addEventListener('vt-hint-available', onAvail as EventListener);
    return () => window.removeEventListener('vt-hint-available', onAvail as EventListener);
  }, [active, hintsEnabled, seenHints]);

  // Reposition on resize/scroll
  useEffect(() => {
    if (!active) return;
    const update = () => {
      const el = document.getElementById(active.anchorId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setActive(prev => prev ? { ...prev, rect, placement: computePlacement(rect) } : prev);
    };
    const r = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { cancelAnimationFrame(r); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [active]);

  const dismiss = (markSeen: boolean) => {
    if (active && markSeen) markHintSeen(active.key);
    if (active) recent.current.set(active.key, Date.now());
    setActive(null);
    // If there are pending hints, show the latest one
    const next = Array.from(pending.current.values()).pop();
    pending.current.clear();
    if (next && canShow(next)) setTimeout(() => showFor(next), 0);
  };

  // Dismiss when user clicks the target element
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!active) return;
      const el = document.getElementById(active.anchorId);
      if (el && (e.target as Node) && el.contains(e.target as Node)) {
        dismiss(true);
      }
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(false);
      if (e.key === '?') setHintsEnabled(!hintsEnabled);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [hintsEnabled, setHintsEnabled]);

  // Dismiss hints when major app views change (navigation within SPA)
  useEffect(() => {
    const off = () => dismiss(false);
    const events = [
      'vt-open-diff', 'vt-open-llm', 'vt-open-getting-started',
      'vt-create-ballot', 'vt-back-preferences', 'vt-exit-special'
    ];
    events.forEach(ev => window.addEventListener(ev, off as EventListener));
    return () => events.forEach(ev => window.removeEventListener(ev, off as EventListener));
  }, []);

  // No early return before hooks; render logic happens below
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2500,
    maxWidth: 320,
    background: 'rgba(20, 26, 56, 0.98)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '10px 12px',
    boxShadow: '0 10px 24px rgba(0,0,0,0.35)'
  };

  const GAP = 8;

  // Compute position after render so we know actual size
  useEffect(() => {
    const b = bubbleRef.current;
    if (!b || !active) return;
    const w = b.offsetWidth || 320;
    const h = b.offsetHeight || 80;
    const safeB = getSafeBottom();
    const maxLeft = Math.max(8, window.innerWidth - w - 8);
    const left = Math.min(Math.max(8, active.rect.left), maxLeft);
    let top: number;
    if (active.placement === 'top') {
      top = Math.max(8, active.rect.top - h - GAP);
    } else {
      top = Math.min(window.innerHeight - safeB - h - 8, active.rect.bottom + GAP);
      // If clamped to bottom, flip to top as fallback
      if (top < 8) top = Math.max(8, active.rect.top - h - GAP);
    }
    setPos({ top, left });
  }, [active?.rect.top, active?.rect.left, active?.placement]);

  if (!active) return null;
  return (
    <>
      {/* Backdrop to allow “tap anywhere to dismiss” and block unintended clicks */}
      <div
        className="hint-backdrop"
        style={{ position: 'fixed', inset: 0, zIndex: 2490, background: 'transparent' }}
        onClick={() => dismiss(true)}
      />
      <div ref={bubbleRef} className="hint-callout" role="tooltip" style={{ ...style, top: pos.top, left: pos.left }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div aria-hidden>💡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{active.content.split('\n')[0]}</div>
            {active.content.includes('\n') && (
              <div className="muted" style={{ fontSize: '0.9rem' }}>{active.content.split('\n').slice(1).join('\n')}</div>
            )}
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn small" onClick={() => dismiss(true)}>Got it</button>
              <button className="btn small ghost" onClick={() => dismiss(false)}>Close</button>
              <button className="btn small ghost" onClick={() => setHintsEnabled(!hintsEnabled)}>{hintsEnabled ? 'Disable Hints' : 'Enable Hints'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
