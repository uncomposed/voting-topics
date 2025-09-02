import type { Meta, StoryObj } from '@storybook/react';
import { PreferenceSetDiffView } from '../../src/components/PreferenceSetDiffView';
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
        { id: '2', text: 'Invest in renewable energy', stars: 4, sources: [], tags: [] }
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
        { id: '3', text: 'Universal healthcare access', stars: 5, sources: [], tags: [] }
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
        { id: '4', text: 'Nuclear energy expansion', stars: 3, sources: [], tags: [] } // New direction
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
        { id: '5', text: 'Increase teacher salaries', stars: 5, sources: [], tags: [] }
      ],
      notes: 'Education is the foundation of society',
      sources: [],
      relations: { broader: [], narrower: [], related: [] }
    }
  ],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01'
};

const meta: Meta<typeof PreferenceSetDiffView> = {
  title: 'Components/PreferenceSetDiffView',
  component: PreferenceSetDiffView,
  parameters: {
    docs: {
      description: {
        component: `
# PreferenceSetDiffView Component

The main component for displaying comprehensive differences between two preference sets. This component orchestrates multiple specialized views to provide a complete comparison experience.

## Features
- 📊 **Summary Statistics**: Overview of changes at a glance
- 🔥 **Priority Heatmap**: Visual representation of importance changes
- 📝 **Detailed Changes**: Granular view of topic and direction modifications
- 🎯 **Directions View**: Specialized view for direction-level comparisons
- 🎛️ **Tabbed Interface**: Organized navigation between different views

## Architecture Benefits
This component demonstrates our clean architecture:
- **Separation of Concerns**: Each tab is a specialized component
- **Reusable Hooks**: Uses \`useExpandedState\` and \`useFilters\` consistently
- **Type Safety**: Comprehensive TypeScript interfaces
- **Modular Design**: Easy to extend with new comparison views

## Component Structure
- **Overview Tab**: Summary statistics and high-level changes
- **Priority Heatmap Tab**: Visual importance comparison
- **Detailed Changes Tab**: Topic-by-topic breakdown
- **Directions Tab**: Direction-level comparison with advanced filtering
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof PreferenceSetDiffView>;

export const Default: Story = {
  args: {
    leftPreferenceSet: mockLeftPreferenceSet,
    rightPreferenceSet: mockRightPreferenceSet
  }
};

export const IdenticalPreferenceSets: Story = {
  args: {
    leftPreferenceSet: mockLeftPreferenceSet,
    rightPreferenceSet: mockLeftPreferenceSet
  }
};

export const CompletelyDifferent: Story = {
  args: {
    leftPreferenceSet: mockLeftPreferenceSet,
    rightPreferenceSet: {
      version: 'tsb.v1',
      title: 'Opposite Views',
      notes: 'Completely different perspective',
      topics: [
        {
          id: '1',
          title: 'Climate Change',
          importance: 1, // Very low importance
          stance: 'against',
          directions: [
            { id: '1', text: 'Focus on economic growth over environment', stars: 5, sources: [], tags: [] },
            { id: '2', text: 'Reduce environmental regulations', stars: 4, sources: [], tags: [] }
          ],
          notes: 'Economic concerns take priority',
          sources: [],
          relations: { broader: [], narrower: [], related: [] }
        },
        {
          id: '2',
          title: 'Healthcare',
          importance: 2,
          stance: 'against',
          directions: [
            { id: '3', text: 'Market-based healthcare solutions', stars: 5, sources: [], tags: [] }
          ],
          notes: 'Free market approach preferred',
          sources: [],
          relations: { broader: [], narrower: [], related: [] }
        }
      ],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    }
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
            { id: '6', text: 'Support small businesses', stars: 4, sources: [], tags: [] }
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
            { id: '7', text: 'Comprehensive immigration reform', stars: 4, sources: [], tags: [] }
          ],
          notes: 'Immigration policy needs reform',
          sources: [],
          relations: { broader: [], narrower: [], related: [] }
        },
        {
          id: '6',
          title: 'Criminal Justice',
          importance: 4,
          stance: 'for',
          directions: [
            { id: '8', text: 'Police reform and accountability', stars: 5, sources: [], tags: [] },
            { id: '9', text: 'End mass incarceration', stars: 4, sources: [], tags: [] }
          ],
          notes: 'Justice system needs reform',
          sources: [],
          relations: { broader: [], narrower: [], related: [] }
        }
      ]
    },
    rightPreferenceSet: mockRightPreferenceSet
  }
};
