import { describe, expect, it } from 'vitest';
import { DEMO_ELECTION, DEMO_MAP, DEMO_PROFILE, SECOND_DEMO_ELECTION, blankMapForElection, createDemoWorkspace } from '../domain/demo';
import { diffGuides } from '../domain/diff';
import { previewLegacyRaw } from '../domain/migration';
import { replaceElectionContest, updateTopic } from '../domain/mutations';
import { auditMapping, generateDraft } from '../domain/scoring';
import { buildPeerGuideUrl, createPeerGuide, readPeerGuideUrl } from '../domain/share';

describe('corrected Gate 1 scoring', () => {
  it('uses the exact weighted formula and confidence coverage', () => {
    const profile = { ...DEMO_PROFILE, topics: DEMO_PROFILE.topics.map((topic) => topic.id === 'public-trust' ? { ...topic, stars: 4 } : topic) };
    const mapping = structuredClone(DEMO_MAP);
    const mayor = mapping.contests.find((contest) => contest.contestId === 'mayor')!;
    const averyTrust = mayor.assessments.find((cell) => cell.optionId === 'avery' && cell.topicId === 'public-trust')!;
    if (averyTrust.status === 'assessed') averyTrust.confidence = 'low';
    const score = generateDraft(profile, DEMO_ELECTION, mapping, '2026-01-01T00:00:00.000Z').contests[0].optionScores.find((option) => option.optionId === 'avery')!;
    expect(score.score).toBeCloseTo((5 * 5 * 1 + 4 * 4 * 0.5 + 4 * 4 * 1) / (5 * 1 + 4 * 0.5 + 4 * 1), 10);
    expect(score.coverage).toBeCloseTo((5 * 1 + 4 * 0.5 + 4 * 1) / (5 + 4 + 4), 10);
  });

  it('keeps Unknown distinct from zero and blocks generation below 60% coverage', () => {
    const mapping = structuredClone(DEMO_MAP);
    const mayor = mapping.contests[0];
    mayor.assessments = mayor.assessments.map((cell) => cell.optionId === 'jordan'
      ? { status: 'unknown' as const, contestId: cell.contestId, optionId: cell.optionId, topicId: cell.topicId, note: 'No reliable source found.' }
      : cell);
    const draft = generateDraft(DEMO_PROFILE, DEMO_ELECTION, mapping);
    const jordan = draft.contests[0].optionScores.find((option) => option.optionId === 'jordan')!;
    expect(jordan.score).toBe(0);
    expect(jordan.coverage).toBe(0);
    expect(draft.contests[0].status).toBe('research-needed');
    expect(draft.contests[0].translated).toBeNull();
    expect(auditMapping(DEMO_PROFILE, DEMO_ELECTION, mapping)).toEqual([]);
  });

  it('requires a cell for every viable option and selected relevant topic', () => {
    const mapping = structuredClone(DEMO_MAP);
    mapping.contests[0].assessments.pop();
    expect(auditMapping(DEMO_PROFILE, DEMO_ELECTION, mapping)).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing-cell' })]));
  });

  it('translates FPTP, choose-up-to, RCV, STAR, and Yes/No without hiding STAR scorecards', () => {
    const contests = generateDraft(DEMO_PROFILE, DEMO_ELECTION, DEMO_MAP).contests;
    expect(contests.map((contest) => contest.translated?.method)).toEqual(['fptp', 'choose-up-to', 'rcv', 'star', 'yes-no']);
    expect(contests[0].translated).toEqual({ method: 'fptp', selectedOptionIds: ['avery'] });
    expect(contests[1].translated).toEqual({ method: 'choose-up-to', selectedOptionIds: ['riley', 'casey'] });
    expect(contests[2].translated).toEqual({ method: 'rcv', rankedOptionIds: ['jamie', 'quinn', 'taylor'] });
    expect(contests[3].translated).toEqual({ method: 'star', scores: { morgan: 5, devon: 4 } });
    expect(contests[4].translated).toEqual({ method: 'yes-no', position: 'yes' });
    expect(contests.every((contest) => contest.optionScores.every((option) => option.score >= 0 && option.score <= 5))).toBe(true);
  });

  it('flags a margin below 0.25 as a close call', () => {
    const mapping = structuredClone(DEMO_MAP);
    const mayor = mapping.contests[0];
    mayor.assessments = mayor.assessments.map((cell) => {
      if (cell.status !== 'assessed' || cell.optionId !== 'jordan') return cell;
      return { ...cell, stars: cell.topicId === 'housing' ? 5 : 4 };
    });
    const draft = generateDraft(DEMO_PROFILE, DEMO_ELECTION, mapping);
    expect(draft.contests[0].status).toBe('close-call');
  });
});

