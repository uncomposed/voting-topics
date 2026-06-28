import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import type { PreferenceSet } from '../schema';
import { buildFullShareUrl, encodeFullSharePayload } from '../utils/share';
import {
  applySharedUrlToStore,
  clearSharePayloadFromCurrentUrl,
  hasSharePayload,
  stripSharePayloadFromUrl,
} from '../utils/shareActions';

let initialState: ReturnType<typeof useStore.getState>;

beforeAll(() => {
  initialState = useStore.getState();
});

afterEach(() => {
  useStore.setState(initialState, true);
  window.history.replaceState(null, '', '/');
});

const preferenceSet: PreferenceSet = {
  version: 'tsb.v2',
  title: 'Pasted Review Set',
  notes: '',
  topics: [
    {
      id: 'pasted-topic',
      title: 'Childcare',
      importance: 5,
      stance: 'for',
      notes: '',
      sources: [],
      relations: { broader: [], narrower: [], related: [] },
    },
  ],
  items: [
    {
      id: 'pasted-item',
      text: 'More childcare slots',
      stars: 5,
      notes: '',
      sources: [],
      topicIds: ['pasted-topic'],
      tags: [],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('share actions', () => {
  it('applies pasted full review links and records shared review state', () => {
    const url = buildFullShareUrl(
      encodeFullSharePayload('preference-set', preferenceSet, preferenceSet.title),
      'https://example.test/app',
    );

    const result = applySharedUrlToStore(url);

    expect(result?.kind).toBe('preference-set');
    expect(useStore.getState().title).toBe('Pasted Review Set');
    expect(useStore.getState().shareReview).toMatchObject({
      active: true,
      kind: 'preference-set',
      title: 'Pasted Review Set',
    });
  });

  it('detects and removes share payloads without disturbing ordinary URLs', () => {
    const sharedUrl = 'https://example.test/app?x=1#full=abc123';
    expect(hasSharePayload(sharedUrl)).toBe(true);
    expect(stripSharePayloadFromUrl(sharedUrl)).toBe('https://example.test/app?x=1');
    expect(stripSharePayloadFromUrl('https://example.test/app?x=1#section')).toBe('https://example.test/app?x=1#section');
  });

  it('clears the current browser URL share payload', () => {
    window.history.replaceState(null, '', `${window.location.origin}/app?share=abc`);
    clearSharePayloadFromCurrentUrl();
    expect(window.location.href).toBe(`${window.location.origin}/app`);
  });
});
