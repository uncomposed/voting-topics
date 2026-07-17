import { generateDraft } from './scoring';
import type { ElectionMap, ElectionTemplate, ElectionWorkspace, Topic, TopicProfile } from './schema';

export function updateTopic(
  profile: TopicProfile,
  workspaces: ElectionWorkspace[],
  topicId: string,
  patch: Partial<Pick<Topic, 'title' | 'description' | 'stars' | 'category' | 'notes'>>,
  now = new Date().toISOString(),
): { profile: TopicProfile; workspaces: ElectionWorkspace[]; invalidatedCells: number } {
  const before = profile.topics.find((topic) => topic.id === topicId);
  if (!before) return { profile, workspaces, invalidatedCells: 0 };
  const wordingChanged = (patch.title !== undefined && patch.title !== before.title)
    || (patch.description !== undefined && patch.description !== before.description);
  const nextProfile = { ...profile, updatedAt: now, topics: profile.topics.map((topic) => topic.id === topicId ? { ...topic, ...patch } : topic) };
  let invalidatedCells = 0;
  const nextWorkspaces = workspaces.map((workspace) => {
    const nextMap: ElectionMap = wordingChanged ? {
      ...workspace.mapping,
      updatedAt: now,
      contests: workspace.mapping.contests.map((contest) => ({
        ...contest,
        assessments: contest.assessments.filter((assessment) => {
          const keep = assessment.topicId !== topicId;
          if (!keep) invalidatedCells += 1;
          return keep;
        }),
      })),
    } : workspace.mapping;
    return { ...workspace, mapping: nextMap, draft: generateDraft(nextProfile, workspace.election, nextMap, now), updatedAt: now };
  });
  return { profile: nextProfile, workspaces: nextWorkspaces, invalidatedCells };
}

export function replaceElectionContest(
  profile: TopicProfile,
  workspace: ElectionWorkspace,
  contest: ElectionTemplate['contests'][number],
  now = new Date().toISOString(),
): ElectionWorkspace {
  const before = workspace.election.contests.find((candidate) => candidate.id === contest.id);
  const structuralChange = !before || before.method !== contest.method
    || JSON.stringify(before.options) !== JSON.stringify(contest.options)
    || ('maxSelections' in before ? before.maxSelections : undefined) !== ('maxSelections' in contest ? contest.maxSelections : undefined)
    || ('maxRankings' in before ? before.maxRankings : undefined) !== ('maxRankings' in contest ? contest.maxRankings : undefined);
  const election: ElectionTemplate = { ...workspace.election, contests: workspace.election.contests.map((candidate) => candidate.id === contest.id ? contest : candidate) };
  const mapping: ElectionMap = structuralChange
    ? { ...workspace.mapping, contests: workspace.mapping.contests.filter((candidate) => candidate.contestId !== contest.id), updatedAt: now }
    : workspace.mapping;
  return {
    ...workspace,
    election,
    mapping,
    draft: generateDraft(profile, election, mapping, now),
    decisions: workspace.decisions.map((decision) => decision.contestId === contest.id && structuralChange ? { ...decision, confirmed: false, override: null } : decision),
    updatedAt: now,
  };
}
