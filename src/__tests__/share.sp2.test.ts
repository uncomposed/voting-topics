import { describe, it, expect } from 'vitest';
import type { Topic } from '../schema';
import { encodeStarterPreferencesV2, decodeStarterPreferencesV2, extractAndDecodeFromUrl, topicIndex, directionIndex, buildShareUrl, buildShareUrlV2 } from '../utils/share';

describe('sp2 share encoding', () => {
  it('roundtrips small set and stays short', () => {
    // Choose first topic with at least 2 directions and another with at least 1
    const t1 = directionIndex.findIndex(row => (row?.length || 0) >= 2);
    const t2 = directionIndex.findIndex((row, i) => i !== t1 && (row?.length || 0) >= 1);
    expect(t1).toBeGreaterThanOrEqual(0);
    expect(t2).toBeGreaterThanOrEqual(0);

    const t1row = directionIndex[t1];
    const t2row = directionIndex[t2];
    const t1d1 = t1row[0];
    const t1d2 = t1row[1];
    const t2d1 = t2row[0];

    const topics: Topic[] = [
      {
        id: topicIndex[t1],
        title: topicIndex[t1],
        importance: 5,
        stance: 'neutral',
        directions: [
          { id: t1d1, text: 'A', stars: 3, sources: [], tags: [] },
          { id: t1d2, text: 'B', stars: 2, sources: [], tags: [] },
        ],
        notes: '', sources: [], relations: { broader: [], narrower: [], related: [] },
      },
      {
        id: topicIndex[t2],
        title: topicIndex[t2],
        importance: 4,
        stance: 'neutral',
        directions: [
          { id: t2d1, text: 'C', stars: 5, sources: [], tags: [] },
        ],
        notes: '', sources: [], relations: { broader: [], narrower: [], related: [] },
      },
    ];

    const payload = encodeStarterPreferencesV2(topics);
    expect(typeof payload).toBe('string');
    expect(payload.length).toBeLessThan(120);

    const decoded = decodeStarterPreferencesV2(payload)!;
    expect(decoded).toBeTruthy();
    expect(decoded.tip).toContainEqual([t1, 5]);
    expect(decoded.tip).toContainEqual([t2, 4]);

    const f1 = directionIndex[t1].indexOf(t1d1);
    const f2 = directionIndex[t1].indexOf(t1d2);
    const c1 = directionIndex[t2].indexOf(t2d1);
    expect(f1).toBeGreaterThanOrEqual(0);
    expect(f2).toBeGreaterThanOrEqual(0);
    expect(c1).toBeGreaterThanOrEqual(0);
    expect(decoded.dsp).toContainEqual([t1, f1, 3]);
    expect(decoded.dsp).toContainEqual([t1, f2, 2]);
    expect(decoded.dsp).toContainEqual([t2, c1, 5]);
  });

  it('extracts from #sp2= URL', () => {
    const id0 = topicIndex[0];
    const topics: Topic[] = [
      { id: id0, title: id0, importance: 1, stance: 'neutral', directions: [], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
    ];
    const p2 = encodeStarterPreferencesV2(topics);
    const url = `https://example.com/app#sp2=${p2}`;
    const parsed = extractAndDecodeFromUrl(url);
    expect(parsed && 'tip' in parsed).toBe(true);
  });

  it('builds share urls with custom base', () => {
    const url1 = buildShareUrl('abc', 'https://example.com/app?x=1');
    expect(url1).toBe('https://example.com/app?x=1#sp=abc');
    const url2 = buildShareUrlV2('def', 'https://example.com/');
    expect(url2).toBe('https://example.com/#sp2=def');
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
    const ti = directionIndex.findIndex(row => (row?.length || 0) >= 1);
    expect(ti).toBeGreaterThanOrEqual(0);
    const dirId = directionIndex[ti][0];
    const topics: Topic[] = [
      {
        id: topicIndex[ti],
        title: topicIndex[ti],
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
    const tipEntry = decoded.tip.find(([i]) => i === ti);
    expect(tipEntry?.[1]).toBe(5);
    const di = directionIndex[ti].indexOf(dirId);
    const dspEntry = decoded.dsp.find(([tidx, dj]) => tidx === ti && dj === di);
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

  it('returns null for malformed or unknown payloads', () => {
    expect(extractAndDecodeFromUrl('https://x#sp2=%%%')).toBeNull();
    const bad = Buffer.from(JSON.stringify({ v: 'unknown', ti: [], ds: [] }), 'utf8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(extractAndDecodeFromUrl(`https://x#sp=${bad}`)).toBeNull();
  });
});
