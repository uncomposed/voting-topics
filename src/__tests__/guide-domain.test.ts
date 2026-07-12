import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_TEMPLATE } from '../guide/demo';
import {
  ElectionTemplateSchema,
  VoterGuidePublishedSchema,
  createGuideFromTemplate,
  guideReadinessMessages,
} from '../guide/schema';
import { buildGuideReviewUrl, readGuideReviewUrl } from '../guide/share';
import { LEGACY_STORAGE_KEY, useGuideStore } from '../guide/store';
import { completeDemoGuide } from './fixtures';

describe('guide domain', () => {
  beforeEach(() => {
    localStorage.clear();
    useGuideStore.setState({ draft: null, backup: null, legacyDismissed: false });
  });

  it('rejects ambiguous choose-one templates', () => {
    const invalid = structuredClone(DEMO_TEMPLATE);
    const contest = invalid.contests[0];
    if (contest.kind !== 'candidate') throw new Error('Expected candidate contest.');
    contest.maxSelections = 2;
    expect(ElectionTemplateSchema.safeParse(invalid).success).toBe(false);
  });

  it('distinguishes a saveable draft from a publishable guide', () => {
    const draft = createGuideFromTemplate(DEMO_TEMPLATE);
    expect(guideReadinessMessages(draft)).toHaveLength(15);
    expect(VoterGuidePublishedSchema.safeParse(draft).success).toBe(false);
    expect(VoterGuidePublishedSchema.safeParse(completeDemoGuide()).success).toBe(true);
  });

  it('round-trips a complete compressed guide below the representative link budget', () => {
    const guide = completeDemoGuide();
    const url = buildGuideReviewUrl(guide, 'https://guide.example.test/app');
    const result = readGuideReviewUrl(url);
    expect(url.length).toBeLessThan(4000);
    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') expect(result.guide).toEqual(guide);
  });

  it('rejects damaged share data without throwing', () => {
    expect(readGuideReviewUrl('https://guide.example.test/#guide=g1.not-valid')).toEqual({
      kind: 'invalid',
      error: 'This review link is damaged or incomplete. Your saved guide was not changed.',
    });
  });

  it('permits only web links in published sources', () => {
    const guide = completeDemoGuide();
    guide.recommendations[0].sources = [
      { id: 'source-one', label: 'Unsafe source', url: 'javascript:alert(1)' },
    ];
    expect(VoterGuidePublishedSchema.safeParse(guide).success).toBe(false);
  });

  it('keeps one rolling guide backup and never changes legacy storage', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, '{"old":"preferences"}');
    const first = useGuideStore.getState().startGuide(DEMO_TEMPLATE);
    const second = { ...completeDemoGuide(), id: 'guide-second' };
    useGuideStore.getState().replaceDraft(second);
    expect(useGuideStore.getState().draft?.id).toBe('guide-second');
    expect(useGuideStore.getState().backup?.id).toBe(first.id);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe('{"old":"preferences"}');
  });
});
