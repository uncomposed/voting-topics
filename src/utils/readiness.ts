import type { Topic, Item, Ballot } from '../schema';

export const isPreferenceExportReady = (topics: Topic[], items: Item[] = []): boolean => {
  const hasTopics = topics.length > 0;
  const hasAnyItem = items.some(item => item.topicIds.length > 0);
  const hasAnyRatedItem = items.some(item => item.stars > 0);
  return Boolean(hasTopics && hasAnyItem && hasAnyRatedItem);
};

export const isBallotShareReady = (ballot: Ballot | null | undefined): boolean => {
  if (!ballot) return false;
  const allOfficesRated = ballot.offices.length > 0 && ballot.offices.every(o => o.candidates.some(c => (c.score ?? 0) > 0));
  const allMeasuresPositioned = ballot.measures.every(m => !!m.position);
  return allOfficesRated && allMeasuresPositioned;
};
