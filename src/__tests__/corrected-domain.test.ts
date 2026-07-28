import { describe, expect, it } from 'vitest';
import { gzipSync, strToU8 } from 'fflate';
import { DEMO_ELECTION, DEMO_MAP, DEMO_PROFILE, SECOND_DEMO_ELECTION, blankMapForElection, createDemoWorkspace } from '../domain/demo';
import { diffGuides } from '../domain/diff';
import { previewLegacyRaw, previewPrototypeConversion } from '../domain/migration';
import { replaceElectionContest, updateTopic } from '../domain/mutations';
import { canonicalize, sha256 } from '../domain/portable';
import { auditMapping, generateDraft } from '../domain/scoring';
import { buildPeerGuideUrl, createPeerGuide, readPeerGuideUrl } from '../domain/share';
import { upgradeTopicProfile } from '../domain/schema';

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

  it('keeps Unknown distinct from zero, blocks automatic translation, and still permits an explicit-warning guide', async () => {
    const mapping = structuredClone(DEMO_MAP);
    const mayor = mapping.contests[0];
    mayor.assessments = mayor.assessments.map((cell) => cell.optionId === 'jordan'
      ? { status: 'unknown' as const, contestId: cell.contestId, optionId: cell.optionId, topicId: cell.topicId, note: 'No reliable source found.', authorship: { kind: 'human' as const }, verification: { status: 'verified' as const, verifiedAt: '2026-01-01T00:00:00.000Z' } }
      : cell);
    const draft = generateDraft(DEMO_PROFILE, DEMO_ELECTION, mapping);
    const jordan = draft.contests[0].optionScores.find((option) => option.optionId === 'jordan')!;
    expect(jordan.score).toBe(0);
    expect(jordan.coverage).toBe(0);
    expect(draft.contests[0].status).toBe('research-needed');
    expect(draft.contests[0].translated).toBeNull();
    expect(auditMapping(DEMO_PROFILE, DEMO_ELECTION, mapping)).toEqual([]);
    const workspace = createDemoWorkspace();
    workspace.mapping = mapping;
    workspace.draft = draft;
    workspace.decisions = workspace.decisions.map((decision) => ({ ...decision, confirmed: true, override: decision.contestId === 'mayor' ? { method: 'fptp' as const, selectedOptionIds: ['avery'] } : decision.override }));
    const guide = await createPeerGuide(DEMO_PROFILE, DEMO_ELECTION, workspace, 'Alex');
    expect(guide.draft.contests[0].status).toBe('research-needed');
    expect(guide.decisions[0].override).toEqual({ method: 'fptp', selectedOptionIds: ['avery'] });
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

  it('calculates direct and chatbot-proposed, human-verified mappings identically', () => {
    const imported = structuredClone(DEMO_MAP);
    imported.contests = imported.contests.map((contest) => ({
      ...contest,
      authorship: { kind: 'chatbot' as const, toolLabel: 'Test assistant', taskId: 'task', inputDigest: '1'.repeat(64) },
      assessments: contest.assessments.map((assessment) => ({ ...assessment, authorship: { kind: 'chatbot' as const, toolLabel: 'Test assistant', taskId: 'task', inputDigest: '1'.repeat(64) } })),
    }));
    const directDraft = generateDraft(DEMO_PROFILE, DEMO_ELECTION, DEMO_MAP, '2026-01-01T00:00:00.000Z');
    const importedDraft = generateDraft(DEMO_PROFILE, DEMO_ELECTION, imported, '2026-01-01T00:00:00.000Z');
    expect(importedDraft.contests).toEqual(directDraft.contests);
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
    const category = updateTopic(DEMO_PROFILE, [workspace], [DEMO_ELECTION], 'housing', { category: 'Daily life' });
    expect(category.invalidatedCells).toBe(0);
    const rating = updateTopic(category.profile, category.workspaces, [DEMO_ELECTION], 'housing', { stars: 1 });
    expect(rating.invalidatedCells).toBe(0);
    expect(rating.workspaces[0].draft.contests[0].optionScores).not.toEqual(workspace.draft.contests[0].optionScores);
    const wording = updateTopic(rating.profile, rating.workspaces, [DEMO_ELECTION], 'housing', { title: 'Residents can stay in homes they can afford' });
    expect(wording.invalidatedCells).toBe(2);
    expect(wording.workspaces[0].draft.contests[0].status).toBe('research-needed');
  });

  it('invalidates one contest when its method or options change', () => {
    const workspace = createDemoWorkspace();
    const mayor = { ...DEMO_ELECTION.contests[0], method: 'rcv' as const, maxRankings: 2 };
    const changed = replaceElectionContest(DEMO_PROFILE, DEMO_ELECTION, workspace, mayor);
    expect(changed.workspace.mapping.contests.some((contest) => contest.contestId === 'mayor')).toBe(false);
    expect(changed.workspace.mapping.contests).toHaveLength(workspace.mapping.contests.length - 1);
  });

  it('does not invalidate research when only a contest title changes', () => {
    const workspace = createDemoWorkspace();
    const renamed = replaceElectionContest(DEMO_PROFILE, DEMO_ELECTION, workspace, { ...DEMO_ELECTION.contests[0], title: 'City Mayor' });
    expect(renamed.workspace.mapping.contests.find((contest) => contest.contestId === 'mayor')).toEqual(workspace.mapping.contests.find((contest) => contest.contestId === 'mayor'));
    expect(renamed.workspace.draft.contests[0].status).toBe('ready');
  });
});

