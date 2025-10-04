import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OfficeSelector } from '../components/ballot/OfficeSelector';
import { useStore } from '../store';
import type { Ballot } from '../schema';

const baseBallot: Ballot = {
  version: 'tsb.ballot.v1',
  title: 'City Election',
  election: {
    name: '2024 Springfield General',
    date: '2024-11-05',
    location: 'Springfield',
    jurisdiction: 'Springfield County',
    type: 'general',
  },
  offices: [
    {
      id: 'office-1',
      title: 'Mayor',
      description: 'Lead executive',
      candidates: [
        {
          id: 'candidate-1',
          name: 'Alex Rivera',
          party: 'Independent',
          description: 'Community organiser',
          website: undefined,
          score: 0,
          sources: [],
        },
      ],
      selectedCandidateId: undefined,
      reasoning: [],
    },
  ],
  measures: [],
  metadata: {
    preferenceSetId: undefined,
    notes: '',
    sources: [],
    tags: [],
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('OfficeSelector STAR scoring', () => {
  beforeEach(() => {
    useStore.setState({
      ballotMode: 'ballot',
      currentBallot: JSON.parse(JSON.stringify(baseBallot)),
      hasSeenIntroModal: true,
    } as any);
  });

  afterEach(() => {
    cleanup();
    useStore.setState({
      ballotMode: 'preference',
      currentBallot: null,
    } as any);
  });

  it('updates candidate score and highlights highest-rated choice', () => {
    render(<OfficeSelector />);

    const fiveStarButton = screen.getByRole('button', { name: '5 stars' });
    fireEvent.click(fiveStarButton);

    expect(fiveStarButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Highest score')).toBeInTheDocument();

    const state = useStore.getState();
    const candidate = state.currentBallot?.offices[0]?.candidates[0];
    expect(candidate?.score).toBe(5);
    expect(state.currentBallot?.offices[0]?.selectedCandidateId).toBe('candidate-1');
  });
});

