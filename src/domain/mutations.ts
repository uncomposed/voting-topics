import { generateDraft } from './scoring';
import { ElectionMapSchema, ElectionTemplateSchema, ElectionWorkspaceSchema, TopicProfileSchema, type Contest, type ElectionTemplate, type ElectionWorkspace, type Topic, type TopicProfile } from './schema';

export function updateTopic(
  profile: TopicProfile,
  workspaces: ElectionWorkspace[],
  elections: ElectionTemplate[],
  topicId: string,
  patch: Partial<Pick<Topic, 'title' | 'description' | 'stars' | 'category' | 'notes'>>,
  now = new Date().toISOString(),
): { profile: TopicProfile; workspaces: ElectionWorkspace[]; invalidatedCells: number } {
  const before = profile.topics.find((topic) => topic.id === topicId);
  if (!before) return { profile, workspaces, invalidatedCells: 0 };
  const wordingChanged = (patch.title !== undefined && patch.title !== before.title) || (patch.description !== undefined && patch.description !== before.description);
  const nextProfile = TopicProfileSchema.parse({ ...profile, updatedAt: now, topics: profile.topics.map((topic) => topic.id === topicId ? { ...topic, ...patch, origin: wordingChanged && topic.origin ? { ...topic.origin, customized: true } : topic.origin } : topic) });
  const byElection = new Map(elections.map((election) => [election.id, election]));
  let invalidatedCells = 0;
  const nextWorkspaces = workspaces.map((workspace) => {
    const election = byElection.get(workspace.electionId);
    if (!election) return workspace;
    const nextMap = wordingChanged ? ElectionMapSchema.parse({
      ...workspace.mapping,
      updatedAt: now,
      contests: workspace.mapping.contests.map((contest) => ({ ...contest, assessments: contest.assessments.filter((assessment) => {
        const keep = assessment.topicId !== topicId;
        if (!keep) invalidatedCells += 1;
        return keep;
      }) })),
    }) : workspace.mapping;
    return ElectionWorkspaceSchema.parse({ ...workspace, mapping: nextMap, draft: generateDraft(nextProfile, election, nextMap, now), updatedAt: now });
  });
  return { profile: nextProfile, workspaces: nextWorkspaces, invalidatedCells };
}

export function replaceElectionContest(
  profile: TopicProfile,
  election: ElectionTemplate,
  workspace: ElectionWorkspace,
  contest: Contest,
  now = new Date().toISOString(),
): { election: ElectionTemplate; workspace: ElectionWorkspace } {
  const before = election.contests.find((candidate) => candidate.id === contest.id);
  const structuralChange = !before || before.method !== contest.method
    || JSON.stringify(before.options) !== JSON.stringify(contest.options)
    || ('maxSelections' in before ? before.maxSelections : undefined) !== ('maxSelections' in contest ? contest.maxSelections : undefined)
    || ('maxRankings' in before ? before.maxRankings : undefined) !== ('maxRankings' in contest ? contest.maxRankings : undefined);
  const nextElection = ElectionTemplateSchema.parse({ ...election, contests: election.contests.map((candidate) => candidate.id === contest.id ? contest : candidate), updatedAt: now });
  const mapping = structuralChange ? ElectionMapSchema.parse({ ...workspace.mapping, contests: workspace.mapping.contests.filter((candidate) => candidate.contestId !== contest.id), updatedAt: now }) : workspace.mapping;
  const nextWorkspace = ElectionWorkspaceSchema.parse({
    ...workspace,
    mapping,
    draft: generateDraft(profile, nextElection, mapping, now),
    decisions: workspace.decisions.map((decision) => decision.contestId === contest.id && structuralChange ? { ...decision, confirmed: false, override: null } : decision),
    updatedAt: now,
  });
  return { election: nextElection, workspace: nextWorkspace };
}
