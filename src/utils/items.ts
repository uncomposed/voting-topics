import type { Item, PreferenceSet, Topic, TopicView } from '../schema';
import { hydrateTopicsWithItems } from '../schema';

type TopicWithDirections = Topic & {
  directions?: Array<Partial<Item> & { id?: string; text?: string }>;
};

export const deriveItemsFromTopics = (topics: TopicWithDirections[] = []): Item[] =>
  topics.flatMap((topic) =>
    (topic.directions || []).map((direction) => ({
      id: direction.id || `${topic.id}:${direction.text || 'item'}`,
      text: direction.text || '',
      stars: direction.stars ?? 0,
      notes: direction.notes || '',
      sources: direction.sources || [],
      topicIds: direction.topicIds?.length ? direction.topicIds : [topic.id],
      tags: direction.tags || [],
    })),
  );

export const coerceItems = (
  items: Item[] | undefined,
  topics: TopicWithDirections[] = [],
): Item[] => {
  if (Array.isArray(items) && items.length > 0) return items;
  return deriveItemsFromTopics(topics);
};

export const getItemsForTopic = (items: Item[], topicId: string): Item[] =>
  (items || []).filter((item) => (item.topicIds || []).includes(topicId));

export const getRatedItemsForTopic = (items: Item[], topicId: string): Item[] =>
  getItemsForTopic(items, topicId).filter((item) => item.stars > 0);

export const hydrateTopic = (topic: Topic, items: Item[]): TopicView => ({
  ...topic,
  directions: getItemsForTopic(items, topic.id),
});

export const hydratePreferenceSet = (preferenceSet: PreferenceSet): PreferenceSet & { topics: TopicView[] } => ({
  ...preferenceSet,
  topics: hydrateTopicsWithItems(preferenceSet.topics, coerceItems(preferenceSet.items, preferenceSet.topics)),
});

export const removeTopicFromItem = (item: Item, topicId: string): Item => ({
  ...item,
  topicIds: item.topicIds.filter((id) => id !== topicId),
});

export const tagItemToTopic = (item: Item, topicId: string): Item => ({
  ...item,
  topicIds: item.topicIds.includes(topicId) ? item.topicIds : [...item.topicIds, topicId],
});

export const isStarterBackedTopic = (topic: Topic, starterTopicIds: string[]): boolean =>
  starterTopicIds.includes(topic.id);

export const isStarterBackedItem = (item: Item, starterItemIds: string[]): boolean =>
  starterItemIds.includes(item.id);
