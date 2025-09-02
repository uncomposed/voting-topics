import type { Topic, Direction } from '../schema';

export interface PreferenceSetDiff {
  title: {
    left: string;
    right: string;
  };
  topics: {
    added: Topic[];      // Only in right preference set
    removed: Topic[];    // Only in left preference set
    modified: TopicDiff[]; // In both but different
    unchanged: Topic[];  // Identical in both
  };
  summary: {
    totalTopics: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
}

export interface TopicDiff {
  topic: Topic;
  changes: {
    importance: { left: number; right: number };
    directions: {
      added: Direction[];
      removed: Direction[];
      modified: DirectionDiff[];
      unchanged: Direction[];
    };
    notes: { left: string; right: string };
  };
  hasChanges: boolean;
}

export interface DirectionDiff {
  direction: Direction;
  changes: {
    text: { left: string; right: string };
    stars: { left: number; right: number };
    notes: { left: string; right: string };
  };
  hasChanges: boolean;
}

export interface PriorityComparison {
  topicId: string;
  topicTitle: string;
  leftImportance: number;
  rightImportance: number;
  importanceDiff: number;
}

// Backward compatibility aliases
export type TemplateDiff = PreferenceSetDiff;
