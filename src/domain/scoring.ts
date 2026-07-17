import {
  ALGORITHM_VERSION,
  DRAFT_VERSION,
  DraftBallotSchema,
  type BallotMark,
  type Contest,
  type ContestDraft,
  type ElectionMap,
  type ElectionTemplate,
  type MappingAssessment,
  type OptionScore,
  type TopicProfile,
} from './schema';

export const CONFIDENCE_WEIGHT = { low: 0.5, medium: 0.75, high: 1 } as const;
export const MINIMUM_COVERAGE = 0.6;
export const CLOSE_CALL_MARGIN = 0.25;

export interface MappingProblem {
  contestId: string;
  optionId?: string;
  topicId?: string;
  code: 'missing-contest' | 'missing-topic' | 'missing-cell' | 'invalid-reference' | 'missing-source';
  message: string;
}

function cellKey(optionId: string, topicId: string): string {
  return `${optionId}\u0000${topicId}`;
}

export function auditMapping(
  profile: TopicProfile,
  election: ElectionTemplate,
  mapping: ElectionMap,
): MappingProblem[] {
  const problems: MappingProblem[] = [];
  const topics = new Set(profile.topics.map((topic) => topic.id));
  const sourceIds = new Set(mapping.sources.map((source) => source.id));
  const contestMaps = new Map(mapping.contests.map((contest) => [contest.contestId, contest]));

  for (const contest of election.contests) {
    const contestMap = contestMaps.get(contest.id);
    if (!contestMap) {
      problems.push({ contestId: contest.id, code: 'missing-contest', message: 'Select relevant topics for this contest.' });
      continue;
    }
    const relevant = new Set(contestMap.relevantTopicIds);
    for (const topicId of relevant) {
      if (!topics.has(topicId)) {
        problems.push({ contestId: contest.id, topicId, code: 'missing-topic', message: 'A relevant topic no longer exists in the profile.' });
      }
    }
    const viableOptions = new Set(contest.options.map((option) => option.id));
    const seen = new Set<string>();
    for (const assessment of contestMap.assessments) {
      const key = cellKey(assessment.optionId, assessment.topicId);
      if (seen.has(key) || !viableOptions.has(assessment.optionId) || !relevant.has(assessment.topicId)) {
        problems.push({
          contestId: contest.id,
          optionId: assessment.optionId,
          topicId: assessment.topicId,
          code: 'invalid-reference',
          message: 'This assessment is duplicated or refers outside the current contest/topic subset.',
        });
      }
      seen.add(key);
      if (assessment.status === 'assessed') {
        for (const sourceId of assessment.sourceIds) {
          if (!sourceIds.has(sourceId)) {
            problems.push({ contestId: contest.id, optionId: assessment.optionId, topicId: assessment.topicId, code: 'missing-source', message: 'An assessed fit must cite a source in this map.' });
          }
        }
      }
    }
    for (const option of contest.options) {
      for (const topicId of relevant) {
        if (!seen.has(cellKey(option.id, topicId))) {
          problems.push({ contestId: contest.id, optionId: option.id, topicId, code: 'missing-cell', message: `${option.name} still needs a rating or an explicit Unknown.` });
        }
      }
    }
  }
  return problems;
}

function scoreOption(
  optionId: string,
  relevantTopicIds: string[],
  assessments: MappingAssessment[],
  profile: TopicProfile,
): OptionScore {
  const topics = new Map(profile.topics.map((topic) => [topic.id, topic]));
  const cells = new Map(assessments.map((assessment) => [cellKey(assessment.optionId, assessment.topicId), assessment]));
  let numerator = 0;
  let scoreDenominator = 0;
  let coverageNumerator = 0;
  let coverageDenominator = 0;
  const contributions: OptionScore['contributions'] = [];

  for (const topicId of relevantTopicIds) {
    const topic = topics.get(topicId);
    if (!topic || topic.stars === 0) continue;
    coverageDenominator += topic.stars;
    const assessment = cells.get(cellKey(optionId, topicId));
    if (!assessment || assessment.status === 'unknown') continue;
    const weight = CONFIDENCE_WEIGHT[assessment.confidence];
    numerator += topic.stars * assessment.stars * weight;
    scoreDenominator += topic.stars * weight;
    coverageNumerator += topic.stars * weight;
    contributions.push({
      topicId,
      voterStars: topic.stars,
      optionStars: assessment.stars,
      confidence: assessment.confidence,
      weightedContribution: topic.stars * assessment.stars * weight,
    });
  }
  return {
    optionId,
    score: scoreDenominator === 0 ? 0 : numerator / scoreDenominator,
    coverage: coverageDenominator === 0 ? 1 : coverageNumerator / coverageDenominator,
    contributions,
  };
}

function sortedScores(scores: OptionScore[]): OptionScore[] {
  return [...scores].sort((a, b) => b.score - a.score || a.optionId.localeCompare(b.optionId));
}

