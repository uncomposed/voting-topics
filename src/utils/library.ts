// Utilities for building PreferenceSets from compact library mappings
import type { PreferenceSet } from '../schema';
import starterPackData from '../../starter-pack.v2.4.json';
import type { StarterPackJson } from '../types';

type Stars = number; // 0..5
export type PrefMap = Record<string, Record<string, Stars>>; // topicId -> directionId -> stars

const sp: StarterPackJson = starterPackData;

export const buildPreferenceSetFromPrefs = (title: string, prefs: PrefMap, notes: string = ''): PreferenceSet => {
  const now = new Date().toISOString();
  const topics = sp.topics.map(t => {
    const prefForTopic = prefs[t.id] || {};
    const directions = (t.directions || []).map(d => ({
      id: d.id,
      text: d.text,
      stars: Math.max(0, Math.min(5, Number(prefForTopic[d.id] ?? 0))) as number,
      sources: [] as { label: string; url: string }[],
      tags: [] as string[],
    }));
    const importance = directions.reduce((m, d) => Math.max(m, d.stars || 0), 0);
    return {
      id: t.id,
      title: t.title,
      importance,
      stance: 'neutral' as const,
      directions,
      notes: '',
      sources: [] as Array<{ label: string; url: string }>,
      relations: { broader: [], narrower: [], related: [] },
    };
  });
  const candidate: PreferenceSet = {
    version: 'tsb.v1',
    title,
    notes,
    topics,
    createdAt: now,
    updatedAt: now,
  };
  return candidate;
};
