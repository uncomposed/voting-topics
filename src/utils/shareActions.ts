import { buildBallot, buildTemplate } from '../exporters';
import { useStore } from '../store';
import {
  applyStarterPreferences,
  buildFullShareUrl,
  encodeFullSharePayload,
  extractShareFromUrl,
} from './share';

export interface AppliedShareResult {
  kind: 'starter' | 'preference-set' | 'sample-ballot';
  title?: string;
  applied?: number;
}

export const buildCurrentReviewUrl = (mode: 'preference' | 'ballot'): string => {
  if (mode === 'ballot' && useStore.getState().currentBallot) {
    const ballot = buildBallot();
    return buildFullShareUrl(encodeFullSharePayload('sample-ballot', ballot, ballot.title));
  }
  const preferenceSet = buildTemplate();
  return buildFullShareUrl(encodeFullSharePayload('preference-set', preferenceSet, preferenceSet.title));
};

export const applySharedUrlToStore = (url: string): AppliedShareResult | null => {
  const share = extractShareFromUrl(url);
  if (!share) return null;

  if (share.kind === 'preference-set') {
    useStore.getState().importData({ ...share.data, notes: share.data.notes || '' });
    useStore.setState({ ballotMode: 'preference' });
    return { kind: 'preference-set', title: share.data.title };
  }

  if (share.kind === 'sample-ballot') {
    useStore.setState({ currentBallot: share.data, ballotMode: 'ballot' });
    return { kind: 'sample-ballot', title: share.data.title };
  }

  const { applied } = applyStarterPreferences(share.payload);
  useStore.setState({ ballotMode: 'preference' });
  return { kind: 'starter', title: 'Compact starter share', applied };
};
