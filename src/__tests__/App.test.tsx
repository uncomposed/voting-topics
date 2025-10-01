import { screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { renderAppWithStore } from './helpers';
import { useStore } from '../store';
import type { Topic } from '../schema';

let initialState: ReturnType<typeof useStore.getState>;

beforeAll(() => {
  initialState = useStore.getState();
});

afterEach(() => {
  useStore.setState(initialState, true);
  cleanup();
  vi.clearAllMocks();
});

describe('App integration smoke tests', () => {
  it('renders toolbar actions via portal and toggles between views', async () => {
    const seededTopic: Topic = {
      id: 'topic-seeded',
      title: 'Housing',
      importance: 3,
      stance: 'neutral',
      directions: [
        {
          id: 'dir-seeded',
          text: 'Add affordable housing units',
          stars: 3,
          sources: [],
          tags: [],
        },
      ],
      notes: '',
      sources: [],
      relations: { broader: [], narrower: [], related: [] },
    };

    const { restoreStore } = renderAppWithStore({ topics: [seededTopic] });

    const toggleButton = await waitFor(() => {
      const btn = document.getElementById('btn-toggle-view');
      if (!btn) throw new Error('Toggle view button not ready');
      return btn;
    });
    expect(toggleButton.textContent).toMatch(/Card View/i);

    await waitFor(() => {
      expect(document.getElementById('btn-next-action')?.textContent).toMatch(/Ballot/i);
    });

    fireEvent.click(toggleButton);
    await waitFor(() => {
      expect(document.getElementById('btn-toggle-view')?.textContent).toMatch(/List View/i);
    });

    const compareButton = document.getElementById('btn-diff-comparison');
    expect(compareButton).toBeInTheDocument();

    restoreStore();
  });

  it('adds starter topics when selection submitted', async () => {
    const addTopicFromStarter = vi.fn();
    const { restoreStore } = renderAppWithStore({
      storeOverrides: {
        addTopicFromStarter,
        currentFlowStep: 'starter',
      },
      topics: [],
    });

    const starterCheckboxes = await screen.findAllByRole('checkbox');
    fireEvent.click(starterCheckboxes[0]);
    const addButton = screen.getByRole('button', { name: /add selected \(\d+\)/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(addTopicFromStarter).toHaveBeenCalled();
    });
    restoreStore();
  });
});
