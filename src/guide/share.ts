import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate';
import {
  VoterGuidePublishedSchema,
  type VoterGuideDraft,
  type VoterGuidePublished,
} from './schema';

export const SHARE_PREFIX = 'g1.';
export const MAX_SHARE_URL_LENGTH = 6000;
const MAX_DECOMPRESSED_BYTES = 200_000;

interface ShareEnvelope {
  v: 'g1';
  guide: VoterGuidePublished;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/gu, '+').replace(/_/gu, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function buildGuideReviewUrl(guideInput: VoterGuideDraft, baseUrl: string): string {
  const guide = VoterGuidePublishedSchema.parse(guideInput);
  const envelope: ShareEnvelope = { v: 'g1', guide };
  const compressed = gzipSync(strToU8(JSON.stringify(envelope)), { level: 9 });
  const url = new URL(baseUrl);
  url.hash = `guide=${SHARE_PREFIX}${toBase64Url(compressed)}`;
  const result = url.toString();
  if (result.length > MAX_SHARE_URL_LENGTH) {
    throw new Error(
      `This guide is too large for a reliable review link (${result.length.toLocaleString()} characters). Export the JSON file instead.`,
    );
  }
  return result;
}

export type SharedGuideResult =
  | { kind: 'none' }
  | { kind: 'valid'; guide: VoterGuidePublished }
  | { kind: 'invalid'; error: string };

export function readGuideReviewUrl(urlInput: string): SharedGuideResult {
  try {
    const url = new URL(urlInput);
    const raw = new URLSearchParams(url.hash.slice(1)).get('guide');
    if (!raw) return { kind: 'none' };
    if (urlInput.length > MAX_SHARE_URL_LENGTH) {
      return { kind: 'invalid', error: 'This review link is too large to open safely.' };
    }
    if (!raw.startsWith(SHARE_PREFIX)) {
      return { kind: 'invalid', error: 'This review link uses an unsupported format.' };
    }
    const compressed = fromBase64Url(raw.slice(SHARE_PREFIX.length));
    const decompressed = gunzipSync(compressed, { out: new Uint8Array(MAX_DECOMPRESSED_BYTES + 1) });
    if (decompressed.length > MAX_DECOMPRESSED_BYTES) {
      return { kind: 'invalid', error: 'This review link expands beyond the safe size limit.' };
    }
    const parsed = JSON.parse(strFromU8(decompressed)) as unknown;
    const envelope = zodEnvelope(parsed);
    return { kind: 'valid', guide: envelope.guide };
  } catch {
    return {
      kind: 'invalid',
      error: 'This review link is damaged or incomplete. Your saved guide was not changed.',
    };
  }
}

function zodEnvelope(input: unknown): ShareEnvelope {
  if (!input || typeof input !== 'object' || !('v' in input) || !('guide' in input)) {
    throw new Error('Invalid review link payload.');
  }
  const record = input as { v: unknown; guide: unknown };
  if (record.v !== 'g1') throw new Error('Unsupported review link payload.');
  return { v: 'g1', guide: VoterGuidePublishedSchema.parse(record.guide) };
}
