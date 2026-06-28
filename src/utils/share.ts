import { useStore } from '../store';
import type { Ballot, Item, PreferenceSet, Topic } from '../schema';
import { coerceItems } from './items';
import { hydrateTopicsWithItems, parseIncomingBallot, parseIncomingPreferenceSet } from '../schema';
import starterPackData from '../../starter-pack.v2.4.json';
import type { StarterPackJson } from '../types';

const sp: StarterPackJson = starterPackData;

const starterItems = sp.items ?? (sp.topics || []).flatMap((topic) =>
  (topic.directions || []).map((direction) => ({
    id: direction.id,
    text: direction.text,
    topicIds: direction.topicIds?.length ? direction.topicIds : [topic.id],
  })),
);

export const packId = 'sp-v3';
const allowedPackIds = new Set<string>(['sp-v1', 'sp-v2.4', 'sp-v3']);

export const topicIndex: string[] = (sp.topics || []).map((topic) => topic.id);
export const topicTitleIndex: string[] = (sp.topics || []).map((topic) => topic.title.toLowerCase());
export const itemIndex: string[] = starterItems.map((item) => item.id);
export const itemTextIndex: string[] = starterItems.map((item) => item.text.toLowerCase());
export const itemTopicIndex: string[][] = starterItems.map((item) => item.topicIds || []);
export const directionIndex: string[][] = topicIndex.map((topicId) =>
  starterItems.filter((item) => (item.topicIds || []).includes(topicId)).map((item) => item.id),
);
export const directionTextIndex: string[][] = topicIndex.map((topicId) =>
  starterItems.filter((item) => (item.topicIds || []).includes(topicId)).map((item) => item.text.toLowerCase()),
);

const getBuffer = () => (
  globalThis as typeof globalThis & {
    Buffer?: { from: (input: string | Uint8Array, encoding?: string) => { toString: (encoding: string) => string } };
  }
).Buffer;

const binaryFromUtf8 = (value: string): string => {
  if (typeof TextEncoder !== 'undefined') {
    return Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join('');
  }
  const BufferCtor = getBuffer();
  if (!BufferCtor) throw new Error('No UTF-8 encoder available');
  return BufferCtor.from(value, 'utf8').toString('binary');
};

const utf8FromBinary = (value: string): string => {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(Uint8Array.from(value, char => char.charCodeAt(0)));
  }
  const BufferCtor = getBuffer();
  if (!BufferCtor) throw new Error('No UTF-8 decoder available');
  return BufferCtor.from(value, 'binary').toString('utf8');
};

export const base64urlEncode = (value: string): string => {
  const binary = binaryFromUtf8(value);
  const encoded = typeof btoa === 'function'
    ? btoa(binary)
    : getBuffer()?.from(binary, 'binary').toString('base64');
  if (!encoded) throw new Error('No base64 encoder available');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64urlDecode = (s: string): string => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = typeof atob === 'function'
    ? atob(normalized)
    : getBuffer()?.from(normalized, 'base64').toString('binary');
  if (!binary) throw new Error('No base64 decoder available');
  return utf8FromBinary(binary);
};

export interface StarterPayloadSparse {
  v: string;
  tip: Array<[number, number]>;
  isp: Array<[number, number]>;
  itr: Array<[number, number]>;
  dsp?: Array<[number, number, number]>;
}

export interface LegacyStarterPayloadDense {
  v: string;
  ti: number[];
  ds: number[][];
}

export interface LegacyStarterPayloadSparse {
  v: string;
  tip: Array<[number, number]>;
  dsp: Array<[number, number, number]>;
}

export type StarterPayload = StarterPayloadSparse | LegacyStarterPayloadDense | LegacyStarterPayloadSparse;

export interface FullSharePayload {
  v: 'vt.full.v1';
  kind: 'preference-set' | 'sample-ballot';
  title: string;
  createdAt: string;
  data: PreferenceSet | Ballot;
}

export type DecodedShare =
  | { kind: 'starter'; payload: StarterPayload }
  | { kind: 'preference-set'; payload: FullSharePayload; data: PreferenceSet }
  | { kind: 'sample-ballot'; payload: FullSharePayload; data: Ballot };

const clamp = (value: number) => Math.max(0, Math.min(5, Number(value) || 0));

const normalizeTopicMatch = (topics: Topic[], idx: number): Topic | undefined => {
  const id = topicIndex[idx];
  const title = topicTitleIndex[idx];
  return topics.find((topic) => topic.id === id) || topics.find((topic) => topic.title.toLowerCase() === title);
};

const normalizeItemMatch = (items: Item[], idx: number): Item | undefined => {
  const id = itemIndex[idx];
  const text = itemTextIndex[idx];
  return items.find((item) => item.id === id) || items.find((item) => item.text.toLowerCase() === text);
};

