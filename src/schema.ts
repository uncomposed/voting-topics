import { z } from 'zod';
import { uid } from './utils';

// New stance enum replacing the old direction scale
export const Stance = z.enum([
  "against",
  "lean_against", 
  "neutral",
  "lean_for",
  "for"
]);

// Helper function to map legacy numeric scale to stance (for migrations/UX)
export const stanceFromScale = (n: number): z.infer<typeof Stance> => {
  if (n <= -2) return "against";
  if (n === -1) return "lean_against";
  if (n === 0) return "neutral";
  if (n === 1) return "lean_for";
  return "for";
};

export const SourceSchema = z.object({
  label: z.string().min(1, 'Label required'),
  url: z.string().url('Valid URL required'),
});

// New Direction schema for multiple free-form directions per topic
export const Direction = z.object({
  id: z.string(),                 // uuid
  text: z.string().min(1, 'Direction text required'),        // free-form direction/outcome
  stars: z.number().int().min(0).max(5).default(0), // per-direction importance (0-5 stars)
  notes: z.string().optional(),
  sources: z.array(SourceSchema).default([]),
  tags: z.array(z.string()).default([]) // optional loose tags or topic IDs
});

// Topic relations for SKOS-style linking
export const TopicRelations = z.object({
  broader: z.array(z.string()).default([]),
  narrower: z.array(z.string()).default([]),
  related: z.array(z.string()).default([])
});

export const TopicSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title required'),
  importance: z.number().min(0).max(5).int(), // topic-level priority
  stance: Stance.default("neutral"), // topic-level stance
  directions: z.array(Direction).default([]), // multiple directions with their own stars
  notes: z.string().optional(),
  sources: z.array(SourceSchema).max(5),
  relations: TopicRelations.default({ broader: [], narrower: [], related: [] })
});

export const PreferenceSetSchema = z.object({
  version: z.literal('tsb.v1'), // Updated version
  title: z.string().min(1, 'Preference set title required'),
  notes: z.string().optional(),
  topics: z.array(TopicSchema).min(1, 'At least one topic'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Legacy types for backward compatibility during migration
export const DirectionScale = z.union([
  z.literal(-2), // Strongly Against
  z.literal(-1), // Lean Against
  z.literal(0),  // Neutral
  z.literal(1),  // Lean For
  z.literal(2),  // Strongly For
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
  sources: z.array(SourceSchema).max(5),
});

export const LegacyPreferenceSetSchema = z.object({
  version: z.literal('tsb.v0'),
  title: z.string().min(1, 'Preference set title required'),
  notes: z.string().optional(),
  topics: z.array(LegacyTopicSchema).min(1, 'At least one topic'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Export types
export type Stance = z.infer<typeof Stance>;
export type Direction = z.infer<typeof Direction>;
export type TopicRelations = z.infer<typeof TopicRelations>;
export type Source = z.infer<typeof SourceSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type PreferenceSet = z.infer<typeof PreferenceSetSchema>;

// Legacy types for migration
export type DirectionScale = z.infer<typeof DirectionScale>;
export type LegacyTopic = z.infer<typeof LegacyTopicSchema>;
export type LegacyPreferenceSet = z.infer<typeof LegacyPreferenceSetSchema>;

// Migration: v0 -> v1
export const migrateV0toV1 = (legacy: LegacyPreferenceSet): PreferenceSet => {
  const topics = legacy.topics.map(t => {
    const directions = [] as Array<z.infer<typeof Direction>>;
    if (t.mode === 'custom' && t.direction.custom && t.direction.custom.trim().length > 0) {
      directions.push({ id: uid(), text: t.direction.custom.trim(), stars: 0, sources: [], tags: [] });
    }
    const stance = t.mode === 'scale' && typeof t.direction.scale === 'number'
      ? stanceFromScale(t.direction.scale)
      : 'neutral';
    return {
      id: t.id,
      title: t.title,
      importance: t.importance,
      stance,
      directions,
      notes: t.notes || '',
      sources: t.sources || [],
      relations: { broader: [], narrower: [], related: [] }
    } as z.infer<typeof TopicSchema>;
  });
  const candidate = {
    version: 'tsb.v1' as const,
    title: legacy.title,
    notes: legacy.notes || '',
    topics,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  };
  return PreferenceSetSchema.parse(candidate);
};

// Parse any incoming preference set JSON (v1 or legacy v0)
export const parseIncomingPreferenceSet = (data: unknown): PreferenceSet => {
  // Fast-path v1/v0 by safely peeking at `version`
  const getVersion = (d: unknown): string | undefined => {
    if (typeof d === 'object' && d !== null) {
      const v = (d as Record<string, unknown>).version;
      return typeof v === 'string' ? v : undefined;
    }
    return undefined;
  };
  const maybeVersion = getVersion(data);
  if (maybeVersion === 'tsb.v1') {
    return PreferenceSetSchema.parse(data);
  }
  if (maybeVersion === 'tsb.v0') {
    const legacy = LegacyPreferenceSetSchema.parse(data);
    return migrateV0toV1(legacy);
  }
  // Try strict v1, otherwise try legacy
  try {
    return PreferenceSetSchema.parse(data);
  } catch (v1Error) {
    const legacy = LegacyPreferenceSetSchema.parse(data);
    return migrateV0toV1(legacy);
  }
};

// Ballot schemas
export const ElectionInfo = z.object({
  name: z.string().min(1, 'Election name required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  location: z.string().min(1, 'Location required'),
  type: z.enum(['primary', 'general', 'special', 'runoff']),
  jurisdiction: z.string().min(1, 'Jurisdiction required'), // e.g., "City of Portland, OR"
});

export const Candidate = z.object({
  id: z.string(),
  name: z.string().min(1, 'Candidate name required'),
  party: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional(),
  sources: z.array(SourceSchema).default([]),
});

export const ReasoningLink = z.object({
  type: z.enum(['topic', 'direction']),
  preferenceSetId: z.string().optional(), // Reference to the preference set
  topicId: z.string(),
  directionId: z.string().optional(), // Only for direction links
  relevance: z.string().min(1, 'Relevance explanation required'),
  weight: z.number().min(0).max(5).int().default(3), // How important this reasoning is
});

export const Office = z.object({
  id: z.string(),
  title: z.string().min(1, 'Office title required'),
  description: z.string().optional(),
  candidates: z.array(Candidate).min(1, 'At least one candidate required'),
  selectedCandidateId: z.string().optional(), // The user's choice
  reasoning: z.array(ReasoningLink).default([]), // Links to preference set topics/directions
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
  preferenceSetId: z.string().optional(), // Optional reference to source preference set
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

// Ballot types
export type ElectionInfo = z.infer<typeof ElectionInfo>;
export type Candidate = z.infer<typeof Candidate>;
export type ReasoningLink = z.infer<typeof ReasoningLink>;
export type Office = z.infer<typeof Office>;
export type Measure = z.infer<typeof Measure>;
export type BallotMetadata = z.infer<typeof BallotMetadata>;
export type Ballot = z.infer<typeof BallotSchema>;

// Parse incoming ballot JSON
export const parseIncomingBallot = (data: unknown): Ballot => {
  return BallotSchema.parse(data);
};

// Backward compatibility aliases
export const TemplateSchema = PreferenceSetSchema;
export const LegacyTemplateSchema = LegacyPreferenceSetSchema;
export type Template = PreferenceSet;
export type LegacyTemplate = LegacyPreferenceSet;
export const parseIncomingTemplate = parseIncomingPreferenceSet;
