import { DEMO_TEMPLATE } from '../guide/demo';
import {
  createGuideFromTemplate,
  type VoterGuideDraft,
} from '../guide/schema';

export function completeDemoGuide(): VoterGuideDraft {
  const guide = createGuideFromTemplate(DEMO_TEMPLATE);
  const value = { id: 'value-accountability', text: 'More accountable and accessible public services' };
  return {
    ...guide,
    title: 'A practical Example County guide',
    authorLabel: 'A careful neighbor',
    values: [value],
    recommendations: guide.recommendations.map((recommendation) => {
      const shared = {
        rationale:
          'I believe this option offers the clearest, most accountable path while acknowledging real tradeoffs.',
        valueIds: [value.id],
      };
      if (recommendation.kind === 'candidate') {
        const contest = guide.template.contests.find(
          (item) => item.id === recommendation.contestId && item.kind === 'candidate',
        );
        if (!contest || contest.kind !== 'candidate') throw new Error('Fixture contest mismatch.');
        return {
          ...recommendation,
          ...shared,
          candidateIds: contest.candidates.slice(0, contest.maxSelections).map((candidate) => candidate.id),
          ratings: { [contest.candidates[0].id]: 4 },
        };
      }
      return { ...recommendation, ...shared, position: 'yes' as const };
    }),
  };
}
