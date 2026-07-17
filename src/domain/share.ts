import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate';
import {
  GUIDE_VERSION,
  PeerGuideSchema,
  type ElectionMap,
  type ElectionWorkspace,
  type PeerGuide,
  type TopicProfile,
} from './schema';

export const SHARE_PREFIX = 'p1.';
export const TARGET_SHARE_URL_LENGTH = 4_000;
export const MAX_SHARE_URL_LENGTH = 6_000;
const MAX_DECOMPRESSED_BYTES = 200_000;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter((key) => object[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`).join(',')}}`;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/gu, '+').replace(/_/gu, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function withoutDigest(guide: Omit<PeerGuide, 'snapshotDigest'> | PeerGuide): Omit<PeerGuide, 'snapshotDigest'> {
  const rest = { ...guide } as Partial<PeerGuide>;
  delete rest.snapshotDigest;
  return rest as Omit<PeerGuide, 'snapshotDigest'>;
}

function subsetProfile(profile: TopicProfile, mapping: ElectionMap): TopicProfile {
  const ids = new Set(mapping.contests.flatMap((contest) => contest.relevantTopicIds));
  return { ...profile, topics: profile.topics.filter((topic) => ids.has(topic.id)) };
}

function dedupeMapSources(mapping: ElectionMap): ElectionMap {
  const byUrl = new Map<string, { id: string; label: string; url: string }>();
  const remap = new Map<string, string>();
  for (const source of mapping.sources) {
    const existing = byUrl.get(source.url);
    if (existing) remap.set(source.id, existing.id);
    else {
      byUrl.set(source.url, source);
      remap.set(source.id, source.id);
    }
  }
  return {
    ...mapping,
    sources: [...byUrl.values()],
    contests: mapping.contests.map((contest) => ({
      ...contest,
      assessments: contest.assessments.map((assessment) => assessment.status === 'assessed'
        ? { ...assessment, sourceIds: [...new Set(assessment.sourceIds.map((id) => remap.get(id) ?? id))] }
        : assessment),
    })),
  };
}

export async function createPeerGuide(
  profile: TopicProfile,
  workspace: ElectionWorkspace,
  authorLabel: string,
  options: { parent?: PeerGuide | null; changesFromParent?: string[]; createdAt?: string } = {},
): Promise<PeerGuide> {
  const mapping = dedupeMapSources(workspace.mapping);
  const unsigned = {
    version: GUIDE_VERSION,
    id: workspace.id,
    authorLabel,
    profile: subsetProfile(profile, mapping),
    election: workspace.election,
    mapping,
    draft: workspace.draft,
    decisions: workspace.decisions,
    lineage: {
      parentSnapshotDigest: options.parent?.snapshotDigest ?? null,
      parentAuthorLabel: options.parent?.authorLabel,
      changesFromParent: options.changesFromParent ?? [],
    },
    createdAt: options.createdAt ?? new Date().toISOString(),
  } as const;
  const snapshotDigest = await sha256(canonicalize(unsigned));
  return PeerGuideSchema.parse({ ...unsigned, snapshotDigest });
}

export async function verifyPeerGuide(guide: PeerGuide): Promise<boolean> {
  return (await sha256(canonicalize(withoutDigest(guide)))) === guide.snapshotDigest;
}

export function buildPeerGuideUrl(guideInput: PeerGuide, baseUrl: string): { url: string; withinTarget: boolean } {
  const guide = PeerGuideSchema.parse(guideInput);
  const compressed = gzipSync(strToU8(canonicalize(guide)), { level: 9 });
  const url = new URL(baseUrl);
  url.hash = `guide=${SHARE_PREFIX}${toBase64Url(compressed)}`;
  const result = url.toString();
  if (result.length > MAX_SHARE_URL_LENGTH) throw new Error(`This reproducible snapshot is ${result.length.toLocaleString()} URL characters. Export JSON and evaluate immutable short-link storage; do not drop evidence.`);
  return { url: result, withinTarget: result.length < TARGET_SHARE_URL_LENGTH };
}

export type SharedGuideResult =
  | { kind: 'none' }
  | { kind: 'valid'; guide: PeerGuide }
  | { kind: 'invalid'; error: string };

export async function readPeerGuideUrl(urlInput: string): Promise<SharedGuideResult> {
  try {
    if (urlInput.length > MAX_SHARE_URL_LENGTH) return { kind: 'invalid', error: 'This snapshot link is too large to open safely. Local work was not changed.' };
    const url = new URL(urlInput);
    const raw = new URLSearchParams(url.hash.slice(1)).get('guide');
    if (!raw) return { kind: 'none' };
    if (!raw.startsWith(SHARE_PREFIX)) return { kind: 'invalid', error: 'This snapshot uses an unsupported format. Local work was not changed.' };
    const decompressed = gunzipSync(fromBase64Url(raw.slice(SHARE_PREFIX.length)), { out: new Uint8Array(MAX_DECOMPRESSED_BYTES + 1) });
    if (decompressed.length > MAX_DECOMPRESSED_BYTES) return { kind: 'invalid', error: 'This snapshot expands beyond the safe limit. Local work was not changed.' };
    const guide = PeerGuideSchema.parse(JSON.parse(strFromU8(decompressed)));
    if (!(await verifyPeerGuide(guide))) return { kind: 'invalid', error: 'This snapshot digest does not match its contents. Local work was not changed.' };
    return { kind: 'valid', guide };
  } catch {
    return { kind: 'invalid', error: 'This snapshot is damaged or incomplete. Local work was not changed.' };
  }
}

export function guideJson(guide: PeerGuide): string {
  return `${JSON.stringify(PeerGuideSchema.parse(guide), null, 2)}\n`;
}
