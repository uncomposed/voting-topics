import { z } from 'zod';
import { uid } from './utils';
import { ItemSchema, SourceSchema, Stance, TopicRelations, TopicSchema, type Item, type Source, type Topic } from './schema';


export const PreferencePatchOperationSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('create_topic'),
    id: z.string().min(1).optional(),
    title: z.string().min(1),
    importance: z.number().int().min(0).max(5).default(3),
    stance: Stance.default('neutral'),
    notes: z.string().optional(),
    sources: z.array(SourceSchema).max(5).default([]),
    relations: TopicRelations.default({ broader: [], narrower: [], related: [] }),
  }),
  z.object({
    op: z.literal('update_topic'),
    topicId: z.string().min(1),
    title: z.string().min(1).optional(),
    importance: z.number().int().min(0).max(5).optional(),
    stance: Stance.optional(),
    notes: z.string().optional(),
    relations: TopicRelations.optional(),
  }),
  z.object({
    op: z.literal('create_item'),
    id: z.string().min(1).optional(),
    text: z.string().min(1),
    stars: z.number().int().min(0).max(5).default(0),
    notes: z.string().optional(),
    sources: z.array(SourceSchema).default([]),
    topicIds: z.array(z.string().min(1)).default([]),
    tags: z.array(z.string().min(1)).default([]),
  }),
  z.object({
    op: z.literal('update_item'),
    itemId: z.string().min(1),
    text: z.string().min(1).optional(),
    stars: z.number().int().min(0).max(5).optional(),
    notes: z.string().optional(),
    topicIds: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),
  }),
  z.object({ op: z.literal('add_topic_source'), topicId: z.string().min(1), source: SourceSchema }),
  z.object({ op: z.literal('add_item_source'), itemId: z.string().min(1), source: SourceSchema }),
  z.object({ op: z.literal('add_item_tag'), itemId: z.string().min(1), tag: z.string().min(1) }),
  z.object({ op: z.literal('tag_item_to_topic'), itemId: z.string().min(1), topicId: z.string().min(1) }),
  z.object({ op: z.literal('remove_item_tag'), itemId: z.string().min(1), tag: z.string().min(1) }),
  z.object({ op: z.literal('remove_item_from_topic'), itemId: z.string().min(1), topicId: z.string().min(1) }),
  z.object({ op: z.literal('delete_topic'), topicId: z.string().min(1) }),
  z.object({ op: z.literal('delete_item'), itemId: z.string().min(1) }),
  z.object({ op: z.literal('noop'), reason: z.string().min(1) }),
]);

export const PreferencePatchSchema = z.object({
  version: z.literal('tsb.patch.v1'),
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  operations: z.array(PreferencePatchOperationSchema).min(1),
});

export type PreferencePatch = z.infer<typeof PreferencePatchSchema>;
export type PreferencePatchOperation = z.infer<typeof PreferencePatchOperationSchema>;

export interface PatchState {
  topics: Topic[];
  items: Item[];
}

export interface PatchResult extends PatchState {
  applied: string[];
  skipped: string[];
}

const sameSource = (a: Source, b: Source) => a.url === b.url || (a.label === b.label && a.url === b.url);
const unique = <T,>(values: T[]) => Array.from(new Set(values));

export const describePatchOperation = (operation: PreferencePatchOperation): string => {
  switch (operation.op) {
    case 'create_topic': return `Create topic “${operation.title}”`;
    case 'update_topic': return `Update topic ${operation.topicId}`;
    case 'create_item': return `Create item “${operation.text}”`;
    case 'update_item': return `Update item ${operation.itemId}`;
    case 'add_topic_source': return `Add source to topic ${operation.topicId}`;
    case 'add_item_source': return `Add source to item ${operation.itemId}`;
    case 'add_item_tag': return `Add tag “${operation.tag}” to item ${operation.itemId}`;
    case 'tag_item_to_topic': return `Connect item ${operation.itemId} to topic ${operation.topicId}`;
    case 'remove_item_tag': return `Remove tag “${operation.tag}” from item ${operation.itemId}`;
    case 'remove_item_from_topic': return `Remove item ${operation.itemId} from topic ${operation.topicId}`;
    case 'delete_topic': return `Delete topic ${operation.topicId}`;
    case 'delete_item': return `Delete item ${operation.itemId}`;
    case 'noop': return `No change: ${operation.reason}`;
  }
};

export const parsePreferencePatch = (data: unknown): PreferencePatch => PreferencePatchSchema.parse(data);

