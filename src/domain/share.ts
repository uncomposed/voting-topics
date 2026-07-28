import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate';
import { canonicalize, sha256 } from './portable';
import {
  GUIDE_VERSION,
  LegacyPeerGuideSchema,
  PREVIOUS_GUIDE_VERSION,
  PeerGuideSchema,
  PreviousPeerGuideSchema,
  upgradeElection,
  upgradeElectionMap,
  upgradeTopicProfile,
  type ElectionMap,
  type ElectionTemplate,
  type ElectionWorkspace,
  type LegacyPeerGuide,
  type PeerGuide,
  type PreviousPeerGuide,
  type TopicProfile,
} from './schema';

export const SHARE_PREFIX = 'p3.';
export const PREVIOUS_SHARE_PREFIX = 'p2.';
export const LEGACY_SHARE_PREFIX = 'p1.';
export const TARGET_SHARE_URL_LENGTH = 4_000;
export const MAX_SHARE_URL_LENGTH = 6_000;
const MAX_DECOMPRESSED_BYTES = 200_000;

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

function withoutDigest<T extends { snapshotDigest: string }>(guide: T): Omit<T, 'snapshotDigest'> {
  const rest = { ...guide };
  delete (rest as Partial<T>).snapshotDigest;
  return rest;
}

function subsetProfile(profile: TopicProfile, mapping: ElectionMap): TopicProfile {
  const ids = new Set(mapping.contests.flatMap((contest) => contest.relevantTopicIds));
  return {
    ...profile,
    ownerLabel: undefined,
    topics: profile.topics.filter((topic) => ids.has(topic.id)).map((topic) => ({ ...topic, category: undefined, notes: undefined })),
  };
}

function dedupeMapSources(mapping: ElectionMap): ElectionMap {
  const byUrl = new Map<string, ElectionMap['sources'][number]>();
  const remap = new Map<string, string>();
  for (const source of mapping.sources) {
    const existing = byUrl.get(source.url);
    if (existing) remap.set(source.id, existing.id);
    else { byUrl.set(source.url, source); remap.set(source.id, source.id); }
  }
  return {
    ...mapping,
    sources: [...byUrl.values()],
    contests: mapping.contests.map((contest) => ({ ...contest, assessments: contest.assessments.map((assessment) => assessment.status === 'assessed' ? { ...assessment, sourceIds: [...new Set(assessment.sourceIds.map((id) => remap.get(id) ?? id))] } : assessment) })),
  };
}

export async function createPeerGuide(
  profile: TopicProfile,
  election: ElectionTemplate,
  workspace: ElectionWorkspace,
  authorLabel: string,
  options: { parent?: PeerGuide | null; changesFromParent?: string[]; createdAt?: string } = {},
): Promise<PeerGuide> {
  const unverifiedContests = election.contests.filter((contest) => contest.verification.status !== 'verified');
  if (unverifiedContests.length) throw new Error(`Verify the official options and voting rules for ${unverifiedContests.map((contest) => contest.title).join(', ')} before sharing.`);
  const unverifiedRelevance = workspace.mapping.contests.filter((contest) => contest.verification.status !== 'verified');
  if (unverifiedRelevance.length) throw new Error(`${unverifiedRelevance.length} contest relevance selection${unverifiedRelevance.length === 1 ? '' : 's'} still need human verification.`);
  const unverifiedClaims = workspace.mapping.contests.flatMap((contest) => contest.assessments).filter((assessment) => assessment.verification.status !== 'verified');
  if (unverifiedClaims.length) throw new Error(`${unverifiedClaims.length} research claim${unverifiedClaims.length === 1 ? '' : 's'} still need human verification.`);
  const mapping = { ...dedupeMapSources(workspace.mapping), authorLabel: undefined };
  const unsigned = {
    version: GUIDE_VERSION,
    id: workspace.id,
    authorLabel,
    profile: subsetProfile(profile, mapping),
    election,
    mapping,
    draft: workspace.draft,
    decisions: workspace.decisions,
    lineage: { parentSnapshotDigest: options.parent?.snapshotDigest ?? null, parentAuthorLabel: options.parent?.authorLabel, changesFromParent: options.changesFromParent ?? [] },
    createdAt: options.createdAt ?? new Date().toISOString(),
  } as const;
  const snapshotDigest = await sha256(canonicalize(unsigned));
  return PeerGuideSchema.parse({ ...unsigned, snapshotDigest });
}

