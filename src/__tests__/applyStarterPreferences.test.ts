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
    const firearmsIdx = topicIndex.indexOf('topic-firearms');
    expect(firearmsIdx).toBeGreaterThanOrEqual(0);
    const d0 = directionIndex[firearmsIdx]?.[0];
    expect(typeof d0).toBe('string');

    // Build a small topic set with non-zero values
    const topics: Topic[] = [
      { id: 'topic-firearms', title: 'Firearms', importance: 3, stance: 'neutral',
        directions: d0 ? [{ id: d0!, text: 'x', stars: 4, sources: [], tags: [] }] : [],
        notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
    ];
    const p = encodeStarterPreferencesV2(topics);
    const payload = decodeStarterPreferencesV2(p)!;

    const { applied } = applyStarterPreferences(payload);
    expect(applied).toBeGreaterThanOrEqual(1);

    const state = useStore.getState();
    const added = state.topics.find(t => t.id === 'topic-firearms' || t.title === 'Firearms');
    expect(added).toBeTruthy();
    expect(added?.importance).toBe(3);
    if (d0) {
      const di = added?.directions.find(d => d.id === d0);
      expect(di?.stars).toBe(4);
    }
  });

  it('updates existing topics that match by id/title', () => {
    // Seed store with an existing starter topic with zeros
    const seed: Topic = {
      id: 'topic-firearms',
      title: 'Firearms',
      importance: 0,
      stance: 'neutral',
      directions: [{ id: 'dir-f1', text: 'Much less death and injury by firearms', stars: 0, sources: [], tags: [] }],
      notes: '',
      sources: [],
      relations: { broader: [], narrower: [], related: [] },
    };
    useStore.setState({ topics: [seed] });

    // Desired updates
    const topics: Topic[] = [
      {
        id: 'topic-firearms',
        title: 'Firearms',
        importance: 5,
        stance: 'neutral',
        directions: [{ id: 'dir-f1', text: 'Much less death and injury by firearms', stars: 2, sources: [], tags: [] }],
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

