import { describe, expect, it } from 'vitest';
import { applyPreferencePatch, parsePreferencePatch } from '../patchSchema';
import type { Item, Topic } from '../schema';

describe('preference patch workflow', () => {
  it('validates and applies additive AI patch operations', () => {
    const topics: Topic[] = [{
      id: 'topic-housing',
      title: 'Housing',
      importance: 4,
      stance: 'neutral',
      notes: '',
      sources: [],
      relations: { broader: [], narrower: [], related: [] },
    }];
    const items: Item[] = [{
      id: 'item-rents',
      text: 'Lower rent burden',
      stars: 5,
      notes: '',
      sources: [],
      topicIds: ['topic-housing'],
      tags: [],
    }];

    const patch = parsePreferencePatch({
      version: 'tsb.patch.v1',
      summary: 'Enrich housing preferences.',
      operations: [
        { op: 'add_item_tag', itemId: 'item-rents', tag: 'affordability' },
        { op: 'add_topic_source', topicId: 'topic-housing', source: { label: 'Housing data', url: 'https://example.org/housing' } },
        { op: 'create_topic', id: 'topic-transit', title: 'Transit', importance: 3 },
        { op: 'tag_item_to_topic', itemId: 'item-rents', topicId: 'topic-transit' },
      ],
    });

    const result = applyPreferencePatch({ topics, items }, patch);

    expect(result.applied).toHaveLength(4);
    expect(result.skipped).toHaveLength(0);
    expect(result.topics).toHaveLength(2);
    expect(result.topics[0].sources).toEqual([{ label: 'Housing data', url: 'https://example.org/housing' }]);
    expect(result.items[0].tags).toContain('affordability');
    expect(result.items[0].topicIds).toContain('topic-transit');
  });

  it('skips operations that reference missing records', () => {
    const patch = parsePreferencePatch({
      version: 'tsb.patch.v1',
      operations: [{ op: 'add_item_tag', itemId: 'missing', tag: 'ignored' }],
    });

    const result = applyPreferencePatch({ topics: [], items: [] }, patch);

    expect(result.applied).toHaveLength(0);
    expect(result.skipped[0]).toContain('item not found');
  });
});
