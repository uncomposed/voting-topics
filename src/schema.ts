import { z } from 'zod';

export const DirectionScale = z.union([
  z.literal(-2), // Strongly Against
  z.literal(-1), // Lean Against
  z.literal(0),  // Neutral
  z.literal(1),  // Lean For
  z.literal(2),  // Strongly For
]);

export const SourceSchema = z.object({
  label: z.string().min(1, 'Label required'),
  url: z.string().url('Valid URL required'),
});

export const TopicSchema = z.object({
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

export const TemplateSchema = z.object({
  version: z.literal('tsb.v0'),
  title: z.string().min(1, 'Template title required'),
  notes: z.string().optional(),
  topics: z.array(TopicSchema).min(1, 'At least one topic'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DirectionScale = z.infer<typeof DirectionScale>;
export type Source = z.infer<typeof SourceSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Template = z.infer<typeof TemplateSchema>;