describe('invalidation and reuse', () => {
  it('reuses the same profile id across two elections', () => {
    expect(createDemoWorkspace().mapping.profileId).toBe(DEMO_PROFILE.id);
    expect(blankMapForElection(SECOND_DEMO_ELECTION, DEMO_PROFILE).profileId).toBe(DEMO_PROFILE.id);
  });

  it('invalidates research on wording edits, not stars or category edits', () => {
    const workspace = createDemoWorkspace();
    const category = updateTopic(DEMO_PROFILE, [workspace], 'housing', { category: 'Daily life' });
    expect(category.invalidatedCells).toBe(0);
    const rating = updateTopic(category.profile, category.workspaces, 'housing', { stars: 1 });
    expect(rating.invalidatedCells).toBe(0);
    expect(rating.workspaces[0].draft.contests[0].optionScores).not.toEqual(workspace.draft.contests[0].optionScores);
    const wording = updateTopic(rating.profile, rating.workspaces, 'housing', { title: 'Residents can stay in homes they can afford' });
    expect(wording.invalidatedCells).toBe(2);
    expect(wording.workspaces[0].draft.contests[0].status).toBe('research-needed');
  });

  it('invalidates one contest when its method or options change', () => {
    const workspace = createDemoWorkspace();
    const mayor = { ...DEMO_ELECTION.contests[0], method: 'rcv' as const, maxRankings: 2 };
    const changed = replaceElectionContest(DEMO_PROFILE, workspace, mayor);
    expect(changed.mapping.contests.some((contest) => contest.contestId === 'mayor')).toBe(false);
    expect(changed.mapping.contests).toHaveLength(workspace.mapping.contests.length - 1);
  });

  it('does not invalidate research when only a contest title changes', () => {
    const workspace = createDemoWorkspace();
    const renamed = replaceElectionContest(DEMO_PROFILE, workspace, { ...DEMO_ELECTION.contests[0], title: 'City Mayor' });
    expect(renamed.mapping.contests.find((contest) => contest.contestId === 'mayor')).toEqual(workspace.mapping.contests.find((contest) => contest.contestId === 'mayor'));
    expect(renamed.draft.contests[0].status).toBe('ready');
  });
});

describe('legacy conversion', () => {
  it.each([
    ['tsb.v0', { version: 'tsb.v0', title: 'v0', topics: [{ id: 'a', title: 'Housing', importance: 5, mode: 'custom', direction: { custom: 'More people can afford stable homes' }, sources: [] }] }],
    ['tsb.v1', { version: 'tsb.v1', title: 'v1', topics: [{ id: 'a', title: 'Housing', importance: 2, directions: [{ id: 'd', text: 'More people can afford stable homes', stars: 4, sources: [] }] }] }],
    ['tsb.v2', { version: 'tsb.v2', title: 'v2', topics: [{ id: 'a', title: 'Housing', importance: 2 }], items: [{ id: 'd', text: 'More people can afford stable homes', stars: 4, topicIds: ['a'], sources: [] }] }],
  ])('previews %s without compounding category importance', (version, legacy) => {
    const raw = JSON.stringify({ state: legacy, unrelated: 'preserved' });
    const preview = previewLegacyRaw(raw, '2026-01-01T00:00:00.000Z');
    expect(preview.detectedVersion).toBe(version);
    expect(preview.profile.topics[0].stars).toBe(version === 'tsb.v0' ? 5 : 4);
    expect(raw).toBe(JSON.stringify({ state: legacy, unrelated: 'preserved' }));
  });
});

describe('reproducible peer snapshot', () => {
  it('round-trips, verifies its digest, and stays within the representative URL target', async () => {
    const workspace = createDemoWorkspace();
    workspace.decisions = workspace.decisions.map((decision) => ({ ...decision, confirmed: true }));
    const guide = await createPeerGuide(DEMO_PROFILE, workspace, 'Alex', { createdAt: '2026-01-01T00:00:00.000Z' });
    const result = buildPeerGuideUrl(guide, 'https://example.org/');
    expect(result.withinTarget).toBe(true);
    const opened = await readPeerGuideUrl(result.url);
    expect(opened.kind).toBe('valid');
    if (opened.kind === 'valid') expect(opened.guide.snapshotDigest).toBe(guide.snapshotDigest);
  });

  it('records an independent fork and reports only the semantic topic/score changes', async () => {
    const workspace = createDemoWorkspace();
    const parent = await createPeerGuide(DEMO_PROFILE, workspace, 'Alex', { createdAt: '2026-01-01T00:00:00.000Z' });
    const updated = updateTopic(DEMO_PROFILE, [workspace], 'housing', { stars: 1 }, '2026-01-02T00:00:00.000Z');
    const child = await createPeerGuide(updated.profile, updated.workspaces[0], 'Blair', { parent, changesFromParent: ['Housing: 5 → 1 stars'], createdAt: '2026-01-02T00:00:00.000Z' });
    const diff = diffGuides(parent, child);
    expect(child.lineage.parentSnapshotDigest).toBe(parent.snapshotDigest);
    expect(diff.topicRatings).toEqual(['More residents can afford stable housing near jobs and services: 5 → 1 stars']);
    expect(diff.generatedScores).toEqual(['Scores changed: mayor']);
    expect(diff.generatedScores).not.toContain('Scores changed: council');
  });

  it('rejects a damaged share without returning a guide', async () => {
    const result = await readPeerGuideUrl('https://example.org/#guide=p1.not-valid');
    expect(result.kind).toBe('invalid');
  });
});
