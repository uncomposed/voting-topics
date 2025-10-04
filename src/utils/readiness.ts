import type { Topic, Ballot } from '../schema';

export const isPreferenceExportReady = (topics: Topic[]): boolean => {
  const hasTopics = topics.length > 0;
  const hasAnyDirection = topics.some(t => t.directions.length > 0);
  const hasAnyRatedDirection = topics.some(t => t.directions.some(d => d.stars > 0));
  return Boolean(hasTopics && hasAnyDirection && hasAnyRatedDirection);
};

export const isBallotShareReady = (ballot: Ballot | null | undefined): boolean => {
  if (!ballot) return false;
  const allOfficesRated = ballot.offices.length > 0 && ballot.offices.every(o => o.candidates.some(c => (c.score ?? 0) > 0));
  const allMeasuresPositioned = ballot.measures.every(m => !!m.position);
  return allOfficesRated && allMeasuresPositioned;
};