export const applyPreferencePatch = (state: PatchState, patch: PreferencePatch): PatchResult => {
  let topics = state.topics.map((topic) => ({ ...topic, sources: [...(topic.sources || [])] }));
  let items = state.items.map((item) => ({ ...item, sources: [...(item.sources || [])], topicIds: [...(item.topicIds || [])], tags: [...(item.tags || [])] }));
  const applied: string[] = [];
  const skipped: string[] = [];

  const topicExists = (id: string) => topics.some((topic) => topic.id === id);
  const itemExists = (id: string) => items.some((item) => item.id === id);

  for (const operation of patch.operations) {
    const description = describePatchOperation(operation);
    switch (operation.op) {
      case 'create_topic': {
        const id = operation.id || uid();
        if (topicExists(id)) { skipped.push(`${description} (topic already exists)`); break; }
        topics = [...topics, TopicSchema.parse({ ...operation, op: undefined, id })];
        applied.push(description);
        break;
      }
      case 'update_topic': {
        if (!topicExists(operation.topicId)) { skipped.push(`${description} (topic not found)`); break; }
        topics = topics.map((topic) => topic.id === operation.topicId ? TopicSchema.parse({ ...topic, ...operation, id: topic.id, op: undefined, topicId: undefined }) : topic);
        applied.push(description);
        break;
      }
      case 'create_item': {
        const id = operation.id || uid();
        if (itemExists(id)) { skipped.push(`${description} (item already exists)`); break; }
        const topicIds = operation.topicIds.filter(topicExists);
        items = [...items, ItemSchema.parse({ ...operation, op: undefined, id, topicIds })];
        applied.push(description);
        break;
      }
      case 'update_item': {
        if (!itemExists(operation.itemId)) { skipped.push(`${description} (item not found)`); break; }
        items = items.map((item) => item.id === operation.itemId ? ItemSchema.parse({ ...item, ...operation, id: item.id, op: undefined, itemId: undefined, topicIds: operation.topicIds?.filter(topicExists) ?? item.topicIds }) : item);
        applied.push(description);
        break;
      }
      case 'add_topic_source': {
        if (!topicExists(operation.topicId)) { skipped.push(`${description} (topic not found)`); break; }
        topics = topics.map((topic) => topic.id === operation.topicId && !topic.sources.some((source) => sameSource(source, operation.source))
          ? { ...topic, sources: [...topic.sources, operation.source].slice(0, 5) }
          : topic);
        applied.push(description);
        break;
      }
      case 'add_item_source': {
        if (!itemExists(operation.itemId)) { skipped.push(`${description} (item not found)`); break; }
        items = items.map((item) => item.id === operation.itemId && !item.sources.some((source) => sameSource(source, operation.source)) ? { ...item, sources: [...item.sources, operation.source] } : item);
        applied.push(description);
        break;
      }
      case 'add_item_tag': {
        if (!itemExists(operation.itemId)) { skipped.push(`${description} (item not found)`); break; }
        items = items.map((item) => item.id === operation.itemId ? { ...item, tags: unique([...item.tags, operation.tag]) } : item);
        applied.push(description);
        break;
      }
      case 'tag_item_to_topic': {
        if (!itemExists(operation.itemId) || !topicExists(operation.topicId)) { skipped.push(`${description} (item or topic not found)`); break; }
        items = items.map((item) => item.id === operation.itemId ? { ...item, topicIds: unique([...item.topicIds, operation.topicId]) } : item);
        applied.push(description);
        break;
      }
      case 'remove_item_tag': {
        if (!itemExists(operation.itemId)) { skipped.push(`${description} (item not found)`); break; }
        items = items.map((item) => item.id === operation.itemId ? { ...item, tags: item.tags.filter((tag) => tag !== operation.tag) } : item);
        applied.push(description);
        break;
      }
      case 'remove_item_from_topic': {
        if (!itemExists(operation.itemId)) { skipped.push(`${description} (item not found)`); break; }
        items = items.map((item) => item.id === operation.itemId ? { ...item, topicIds: item.topicIds.filter((id) => id !== operation.topicId) } : item);
        applied.push(description);
        break;
      }
      case 'delete_topic': {
        if (!topicExists(operation.topicId)) { skipped.push(`${description} (topic not found)`); break; }
        topics = topics.filter((topic) => topic.id !== operation.topicId);
        items = items.map((item) => ({ ...item, topicIds: item.topicIds.filter((id) => id !== operation.topicId) }));
        applied.push(description);
        break;
      }
      case 'delete_item': {
        if (!itemExists(operation.itemId)) { skipped.push(`${description} (item not found)`); break; }
        items = items.filter((item) => item.id !== operation.itemId);
        applied.push(description);
        break;
      }
      case 'noop':
        skipped.push(description);
        break;
    }
  }

  return { topics, items, applied, skipped };
};
