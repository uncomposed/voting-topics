import { buildBallot, buildTemplate } from '../exporters';
import { useStore } from '../store';
import type { Item, Topic } from '../schema';
import {
  applyStarterPreferences,
  buildFullShareUrl,
  encodeFullSharePayload,
  extractShareFromUrl,
} from './share';

export const MAX_REVIEW_URL_LENGTH = 6000;

export interface AppliedShareResult {
  kind: 'starter' | 'preference-set' | 'sample-ballot';
  title?: string;
  applied?: number;
  sourceUrl: string;
  shareId: string;
  undoSnapshot?: {
    topics: Topic[];
    items: Item[];
  };
}

export class ReviewUrlTooLargeError extends Error {
  constructor(length: number) {
    super(`Review link is ${length.toLocaleString()} characters, which is too large for reliable sharing. Use Full Share JSON or PDF instead.`);
    this.name = 'ReviewUrlTooLargeError';
  }
}

const SHARE_KEYS = ['full', 'share', 'sp2', 'sp', 'ballot'];
const SHARE_RE = /(?:[#&?](?:full|share|sp2|sp|ballot)=)([^&]+)/i;
const SHARE_DETECT_RE = /(#sp2=|#sp=|#full=|#ballot=|[?&]share=)/i;

export const hasSharePayload = (url: string): boolean => SHARE_DETECT_RE.test(url);

export const getShareIdFromUrl = (url: string): string => {
  const match = url.match(SHARE_RE);
  return match ? `${match[0].split('=')[0]}=${match[1]}` : url;
};

export const stripSharePayloadFromUrl = (href: string): string => {
  const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  url.searchParams.delete('share');

  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (!hash) return url.toString();

  const hashParams = new URLSearchParams(hash);
  const hadHashShareParam = SHARE_KEYS.some((key) => hashParams.has(key));
  if (hadHashShareParam) {
    SHARE_KEYS.forEach((key) => hashParams.delete(key));
    const nextHash = hashParams.toString();
    url.hash = nextHash ? `#${nextHash}` : '';
    return url.toString();
  }

  if (/^(full|share|sp2|sp|ballot)=/i.test(hash)) {
    url.hash = '';
  }

  return url.toString();
};

export const clearSharePayloadFromCurrentUrl = (): void => {
  if (typeof window === 'undefined') return;
  const nextUrl = stripSharePayloadFromUrl(window.location.href);
  window.history.replaceState(null, '', nextUrl);
};

export const buildCurrentReviewUrl = (mode: 'preference' | 'ballot'): string => {
  let url: string;
  if (mode === 'ballot' && useStore.getState().currentBallot) {
    const ballot = buildBallot();
    url = buildFullShareUrl(encodeFullSharePayload('sample-ballot', ballot, ballot.title));
  } else {
    const preferenceSet = buildTemplate();
    url = buildFullShareUrl(encodeFullSharePayload('preference-set', preferenceSet, preferenceSet.title));
  }

  if (url.length > MAX_REVIEW_URL_LENGTH) throw new ReviewUrlTooLargeError(url.length);
  return url;
};

export const applySharedUrlToStore = (url: string): AppliedShareResult | null => {
  const share = extractShareFromUrl(url);
  if (!share) return null;
  const sourceUrl = url;
  const shareId = getShareIdFromUrl(url);

  if (share.kind === 'preference-set') {
    useStore.getState().importData({ ...share.data, notes: share.data.notes || '' });
    useStore.setState({
      ballotMode: 'preference',
      shareReview: {
        active: true,
        kind: 'preference-set',
        title: share.payload.title || share.data.title,
        sourceUrl,
        shareId,
      },
    });
    return { kind: 'preference-set', title: share.data.title, sourceUrl, shareId };
  }

  if (share.kind === 'sample-ballot') {
    useStore.setState({
      currentBallot: share.data,
      ballotMode: 'ballot',
      shareReview: {
        active: true,
        kind: 'sample-ballot',
        title: share.payload.title || share.data.title,
        sourceUrl,
        shareId,
      },
    });
    return { kind: 'sample-ballot', title: share.data.title, sourceUrl, shareId };
  }

  const snapshot = {
    topics: useStore.getState().topics,
    items: useStore.getState().items,
  };
  const { applied } = applyStarterPreferences(share.payload);
  useStore.setState({
    ballotMode: 'preference',
    shareReview: {
      active: true,
      kind: 'starter',
      title: 'Compact starter share',
      sourceUrl,
      shareId,
    },
  });
  return {
    kind: 'starter',
    title: 'Compact starter share',
    applied,
    sourceUrl,
    shareId,
    undoSnapshot: snapshot,
  };
};
