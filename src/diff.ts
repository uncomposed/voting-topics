import type { PreferenceSet, Topic, Direction, Stance } from './schema';

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

// Helper function to find topics by title (since IDs might differ)
const findTopicByTitle = (topics: Topic[], title: string): Topic | undefined => {
  return topics.find(t => t.title.toLowerCase().trim() === title.toLowerCase().trim());
};

// Helper function to find directions by text
const findDirectionByText = (directions: Direction[], text: string): Direction | undefined => {
  return directions.find(d => d.text.toLowerCase().trim() === text.toLowerCase().trim());
};

// Check if two topics are identical
const topicsEqual = (left: Topic, right: Topic): boolean => {
  if (left.title !== right.title) return false;
  if (left.importance !== right.importance) return false;
  if (left.notes !== right.notes) return false;
  if (left.directions.length !== right.directions.length) return false;
  
  // Check directions
  for (const leftDir of left.directions) {
    const rightDir = findDirectionByText(right.directions, leftDir.text);
    if (!rightDir) return false;
    if (leftDir.stars !== rightDir.stars) return false;
    if (leftDir.notes !== rightDir.notes) return false;
  }
  
  return true;
};

// Check if two directions are identical
const directionsEqual = (left: Direction, right: Direction): boolean => {
  return left.text === right.text && 
         left.stars === right.stars && 
         left.notes === right.notes;
};

// Compute topic diff
const computeTopicDiff = (left: Topic, right: Topic): TopicDiff => {
  const directionDiffs: DirectionDiff[] = [];
  const addedDirections: Direction[] = [];
  const removedDirections: Direction[] = [];
  const unchangedDirections: Direction[] = [];
  
  // Find modified and unchanged directions
  for (const leftDir of left.directions) {
    const rightDir = findDirectionByText(right.directions, leftDir.text);
    if (rightDir) {
      if (directionsEqual(leftDir, rightDir)) {
        unchangedDirections.push(leftDir);
      } else {
        directionDiffs.push({
          direction: rightDir,
          changes: {
            text: { left: leftDir.text, right: rightDir.text },
            stars: { left: leftDir.stars, right: rightDir.stars },
            notes: { left: leftDir.notes || '', right: rightDir.notes || '' }
          },
          hasChanges: true
        });
      }
    } else {
      removedDirections.push(leftDir);
    }
  }
  
  // Find added directions
  for (const rightDir of right.directions) {
    const leftDir = findDirectionByText(left.directions, rightDir.text);
    if (!leftDir) {
      addedDirections.push(rightDir);
    }
  }
  
  const hasChanges = 
    left.importance !== right.importance ||
    left.notes !== right.notes ||
    directionDiffs.length > 0 ||
    addedDirections.length > 0 ||
    removedDirections.length > 0;
  
  return {
    topic: right,
    changes: {
      importance: { left: left.importance, right: right.importance },
      directions: {
        added: addedDirections,
        removed: removedDirections,
        modified: directionDiffs,
        unchanged: unchangedDirections
      },
      notes: { left: left.notes || '', right: right.notes || '' }
    },
    hasChanges
  };
};

// Main diff computation function
export const computePreferenceSetDiff = (leftPreferenceSet: PreferenceSet, rightPreferenceSet: PreferenceSet): PreferenceSetDiff => {
  const addedTopics: Topic[] = [];
  const removedTopics: Topic[] = [];
  const modifiedTopics: TopicDiff[] = [];
  const unchangedTopics: Topic[] = [];
  
  // Find added and modified topics
  for (const rightTopic of rightPreferenceSet.topics) {
    const leftTopic = findTopicByTitle(leftPreferenceSet.topics, rightTopic.title);
    if (leftTopic) {
      if (topicsEqual(leftTopic, rightTopic)) {
        unchangedTopics.push(rightTopic);
      } else {
        modifiedTopics.push(computeTopicDiff(leftTopic, rightTopic));
      }
    } else {
      addedTopics.push(rightTopic);
    }
  }
  
  // Find removed topics
  for (const leftTopic of leftPreferenceSet.topics) {
    const rightTopic = findTopicByTitle(rightPreferenceSet.topics, leftTopic.title);
    if (!rightTopic) {
      removedTopics.push(leftTopic);
    }
  }
  
  const totalTopics = Math.max(leftPreferenceSet.topics.length, rightPreferenceSet.topics.length);
  
  return {
    title: {
      left: leftPreferenceSet.title,
      right: rightPreferenceSet.title
    },
    topics: {
      added: addedTopics,
      removed: removedTopics,
      modified: modifiedTopics,
      unchanged: unchangedTopics
    },
    summary: {
      totalTopics,
      addedCount: addedTopics.length,
      removedCount: removedTopics.length,
      modifiedCount: modifiedTopics.length,
      unchangedCount: unchangedTopics.length
    }
  };
};

// Compute priority comparison for heatmap
export const computePriorityComparison = (leftPreferenceSet: PreferenceSet, rightPreferenceSet: PreferenceSet): PriorityComparison[] => {
  const allTopics = new Map<string, { title: string; left?: Topic; right?: Topic }>();
  
  // Collect all unique topics
  for (const topic of leftPreferenceSet.topics) {
    allTopics.set(topic.title, { title: topic.title, left: topic });
  }
  
  for (const topic of rightPreferenceSet.topics) {
    const existing = allTopics.get(topic.title);
    if (existing) {
      existing.right = topic;
    } else {
      allTopics.set(topic.title, { title: topic.title, right: topic });
    }
  }
  
  return Array.from(allTopics.values()).map(({ title, left, right }) => ({
    topicId: left?.id || right?.id || title,
    topicTitle: title,
    leftImportance: left?.importance || 0,
    rightImportance: right?.importance || 0,
    importanceDiff: (right?.importance || 0) - (left?.importance || 0)
  }));
};

// Backward compatibility aliases
export const computeTemplateDiff = computePreferenceSetDiff;
export type TemplateDiff = PreferenceSetDiff;