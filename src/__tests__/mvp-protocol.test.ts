import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_ELECTION, DEMO_PROFILE, createDemoWorkspace } from '../domain/demo';
import { assessmentContext, createHandoffTask, electionContext, parseProposal, priorityContext, renderHandoffMarkdown, validateProposalReferences, validateProposalScope } from '../domain/handoff';
import { normalizePublicArtifactUrl, parsePortableArtifact } from '../domain/import';
import { PRIORITY_MENU } from '../domain/priority-menu';
import { digestValue } from '../domain/portable';
import { ElectionMapSchema } from '../domain/schema';

describe('first-class priority menu', () => {
  it('ships specific outcomes under presentation-only categories', () => {
    expect(PRIORITY_MENU.version).toBe('vt.priority-menu.v1');
    expect(PRIORITY_MENU.items).toHaveLength(66);
    expect(new Set(PRIORITY_MENU.items.map((item) => item.category))).toHaveLength(22);
    expect(PRIORITY_MENU.items.every((item) => item.statement.length > item.category.length)).toBe(true);
  });

  it('publishes a digest for the exact catalog revision copied into profiles', async () => {
    const { digest, ...content } = PRIORITY_MENU;
    expect(await digestValue(content)).toBe(digest);
  });
});

describe('task-scoped chatbot handoffs', () => {
  it('embeds only the task context and accepts one fenced response object', async () => {
    const task = await createHandoffTask('priorities', priorityContext(DEMO_PROFILE), 'Help me notice tradeoffs.');
    const response = { version: 'vt.priority-proposal.v1', taskId: task.id, inputDigest: task.inputDigest, selections: [{ menuItemId: PRIORITY_MENU.items[0].id, stars: 5 }], customPriorities: [] };
    const parsed = parseProposal(`Here is the requested payload:\n\n\`\`\`json\n${JSON.stringify(response)}\n\`\`\``, task);
    expect(parsed.kind).toBe('valid');
    expect(renderHandoffMarkdown(task)).toContain('Help me notice tradeoffs.');
    expect(renderHandoffMarkdown(task)).not.toContain(DEMO_ELECTION.title);
  });

  it('rejects stale digests and multiple ambiguous payloads with a repair brief', async () => {
    const task = await createHandoffTask('priorities', priorityContext(DEMO_PROFILE));
    const stale = parseProposal(JSON.stringify({ version: 'vt.priority-proposal.v1', taskId: task.id, inputDigest: '0'.repeat(64), selections: [], customPriorities: [] }), task);
    expect(stale.kind).toBe('invalid');
    if (stale.kind === 'invalid') expect(stale.repairBrief).toContain('inputDigest is stale');
    const multiple = parseProposal('```json\n{}\n```\n```json\n{}\n```', task);
    expect(multiple.kind).toBe('invalid');
  });

  it('rejects hallucinated options and incomplete contest research before mutation', async () => {
    const workspace = createDemoWorkspace();
    const task = await createHandoffTask('assessment', assessmentContext(DEMO_PROFILE, DEMO_ELECTION, workspace, 'mayor'));
    const proposal = {
      version: 'vt.assessment-batch.v1' as const, taskId: task.id, inputDigest: task.inputDigest, contestId: 'mayor', sources: [],
      assessments: [{ status: 'unknown' as const, contestId: 'mayor', optionId: 'invented-candidate', topicId: 'housing', note: 'No evidence.' }],
    };
    const parsed = parseProposal(JSON.stringify(proposal), task);
    expect(parsed.kind).toBe('valid');
    if (parsed.kind === 'valid') {
      const errors = validateProposalReferences(parsed.proposal, { profile: DEMO_PROFILE, election: DEMO_ELECTION, workspace });
      expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('Unknown option'), expect.stringContaining('Missing assessment')]));
    }
  });

  it('rejects assessment citations that are absent from both the batch and workspace', async () => {
    const workspace = createDemoWorkspace();
    const task = await createHandoffTask('assessment', assessmentContext(DEMO_PROFILE, DEMO_ELECTION, workspace, 'mayor'));
    const proposal = {
      version: 'vt.assessment-batch.v1' as const, taskId: task.id, inputDigest: task.inputDigest, contestId: 'mayor', sources: [],
      assessments: workspace.mapping.contests[0].assessments.map((assessment) => assessment.status === 'unknown' ? { ...assessment, authorship: undefined, verification: undefined } : { status: 'assessed' as const, contestId: assessment.contestId, optionId: assessment.optionId, topicId: assessment.topicId, stars: assessment.stars, confidence: assessment.confidence, reason: assessment.reason, sourceIds: ['invented-source'] }),
    };
    const parsed = parseProposal(JSON.stringify(proposal), task);
    expect(parsed.kind).toBe('valid');
    if (parsed.kind === 'valid') expect(validateProposalReferences(parsed.proposal, { profile: DEMO_PROFILE, election: DEMO_ELECTION, workspace })).toEqual(expect.arrayContaining([expect.stringContaining('Unknown evidence source')]));
  });

  it('rejects menu choices outside the exported scope and changed election ids', async () => {
    const menuTask = await createHandoffTask('priorities', priorityContext(DEMO_PROFILE, [PRIORITY_MENU.items[0].id]));
    const menuProposal = { version: 'vt.priority-proposal.v1' as const, taskId: menuTask.id, inputDigest: menuTask.inputDigest, selections: [{ menuItemId: PRIORITY_MENU.items[1].id, stars: 5 }], customPriorities: [] };
    expect(validateProposalScope(menuProposal, menuTask)).toEqual([expect.stringContaining('not included')]);

    const electionTask = await createHandoffTask('election', electionContext(DEMO_ELECTION));
    const electionProposal = { version: 'vt.election-proposal.v1' as const, taskId: electionTask.id, inputDigest: electionTask.inputDigest, election: { ...DEMO_ELECTION, id: 'replacement-election' } };
    expect(validateProposalScope(electionProposal, electionTask)).toEqual(expect.arrayContaining([expect.stringContaining('Election id changed')]));
  });
});

describe('portable user-owned artifacts', () => {
  it('normalizes GitHub files to raw HTTPS and imports an election without state', async () => {
    expect(normalizePublicArtifactUrl('https://github.com/example/elections/blob/main/city.json')).toBe('https://raw.githubusercontent.com/example/elections/main/city.json');
    const parsed = await parsePortableArtifact(JSON.stringify(DEMO_ELECTION));
    expect(parsed.kind).toBe('election');
    if (parsed.kind === 'election') expect(parsed.value.id).toBe(DEMO_ELECTION.id);
  });

  it('keeps the checked-in examples valid against the executable contracts', async () => {
    const profileRaw = readFileSync(join(process.cwd(), 'docs/examples/topic-profile.v3.json'), 'utf8');
    const previousProfileRaw = readFileSync(join(process.cwd(), 'docs/examples/topic-profile.v2.json'), 'utf8');
    const electionRaw = readFileSync(join(process.cwd(), 'docs/examples/election-template.v3.json'), 'utf8');
    const mapRaw = readFileSync(join(process.cwd(), 'docs/examples/election-map.v2.json'), 'utf8');
    expect((await parsePortableArtifact(profileRaw)).kind).toBe('profile');
    expect((await parsePortableArtifact(previousProfileRaw)).kind).toBe('profile');
    expect((await parsePortableArtifact(electionRaw)).kind).toBe('election');
    expect(ElectionMapSchema.parse(JSON.parse(mapRaw)).version).toBe('vt.election-map.v2');
  });
});
