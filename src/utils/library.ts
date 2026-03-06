import type { PreferenceSet } from '../schema';
import starterPackData from '../../starter-pack.v2.4.json';
import type { StarterPackJson } from '../types';

type Stars = number;
export type PrefMap = Record<string, Record<string, Stars>>;

const sp: StarterPackJson = starterPackData;
const starterItems = sp.items ?? (sp.topics || []).flatMap((topic) =>
  (topic.directions || []).map((direction) => ({
    id: direction.id,
    text: direction.text,
    topicIds: direction.topicIds?.length ? direction.topicIds : [topic.id],
  })),
);

export const buildPreferenceSetFromPrefs = (title: string, prefs: PrefMap, notes: string = ''): PreferenceSet => {
  const now = new Date().toISOString();
  const topics = (sp.topics || []).map((topic) => {
    const prefForTopic = prefs[topic.id] || {};
    const importance = starterItems
      .filter((item) => (item.topicIds || []).includes(topic.id))
      .reduce((max, item) => Math.max(max, Number(prefForTopic[item.id] ?? 0)), 0);
    return {
      id: topic.id,
      title: topic.title,
      importance,
      stance: 'neutral' as const,
      notes: '',
      sources: [] as Array<{ label: string; url: string }>,
      relations: { broader: [], narrower: [], related: [] },
    };
  });

  const items = starterItems.map((item) => {
    const firstTopicId = item.topicIds?.[0] || '';
    const prefForTopic = prefs[firstTopicId] || {};
    return {
      id: item.id,
      text: item.text,
      stars: Math.max(0, Math.min(5, Number(prefForTopic[item.id] ?? 0))),
      notes: '',
      sources: [] as Array<{ label: string; url: string }>,
      topicIds: item.topicIds || [],
      tags: [] as string[],
    };
  });

  const hydratedTopics = topics.map((topic) => ({
    ...topic,
    directions: items.filter((item) => item.topicIds.includes(topic.id)),
  }));

  return {
    version: 'tsb.v1' as 'tsb.v2',
    title,
    notes,
    topics: hydratedTopics,
    items,
    createdAt: now,
    updatedAt: now,
  };
};
