import { describe, it, expect } from 'vitest';
import { computeTemplateDiff, computePriorityComparison } from '../diff';
import type { Template } from '../schema';

describe('Diff functionality', () => {
  const leftTemplate: Template = {
    version: 'tsb.v1',
    title: 'Left Template',
    notes: 'Left notes',
    topics: [
      {
        id: 'topic-1',
        title: 'Climate Change',
        importance: 5,
        stance: 'for',
        directions: [
          {
            id: 'dir-1',
            text: 'Reduce emissions',
            stars: 5,
            sources: [],
            tags: []
          }
        ],
        notes: 'Important topic',
        sources: [],
        relations: { broader: [], narrower: [], related: [] }
      },
      {
        id: 'topic-2',
        title: 'Education',
        importance: 3,
        stance: 'neutral',
        directions: [],
        notes: '',
        sources: [],
        relations: { broader: [], narrower: [], related: [] }
      }
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const rightTemplate: Template = {
    version: 'tsb.v1',
    title: 'Right Template',
    notes: 'Right notes',
    topics: [
      {
        id: 'topic-1',
        title: 'Climate Change',
        importance: 4, // Changed from 5
        stance: 'lean_for', // Changed from 'for'
        directions: [
          {
            id: 'dir-1',
            text: 'Reduce emissions significantly', // Changed text
            stars: 4, // Changed from 5
            sources: [],
            tags: []
          }
        ],
        notes: 'Very important topic', // Changed notes
        sources: [],
        relations: { broader: [], narrower: [], related: [] }
      },
      {
        id: 'topic-3', // New topic
        title: 'Healthcare',
        importance: 4,
        stance: 'for',
        directions: [],
        notes: '',
        sources: [],
        relations: { broader: [], narrower: [], related: [] }
      }
      // Education topic removed
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  it('should compute template diff correctly', () => {
    const diff = computeTemplateDiff(leftTemplate, rightTemplate);

    expect(diff.title.left).toBe('Left Template');
    expect(diff.title.right).toBe('Right Template');
    
    // Should have 1 added topic (Healthcare)
    expect(diff.topics.added).toHaveLength(1);
    expect(diff.topics.added[0].title).toBe('Healthcare');
    
    // Should have 1 removed topic (Education)
    expect(diff.topics.removed).toHaveLength(1);
    expect(diff.topics.removed[0].title).toBe('Education');
    
    // Should have 1 modified topic (Climate Change)
    expect(diff.topics.modified).toHaveLength(1);
    expect(diff.topics.modified[0].topic.title).toBe('Climate Change');
    
    // Should have no unchanged topics
    expect(diff.topics.unchanged).toHaveLength(0);
    
    // Check summary
    expect(diff.summary.addedCount).toBe(1);
    expect(diff.summary.removedCount).toBe(1);
    expect(diff.summary.modifiedCount).toBe(1);
    expect(diff.summary.unchangedCount).toBe(0);
  });

  it('should compute priority comparison correctly', () => {
    const comparison = computePriorityComparison(leftTemplate, rightTemplate);

    // Should have 3 topics total (Climate, Education, Healthcare)
    expect(comparison).toHaveLength(3);
    
    // Find Climate Change comparison
    const climateComparison = comparison.find(c => c.topicTitle === 'Climate Change');
    expect(climateComparison).toBeDefined();
    expect(climateComparison!.leftImportance).toBe(5);
    expect(climateComparison!.rightImportance).toBe(4);
    expect(climateComparison!.importanceDiff).toBe(-1);
    expect(climateComparison!.stanceChanged).toBe(true);
    
    // Find Education comparison (only in left)
    const educationComparison = comparison.find(c => c.topicTitle === 'Education');
    expect(educationComparison).toBeDefined();
    expect(educationComparison!.leftImportance).toBe(3);
    expect(educationComparison!.rightImportance).toBe(0);
    expect(educationComparison!.importanceDiff).toBe(-3);
    
    // Find Healthcare comparison (only in right)
    const healthcareComparison = comparison.find(c => c.topicTitle === 'Healthcare');
    expect(healthcareComparison).toBeDefined();
    expect(healthcareComparison!.leftImportance).toBe(0);
    expect(healthcareComparison!.rightImportance).toBe(4);
    expect(healthcareComparison!.importanceDiff).toBe(4);
  });

  it('should handle identical templates', () => {
    const diff = computeTemplateDiff(leftTemplate, leftTemplate);
    
    expect(diff.topics.added).toHaveLength(0);
    expect(diff.topics.removed).toHaveLength(0);
    expect(diff.topics.modified).toHaveLength(0);
    expect(diff.topics.unchanged).toHaveLength(2);
    
    expect(diff.summary.addedCount).toBe(0);
    expect(diff.summary.removedCount).toBe(0);
    expect(diff.summary.modifiedCount).toBe(0);
    expect(diff.summary.unchangedCount).toBe(2);
  });
});
