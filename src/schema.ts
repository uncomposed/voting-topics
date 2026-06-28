import { z } from 'zod';
import { uid } from './utils';

export const Stance = z.enum([
  'against',
  'lean_against',
  'neutral',
  'lean_for',
  'for',
]);

export const stanceFromScale = (n: number): z.infer<typeof Stance> => {
  if (n <= -2) return 'against';
  if (n === -1) return 'lean_against';
  if (n === 0) return 'neutral';
  if (n === 1) return 'lean_for';
  return 'for';
};

export const SourceSchema = z.object({
  label: z.string().min(1, 'Label required'),
  url: z.string().url('Valid URL required'),
});

export const ItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Item text required'),
  stars: z.number().int().min(0).max(5).default(0),
  notes: z.string().optional(),
  sources: z.array(SourceSchema).default([]),
  topicIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

// Backward compatibility alias for code paths still named "Direction".
export const Direction = ItemSchema;

export const TopicRelations = z.object({
  broader: z.array(z.string()).default([]),
  narrower: z.array(z.string()).default([]),
  related: z.array(z.string()).default([]),
});

export const TopicSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title required'),
  importance: z.number().min(0).max(5).int(),
  stance: Stance.default('neutral'),
  notes: z.string().optional(),
  sources: z.array(SourceSchema).max(5).default([]),
  relations: TopicRelations.default({ broader: [], narrower: [], related: [] }),
});