export async function verifyPeerGuide(guide: PeerGuide): Promise<boolean> {
  return (await sha256(canonicalize(withoutDigest(guide)))) === guide.snapshotDigest;
}

async function verifyLegacyGuide(guide: LegacyPeerGuide): Promise<boolean> {
  return (await sha256(canonicalize(withoutDigest(guide)))) === guide.snapshotDigest;
}

async function verifyPreviousGuide(guide: PreviousPeerGuide): Promise<boolean> {
  return (await sha256(canonicalize(withoutDigest(guide)))) === guide.snapshotDigest;
}

async function upgradePreviousGuide(previous: PreviousPeerGuide): Promise<PeerGuide> {
  const unsigned = {
    ...withoutDigest(previous),
    version: GUIDE_VERSION,
    profile: upgradeTopicProfile(previous.profile),
  } as const;
  return PeerGuideSchema.parse({ ...unsigned, snapshotDigest: await sha256(canonicalize(unsigned)) });
}

async function upgradeLegacyGuide(legacy: LegacyPeerGuide): Promise<PeerGuide> {
  const now = legacy.createdAt;
  const profile = upgradeTopicProfile(legacy.profile);
  const election = upgradeElection(legacy.election, now);
  const mapping = upgradeElectionMap(legacy.mapping, now);
  const unsigned = {
    version: GUIDE_VERSION,
    id: legacy.id,
    authorLabel: legacy.authorLabel,
    profile,
    election,
    mapping,
    draft: legacy.draft,
    decisions: legacy.decisions,
    lineage: legacy.lineage,
    createdAt: legacy.createdAt,
  } as const;
  return PeerGuideSchema.parse({ ...unsigned, snapshotDigest: await sha256(canonicalize(unsigned)) });
}

export async function parsePeerGuide(input: unknown): Promise<PeerGuide> {
  const version = typeof input === 'object' && input ? (input as { version?: unknown }).version : undefined;
  if (version === GUIDE_VERSION) {
    const guide = PeerGuideSchema.parse(input);
    if (!(await verifyPeerGuide(guide))) throw new Error('The snapshot digest does not match its contents.');
    return guide;
  }
  if (version === PREVIOUS_GUIDE_VERSION) {
    const previous = PreviousPeerGuideSchema.parse(input);
    if (!(await verifyPreviousGuide(previous))) throw new Error('The previous snapshot digest does not match its contents.');
    return upgradePreviousGuide(previous);
  }
  const legacy = LegacyPeerGuideSchema.parse(input);
  if (!(await verifyLegacyGuide(legacy))) throw new Error('The legacy snapshot digest does not match its contents.');
  return upgradeLegacyGuide(legacy);
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

export type SharedGuideResult = { kind: 'none' } | { kind: 'valid'; guide: PeerGuide } | { kind: 'invalid'; error: string };

export async function readPeerGuideUrl(urlInput: string): Promise<SharedGuideResult> {
  try {
    if (urlInput.length > MAX_SHARE_URL_LENGTH) return { kind: 'invalid', error: 'This snapshot link is too large to open safely. Local work was not changed.' };
    const url = new URL(urlInput);
    const raw = new URLSearchParams(url.hash.slice(1)).get('guide');
    if (!raw) return { kind: 'none' };
    const prefix = raw.startsWith(SHARE_PREFIX) ? SHARE_PREFIX : raw.startsWith(PREVIOUS_SHARE_PREFIX) ? PREVIOUS_SHARE_PREFIX : raw.startsWith(LEGACY_SHARE_PREFIX) ? LEGACY_SHARE_PREFIX : null;
    if (!prefix) return { kind: 'invalid', error: 'This snapshot uses an unsupported format. Local work was not changed.' };
    const decompressed = gunzipSync(fromBase64Url(raw.slice(prefix.length)), { out: new Uint8Array(MAX_DECOMPRESSED_BYTES + 1) });
    if (decompressed.length > MAX_DECOMPRESSED_BYTES) return { kind: 'invalid', error: 'This snapshot expands beyond the safe limit. Local work was not changed.' };
    return { kind: 'valid', guide: await parsePeerGuide(JSON.parse(strFromU8(decompressed))) };
  } catch {
    return { kind: 'invalid', error: 'This snapshot is damaged, stale, or incomplete. Local work was not changed.' };
  }
}

export function guideJson(guide: PeerGuide): string {
  return `${JSON.stringify(PeerGuideSchema.parse(guide), null, 2)}\n`;
}

export function artifactJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export { canonicalize, sha256 } from './portable';
