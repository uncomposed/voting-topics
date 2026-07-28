import { z } from 'zod';
import { generateDraft } from './scoring';
import {
  ContestDecisionSchema,
  ElectionWorkspaceSchema,
  PROFILE_VERSION,
  TopicProfileSchema,
  newId,
  upgradeElection,
  upgradeElectionMap,
  upgradeTopicProfile,
  type ElectionTemplate,
  type ElectionWorkspace,
  type Source,
  type Topic,
  type TopicProfile,
} from './schema';

type RecordLike = Record<string, unknown>;

export interface MigrationPreview {
  detectedVersion: 'tsb.v0' | 'tsb.v1' | 'tsb.v2';
  profile: TopicProfile;
  warnings: string[];
  discardedCategoryImportance: Array<{ category: string; importance: number }>;
}

export interface PrototypeMigrationPreview {
  profiles: TopicProfile[];
  elections: ElectionTemplate[];
  workspaces: ElectionWorkspace[];
  warnings: string[];
}

const PrototypeWorkspaceSchema = z.object({
  id: z.string().trim().min(1),
  election: z.unknown(),
  mapping: z.unknown(),
  decisions: z.array(ContestDecisionSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

function record(value: unknown): RecordLike {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Legacy data is not an object.');
  return value as RecordLike;
}

function array(value: unknown): RecordLike[] {
  return Array.isArray(value) ? value.filter((item): item is RecordLike => Boolean(item && typeof item === 'object' && !Array.isArray(item))) : [];
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function stars(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(5, Math.round(value))) : 0;
}

function sources(value: unknown, prefix: string): Source[] {
  return array(value).flatMap((source, index) => {
    const url = text(source.url);
    const label = text(source.label, url);
    return /^https?:\/\//u.test(url) && label ? [{ id: `${prefix}-source-${index + 1}`, label, url }] : [];
  });
}

function unwrap(input: unknown): RecordLike {
  const outer = record(input);
  return outer.state && typeof outer.state === 'object' ? record(outer.state) : outer;
}

export function previewLegacyConversion(input: unknown, now = new Date().toISOString()): MigrationPreview {
  const data = unwrap(input);
  const version = data.version;
  if (version !== 'tsb.v0' && version !== 'tsb.v1' && version !== 'tsb.v2') throw new Error('Only tsb.v0, tsb.v1, and tsb.v2 can be converted.');
  const legacyTopics = array(data.topics);
  const warnings: string[] = [];
  const discardedCategoryImportance = legacyTopics.map((topic) => ({ category: text(topic.title, 'Untitled category'), importance: stars(topic.importance) }));
  const converted: Topic[] = [];

  const addItem = (item: RecordLike, categories: string[], fallbackStars = 0) => {
    const title = text(item.text) || text(item.title) || text(item.custom);
    if (!title) return;
    const category = categories[0];
    if (categories.length > 1) warnings.push(`“${title}” belonged to multiple old categories; “${category}” is retained as presentation metadata.`);
    converted.push({
      id: text(item.id, newId('topic')),
      title,
      stars: stars(item.stars ?? fallbackStars),
      category: category || undefined,
      notes: text(item.notes) || undefined,
      sources: sources(item.sources, text(item.id, `topic-${converted.length + 1}`)),
    });
  };

  if (version === 'tsb.v2') {
    const titleById = new Map(legacyTopics.map((topic) => [text(topic.id), text(topic.title)]));
    const items = array(data.items);
    for (const item of items) {
      const categories = Array.isArray(item.topicIds) ? item.topicIds.map((id) => titleById.get(text(id))).filter((title): title is string => Boolean(title)) : [];
      addItem(item, categories);
    }
    for (const topic of legacyTopics) {
      const topicId = text(topic.id);
      const hasItem = items.some((item) => Array.isArray(item.topicIds) && item.topicIds.some((id) => text(id) === topicId));
      if (!hasItem) {
        addItem({ id: topic.id, text: topic.title, stars: topic.importance, notes: topic.notes, sources: topic.sources }, []);
        warnings.push(`“${text(topic.title)}” had no specific item; it was converted as a topic and needs specificity review.`);
      }
    }
  } else if (version === 'tsb.v1') {
    for (const topic of legacyTopics) {
      const directions = array(topic.directions);
      if (directions.length) directions.forEach((direction) => addItem(direction, [text(topic.title)], stars(topic.importance)));
      else {
        addItem({ id: topic.id, text: topic.title, stars: topic.importance, notes: topic.notes, sources: topic.sources }, []);
        warnings.push(`“${text(topic.title)}” had no direction; it needs specificity review.`);
      }
    }
  } else {
    for (const topic of legacyTopics) {
      const direction = topic.direction && typeof topic.direction === 'object' ? record(topic.direction) : {};
      const custom = text(direction.custom);
      addItem({ id: topic.id, text: custom || topic.title, stars: topic.importance, notes: topic.notes, sources: topic.sources }, custom ? [text(topic.title)] : []);
      if (!custom) warnings.push(`“${text(topic.title)}” had no custom direction; it needs specificity review.`);
    }
  }
  warnings.push('Old category importance was not multiplied into topic stars; it is preserved in this report only.');
  return {
    detectedVersion: version,
    profile: TopicProfileSchema.parse({
      version: PROFILE_VERSION,
      id: newId('profile'),
      title: text(data.title, 'Converted topic profile'),
      ownerLabel: undefined,
      topics: converted,
      authorship: { kind: 'import' },
      createdAt: now,
      updatedAt: now,
    }),
    warnings,
    discardedCategoryImportance,
  };
}

export function previewLegacyRaw(raw: string, now?: string): MigrationPreview {
  return previewLegacyConversion(JSON.parse(raw), now);
}

function parseRawArray(raw: string | null, label: string): unknown[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${label} is not an array.`);
  return parsed;
}

/**
 * Converts the corrected Gate 1 prototype's embedded-election workspaces into the
 * normalized MVP library. This is deliberately preview-only: callers must make a
 * separate, explicit atomic acceptance call after showing the returned artifacts.
 */
export function previewPrototypeConversion(profileRaw: string | null, workspaceRaw: string | null, now = new Date().toISOString()): PrototypeMigrationPreview {
  const profiles = parseRawArray(profileRaw, 'Prototype profile storage').map(upgradeTopicProfile);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  if (profileById.size !== profiles.length) throw new Error('Prototype profiles contain duplicate ids.');

  const electionsById = new Map<string, ElectionTemplate>();
  const workspaces = parseRawArray(workspaceRaw, 'Prototype workspace storage').map((input, index) => {
    const legacy = PrototypeWorkspaceSchema.parse(input);
    const election = upgradeElection(legacy.election, now);
    const mapping = upgradeElectionMap(legacy.mapping, now);
    const profile = profileById.get(mapping.profileId);
    if (!profile) throw new Error(`Prototype workspace ${index + 1} refers to missing profile “${mapping.profileId}”.`);
    if (mapping.electionId !== election.id) throw new Error(`Prototype workspace ${index + 1} has conflicting election references.`);

    const previousElection = electionsById.get(election.id);
    if (previousElection && JSON.stringify(previousElection) !== JSON.stringify(election)) {
      throw new Error(`Prototype workspaces contain conflicting copies of election “${election.id}”.`);
    }
    electionsById.set(election.id, election);

    return ElectionWorkspaceSchema.parse({
      id: legacy.id,
      profileId: profile.id,
      electionId: election.id,
      mapping,
      draft: generateDraft(profile, election, mapping, now),
      decisions: legacy.decisions,
      createdAt: legacy.createdAt,
      updatedAt: now,
    });
  });

  return {
    profiles,
    elections: [...electionsById.values()],
    workspaces,
    warnings: [
      'Prototype candidate research is retained as imported, human-verified evidence.',
      'Prototype contests return to draft verification because they did not record official election sources.',
      'The exact prototype storage remains untouched after acceptance.',
    ],
  };
}