export const PreferenceSetSchema = z.object({
  version: z.literal('tsb.v2'),
  title: z.string().min(1, 'Preference set title required'),
  notes: z.string().optional(),
  topics: z.array(TopicSchema).min(1, 'At least one topic'),
  items: z.array(ItemSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Legacy v1 shape (topics own directions)
export const LegacyTopicOwnedTopicSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title required'),
  importance: z.number().min(0).max(5).int(),
  stance: Stance.default('neutral'),
  directions: z.array(ItemSchema.omit({ topicIds: true }).extend({
    tags: z.array(z.string()).default([]),
  })).default([]),
  notes: z.string().optional(),
  sources: z.array(SourceSchema).max(5).default([]),
  relations: TopicRelations.default({ broader: [], narrower: [], related: [] }),
});

export const LegacyTopicOwnedPreferenceSetSchema = z.object({
  version: z.literal('tsb.v1'),
  title: z.string().min(1, 'Preference set title required'),
  notes: z.string().optional(),
  topics: z.array(LegacyTopicOwnedTopicSchema).min(1, 'At least one topic'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const DirectionScale = z.union([
  z.literal(-2),
  z.literal(-1),
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

export const LegacyTopicSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title required'),
  importance: z.number().min(0).max(5).int(),
  mode: z.union([z.literal('scale'), z.literal('custom')]),
  direction: z.object({
    scale: DirectionScale.optional(),
    custom: z.string().optional(),
  }),
  notes: z.string().optional(),
  sources: z.array(SourceSchema).max(5).default([]),
});

export const LegacyPreferenceSetSchema = z.object({
  version: z.literal('tsb.v0'),
  title: z.string().min(1, 'Preference set title required'),
  notes: z.string().optional(),
  topics: z.array(LegacyTopicSchema).min(1, 'At least one topic'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Stance = z.infer<typeof Stance>;
export type Item = z.infer<typeof ItemSchema>;
export type Direction = Item;
export type TopicRelations = z.infer<typeof TopicRelations>;
export type Source = z.infer<typeof SourceSchema>;
export type Topic = z.infer<typeof TopicSchema> & { directions?: Item[] };
export type PreferenceSet = z.infer<typeof PreferenceSetSchema>;
export type TopicView = z.infer<typeof TopicSchema> & { directions: Item[] };

export type DirectionScale = z.infer<typeof DirectionScale>;
export type LegacyTopic = z.infer<typeof LegacyTopicSchema>;
export type LegacyPreferenceSet = z.infer<typeof LegacyPreferenceSetSchema>;
export type LegacyTopicOwnedPreferenceSet = z.infer<typeof LegacyTopicOwnedPreferenceSetSchema>;

export const migrateV0toV2 = (legacy: LegacyPreferenceSet): PreferenceSet => {
  const topics = legacy.topics.map((t) => ({
    id: t.id,
    title: t.title,
    importance: t.importance,
    stance: t.mode === 'scale' && typeof t.direction.scale === 'number'
      ? stanceFromScale(t.direction.scale)
      : 'neutral',
    notes: t.notes || '',
    sources: t.sources || [],
    relations: { broader: [], narrower: [], related: [] },
  }));
  const items = legacy.topics.flatMap((t) => {
    if (t.mode !== 'custom' || !t.direction.custom?.trim()) return [];
    return [{
      id: uid(),
      text: t.direction.custom.trim(),
      stars: 0,
      notes: '',
      sources: [],
      topicIds: [t.id],
      tags: [],
    }];
  });
  return PreferenceSetSchema.parse({
    version: 'tsb.v2',
    title: legacy.title,
    notes: legacy.notes || '',
    topics,
    items,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  });
};

export const migrateV1toV2 = (legacy: LegacyTopicOwnedPreferenceSet): PreferenceSet => {
  const topics = legacy.topics.map((t) => ({
    id: t.id,
    title: t.title,
    importance: t.importance,
    stance: t.stance || 'neutral',
    notes: t.notes || '',
    sources: t.sources || [],
    relations: t.relations || { broader: [], narrower: [], related: [] },
  }));
  const items = legacy.topics.flatMap((t) => (t.directions || []).map((d) => ({
    id: d.id || uid(),
    text: d.text,
    stars: d.stars ?? 0,
    notes: d.notes || '',
    sources: d.sources || [],
    topicIds: [t.id],
    tags: d.tags || [],
  })));
  return PreferenceSetSchema.parse({
    version: 'tsb.v2',
    title: legacy.title,
    notes: legacy.notes || '',
    topics,
    items,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  });
};

export const hydrateTopicsWithItems = (topics: Topic[], items: Item[]): TopicView[] =>
  topics.map((topic) => ({
    ...topic,
    directions: items.filter((item) => item.topicIds.includes(topic.id)),
  }));

export const stripTopicDirections = (topic: Topic): z.infer<typeof TopicSchema> => {
  const next = { ...topic };
  delete next.directions;
  return next;
};

export const serializePreferenceSet = (preferenceSet: PreferenceSet): PreferenceSet => PreferenceSetSchema.parse({
  ...preferenceSet,
  topics: preferenceSet.topics.map((topic) => stripTopicDirections(topic as Topic)),
});

export const parseIncomingPreferenceSet = (data: unknown): PreferenceSet => {
  const getVersion = (d: unknown): string | undefined => {
    if (typeof d === 'object' && d !== null) {
      const v = (d as Record<string, unknown>).version;
      return typeof v === 'string' ? v : undefined;
    }
    return undefined;
  };

  const maybeVersion = getVersion(data);
  if (maybeVersion === 'tsb.v2') {
    return PreferenceSetSchema.parse(data);
  }
  if (maybeVersion === 'tsb.v1') {
    return migrateV1toV2(LegacyTopicOwnedPreferenceSetSchema.parse(data));
  }
  if (maybeVersion === 'tsb.v0') {
    return migrateV0toV2(LegacyPreferenceSetSchema.parse(data));
  }

  try {
    return PreferenceSetSchema.parse(data);
  } catch {
    try {
      return migrateV1toV2(LegacyTopicOwnedPreferenceSetSchema.parse(data));
    } catch {
      return migrateV0toV2(LegacyPreferenceSetSchema.parse(data));
    }
  }
};

export const ElectionInfo = z.object({
  name: z.string().min(1, 'Election name required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  location: z.string().min(1, 'Location required'),
  type: z.enum(['primary', 'general', 'special', 'runoff']),
  jurisdiction: z.string().min(1, 'Jurisdiction required'),
});

export const Candidate = z.object({
  id: z.string(),
  name: z.string().min(1, 'Candidate name required'),
  party: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional(),
  score: z.number().int().min(0).max(5).default(0),
  sources: z.array(SourceSchema).default([]),
});

export const ReasoningLink = z.object({
  type: z.enum(['topic', 'item', 'direction']),
  preferenceSetId: z.string().optional(),
  topicId: z.string().optional(),
  itemId: z.string().optional(),
  directionId: z.string().optional(),
  relevance: z.string().min(1, 'Relevance explanation required'),
  weight: z.number().min(0).max(5).int().default(3),
}).superRefine((value, ctx) => {
  if (value.type === 'topic' && !value.topicId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['topicId'], message: 'Topic required' });
  }
  if (value.type === 'item' && !value.itemId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['itemId'], message: 'Item required' });
  }
  if (value.type === 'direction' && !value.directionId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['directionId'], message: 'Direction required' });
  }
});

export const Office = z.object({
  id: z.string(),
  title: z.string().min(1, 'Office title required'),
  description: z.string().optional(),
  candidates: z.array(Candidate).min(1, 'At least one candidate required'),
  selectedCandidateId: z.string().optional(),
  reasoning: z.array(ReasoningLink).default([]),
});

export const Measure = z.object({
  id: z.string(),
  title: z.string().min(1, 'Measure title required'),
  description: z.string().optional(),
  position: z.enum(['yes', 'no', 'abstain']).optional(),
  reasoning: z.array(ReasoningLink).default([]),
  sources: z.array(SourceSchema).default([]),
});

export const BallotMetadata = z.object({
  preferenceSetId: z.string().optional(),
  notes: z.string().optional(),
  sources: z.array(SourceSchema).default([]),
  tags: z.array(z.string()).default([]),
});

export const BallotSchema = z.object({
  version: z.literal('tsb.ballot.v1'),
  title: z.string().min(1, 'Ballot title required'),
  election: ElectionInfo,
  offices: z.array(Office).min(1, 'At least one office required'),
  measures: z.array(Measure).default([]),
  metadata: BallotMetadata,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ElectionInfo = z.infer<typeof ElectionInfo>;
export type Candidate = z.infer<typeof Candidate>;
export type ReasoningLink = z.infer<typeof ReasoningLink>;
export type Office = z.infer<typeof Office>;
export type Measure = z.infer<typeof Measure>;
export type BallotMetadata = z.infer<typeof BallotMetadata>;
export type Ballot = z.infer<typeof BallotSchema>;

export const parseIncomingBallot = (data: unknown): Ballot => BallotSchema.parse(data);

export const TemplateSchema = PreferenceSetSchema;
export const LegacyTemplateSchema = LegacyPreferenceSetSchema;
export type Template = PreferenceSet;
export type LegacyTemplate = LegacyPreferenceSet;
export const parseIncomingTemplate = parseIncomingPreferenceSet;
