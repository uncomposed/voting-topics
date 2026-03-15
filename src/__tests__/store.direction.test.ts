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

  it('adds starter topic items and reuses existing starter-backed items', () => {
    useStore.setState({
      topics: [JSON.parse(JSON.stringify(topic))],
      items: [{
        id: 'shared-item',
        text: 'Shared outcome',
        stars: 2,
        notes: '',
        sources: [],
        topicIds: ['t1'],
        tags: [],
      }],
    } as any);

    useStore.getState().addTopicFromStarter({
      id: 't2',
      title: 'T2',
      items: [
        { id: 'shared-item', text: 'Shared outcome', topicIds: ['t1', 't2'] },
        { id: 'new-item', text: 'New outcome', topicIds: ['t2'] },
      ],
    });

    const state = useStore.getState();
    const topicTwo = state.topics.find((entry) => entry.id === 't2');
    expect(topicTwo).toBeTruthy();
    expect(topicTwo?.directions.map((direction) => direction.id).sort()).toEqual(['new-item', 'shared-item']);

    const shared = state.items.find((item) => item.id === 'shared-item');
    expect(shared?.topicIds.sort()).toEqual(['t1', 't2']);
    expect(state.items.filter((item) => item.id === 'shared-item')).toHaveLength(1);
  });
});