export const encodeStarterPreferencesV2 = (
  topics: Topic[],
  items?: Item[],
): string => {
  const normalizedItems = coerceItems(items, topics);
  const tip: Array<[number, number]> = [];
  topicIndex.forEach((_, idx) => {
    const topic = normalizeTopicMatch(topics, idx);
    const importance = topic ? clamp(topic.importance) : 0;
    if (importance > 0) tip.push([idx, importance]);
  });

  const isp: Array<[number, number]> = [];
  const itr: Array<[number, number]> = [];
  itemIndex.forEach((_, idx) => {
    const item = normalizeItemMatch(normalizedItems, idx);
    const stars = item ? clamp(item.stars) : 0;
    if (stars > 0) isp.push([idx, stars]);
    const defaultTopicIds = itemTopicIndex[idx] || [];
    if (item) {
      for (const topicId of defaultTopicIds) {
        if (!item.topicIds.includes(topicId)) {
          const topicIdx = topicIndex.indexOf(topicId);
          if (topicIdx >= 0) itr.push([idx, topicIdx]);
        }
      }
    }
  });

  return base64urlEncode(JSON.stringify({ v: packId, tip, isp, itr }));
};

export const decodeStarterPreferencesV2 = (payload: string): StarterPayloadSparse | null => {
  try {
    const parsed = JSON.parse(base64urlDecode(payload)) as StarterPayload;
    if (!parsed || !allowedPackIds.has(parsed.v)) return null;

    if ('isp' in parsed) {
      return {
        v: parsed.v,
        tip: parsed.tip || [],
        isp: parsed.isp || [],
        itr: parsed.itr || [],
        dsp: parsed.dsp || (parsed.isp || []).map(([itemIdx, stars]) => {
          const topicId = itemTopicIndex[itemIdx]?.[0];
          const topicIdx = topicId ? topicIndex.indexOf(topicId) : -1;
          const directionIdx = topicIdx >= 0 ? directionIndex[topicIdx]?.indexOf(itemIndex[itemIdx]) ?? -1 : -1;
          return [topicIdx, directionIdx, stars] as [number, number, number];
        }).filter(([topicIdx, directionIdx]) => topicIdx >= 0 && directionIdx >= 0),
      };
    }

    if ('ti' in parsed && 'ds' in parsed) {
      const tip: Array<[number, number]> = [];
      const isp: Array<[number, number]> = [];
      parsed.ti.forEach((value, idx) => {
        const clamped = clamp(value);
        if (clamped > 0) tip.push([idx, clamped]);
      });
      parsed.ds.forEach((row, topicIdx) => {
        row.forEach((value, itemIdxWithinTopic) => {
          const starterTopicId = topicIndex[topicIdx];
          const rowItems = starterItems
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => (item.topicIds || []).includes(starterTopicId));
          const target = rowItems[itemIdxWithinTopic];
          if (!target) return;
          const clamped = clamp(value);
          if (clamped > 0) isp.push([target.idx, clamped]);
        });
      });
      const dsp = isp.map(([itemIdx, stars]) => {
        const topicId = itemTopicIndex[itemIdx]?.[0];
        const topicIdx = topicId ? topicIndex.indexOf(topicId) : -1;
        const directionIdx = topicIdx >= 0 ? directionIndex[topicIdx]?.indexOf(itemIndex[itemIdx]) ?? -1 : -1;
        return [topicIdx, directionIdx, stars] as [number, number, number];
      }).filter(([topicIdx, directionIdx]) => topicIdx >= 0 && directionIdx >= 0);
      return { v: parsed.v, tip, isp, itr: [], dsp };
    }

    const legacy = parsed as LegacyStarterPayloadSparse;
    const isp = (legacy.dsp || []).map(([topicIdx, directionIdx, stars]) => {
      const itemId = directionIndex[topicIdx]?.[directionIdx];
      const idx = itemId ? itemIndex.indexOf(itemId) : -1;
      return [idx, clamp(stars)] as [number, number];
    }).filter(([idx]) => idx >= 0);
    return {
      v: legacy.v,
      tip: legacy.tip || [],
      isp,
      itr: [],
      dsp: (legacy.dsp || []).map(([topicIdx, directionIdx, stars]) => [topicIdx, directionIdx, clamp(stars)]),
    };
  } catch {
    return null;
  }
};

export const encodeStarterPreferences = encodeStarterPreferencesV2;

export const decodeStarterPreferences = (payload: string): StarterPayload | null => decodeStarterPreferencesV2(payload);

const starterTopicTemplate = (idx: number): Topic => ({
  id: topicIndex[idx],
  title: sp.topics[idx]?.title || topicIndex[idx],
  importance: 0,
  stance: 'neutral',
  notes: '',
  sources: [],
  relations: { broader: [], narrower: [], related: [] },
});

const starterItemTemplate = (idx: number): Item => ({
  id: itemIndex[idx],
  text: starterItems[idx]?.text || itemIndex[idx],
  stars: 0,
  notes: '',
  sources: [],
  topicIds: [...(starterItems[idx]?.topicIds || [])],
  tags: [],
});