describe('legacy conversion', () => {
  it('upgrades v2 numeric ratings without changing zero or inventing Unrated', () => {
    const previous = { ...structuredClone(DEMO_PROFILE), version: 'vt.topic-profile.v2' as const };
    previous.topics[0].stars = 0;
    const upgraded = upgradeTopicProfile(previous);
    expect(upgraded.version).toBe('vt.topic-profile.v3');
    expect(upgraded.topics[0].stars).toBe(0);
    expect(upgraded.topics.slice(1).every((topic) => topic.stars !== null)).toBe(true);
  });

  it('keeps Unrated out of scoring and rejects it from relevance', () => {
    const profile = { ...structuredClone(DEMO_PROFILE), topics: DEMO_PROFILE.topics.map((topic) => topic.id === 'housing' ? { ...topic, stars: null } : topic) };
    const problems = auditMapping(profile, DEMO_ELECTION, DEMO_MAP);
    expect(problems).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unrated-topic', topicId: 'housing' })]));
    const draft = generateDraft(profile, DEMO_ELECTION, DEMO_MAP);
    expect(draft.contests[0].status).toBe('research-needed');
    expect(draft.contests[0].optionScores.flatMap((option) => option.contributions).some((contribution) => contribution.topicId === 'housing')).toBe(false);
  });

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

  it('previews the corrected prototype as a normalized library without touching its raw bytes', () => {
    const legacyProfile = {
      ...DEMO_PROFILE,
      version: 'vt.topic-profile.v1',
      topics: DEMO_PROFILE.topics.map(({ origin: _origin, ...topic }) => topic),
      authorship: undefined,
    };
    const legacyElection = {
      version: 'vt.election-template.v2', id: DEMO_ELECTION.id, title: DEMO_ELECTION.title, electionDate: DEMO_ELECTION.electionDate,
      jurisdiction: DEMO_ELECTION.jurisdiction, isFictional: DEMO_ELECTION.isFictional, disclaimer: DEMO_ELECTION.disclaimer,
      contests: DEMO_ELECTION.contests.map(({ sourceIds: _sourceIds, verification: _verification, ballotInstructions: _instructions, ...contest }) => ({
        ...contest,
        options: contest.options.map(({ sourceIds: _optionSources, website: _website, ...option }) => option),
      })),
    };
    const legacyMap = {
      ...DEMO_MAP,
      version: 'vt.election-map.v1',
      contests: DEMO_MAP.contests.map((contest) => ({ ...contest, assessments: contest.assessments.map(({ authorship: _authorship, verification: _verification, ...assessment }) => assessment) })),
    };
    const profileRaw = JSON.stringify([legacyProfile]);
    const workspaceRaw = JSON.stringify([{ id: 'old-workspace', election: legacyElection, mapping: legacyMap, draft: createDemoWorkspace().draft, decisions: createDemoWorkspace().decisions, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }]);
    const preview = previewPrototypeConversion(profileRaw, workspaceRaw, '2026-07-17T12:00:00.000Z');
    expect(preview.profiles[0].version).toBe('vt.topic-profile.v3');
    expect(preview.elections[0].contests.every((contest) => contest.verification.status === 'draft')).toBe(true);
    expect(preview.workspaces[0].mapping.contests[0].assessments[0].verification.status).toBe('verified');
    expect(profileRaw).toBe(JSON.stringify([legacyProfile]));
    expect(workspaceRaw).toContain('old-workspace');
  });
});

