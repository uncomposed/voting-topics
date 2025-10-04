import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('store direction actions', () => {
  const topic = {
    id: 't1',
    title: 'T1',
    importance: 1,
    stance: 'neutral' as const,
    directions: [],
    notes: '',
    sources: [],
    relations: { broader: [], narrower: [], related: [] }
  };

  beforeEach(() => {
    useStore.setState({
      title: '',
      notes: '',
      topics: [JSON.parse(JSON.stringify(topic))],
      ballotMode: 'preference',
      currentBallot: null,
      ballotHistory: [],
      currentFlowStep: 'starter',
      hintsEnabled: false,
      seenHints: [],
      hasSeenIntroModal: true,
    } as any);
  });

  it('adds, patches, and removes directions', () => {
    const add = useStore.getState().addDirection;
    const patch = useStore.getState().patchDirection;
    const remove = useStore.getState().removeDirection;

    add('t1');
    let state = useStore.getState();
    expect(state.topics[0].directions.length).toBe(1);
    const dirId = state.topics[0].directions[0].id;

    patch('t1', dirId, { text: 'updated', stars: 3 });
    state = useStore.getState();
    expect(state.topics[0].directions[0].text).toBe('updated');
    expect(state.topics[0].directions[0].stars).toBe(3);

    remove('t1', dirId);
    state = useStore.getState();
    expect(state.topics[0].directions.length).toBe(0);
  });
});
