import { describe, it, expect, beforeEach } from 'vitest';
import type { Topic } from '../schema';
import { useStore } from '../store';
import { encodeStarterPreferencesV2, decodeStarterPreferencesV2, applyStarterPreferences, topicIndex, directionIndex } from '../utils/share';

describe('applyStarterPreferences', () => {
  beforeEach(() => {
    // Reset store to a clean state between tests
    useStore.setState({
      title: '',
      notes: '',
      topics: [],
      __createdAt: undefined,
      ballotMode: 'preference',
      currentBallot: null,
      ballotHistory: [],
      // leave other defaults in place
    } as any);
  });

  it('appends missing starter topics when payload has non-zero data', () => {
    const ti = directionIndex.findIndex(row => (row?.length || 0) >= 1);
    expect(ti).toBeGreaterThanOrEqual(0);
    const tid = topicIndex[ti];
    const d0 = directionIndex[ti]?.[0];
    expect(typeof d0).toBe('string');

    const topics: Topic[] = [
      { id: tid, title: tid, importance: 3, stance: 'neutral',
        directions: d0 ? [{ id: d0!, text: 'x', stars: 4, sources: [], tags: [] }] : [],
        notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
    ];
    const p = encodeStarterPreferencesV2(topics);
    const payload = decodeStarterPreferencesV2(p)!;

    const { applied } = applyStarterPreferences(payload);
    expect(applied).toBeGreaterThanOrEqual(1);

    const state = useStore.getState();
    const added = state.topics.find(t => t.id === tid || t.title === tid);
    expect(added).toBeTruthy();
    expect(added?.importance).toBe(3);
    if (d0) {
      const di = added?.directions.find(d => d.id === d0);
      expect(di?.stars).toBe(4);
    }
  });

  it('updates existing topics that match by id/title', () => {
    const ti = directionIndex.findIndex(row => (row?.length || 0) >= 1);
    expect(ti).toBeGreaterThanOrEqual(0);
    const tid = topicIndex[ti];
    const d0 = directionIndex[ti][0];
    // Seed with existing topic matching by id
    const seed: Topic = {
      id: tid,
      title: tid,
      importance: 0,
      stance: 'neutral',
      directions: [{ id: d0, text: 'x', stars: 0, sources: [], tags: [] }],
      notes: '', sources: [], relations: { broader: [], narrower: [], related: [] },
    };
    useStore.setState({ topics: [seed] });

    const topics: Topic[] = [
      {
        id: tid,
        title: tid,
        importance: 5,
        stance: 'neutral',
        directions: [{ id: d0, text: 'x', stars: 2, sources: [], tags: [] }],
        notes: '', sources: [], relations: { broader: [], narrower: [], related: [] },
      }
    ];
    const p = encodeStarterPreferencesV2(topics);
    const payload = decodeStarterPreferencesV2(p)!;

    const { applied } = applyStarterPreferences(payload);
    expect(applied).toBeGreaterThanOrEqual(1);

    const state = useStore.getState();
    expect(state.topics.length).toBe(1); // no duplicates
    expect(state.topics[0].importance).toBe(5);
    const d = state.topics[0].directions.find(x => x.id === 'dir-f1');
    expect(d?.stars).toBe(2);
  });
});
