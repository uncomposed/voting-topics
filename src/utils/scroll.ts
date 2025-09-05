export const getHeaderHeight = (): number => {
  const header = document.querySelector('header') as HTMLElement | null;
  return header ? header.offsetHeight : 0;
};

export const getBottomBarHeight = (): number => {
  const bar = document.querySelector('.mobile-action-bar') as HTMLElement | null;
  // Only count if visible
  if (!bar) return 0;
  const style = getComputedStyle(bar);
  if (style.display === 'none') return 0;
  return bar.offsetHeight || 0;
};

/**
 * Smoothly scroll the page so that the element is vertically centered within
 * the usable viewport area (accounting for sticky header and bottom action bar).
 */
export const scrollIntoViewSmart = (el: HTMLElement, behavior: ScrollBehavior = 'smooth') => {
  const rect = el.getBoundingClientRect();
  const headerH = getHeaderHeight();
  const bottomH = getBottomBarHeight();
  const usableH = Math.max(100, window.innerHeight - headerH - bottomH);
  const currentTop = window.scrollY + rect.top; // element top in document coords

  // Small visual offset so titles aren't tight against the header
  const SAFETY = 8;

  let target: number;
  if (rect.height >= usableH) {
    // If the element is taller than the usable viewport, align its top just below the header
    target = currentTop - headerH - SAFETY;
  } else {
    // Otherwise, center within usable viewport
    target = currentTop - headerH - (usableH - rect.height) / 2 - SAFETY;
  }

  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const clamped = Math.min(Math.max(0, target), maxScroll);
  window.scrollTo({ top: clamped, behavior });
};
