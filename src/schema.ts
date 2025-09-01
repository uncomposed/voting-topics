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

export const TemplateSchema = z.object({
  version: z.literal('tsb.v1'), // Updated version
  title: z.string().min(1, 'Template title required'),
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

export const LegacyTemplateSchema = z.object({
  version: z.literal('tsb.v0'),
  title: z.string().min(1, 'Template title required'),
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
export type Template = z.infer<typeof TemplateSchema>;

// Legacy types for migration
export type DirectionScale = z.infer<typeof DirectionScale>;
export type LegacyTopic = z.infer<typeof LegacyTopicSchema>;
export type LegacyTemplate = z.infer<typeof LegacyTemplateSchema>;

// Migration: v0 -> v1
export const migrateV0toV1 = (legacy: LegacyTemplate): Template => {
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
  return TemplateSchema.parse(candidate);
};

// Parse any incoming template JSON (v1 or legacy v0)
export const parseIncomingTemplate = (data: unknown): Template => {
  // Fast-path v1
  const maybeVersion = (data as any)?.version;
  if (maybeVersion === 'tsb.v1') {
    return TemplateSchema.parse(data);
  }
  if (maybeVersion === 'tsb.v0') {
    const legacy = LegacyTemplateSchema.parse(data);
    return migrateV0toV1(legacy);
  }
  // Try strict v1, otherwise try legacy
  try {
    return TemplateSchema.parse(data);
  } catch (v1Error) {
    const legacy = LegacyTemplateSchema.parse(data);
    return migrateV0toV1(legacy);
  }
};
