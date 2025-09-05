export const emitHint = (key: string, anchorId: string, content: string) => {
  try {
    const el = document.getElementById(anchorId);
    if (!el) return;
    // Use CustomEvent if available, otherwise fall back
    let ev: Event;
    try {
      ev = new CustomEvent('vt-hint-available', { detail: { key, anchorId, content } } as any);
    } catch {
      // Older Safari fallback
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ev = document.createEvent('CustomEvent');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ev.initCustomEvent('vt-hint-available', true, true, { key, anchorId, content });
    }
    window.dispatchEvent(ev);
  } catch {
    // no-op: hints should never crash the app
  }
};