export const applyStarterPreferences = (data: StarterPayload) => {
  const normalized = 'isp' in data
    ? data as StarterPayloadSparse
    : decodeStarterPreferencesV2(base64urlEncode(JSON.stringify(data)));

  if (!normalized) return { applied: 0 };

  const before = useStore.getState();
  const nextTopics = [...before.topics];
  const nextItems = [...coerceItems(before.items, before.topics)];
  let applied = 0;

  for (const [topicIdx, importance] of normalized.tip) {
    const clampedImportance = clamp(importance);
    const existing = normalizeTopicMatch(nextTopics, topicIdx);
    if (existing) {
      if (existing.importance !== clampedImportance) applied++;
      existing.importance = clampedImportance;
    } else if (clampedImportance > 0 || topicIdx >= 0) {
      nextTopics.push({ ...starterTopicTemplate(topicIdx), importance: clampedImportance });
      applied++;
    }
  }

  for (let idx = 0; idx < itemIndex.length; idx++) {
    const encoded = normalized.isp.find(([itemIdx]) => itemIdx === idx);
    const removals = normalized.itr.filter(([itemIdx]) => itemIdx === idx).map(([, topicIdx]) => topicIndex[topicIdx]);
    const defaultItem = starterItemTemplate(idx);
    const existing = normalizeItemMatch(nextItems, idx);
    const nextTopicIds = defaultItem.topicIds.filter((topicId) => !removals.includes(topicId));
    const topicPresent = nextTopicIds.some((topicId) => nextTopics.some((topic) => topic.id === topicId));
    if (existing) {
      const stars = encoded ? clamp(encoded[1]) : existing.stars;
      const topicIds = Array.from(new Set([
        ...existing.topicIds.filter((topicId) => !defaultItem.topicIds.includes(topicId)),
        ...nextTopicIds,
      ]));
      if (existing.stars !== stars || existing.topicIds.join('|') !== topicIds.join('|')) applied++;
      existing.stars = stars;
      existing.topicIds = topicIds;
    } else if ((encoded && encoded[1] > 0) || topicPresent) {
      nextItems.push({
        ...defaultItem,
        stars: encoded ? clamp(encoded[1]) : 0,
        topicIds: nextTopicIds,
      });
      applied++;
    }
  }

  useStore.setState({
    topics: hydrateTopicsWithItems(nextTopics, nextItems),
    items: nextItems,
  });

  return { applied };
};

export const buildShareUrl = (
  payload: string,
  base: string = typeof window !== 'undefined' ? window.location.href : 'http://localhost/',
): string => {
  const url = new URL(base);
  return `${url.origin}${url.pathname}${url.search}#sp=${payload}`;
};

export const buildShareUrlV2 = (
  payload: string,
  base: string = typeof window !== 'undefined' ? window.location.href : 'http://localhost/',
): string => {
  const url = new URL(base);
  return `${url.origin}${url.pathname}${url.search}#sp2=${payload}`;
};

export const encodeFullSharePayload = (
  kind: FullSharePayload['kind'],
  data: PreferenceSet | Ballot,
  title = 'Voting Topics review link',
): string => base64urlEncode(JSON.stringify({
  v: 'vt.full.v1',
  kind,
  title,
  createdAt: new Date().toISOString(),
  data,
} satisfies FullSharePayload));

export const decodeFullSharePayload = (payload: string): DecodedShare | null => {
  try {
    const parsed = JSON.parse(base64urlDecode(payload)) as FullSharePayload;
    if (!parsed || parsed.v !== 'vt.full.v1') return null;
    if (parsed.kind === 'preference-set') {
      const data = parseIncomingPreferenceSet(parsed.data);
      return { kind: 'preference-set', payload: { ...parsed, data }, data };
    }
    if (parsed.kind === 'sample-ballot') {
      const data = parseIncomingBallot(parsed.data);
      return { kind: 'sample-ballot', payload: { ...parsed, data }, data };
    }
    return null;
  } catch {
    return null;
  }
};

export const buildFullShareUrl = (
  payload: string,
  base: string = typeof window !== 'undefined' ? window.location.href : 'http://localhost/',
): string => {
  const url = new URL(base);
  return `${url.origin}${url.pathname}${url.search}#full=${payload}`;
};

export const extractAndDecodeFromUrl = (url: string): StarterPayload | null => {
  try {
    const m2 = url.match(/[#&]sp2=([^&]+)/);
    if (m2) {
      const v = decodeStarterPreferencesV2(m2[1]);
      if (v) return v;
    }
    const m1 = url.match(/[#&]sp=([^&]+)/);
    if (m1) return decodeStarterPreferences(m1[1]);
    return null;
  } catch {
    return null;
  }
};

export const extractFullShareFromUrl = (url: string): DecodedShare | null => {
  try {
    const full = url.match(/[#&?]full=([^&]+)/) || url.match(/[#&?]share=([^&]+)/);
    if (!full) return null;
    return decodeFullSharePayload(decodeURIComponent(full[1]));
  } catch {
    return null;
  }
};

export const extractShareFromUrl = (url: string): DecodedShare | null => {
  const full = extractFullShareFromUrl(url);
  if (full) return full;
  const starter = extractAndDecodeFromUrl(url);
  return starter ? { kind: 'starter', payload: starter } : null;
};
