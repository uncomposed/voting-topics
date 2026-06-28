import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MobileMenu } from '../components/MobileMenu';
import { useStore } from '../store';
import type { Ballot } from '../schema';

let initialState: ReturnType<typeof useStore.getState>;

beforeAll(() => {
  initialState = useStore.getState();
});

afterEach(() => {
  useStore.setState(initialState, true);
  cleanup();
  vi.clearAllMocks();
});

const buildBallot = (score: number): Ballot => ({
  version: 'tsb.ballot.v1',
  title: 'Menu Ballot',
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
      selectedCandidateId: score > 0 ? 'candidate-1' : undefined,
      reasoning: [],
      candidates: [
        {
          id: 'candidate-1',
          name: 'Avery Stone',
          party: '',
          description: '',
          website: 'https://example.com',
          score,
          sources: [],
        },
      ],
    },
  ],
  measures: [],
  metadata: { sources: [], tags: [] },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
});

const openMenu = () => {
  act(() => {
    window.dispatchEvent(new Event('vt-open-mobile-menu'));
  });
};

describe('Mobile menu ballot sharing', () => {
  it('hides share actions for incomplete ballots', () => {
    useStore.setState({
      ...initialState,
      ballotMode: 'ballot',
      currentBallot: buildBallot(0),
      topics: [],
      items: [],
      hasSeenIntroModal: true,
    }, true);
    render(<MobileMenu />);

    openMenu();

    expect(screen.queryByLabelText('Export options')).not.toBeInTheDocument();
  });

  it('shows share actions for share-ready ballots', () => {
    useStore.setState({
      ...initialState,
      ballotMode: 'ballot',
      currentBallot: buildBallot(5),
      topics: [],
      items: [],
      hasSeenIntroModal: true,
    }, true);
    render(<MobileMenu />);

    openMenu();

    expect(screen.getByLabelText('Export options')).toBeInTheDocument();
  });
});
