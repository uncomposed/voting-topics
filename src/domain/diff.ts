import type { PeerGuide } from './schema';

export interface SemanticDiff {
  topicRatings: string[];
  mappings: string[];
  generatedScores: string[];
  translatedBallot: string[];
  overrides: string[];
  explanations: string[];
}

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter((key) => object[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(',')}}`;
}

export function diffGuides(parent: PeerGuide, current: PeerGuide): SemanticDiff {
  const result: SemanticDiff = { topicRatings: [], mappings: [], generatedScores: [], translatedBallot: [], overrides: [], explanations: [] };
  const parentTopics = new Map(parent.profile.topics.map((topic) => [topic.id, topic]));
  for (const topic of current.profile.topics) {
    const before = parentTopics.get(topic.id);
    if (!before) result.topicRatings.push(`Added topic: ${topic.title}`);
    else if (before.stars !== topic.stars) result.topicRatings.push(`${topic.title}: ${before.stars} → ${topic.stars} stars`);
    else if (before.title !== topic.title) result.topicRatings.push(`Reworded topic: ${before.title} → ${topic.title}`);
  }
  const parentMaps = new Map(parent.mapping.contests.map((contest) => [contest.contestId, contest]));
  for (const contest of current.mapping.contests) {
    if (stable(parentMaps.get(contest.contestId)) !== stable(contest)) result.mappings.push(`Evidence map changed: ${contest.contestId}`);
  }
  const parentDrafts = new Map(parent.draft.contests.map((contest) => [contest.contestId, contest]));
  for (const contest of current.draft.contests) {
    const before = parentDrafts.get(contest.contestId);
    if (!before) continue;
    if (stable(before.optionScores) !== stable(contest.optionScores)) result.generatedScores.push(`Scores changed: ${contest.contestId}`);
    if (stable(before.translated) !== stable(contest.translated)) result.translatedBallot.push(`Draft ballot changed: ${contest.contestId}`);
    if (before.explanation !== contest.explanation) result.explanations.push(`Explanation changed: ${contest.contestId}`);
  }
  const parentDecisions = new Map(parent.decisions.map((decision) => [decision.contestId, decision]));
  for (const decision of current.decisions) {
    if (stable(parentDecisions.get(decision.contestId)?.override) !== stable(decision.override)) result.overrides.push(`Override changed: ${decision.contestId}`);
  }
  return result;
}

export function summarizeDiff(diff: SemanticDiff): string[] {
  return Object.values(diff).flat();
}
