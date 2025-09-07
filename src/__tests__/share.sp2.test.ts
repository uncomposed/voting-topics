import { describe, it, expect } from 'vitest';
import type { Topic } from '../schema';
import { encodeStarterPreferencesV2, decodeStarterPreferencesV2, extractAndDecodeFromUrl, topicIndex, directionIndex } from '../utils/share';

describe('sp2 share encoding', () => {
  it('roundtrips small set and stays short', () => {
    const firearmsIdx = topicIndex.indexOf('topic-firearms');
    const climateIdx = topicIndex.indexOf('topic-climate');
    expect(firearmsIdx).toBeGreaterThanOrEqual(0);
    expect(climateIdx).toBeGreaterThanOrEqual(0);

    const topics: Topic[] = [
      {
        id: 'topic-firearms',
        title: 'Firearms',
        importance: 5,
        stance: 'neutral',
        directions: [
          { id: 'dir-f1', text: 'Much less death and injury by firearms', stars: 3, sources: [], tags: [] },
          { id: 'dir-f2', text: 'People use firearms responsibly', stars: 2, sources: [], tags: [] },
        ],
        notes: '',
        sources: [],
        relations: { broader: [], narrower: [], related: [] },
      },
      {
        id: 'topic-climate',
        title: 'Climate',
        importance: 4,
        stance: 'neutral',
        directions: [
          { id: 'dir-c1', text: 'Lower greenhouse gas emissions', stars: 5, sources: [], tags: [] },
        ],
        notes: '',
        sources: [],
        relations: { broader: [], narrower: [], related: [] },
      },
    ];

    const payload = encodeStarterPreferencesV2(topics);
    expect(typeof payload).toBe('string');
    // sanity: should be fairly short for a small set
    expect(payload.length).toBeLessThan(120);

    const decoded = decodeStarterPreferencesV2(payload)!;
    expect(decoded).toBeTruthy();
    // tip should include both topics
    expect(decoded.tip).toContainEqual([firearmsIdx, 5]);
    expect(decoded.tip).toContainEqual([climateIdx, 4]);

    // dsp should include specific directions
    const fRow = directionIndex[firearmsIdx];
    const cRow = directionIndex[climateIdx];
    const f1 = fRow.indexOf('dir-f1');
    const f2 = fRow.indexOf('dir-f2');
    const c1 = cRow.indexOf('dir-c1');
    expect(f1).toBeGreaterThanOrEqual(0);
    expect(f2).toBeGreaterThanOrEqual(0);
    expect(c1).toBeGreaterThanOrEqual(0);
    expect(decoded.dsp).toContainEqual([firearmsIdx, f1, 3]);
    expect(decoded.dsp).toContainEqual([firearmsIdx, f2, 2]);
    expect(decoded.dsp).toContainEqual([climateIdx, c1, 5]);
  });

  it('extracts from #sp2= URL', () => {
    const topics: Topic[] = [
      { id: 'topic-firearms', title: 'Firearms', importance: 1, stance: 'neutral', directions: [], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
    ];
    const p2 = encodeStarterPreferencesV2(topics);
    const url = `https://example.com/app#sp2=${p2}`;
    const parsed = extractAndDecodeFromUrl(url);
    expect(parsed && 'tip' in parsed).toBe(true);
  });

  it('handles empty payload (no non-zero entries)', () => {
    // Build topics with only starter IDs but zero importance/stars
    const idx = topicIndex.slice(0, 2);
    const topics: Topic[] = idx.map(id => ({
      id,
      title: id,
      importance: 0,
      stance: 'neutral',
      directions: [],
      notes: '',
      sources: [],
      relations: { broader: [], narrower: [], related: [] },
    }));
    const p = encodeStarterPreferencesV2(topics);
    const decoded = decodeStarterPreferencesV2(p)!;
    expect(decoded).toBeTruthy();
    expect(Array.isArray((decoded as any).tip)).toBe(true);
    expect(Array.isArray((decoded as any).dsp)).toBe(true);
    expect((decoded as any).tip.length).toBe(0);
    expect((decoded as any).dsp.length).toBe(0);
  });

  it('clamps values to 0..5', () => {
    const firearmsIdx = topicIndex.indexOf('topic-firearms');
    expect(firearmsIdx).toBeGreaterThanOrEqual(0);
    const drow = directionIndex[firearmsIdx];
    const dirId = drow[0];
    const topics: Topic[] = [
      {
        id: 'topic-firearms',
        title: 'Firearms',
        importance: 9, // should clamp to 5
        stance: 'neutral',
        directions: [
          { id: dirId, text: 'x', stars: 11, sources: [], tags: [] }, // clamp to 5
        ],
        notes: '', sources: [], relations: { broader: [], narrower: [], related: [] },
      }
    ];
    const p = encodeStarterPreferencesV2(topics);
    const decoded = decodeStarterPreferencesV2(p)!;
    const tipEntry = decoded.tip.find(([i]) => i === firearmsIdx);
    expect(tipEntry?.[1]).toBe(5);
    const di = directionIndex[firearmsIdx].indexOf(dirId);
    const dspEntry = decoded.dsp.find(([ti, dj]) => ti === firearmsIdx && dj === di);
    expect(dspEntry?.[2]).toBe(5);
  });

  it('stays compact with many entries', () => {
    // Set first 10 topics with importance and first direction star
    const count = Math.min(10, topicIndex.length);
    const topics: Topic[] = [];
    for (let i = 0; i < count; i++) {
      const tId = topicIndex[i];
      const dId = directionIndex[i]?.[0];
      topics.push({
        id: tId,
        title: tId,
        importance: 3,
        stance: 'neutral',
        directions: dId ? [{ id: dId, text: 'x', stars: 2, sources: [], tags: [] }] : [],
        notes: '', sources: [], relations: { broader: [], narrower: [], related: [] },
      });
    }
    const p = encodeStarterPreferencesV2(topics);
    // Basic size sanity check; binary should remain fairly compact
    expect(p.length).toBeLessThan(300);
    const decoded = decodeStarterPreferencesV2(p)!;
    expect(decoded.tip.length).toBeGreaterThanOrEqual(count);
    // dsp may be less than count if some topics have no directions
    expect(Array.isArray(decoded.dsp)).toBe(true);
  });
});
