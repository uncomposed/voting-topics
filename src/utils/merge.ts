import type { PreferenceSet, Topic, Item } from '../schema';
import { coerceItems } from './items';

const normalize = (value: string) => value.trim().toLowerCase();

const normalizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  } catch {
    return url.trim().replace(/\/+$/, '');
  }
};

const mergeTopic = (current: Topic, incoming: Topic): Topic => ({
  ...current,
  title: current.title || incoming.title,
  notes: current.notes && incoming.notes && normalize(current.notes) !== normalize(incoming.notes)
    ? `${current.notes}\n\n— Imported —\n${incoming.notes}`
    : (current.notes ?? incoming.notes),
  sources: (() => {
    const seen = new Set<string>();
    return [...(current.sources || []), ...(incoming.sources || [])].filter((source) => {
      const key = `${source.label}|${normalizeUrl(source.url || '')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })(),
});

const mergeItem = (current: Item, incoming: Item): Item => ({
  ...current,
  text: incoming.text || current.text,
  stars: typeof incoming.stars === 'number' ? incoming.stars : current.stars,
  notes: incoming.notes ?? current.notes,
  sources: incoming.sources?.length ? incoming.sources : current.sources,
  topicIds: Array.from(new Set([...(current.topicIds || []), ...(incoming.topicIds || [])])),
  tags: Array.from(new Set([...(current.tags || []), ...(incoming.tags || [])])),
});

export const mergePreferenceSets = (current: PreferenceSet, incoming: PreferenceSet): PreferenceSet => {
  const currentItems = coerceItems(current.items, current.topics);
  const incomingItems = coerceItems(incoming.items, incoming.topics);
  const currentTopicsById = new Map(current.topics.map((topic) => [topic.id, topic]));
  const currentTopicsByTitle = new Map(current.topics.map((topic) => [normalize(topic.title), topic]));
  const mergedTopics = [...current.topics];
  const topicIdRemap = new Map<string, string>();
  for (const incomingTopic of incoming.topics) {
    const match = currentTopicsById.get(incomingTopic.id) || currentTopicsByTitle.get(normalize(incomingTopic.title));
    if (match) {
      const idx = mergedTopics.findIndex((topic) => topic.id === match.id);
      mergedTopics[idx] = mergeTopic(match, incomingTopic);
      topicIdRemap.set(incomingTopic.id, match.id);
    } else {
      mergedTopics.push(incomingTopic);
      topicIdRemap.set(incomingTopic.id, incomingTopic.id);
    }
  }

  const mergedItems = [...currentItems];
  for (const incomingItem of incomingItems) {
    const remappedItem: Item = {
      ...incomingItem,
      topicIds: (incomingItem.topicIds || []).map((topicId) => topicIdRemap.get(topicId) || topicId),
    };
    const idx = mergedItems.findIndex((item) => item.id === remappedItem.id || normalize(item.text) === normalize(remappedItem.text));
    if (idx >= 0) mergedItems[idx] = mergeItem(mergedItems[idx], remappedItem);
    else mergedItems.push(remappedItem);
  }

  return {
    version: 'tsb.v2',
    title: current.title,
    notes: current.notes,
    topics: mergedTopics.map((topic) => ({
      ...topic,
      directions: mergedItems.filter((item) => item.topicIds.includes(topic.id)),
    })),
    items: mergedItems,
    createdAt: current.createdAt,
    updatedAt: incoming.updatedAt || new Date().toISOString(),
  };
};

export const mergePreferenceSetsSelective = (
  current: PreferenceSet,
  incoming: PreferenceSet,
  acceptTitles: Set<string>,
): PreferenceSet => {
  const accepted = new Set(Array.from(acceptTitles).map(normalize));
  const filteredIncomingTopics = incoming.topics.filter((topic) => accepted.has(normalize(topic.title)));
  const filteredIncomingTopicIds = new Set(filteredIncomingTopics.map((topic) => topic.id));
  const filteredIncomingItems = coerceItems(incoming.items, incoming.topics).filter((item) =>
    item.topicIds.some((topicId) => filteredIncomingTopicIds.has(topicId)),
  );
  return mergePreferenceSets(current, {
    ...incoming,
    topics: filteredIncomingTopics,
    items: filteredIncomingItems,
  });
};
