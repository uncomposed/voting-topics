import { act, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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

const buildPreferenceSet = (title: string): PreferenceSet => ({
  version: 'tsb.v2',
  title,
  notes: '',
  topics: [
    {
      id: `${title.toLowerCase().replace(/\W+/g, '-')}-topic`,
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
      id: `${title.toLowerCase().replace(/\W+/g, '-')}-item`,
      text: 'More frequent buses',
      stars: 5,
      notes: '',
      sources: [],
      topicIds: [`${title.toLowerCase().replace(/\W+/g, '-')}-topic`],
      tags: [],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
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
    const preferenceSet = buildPreferenceSet('Shared Preference Example');
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
    expect(window.location.href).not.toContain('#full=');
    expect(useStore.getState().shareReview.active).toBe(false);
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

  it('rejects malformed share links without entering review mode or replacing local work', async () => {
    const localTopic: Topic = {
      id: 'local-topic',
      title: 'Local housing',
      importance: 3,
      stance: 'neutral',
      directions: [],
      notes: '',
      sources: [],
      relations: { broader: [], narrower: [], related: [] },
    };
    window.history.replaceState(null, '', `${window.location.origin}/#full=not-a-valid-payload`);

    const { restoreStore } = renderAppWithStore({
      storeOverrides: { hasSeenIntroModal: true },
      topics: [localTopic],
    });

    await waitFor(() => {
      expect(useStore.getState().shareReview.active).toBe(false);
    });
    expect(screen.queryByText(/Review Shared/)).not.toBeInTheDocument();
    expect(useStore.getState().topics[0]?.title).toBe('Local housing');
    restoreStore();
  });

  it('applies a later share hash in an already open tab after confirmation', async () => {
    const firstPreferenceSet = buildPreferenceSet('First Shared Set');
    const secondPreferenceSet = buildPreferenceSet('Second Shared Set');
    const firstUrl = buildFullShareUrl(
      encodeFullSharePayload('preference-set', firstPreferenceSet, firstPreferenceSet.title),
      `${window.location.origin}/`,
    );
    const secondUrl = buildFullShareUrl(
      encodeFullSharePayload('preference-set', secondPreferenceSet, secondPreferenceSet.title),
      `${window.location.origin}/`,
    );
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { restoreStore } = renderAppWithStore({
      storeOverrides: { hasSeenIntroModal: true },
      topics: [],
    });

    act(() => {
      window.history.pushState(null, '', firstUrl);
      window.dispatchEvent(new Event('hashchange'));
    });
    await waitFor(() => {
      expect(useStore.getState().title).toBe('First Shared Set');
    });

    act(() => {
      window.history.pushState(null, '', secondUrl);
      window.dispatchEvent(new Event('hashchange'));
    });
    await waitFor(() => {
      expect(useStore.getState().title).toBe('Second Shared Set');
    });
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(useStore.getState().shareReview.title).toBe('Second Shared Set');

    confirmSpy.mockRestore();
    restoreStore();
  });
});
