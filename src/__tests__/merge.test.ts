import { describe, it, expect } from 'vitest';
import { mergePreferenceSets } from '../utils/merge';

describe('mergePreferenceSets', () => {
  it('merges topics by id and by normalized title; merges directions by id or text', () => {
    const current = {
      version: 'tsb.v1' as const,
      title: 'My Set',
      notes: '',
      topics: [
        { id: 't1', title: 'Housing', importance: 3, stance: 'neutral', directions: [
          { id: 'd1', text: 'Build more homes', stars: 2, sources: [], tags: [] },
        ], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
        { id: 't2', title: 'Transit', importance: 4, stance: 'for', directions: [], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
      ],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const incoming = {
      version: 'tsb.v1' as const,
      title: 'Incoming',
      notes: 'notes',
      topics: [
        // Matches by id
        { id: 't1', title: 'Housing policy', importance: 5, stance: 'for', directions: [
          // Matches by id
          { id: 'd1', text: 'Build more homes', stars: 5, sources: [], tags: [] },
          // New direction by text
          { id: 'dX', text: 'Fund affordable housing', stars: 4, sources: [], tags: [] },
        ], notes: 'new', sources: [], relations: { broader: [], narrower: [], related: [] } },
        // Matches by normalized title
        { id: 'tX', title: 'transit', importance: 2, stance: 'against', directions: [
          { id: 'dT', text: 'Bus-only lanes', stars: 3, sources: [], tags: [] },
        ], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
        // Brand new topic
        { id: 't3', title: 'Climate', importance: 5, stance: 'for', directions: [], notes: '', sources: [], relations: { broader: [], narrower: [], related: [] } },
      ],
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    };

    const merged = mergePreferenceSets(current as any, incoming as any);

    expect(merged.topics.length).toBe(3);

    const housing = merged.topics.find(t => t.id === 't1')!;
    // Keep current stance/importance, but directions merged; stars updated from incoming
    expect(housing.importance).toBe(3);
    expect(housing.stance).toBe('neutral');
    expect(housing.directions.length).toBe(2);
    expect(housing.directions.find(d => d.id === 'd1')!.stars).toBe(5);
    expect(housing.directions.find(d => d.text.includes('Fund affordable housing'))).toBeTruthy();

    const transit = merged.topics.find(t => t.title.toLowerCase() === 'transit')!;
    expect(transit.directions.length).toBe(1);

    const climate = merged.topics.find(t => t.title === 'Climate');
    expect(climate).toBeTruthy();
  });

  it('normalizes source URLs to avoid duplicates', () => {
    const current = {
      version: 'tsb.v1' as const,
      title: 'My Set',
      notes: '',
      topics: [{
        id: 't1',
        title: 'Housing',
        importance: 3,
        stance: 'neutral',
        directions: [],
        notes: '',
        sources: [{ label: 'A', url: 'https://Example.com/path/' }],
        relations: { broader: [], narrower: [], related: [] }
      }],
      createdAt: '',
      updatedAt: '',
    };

    const incoming = {
      version: 'tsb.v1' as const,
      title: 'Incoming',
      notes: '',
      topics: [{
        id: 't1',
        title: 'Housing',
        importance: 3,
        stance: 'neutral',
        directions: [],
        notes: '',
        sources: [{ label: 'A', url: 'https://example.com/path' }],
        relations: { broader: [], narrower: [], related: [] }
      }],
      createdAt: '',
      updatedAt: '',
    };

    const merged = mergePreferenceSets(current as any, incoming as any);
    const sources = merged.topics[0].sources;
    expect(sources.length).toBe(1);
  });
});

