import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { LEGACY_STORAGE_KEY, useGuideStore } from '../guide/store';
import { completeDemoGuide } from './fixtures';

describe('App safety and first-run behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    useGuideStore.setState({ draft: null, backup: null, legacyDismissed: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts the deliberately fictional guide without onboarding detours', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start fictional demo' }));
    expect(screen.getByRole('heading', { name: 'Mayor' })).toBeInTheDocument();
    expect(screen.getByText(/Fictional demo election/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review guide' })).toBeDisabled();
  });

  it('does not replace local state when a shared URL is malformed', () => {
    const guide = completeDemoGuide();
    useGuideStore.setState({ draft: guide });
    window.history.replaceState(null, '', '/#guide=g1.damaged');
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('saved guide was not changed');
    expect(useGuideStore.getState().draft?.id).toBe(guide.id);
    expect(screen.getByRole('button', { name: 'Resume saved guide' })).toBeInTheDocument();
  });

  it('offers the untouched legacy payload as a raw download', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, '{"legacy":true}');
    const createObjectUrl = vi.fn(() => 'blob:legacy');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Download legacy backup' }));
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe('{"legacy":true}');
  });
});
