import { useStore } from '../store';
import type { Topic } from '../schema';
// Import the current starter pack to derive a stable index
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JSON import is enabled via Vite
import starterPack from '../../starter-pack.v1.json';

// Stable pack identifier. Increment when the starter index order changes.
// Keep older IDs decodable for existing links.
export const packId = 'sp-v1';
const allowedPackIds = new Set<string>(['sp-v1', 'sp-v2.4']);

type StarterPack = { topics: Array<{ id: string; directions?: Array<{ id: string }> }> };
const sp = (starterPack as StarterPack) || { topics: [] };

// Build stable indices (append-only ordering)
export const topicIndex: string[] = sp.topics.map(t => t.id);
export const topicTitleIndex: string[] = sp.topics.map(t => (t as any).title?.toLowerCase?.() || '');
export const directionIndex: string[][] = sp.topics.map(t => (t.directions || []).map(d => d.id));
export const directionTextIndex: string[][] = sp.topics.map(t => (t.directions || []).map(d => (d as any).text?.toLowerCase?.() || ''));

const base64urlEncode = (s: string): string => {
  // Standard btoa expects latin1; payload is ASCII-only JSON of numbers/ids
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};
const base64urlDecode = (s: string): string => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return atob(b64);
};

// --- sp2 binary encoding helpers ---
const varintEncode = (n: number, out: number[] = []): number[] => {
  let v = Math.max(0, Math.floor(n));
  while (v >= 0x80) { out.push((v & 0x7f) | 0x80); v >>>= 7; }
  out.push(v & 0x7f);
  return out;
};
const varintDecode = (bytes: Uint8Array, offset: number): { value: number; next: number } => {
  let shift = 0, res = 0, i = offset;
  while (i < bytes.length) {
    const b = bytes[i++];
    res |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return { value: res >>> 0, next: i };
};
const bytesToB64url = (arr: number[] | Uint8Array): string => {
  const u8 = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return base64urlEncode(s);
};
const b64urlToBytes = (s: string): Uint8Array => {
  const bin = base64urlDecode(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
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

// --- v2: binary compact encoding ---
// Format: [0x02, packCode]
//         varint Nti, then Nti * (varint topicIdx, u8 importance)
//         varint Ndsp, then Ndsp * (varint topicIdx, varint dirIdx, u8 stars)
const PACK_CODES: Record<string, number> = { 'sp-v1': 1, 'sp-v2.4': 2 };
const packCode = (id: string): number => PACK_CODES[id] ?? 0;
const packFromCode = (code: number): string => {
  const entry = Object.entries(PACK_CODES).find(([, v]) => v === code);
  return entry ? entry[0] : 'sp-v1';
};

export const encodeStarterPreferencesV2 = (topics: Topic[]): string => {
  // Build sparse like v1, then pack
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
    return row.map((did, j) => {
      const textLc = directionTextIndex[i][j] || '';
      const d = t?.directions?.find(dd => dd.id === did) || t?.directions?.find(dd => (dd.text || '').toLowerCase() === textLc);
      const v = d ? Number(d.stars || 0) : 0;
      return Math.max(0, Math.min(5, v));
    });
  });
  const tip: Array<[number, number]> = [];
  tiDense.forEach((v, i) => { if (v > 0) tip.push([i, v]); });
  const dsp: Array<[number, number, number]> = [];
  dsDense.forEach((row, ti) => row.forEach((v, di) => { if (v > 0) dsp.push([ti, di, v]); }));

  const bytes: number[] = [];
  bytes.push(0x02, packCode(packId));
  varintEncode(tip.length, bytes);
  for (const [ti, imp] of tip) { varintEncode(ti, bytes); bytes.push(imp & 0xff); }
  varintEncode(dsp.length, bytes);
  for (const [ti, di, stars] of dsp) { varintEncode(ti, bytes); varintEncode(di, bytes); bytes.push(stars & 0xff); }
  return bytesToB64url(bytes);
};

export const decodeStarterPreferencesV2 = (payload: string): StarterPayloadSparse | null => {
  try {
    const bytes = b64urlToBytes(payload);
    if (bytes.length < 2 || bytes[0] !== 0x02) return null;
    const pack = packFromCode(bytes[1]);
    let off = 2;
    const nti = varintDecode(bytes, off); off = nti.next;
    const tip: Array<[number, number]> = [];
    for (let i = 0; i < nti.value; i++) {
      const ti = varintDecode(bytes, off); off = ti.next;
      const imp = bytes[off++] | 0;
      tip.push([ti.value, imp]);
    }
    const ndsp = varintDecode(bytes, off); off = ndsp.next;
    const dsp: Array<[number, number, number]> = [];
    for (let i = 0; i < ndsp.value; i++) {
      const ti = varintDecode(bytes, off); off = ti.next;
      const di = varintDecode(bytes, off); off = di.next;
      const stars = bytes[off++] | 0;
      dsp.push([ti.value, di.value, stars]);
    }
    return { v: pack, tip, dsp } as StarterPayloadSparse;
  } catch {
    return null;
  }
};

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
    // Try v2 first (binary)
    const v2 = decodeStarterPreferencesV2(payload);
    if (v2) return v2;
    // Fallback to v1 JSON sparse/dense
    const json = base64urlDecode(payload);
    const obj = JSON.parse(json) as StarterPayload;
    if (!obj || !allowedPackIds.has((obj as any).v)) return null;
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
  // Clamp all values to [0,5]
  tiArr = tiArr.map(v => Math.max(0, Math.min(5, Number(v) || 0)));
  dsArr = dsArr.map(row => row.map(v => Math.max(0, Math.min(5, Number(v) || 0))));
  // First pass: apply updates to existing topics that match starter-pack IDs or titles
  const seenStarterIndices = new Set<number>();
  const nextTopics = prevTopics.map(t => {
    const idx = topicIndex.indexOf(t.id);
    // Also attempt loose match by title when IDs differ
    const titleIdx = idx === -1 ? topicTitleIndex.indexOf((t.title || '').toLowerCase()) : idx;
    if (titleIdx === -1) return t; // not in starter pack
    seenStarterIndices.add(titleIdx);
    let changed = false;
    const imp = tiArr[titleIdx] ?? 0;
    if ((t.importance || 0) !== imp) { changed = true; }
    const dirRow = directionIndex[titleIdx] || [];
    const nextDirs = t.directions.map(d => {
      const didx = dirRow.indexOf(d.id);
      if (didx === -1) return d;
      const stars = dsArr[titleIdx]?.[didx] ?? 0;
      if ((d.stars || 0) !== stars) { changed = true; }
      return { ...d, stars };
    });
    if (changed) applied++;
    return { ...t, importance: imp, directions: nextDirs };
  });
  // Second pass: append any referenced starter topics that are missing but have non-zero data
  const additions: Topic[] = [];
  for (let i = 0; i < topicIndex.length; i++) {
    if (seenStarterIndices.has(i)) continue;
    const imp = tiArr[i] ?? 0;
    const dirStars = (dsArr[i] || []);
    const anyDirStar = dirStars.some(v => (v || 0) > 0);
    // Only add topics that the share payload indicates were set (importance or any direction star)
    if (imp === 0 && !anyDirStar) continue;
    const packTopic: any = (sp.topics[i] || {});
    if (!packTopic || !packTopic.id || !packTopic.title) continue;
    const directions = (packTopic.directions || []).map((d: any, di: number) => ({
      id: d.id,
      text: d.text,
      stars: dirStars[di] ?? 0,
      sources: [],
      tags: [] as string[],
    }));
    const toAdd: Topic = {
      id: packTopic.id,
      title: packTopic.title,
      importance: imp,
      stance: 'neutral',
      directions,
      notes: '',
      sources: [],
      relations: { broader: [], narrower: [], related: [] },
    } as Topic;
    additions.push(toAdd);
  }
  if (additions.length > 0) applied += additions.length;
  useStore.setState({ topics: [...nextTopics, ...additions] });
  return { applied };
};

export const buildShareUrl = (
  payload: string,
  base: string = typeof window !== 'undefined' ? window.location.href : 'http://localhost/'
): string => {
  const url = new URL(base);
  return `${url.origin}${url.pathname}${url.search}#sp=${payload}`;
};

export const buildShareUrlV2 = (
  payload: string,
  base: string = typeof window !== 'undefined' ? window.location.href : 'http://localhost/'
): string => {
  const url = new URL(base);
  return `${url.origin}${url.pathname}${url.search}#sp2=${payload}`;
};

// Extract and decode share payload from a URL string (supports sp2, then sp)
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
  } catch { return null; }
};
