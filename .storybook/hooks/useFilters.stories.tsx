import type { Meta, StoryObj } from '@storybook/react';
import { useFilters } from '../../src/hooks/useFilters';

// Demo component to showcase the hook
const FiltersDemo = () => {
  const { filters, updateFilter } = useFilters();
  
  const sampleData = [
    { id: '1', title: 'Climate Change', importance: 5, status: 'added' },
    { id: '2', title: 'Healthcare', importance: 4, status: 'modified' },
    { id: '3', title: 'Education', importance: 3, status: 'removed' },
    { id: '4', title: 'Economy', importance: 5, status: 'unchanged' },
  ];

  const filteredData = sampleData.filter(item => {
    if (filters.topicFilter === 'all') return true;
    if (filters.topicFilter === 'added' && item.status === 'added') return true;
    if (filters.topicFilter === 'modified' && item.status === 'modified') return true;
    if (filters.topicFilter === 'removed' && item.status === 'removed') return true;
    if (filters.topicFilter === 'unchanged' && item.status === 'unchanged') return true;
    return false;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added': return '#64ffa1';
      case 'modified': return '#ffd166';
      case 'removed': return '#ff6b6b';
      case 'unchanged': return '#8bd3ff';
      default: return '#e2e8ff';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', color: '#e2e8ff' }}>
      <h3 style={{ color: '#8bd3ff', marginBottom: '20px' }}>useFilters Hook Demo</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', color: '#64ffa1' }}>
          Topic Filter:
        </label>
        <select
          value={filters.topicFilter}
          onChange={(e) => updateFilter('topicFilter', e.target.value)}
          style={{
            padding: '8px 12px',
            backgroundColor: '#121832',
            color: '#e2e8ff',
            border: '1px solid #8bd3ff',
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          <option value="all">All Topics</option>
          <option value="added">Added</option>
          <option value="modified">Modified</option>
          <option value="removed">Removed</option>
          <option value="unchanged">Unchanged</option>
        </select>
        
        <span style={{ color: '#8bd3ff' }}>
          Showing {filteredData.length} of {sampleData.length} items
        </span>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {filteredData.map(item => (
          <div
            key={item.id}
            style={{
              padding: '12px',
              backgroundColor: '#121832',
              border: '1px solid #8bd3ff',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <span style={{ color: '#e2e8ff', fontWeight: 'bold' }}>{item.title}</span>
              <span style={{ color: '#8bd3ff', marginLeft: '10px' }}>
                {'★'.repeat(item.importance)}
              </span>
            </div>
            <span
              style={{
                color: getStatusColor(item.status),
                fontWeight: 'bold',
                textTransform: 'uppercase',
                fontSize: '12px'
              }}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const meta: Meta<typeof FiltersDemo> = {
  title: 'Hooks/useFilters',
  component: FiltersDemo,
  parameters: {
    docs: {
      description: {
        component: `
# useFilters Hook

A custom hook for managing filter state across components. This hook provides a consistent interface for filtering data and prevents duplication of filter logic.

## Features
- ✅ Centralized filter state management
- ✅ Type-safe filter updates
- ✅ Consistent filter interface across components
- ✅ Easy to extend with new filter types

## Usage
\`\`\`typescript
import { useFilters } from '../hooks/useFilters';

const { filters, updateFilter } = useFilters();

// Update a filter
updateFilter('topicFilter', 'added');

// Access current filter values
console.log(filters.topicFilter); // 'added'
\`\`\`

## Duplication Prevention
This hook prevents the common pattern of:
\`\`\`typescript
// ❌ Don't do this - creates duplication
const [topicFilter, setTopicFilter] = useState('all');
const [directionFilter, setDirectionFilter] = useState('all');
const [magnitudeFilter, setMagnitudeFilter] = useState('all');

// Multiple useState calls and handlers
\`\`\`

Instead, use this hook for consistent filter management across all components.

## Filter Types
- **topicFilter**: 'all' | 'added' | 'modified' | 'removed' | 'unchanged'
- **directionFilter**: 'all' | 'matching' | 'most-different' | 'highest-rated'
- **magnitudeFilter**: 'all' | 'high-difference' | 'high-rating'
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof FiltersDemo>;

export const Default: Story = {};

export const WithCustomFilters: Story = {
  render: () => {
    const { filters, updateFilter } = useFilters();
    
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui', color: '#e2e8ff' }}>
        <h3 style={{ color: '#8bd3ff', marginBottom: '20px' }}>Custom Filter Configuration</h3>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#64ffa1' }}>
              Topic Filter: {filters.topicFilter}
            </label>
            <select
              value={filters.topicFilter}
              onChange={(e) => updateFilter('topicFilter', e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#121832',
                color: '#e2e8ff',
                border: '1px solid #8bd3ff',
                borderRadius: '4px',
                width: '200px'
              }}
            >
              <option value="all">All Topics</option>
              <option value="added">Added</option>
              <option value="modified">Modified</option>
              <option value="removed">Removed</option>
              <option value="unchanged">Unchanged</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#64ffa1' }}>
              Direction Filter: {filters.directionFilter}
            </label>
            <select
              value={filters.directionFilter}
              onChange={(e) => updateFilter('directionFilter', e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#121832',
                color: '#e2e8ff',
                border: '1px solid #8bd3ff',
                borderRadius: '4px',
                width: '200px'
              }}
            >
              <option value="all">All Directions</option>
              <option value="matching">Matching</option>
              <option value="most-different">Most Different</option>
              <option value="highest-rated">Highest Rated</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#64ffa1' }}>
              Magnitude Filter: {filters.magnitudeFilter}
            </label>
            <select
              value={filters.magnitudeFilter}
              onChange={(e) => updateFilter('magnitudeFilter', e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#121832',
                color: '#e2e8ff',
                border: '1px solid #8bd3ff',
                borderRadius: '4px',
                width: '200px'
              }}
            >
              <option value="all">All Magnitudes</option>
              <option value="high-difference">High Difference (≥2 stars)</option>
              <option value="high-rating">High Rating (≥3 stars)</option>
            </select>
          </div>
        </div>

        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#121832', 
          border: '1px solid #8bd3ff',
          borderRadius: '4px'
        }}>
          <h4 style={{ color: '#8bd3ff', margin: '0 0 10px 0' }}>Current Filter State:</h4>
          <pre style={{ color: '#64ffa1', margin: 0, fontSize: '12px' }}>
            {JSON.stringify(filters, null, 2)}
          </pre>
        </div>
      </div>
    );
  }
};
