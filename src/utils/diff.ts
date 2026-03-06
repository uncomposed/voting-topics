import type { PreferenceSet, Topic, Item } from '../schema';
import type { PreferenceSetDiff, TopicDiff, DirectionDiff, PriorityComparison } from '../types/diff';
import { coerceItems, getItemsForTopic } from './items';

const normalize = (value: string) => value.toLowerCase().trim();

const findTopicByTitle = (topics: Topic[], title: string): Topic | undefined =>
  topics.find((topic) => normalize(topic.title) === normalize(title));

const findItemByText = (items: Item[], text: string): Item | undefined =>
  items.find((item) => normalize(item.text) === normalize(text));

const findItemById = (items: Item[], id?: string): Item | undefined =>
  id ? items.find((item) => item.id === id) : undefined;

const itemsEqual = (left: Item, right: Item): boolean =>
  left.text === right.text &&
  left.stars === right.stars &&
  left.notes === right.notes;

const topicsEqual = (left: Topic, right: Topic, leftItems: Item[], rightItems: Item[]): boolean => {
  if (left.title !== right.title) return false;
  if (left.importance !== right.importance) return false;
  if ((left.notes || '') !== (right.notes || '')) return false;

  const leftTopicItems = getItemsForTopic(leftItems, left.id);
  const rightTopicItems = getItemsForTopic(rightItems, right.id);
  if (leftTopicItems.length !== rightTopicItems.length) return false;

  for (const leftItem of leftTopicItems) {
    const rightItem = findItemById(rightTopicItems, leftItem.id) || findItemByText(rightTopicItems, leftItem.text);
    if (!rightItem || !itemsEqual(leftItem, rightItem)) return false;
  }

  return true;
};

const computeTopicDiff = (left: Topic, right: Topic, leftItems: Item[], rightItems: Item[]): TopicDiff => {
  const leftTopicItems = getItemsForTopic(leftItems, left.id);
  const rightTopicItems = getItemsForTopic(rightItems, right.id);
  const itemDiffs: DirectionDiff[] = [];
  const added: Item[] = [];
  const removed: Item[] = [];
  const unchanged: Item[] = [];

  for (const leftItem of leftTopicItems) {
    const rightItem = findItemById(rightTopicItems, leftItem.id) || findItemByText(rightTopicItems, leftItem.text);
    if (!rightItem) {
      removed.push(leftItem);
    } else if (itemsEqual(leftItem, rightItem)) {
      unchanged.push(leftItem);
    } else {
      itemDiffs.push({
        direction: rightItem,
        changes: {
          text: { left: leftItem.text, right: rightItem.text },
          stars: { left: leftItem.stars, right: rightItem.stars },
          notes: { left: leftItem.notes || '', right: rightItem.notes || '' },
        },
        hasChanges: true,
      });
    }
  }

  for (const rightItem of rightTopicItems) {
    const leftItem = findItemById(leftTopicItems, rightItem.id) || findItemByText(leftTopicItems, rightItem.text);
    if (!leftItem) added.push(rightItem);
  }

  return {
    topic: { ...right, directions: rightTopicItems },
    changes: {
      importance: { left: left.importance, right: right.importance },
      directions: {
        added,
        removed,
        modified: itemDiffs,
        unchanged,
      },
      notes: { left: left.notes || '', right: right.notes || '' },
    },
    hasChanges:
      left.importance !== right.importance ||
      (left.notes || '') !== (right.notes || '') ||
      itemDiffs.length > 0 ||
      added.length > 0 ||
      removed.length > 0,
  };
};

export const computePreferenceSetDiff = (leftPreferenceSet: PreferenceSet, rightPreferenceSet: PreferenceSet): PreferenceSetDiff => {
  const leftItems = coerceItems(leftPreferenceSet.items, leftPreferenceSet.topics);
  const rightItems = coerceItems(rightPreferenceSet.items, rightPreferenceSet.topics);
  const addedTopics: Topic[] = [];
  const removedTopics: Topic[] = [];
  const modifiedTopics: TopicDiff[] = [];
  const unchangedTopics: Topic[] = [];

  for (const rightTopic of rightPreferenceSet.topics) {
    const leftTopic = findTopicByTitle(leftPreferenceSet.topics, rightTopic.title);
    if (leftTopic) {
      if (topicsEqual(leftTopic, rightTopic, leftItems, rightItems)) {
        unchangedTopics.push({ ...rightTopic, directions: getItemsForTopic(rightItems, rightTopic.id) });
      } else {
        modifiedTopics.push(computeTopicDiff(leftTopic, rightTopic, leftItems, rightItems));
      }
    } else {
      addedTopics.push({ ...rightTopic, directions: getItemsForTopic(rightItems, rightTopic.id) });
    }
  }

  for (const leftTopic of leftPreferenceSet.topics) {
    const rightTopic = findTopicByTitle(rightPreferenceSet.topics, leftTopic.title);
    if (!rightTopic) removedTopics.push({ ...leftTopic, directions: getItemsForTopic(leftItems, leftTopic.id) });
  }

  return {
    title: {
      left: leftPreferenceSet.title,
      right: rightPreferenceSet.title,
    },
    topics: {
      added: addedTopics,
      removed: removedTopics,
      modified: modifiedTopics,
      unchanged: unchangedTopics,
    },
    summary: {
      totalTopics: Math.max(leftPreferenceSet.topics.length, rightPreferenceSet.topics.length),
      addedCount: addedTopics.length,
      removedCount: removedTopics.length,
      modifiedCount: modifiedTopics.length,
      unchangedCount: unchangedTopics.length,
    },
  };
};

export const computePriorityComparison = (leftPreferenceSet: PreferenceSet, rightPreferenceSet: PreferenceSet): PriorityComparison[] => {
  const allTopics = new Map<string, { title: string; left?: Topic; right?: Topic }>();
  for (const topic of leftPreferenceSet.topics) allTopics.set(topic.title, { title: topic.title, left: topic });
  for (const topic of rightPreferenceSet.topics) {
    const existing = allTopics.get(topic.title);
    if (existing) existing.right = topic;
    else allTopics.set(topic.title, { title: topic.title, right: topic });
  }

  return Array.from(allTopics.values()).map(({ title, left, right }) => ({
    topicId: left?.id || right?.id || title,
    topicTitle: title,
    leftImportance: left?.importance || 0,
    rightImportance: right?.importance || 0,
    importanceDiff: (right?.importance || 0) - (left?.importance || 0),
  }));
};

export const computeTemplateDiff = computePreferenceSetDiff;
