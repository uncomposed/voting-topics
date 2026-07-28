import { parsePeerGuide } from './share';
import { PriorityMenuSchema, upgradeElection, upgradeTopicProfile, type ElectionTemplate, type PeerGuide, type PriorityMenu, type TopicProfile } from './schema';

export const MAX_ARTIFACT_BYTES = 1_000_000;

export type PortableArtifact =
  | { kind: 'profile'; value: TopicProfile }
  | { kind: 'election'; value: ElectionTemplate }
  | { kind: 'menu'; value: PriorityMenu }
  | { kind: 'guide'; value: PeerGuide };

export function normalizePublicArtifactUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('Public artifact URLs must use HTTPS.');
  if (url.hostname === 'github.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 5 && parts[2] === 'blob') return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts[3]}/${parts.slice(4).join('/')}`;
  }
  if (url.hostname === 'gist.github.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) return `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`;
  }
  return url.toString();
}

export async function fetchArtifactText(input: string): Promise<{ raw: string; resolvedUrl: string }> {
  const resolvedUrl = normalizePublicArtifactUrl(input);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(resolvedUrl, { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json,text/plain' } });
    if (!response.ok) throw new Error(`The host returned ${response.status}.`);
    if (response.url && new URL(response.url).protocol !== 'https:') throw new Error('The artifact redirected to a non-HTTPS location.');
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > MAX_ARTIFACT_BYTES) throw new Error('That artifact exceeds the 1 MB import limit.');
    const raw = await response.text();
    if (new TextEncoder().encode(raw).length > MAX_ARTIFACT_BYTES) throw new Error('That artifact exceeds the 1 MB import limit.');
    return { raw, resolvedUrl };
  } finally { window.clearTimeout(timeout); }
}

export async function parsePortableArtifact(raw: string): Promise<PortableArtifact> {
  if (new TextEncoder().encode(raw).length > MAX_ARTIFACT_BYTES) throw new Error('That artifact exceeds the 1 MB import limit.');
  const value = JSON.parse(raw) as { version?: unknown };
  if (value.version === 'vt.topic-profile.v1' || value.version === 'vt.topic-profile.v2' || value.version === 'vt.topic-profile.v3') return { kind: 'profile', value: upgradeTopicProfile(value) };
  if (value.version === 'vt.election-template.v2' || value.version === 'vt.election-template.v3') return { kind: 'election', value: upgradeElection(value) };
  if (value.version === 'vt.priority-menu.v1') return { kind: 'menu', value: PriorityMenuSchema.parse(value) };
  if (value.version === 'vt.peer-guide.v1' || value.version === 'vt.peer-guide.v2' || value.version === 'vt.peer-guide.v3') return { kind: 'guide', value: await parsePeerGuide(value) };
  throw new Error('Unsupported artifact version. Expected a Voting Topics profile, election, menu, or peer guide.');
}
