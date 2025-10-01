import { cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { renderAppWithStore } from './helpers';
import { useStore } from '../store';

let initialState: ReturnType<typeof useStore.getState>;

beforeAll(() => {
  initialState = useStore.getState();
});

afterEach(() => {
  useStore.setState(initialState, true);
  cleanup();
  vi.clearAllMocks();
});

describe('Mobile action bar behaviour', () => {
  it('surfaces Add Selected when starter topics are chosen', async () => {
    const { restoreStore } = renderAppWithStore({
      topics: [],
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('vt-starter-selection-changed', { detail: { count: 3 } }));
    });

    const nextBtn = await waitFor(() => document.getElementById('m-next'));
    expect(nextBtn).toBeInTheDocument();
    await waitFor(() => {
      expect(nextBtn?.textContent).toMatch(/Add Selected/i);
    });

    const handler = vi.fn();
    window.addEventListener('vt-starter-add-selected', handler as EventListener);
    if (nextBtn) {
      fireEvent.click(nextBtn);
    }
    window.removeEventListener('vt-starter-add-selected', handler as EventListener);

    expect(handler).toHaveBeenCalledTimes(1);

    restoreStore();
  });
});