function hasCloseAdjacent(scores: OptionScore[], count: number): boolean {
  const sorted = sortedScores(scores).slice(0, count);
  return sorted.some((score, index) => index > 0 && sorted[index - 1].score - score.score < CLOSE_CALL_MARGIN);
}

function translate(contest: Contest, optionScores: OptionScore[]): { mark: BallotMark; close: boolean } {
  const sorted = sortedScores(optionScores);
  if (contest.method === 'fptp') {
    return {
      mark: { method: 'fptp', selectedOptionIds: sorted.length ? [sorted[0].optionId] : [] },
      close: sorted.length > 1 && sorted[0].score - sorted[1].score < CLOSE_CALL_MARGIN,
    };
  }
  if (contest.method === 'choose-up-to') {
    const selected = sorted.slice(0, contest.maxSelections).map((score) => score.optionId);
    const boundaryClose = sorted.length > contest.maxSelections && sorted[contest.maxSelections - 1].score - sorted[contest.maxSelections].score < CLOSE_CALL_MARGIN;
    return { mark: { method: 'choose-up-to', selectedOptionIds: selected }, close: boundaryClose };
  }
  if (contest.method === 'rcv') {
    const rankings = sorted.slice(0, contest.maxRankings);
    return {
      mark: { method: 'rcv', rankedOptionIds: rankings.map((score) => score.optionId) },
      close: hasCloseAdjacent(rankings, rankings.length),
    };
  }
  if (contest.method === 'star') {
    return {
      mark: { method: 'star', scores: Object.fromEntries(optionScores.map((score) => [score.optionId, Math.round(score.score)])) },
      close: false,
    };
  }
  const yes = optionScores.find((score) => score.optionId === 'yes')?.score ?? 0;
  const no = optionScores.find((score) => score.optionId === 'no')?.score ?? 0;
  const close = Math.abs(yes - no) < CLOSE_CALL_MARGIN;
  return { mark: { method: 'yes-no', position: close ? 'abstain' : yes > no ? 'yes' : 'no' }, close };
}

function explanationFor(contest: Contest, scores: OptionScore[], profile: TopicProfile): string {
  const winner = sortedScores(scores)[0];
  if (!winner) return 'No option scores are available yet.';
  const topics = new Map(profile.topics.map((topic) => [topic.id, topic.title]));
  const strongest = [...winner.contributions]
    .sort((a, b) => b.weightedContribution - a.weightedContribution)
    .slice(0, 2)
    .map((contribution) => topics.get(contribution.topicId))
    .filter(Boolean);
  const optionName = contest.options.find((option) => option.id === winner.optionId)?.name ?? winner.optionId;
  return strongest.length
    ? `${optionName} has the highest topic-match score, led by ${strongest.join(' and ')}.`
    : `${optionName} currently has the highest topic-match score, but it has no assessed contributing topics.`;
}

export function generateDraft(
  profile: TopicProfile,
  election: ElectionTemplate,
  mapping: ElectionMap,
  generatedAt = new Date().toISOString(),
) {
  const allProblems = auditMapping(profile, election, mapping);
  const contestMaps = new Map(mapping.contests.map((contest) => [contest.contestId, contest]));
  const contests: ContestDraft[] = election.contests.map((contest) => {
    const contestMap = contestMaps.get(contest.id);
    const relevantTopicIds = contestMap?.relevantTopicIds ?? [];
    const assessments = contestMap?.assessments ?? [];
    const optionScores = contest.options.map((option) => scoreOption(option.id, relevantTopicIds, assessments, profile));
    const problems = allProblems.filter((problem) => problem.contestId === contest.id);
    const lowCoverage = optionScores.filter((score) => score.coverage < MINIMUM_COVERAGE);
    const researchNeeded = relevantTopicIds.length === 0 || problems.length > 0 || lowCoverage.length > 0;
    const translation = translate(contest, optionScores);
    const warnings = [
      ...problems.map((problem) => problem.message),
      ...lowCoverage.map((score) => `${contest.options.find((option) => option.id === score.optionId)?.name ?? score.optionId} has only ${Math.round(score.coverage * 100)}% weighted evidence coverage.`),
    ];
    if (contest.method === 'star') warnings.push('STAR scores are an official ballot draft, not a claim about a single-voter runoff result.');
    if (translation.close) warnings.push('A score margin under 0.25 crosses a selection or ranking boundary; resolve this close call explicitly.');
    return {
      contestId: contest.id,
      status: researchNeeded ? 'research-needed' : translation.close ? 'close-call' : 'ready',
      optionScores,
      translated: researchNeeded ? null : translation.mark,
      explanation: explanationFor(contest, optionScores, profile),
      warnings,
    };
  });
  return DraftBallotSchema.parse({
    version: DRAFT_VERSION,
    algorithmVersion: ALGORITHM_VERSION,
    profileId: profile.id,
    electionId: election.id,
    mappingId: mapping.id,
    contests,
    generatedAt,
  });
}

export function effectiveMark(draft: ContestDraft, decision?: { override: BallotMark | null }): BallotMark | null {
  return decision?.override ?? draft.translated;
}
