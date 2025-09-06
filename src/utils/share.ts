import { useStore } from '../store';
import type { Topic } from '../schema';
// Import the current starter pack to derive a stable index
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JSON import is enabled via Vite
import starterPack from '../../starter-pack.v1.json';

// Stable pack identifier. Increment when the starter index order changes.
export const packId = 'sp-v1';

type StarterPack = { topics: Array<{ id: string; directions?: Array<{ id: string }> }> };
const sp = (starterPack as StarterPack) || { topics: [] };

// Build stable indices (append-only ordering)
export const topicIndex: string[] = sp.topics.map(t => t.id);
export const topicTitleIndex: string[] = sp.topics.map(t => (t as any).title?.toLowerCase?.() || '');
export const directionIndex: string[][] = sp.topics.map(t => (t.directions || []).map(d => d.id));
export const directionTextIndex: string[][] = sp.topics.map(t => (t.directions || []).map(d => (d as any).text?.toLowerCase?.() || ''));

const base64urlEncode = (s: string): string => {
  // Standard btoa expects latin1; payload is ASCII-only JSON of numbers/ids
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};
const base64urlDecode = (s: string): string => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/') + pad;
  return atob(b64);
};

export interface StarterPayloadDense {
  v: string;      // pack version, e.g. sp-v1
  ti: number[];   // topic importance per topicIndex
  ds: number[][]; // direction stars per directionIndex row
}
export interface StarterPayloadSparse {
  v: string;
  tip: Array<[number, number]>;      // pairs: [topicIdx, importance]
  dsp: Array<[number, number, number]>; // triples: [topicIdx, dirIdx, stars]
}
export type StarterPayload = StarterPayloadDense | StarterPayloadSparse;

export const encodeStarterPreferences = (topics: Topic[]): string => {
  const tiDense: number[] = topicIndex.map((tid, i) => {
    const byId = topics.find(x => x.id === tid);
    const lc = topicTitleIndex[i];
    const byTitle = topics.find(x => (x.title || '').toLowerCase() === lc);
    const t = byId || byTitle;
    return t ? Math.max(0, Math.min(5, Number(t.importance || 0))) : 0;
  });
  const dsDense: number[][] = directionIndex.map((row, i) => {
    const tid = topicIndex[i];
    const lc = topicTitleIndex[i];
    const t = topics.find(x => x.id === tid) || topics.find(x => (x.title || '').toLowerCase() === lc);
    return row.map(did => {
      const dtextLcArr = directionTextIndex[i];
      const j = directionIndex[i].indexOf(did);
      const textLc = j >= 0 ? (dtextLcArr[j] || '') : '';
      const d = t?.directions?.find(dd => dd.id === did) || t?.directions?.find(dd => (dd.text || '').toLowerCase() === textLc);
      const v = d ? Number(d.stars || 0) : 0;
      return Math.max(0, Math.min(5, v));
    });
  });
  // Build sparse payload with only non-zero entries
  const tip: Array<[number, number]> = [];
  tiDense.forEach((v, i) => { if (v > 0) tip.push([i, v]); });
  const dsp: Array<[number, number, number]> = [];
  dsDense.forEach((row, ti) => row.forEach((v, di) => { if (v > 0) dsp.push([ti, di, v]); }));
  const sparse: StarterPayloadSparse = { v: packId, tip, dsp };
  return base64urlEncode(JSON.stringify(sparse));
};

export const decodeStarterPreferences = (payload: string): StarterPayload | null => {
  try {
    const json = base64urlDecode(payload);
    const obj = JSON.parse(json) as StarterPayload;
    if (!obj || obj.v !== packId) return null;
    return obj;
  } catch {
    return null;
  }
};

export const applyStarterPreferences = (data: StarterPayload) => {
  const before = useStore.getState();
  const prevTopics = before.topics;
  let applied = 0;
  // Normalize to dense arrays for application
  let tiArr: number[];
  let dsArr: number[][];
  if ('ti' in data && 'ds' in data) {
    tiArr = data.ti;
    dsArr = data.ds;
  } else {
    tiArr = new Array(topicIndex.length).fill(0);
    dsArr = directionIndex.map(row => new Array(row.length).fill(0));
    const sp = data as StarterPayloadSparse;
    sp.tip.forEach(([i, v]) => { if (i >= 0 && i < tiArr.length) tiArr[i] = v; });
    sp.dsp.forEach(([ti, di, v]) => { if (dsArr[ti] && di >= 0 && di < dsArr[ti].length) dsArr[ti][di] = v; });
  }
  const nextTopics = prevTopics.map(t => {
    const idx = topicIndex.indexOf(t.id);
    if (idx === -1) return t; // not in starter pack
    let changed = false;
    const imp = tiArr[idx] ?? 0;
    if ((t.importance || 0) !== imp) { changed = true; }
    const dirRow = directionIndex[idx] || [];
    const nextDirs = t.directions.map(d => {
      const didx = dirRow.indexOf(d.id);
      if (didx === -1) return d;
      const stars = dsArr[idx]?.[didx] ?? 0;
      if ((d.stars || 0) !== stars) { changed = true; }
      return { ...d, stars };
    });
    if (changed) applied++;
    return { ...t, importance: imp, directions: nextDirs };
  });
  useStore.setState({ topics: nextTopics });
  return { applied };
};

export const buildShareUrl = (payload: string): string => {
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#sp=${payload}`;
};
