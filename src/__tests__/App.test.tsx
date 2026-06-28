import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { renderAppWithStore } from './helpers';
import { useStore } from '../store';
import type { Ballot, PreferenceSet, Topic } from '../schema';
import { buildFullShareUrl, encodeFullSharePayload } from '../utils/share';

let initialState: ReturnType<typeof useStore.getState>;

beforeAll(() => {
  initialState = useStore.getState();
});

afterEach(() => {
  useStore.setState(initialState, true);
  window.history.replaceState(null, '', '/');
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

  it('shows shared review controls for full preference review links', async () => {
    const preferenceSet: PreferenceSet = {
      version: 'tsb.v2',
      title: 'Shared Preference Example',
      notes: '',
      topics: [
        {
          id: 'shared-topic',
          title: 'Clean transit',
          importance: 4,
          stance: 'for',
          notes: '',
          sources: [],
          relations: { broader: [], narrower: [], related: [] },
        },
      ],
      items: [
        {
          id: 'shared-item',
          text: 'More frequent buses',
          stars: 5,
          notes: '',
          sources: [],
          topicIds: ['shared-topic'],
          tags: [],
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const url = buildFullShareUrl(
      encodeFullSharePayload('preference-set', preferenceSet, preferenceSet.title),
      `${window.location.origin}/`,
    );
    window.history.replaceState(null, '', url);

    const { restoreStore } = renderAppWithStore({
      storeOverrides: { hasSeenIntroModal: true },
      topics: [],
    });

    expect(await screen.findByText('Review Shared Preference Set')).toBeInTheDocument();
    expect(screen.getByText(/Shared Preference Example/)).toBeInTheDocument();
    const makeCopy = screen.getByRole('button', { name: 'Make My Copy' });
    fireEvent.click(makeCopy);

    await waitFor(() => {
      expect(screen.queryByText('Review Shared Preference Set')).not.toBeInTheDocument();
    });
    restoreStore();
  });

  it('shows shared review controls for full ballot review links', async () => {
    const ballot: Ballot = {
      version: 'tsb.ballot.v1',
      title: 'Shared Ballot Example',
      election: {
        name: 'Spring Election',
        date: '2026-04-07',
        location: 'Test County',
        type: 'general',
        jurisdiction: 'Test County',
      },
      offices: [
        {
          id: 'office-1',
          title: 'Mayor',
          description: '',
          selectedCandidateId: 'candidate-1',
          reasoning: [],
          candidates: [
            {
              id: 'candidate-1',
              name: 'Avery Stone',
              party: '',
              description: '',
              website: 'https://example.com',
              score: 5,
              sources: [],
            },
          ],
        },
      ],
      measures: [],
      metadata: { sources: [], tags: [] },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const url = buildFullShareUrl(
      encodeFullSharePayload('sample-ballot', ballot, ballot.title),
      `${window.location.origin}/`,
    );
    window.history.replaceState(null, '', url);

    const { restoreStore } = renderAppWithStore({
      storeOverrides: { hasSeenIntroModal: true },
      topics: [],
    });

    expect(await screen.findByText('Review Shared Sample Ballot')).toBeInTheDocument();
    expect(screen.getByText(/Shared Ballot Example/)).toBeInTheDocument();
    const makeCopy = screen.getByRole('button', { name: 'Make My Copy' });
    fireEvent.click(makeCopy);

    await waitFor(() => {
      expect(screen.queryByText('Review Shared Sample Ballot')).not.toBeInTheDocument();
    });
    restoreStore();
  });
});