describe('reproducible peer snapshot', () => {
  it('round-trips, verifies its digest, and stays within the representative URL target', async () => {
    const workspace = createDemoWorkspace();
    workspace.decisions = workspace.decisions.map((decision) => ({ ...decision, confirmed: true }));
    const guide = await createPeerGuide(DEMO_PROFILE, DEMO_ELECTION, workspace, 'Alex', { createdAt: '2026-01-01T00:00:00.000Z' });
    const result = buildPeerGuideUrl(guide, 'https://example.org/');
    expect(result.withinTarget).toBe(true);
    const opened = await readPeerGuideUrl(result.url);
    expect(opened.kind).toBe('valid');
    if (opened.kind === 'valid') expect(opened.guide.snapshotDigest).toBe(guide.snapshotDigest);
  });

  it('records an independent fork and reports only the semantic topic/score changes', async () => {
    const workspace = createDemoWorkspace();
    const parent = await createPeerGuide(DEMO_PROFILE, DEMO_ELECTION, workspace, 'Alex', { createdAt: '2026-01-01T00:00:00.000Z' });
    const updated = updateTopic(DEMO_PROFILE, [workspace], [DEMO_ELECTION], 'housing', { stars: 1 }, '2026-01-02T00:00:00.000Z');
    const child = await createPeerGuide(updated.profile, DEMO_ELECTION, updated.workspaces[0], 'Blair', { parent, changesFromParent: ['Housing: 5 → 1 stars'], createdAt: '2026-01-02T00:00:00.000Z' });
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

  it('opens a valid legacy p1 link read-only and upgrades only in memory', async () => {
    const workspace = createDemoWorkspace();
    const profile = { ...DEMO_PROFILE, version: 'vt.topic-profile.v1', topics: DEMO_PROFILE.topics.map(({ origin: _origin, ...topic }) => topic) };
    delete (profile as { authorship?: unknown }).authorship;
    const election = {
      version: 'vt.election-template.v2', id: DEMO_ELECTION.id, title: DEMO_ELECTION.title, electionDate: DEMO_ELECTION.electionDate,
      jurisdiction: DEMO_ELECTION.jurisdiction, isFictional: DEMO_ELECTION.isFictional, disclaimer: DEMO_ELECTION.disclaimer,
      contests: DEMO_ELECTION.contests.map(({ sourceIds: _sourceIds, verification: _verification, ballotInstructions: _instructions, ...contest }) => ({ ...contest, options: contest.options.map(({ sourceIds: _optionSources, website: _website, ...option }) => option) })),
    };
    const mapping = {
      ...DEMO_MAP, version: 'vt.election-map.v1',
      contests: DEMO_MAP.contests.map(({ authorship: _mappingAuthorship, verification: _mappingVerification, ...contest }) => ({ ...contest, assessments: contest.assessments.map(({ authorship: _authorship, verification: _verification, ...assessment }) => assessment) })),
    };
    const unsigned = { version: 'vt.peer-guide.v1', id: workspace.id, authorLabel: 'Legacy Alex', profile, election, mapping, draft: workspace.draft, decisions: workspace.decisions, lineage: { parentSnapshotDigest: null, changesFromParent: [] }, createdAt: '2026-01-01T00:00:00.000Z' };
    const legacy = { ...unsigned, snapshotDigest: await sha256(canonicalize(unsigned)) };
    const payload = Buffer.from(gzipSync(strToU8(canonicalize(legacy)), { level: 9 })).toString('base64url');
    const result = await readPeerGuideUrl(`https://example.org/#guide=p1.${payload}`);
    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.guide.version).toBe('vt.peer-guide.v3');
      expect(result.guide.mapping.contests[0].authorship.kind).toBe('import');
    }
  });

  it('verifies a previous p2 digest before upgrading its rated profile to p3/v3', async () => {
    const workspace = createDemoWorkspace();
    const previousProfile = { ...structuredClone(DEMO_PROFILE), version: 'vt.topic-profile.v2' as const };
    const unsigned = { version: 'vt.peer-guide.v2', id: workspace.id, authorLabel: 'Previous Alex', profile: previousProfile, election: DEMO_ELECTION, mapping: DEMO_MAP, draft: workspace.draft, decisions: workspace.decisions, lineage: { parentSnapshotDigest: null, changesFromParent: [] }, createdAt: '2026-01-01T00:00:00.000Z' } as const;
    const previous = { ...unsigned, snapshotDigest: await sha256(canonicalize(unsigned)) };
    const payload = Buffer.from(gzipSync(strToU8(canonicalize(previous)), { level: 9 })).toString('base64url');
    const result = await readPeerGuideUrl(`https://example.org/#guide=p2.${payload}`);
    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.guide.version).toBe('vt.peer-guide.v3');
      expect(result.guide.profile.version).toBe('vt.topic-profile.v3');
      expect(result.guide.profile.topics.map((topic) => topic.stars)).toEqual(DEMO_PROFILE.topics.map((topic) => topic.stars));
    }
  });
});
