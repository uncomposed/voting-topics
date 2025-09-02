import type { Meta, StoryObj } from '@storybook/react';
import { DirectionsDiffView } from '../../src/components/DirectionsDiffView';
import { PreferenceSet } from '../../src/schema';

// Mock data for stories
const mockLeftPreferenceSet: PreferenceSet = {
  version: 'tsb.v1',
  title: 'My Political Views',
  notes: 'My personal preference set',
  topics: [
    {
      id: '1',
      title: 'Climate Change',
      importance: 5,
      stance: 'for',
      directions: [
        { id: '1', text: 'Reduce carbon emissions', stars: 5, sources: [], tags: [] },
        { id: '2', text: 'Invest in renewable energy', stars: 4, sources: [], tags: [] },
        { id: '3', text: 'Protect natural ecosystems', stars: 4, sources: [], tags: [] }
      ],
      notes: 'Critical issue for future generations',
      sources: [],
      relations: { broader: [], narrower: [], related: [] }
    },
    {
      id: '2',
      title: 'Healthcare',
      importance: 4,
      stance: 'for',
      directions: [
        { id: '4', text: 'Universal healthcare access', stars: 5, sources: [], tags: [] },
        { id: '5', text: 'Mental health parity', stars: 4, sources: [], tags: [] }
      ],
      notes: 'Healthcare is a human right',
      sources: [],
      relations: { broader: [], narrower: [], related: [] }
    }
  ],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

const mockRightPreferenceSet: PreferenceSet = {
  version: 'tsb.v1',
  title: 'Friend\'s Political Views',
  notes: 'My friend\'s preference set',
  topics: [
    {
      id: '1',
      title: 'Climate Change',
      importance: 4, // Different importance
      stance: 'for',
      directions: [
        { id: '1', text: 'Reduce carbon emissions', stars: 4, sources: [], tags: [] }, // Different stars
        { id: '2', text: 'Invest in renewable energy', stars: 5, sources: [], tags: [] },
        { id: '6', text: 'Nuclear energy expansion', stars: 3, sources: [], tags: [] } // New direction
      ],
      notes: 'Important but not critical',
      sources: [],
      relations: { broader: [], narrower: [], related: [] }
    },
    {
      id: '3',
      title: 'Education',
      importance: 5,
      stance: 'for',
      directions: [
        { id: '7', text: 'Increase teacher salaries', stars: 5, sources: [], tags: [] },
        { id: '8', text: 'Reduce class sizes', stars: 4, sources: [], tags: [] }
      ],
      notes: 'Education is the foundation of society',
      sources: [],
      relations: { broader: [], narrower: [], related: [] }
    }
  ],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

const meta: Meta<typeof DirectionsDiffView> = {
  title: 'Components/DirectionsDiffView',
  component: DirectionsDiffView,
  parameters: {
    docs: {
      description: {
        component: `
# DirectionsDiffView Component

A comprehensive view for comparing directions between two preference sets with advanced filtering capabilities.

## Features
- 🔍 **Advanced Filtering**: Filter by topic status, direction status, and magnitude
- 📊 **Visual Indicators**: Color-coded badges for added/removed/modified directions
- ⭐ **Star Comparisons**: Side-by-side star ratings with difference indicators
- 🎯 **Smart Grouping**: Directions grouped by topic with expand/collapse functionality
- 🎛️ **Interactive Controls**: Collapse/expand all, filter controls

## Filtering Options
- **Topic Filter**: Similar priority, different priority, missing topics
- **Direction Filter**: Matching, most different, highest rated
- **Magnitude Filter**: High difference (≥2 stars), high rating (≥3 stars)

## Architecture Benefits
This component demonstrates our clean architecture:
- Uses \`useExpandedState\` hook for consistent expand/collapse behavior
- Uses \`useFilters\` hook for centralized filter management
- Separates concerns with dedicated utility functions
- Type-safe with comprehensive TypeScript interfaces
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof DirectionsDiffView>;

export const Default: Story = {
  args: {
    leftPreferenceSet: mockLeftPreferenceSet,
    rightPreferenceSet: mockRightPreferenceSet
  }
};

export const WithManyTopics: Story = {
  args: {
    leftPreferenceSet: {
      ...mockLeftPreferenceSet,
      topics: [
        ...mockLeftPreferenceSet.topics,
        {
          id: '4',
          title: 'Economy',
          importance: 3,
          stance: 'neutral',
          directions: [
            { id: '9', text: 'Support small businesses', stars: 4, sources: [], tags: [] },
            { id: '10', text: 'Reduce income inequality', stars: 5, sources: [], tags: [] }
          ],
          notes: 'Economic policy matters',
          sources: [],
          relations: { broader: [], narrower: [], related: [] }
        },
        {
          id: '5',
          title: 'Immigration',
          importance: 2,
          stance: 'for',
          directions: [
            { id: '11', text: 'Comprehensive immigration reform', stars: 4, sources: [], tags: [] }
          ],
          notes: 'Immigration policy needs reform',
          sources: [],
          relations: { broader: [], narrower: [], related: [] }
        }
      ]
    },
    rightPreferenceSet: mockRightPreferenceSet
  }
};

export const MinimalDifferences: Story = {
  args: {
    leftPreferenceSet: mockLeftPreferenceSet,
    rightPreferenceSet: {
      ...mockLeftPreferenceSet,
      title: 'Slightly Different Views',
      topics: mockLeftPreferenceSet.topics.map(topic => ({
        ...topic,
        directions: topic.directions.map(direction => ({
          ...direction,
          stars: Math.max(1, direction.stars - 1) // Slightly lower ratings
        }))
      }))
    }
  }
};

export const MajorDifferences: Story = {
  args: {
    leftPreferenceSet: mockLeftPreferenceSet,
    rightPreferenceSet: {
      ...mockRightPreferenceSet,
      title: 'Very Different Views',
      topics: [
        {
          id: '1',
          title: 'Climate Change',
          importance: 2, // Much lower importance
          stance: 'against',
          directions: [
            { id: '1', text: 'Reduce carbon emissions', stars: 1, sources: [], tags: [] }, // Much lower
            { id: '12', text: 'Focus on economic growth over environment', stars: 5, sources: [], tags: [] } // New direction
          ],
          notes: 'Economic concerns take priority',
          sources: [],
          relations: { broader: [], narrower: [], related: [] }
        }
      ]
    }
  }
};
