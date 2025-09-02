import type { Meta, StoryObj } from '@storybook/react';
import { useExpandedState } from '../../src/hooks/useExpandedState';
import { useState } from 'react';

// Demo component to showcase the hook
const ExpandedStateDemo = () => {
  const { expandedItems, toggleExpanded, toggleAllExpanded, isExpanded } = useExpandedState();
  
  const items = ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4'];
  
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui', color: '#e2e8ff' }}>
      <h3 style={{ color: '#8bd3ff', marginBottom: '20px' }}>useExpandedState Hook Demo</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => toggleAllExpanded(items)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#8bd3ff',
            color: '#0b1020',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          {expandedItems.size === items.length ? 'Collapse All' : 'Expand All'}
        </button>
        <span style={{ color: '#64ffa1' }}>
          {expandedItems.size}/{items.length} expanded
        </span>
      </div>
      
      {items.map(item => (
        <div key={item} style={{ marginBottom: '10px' }}>
          <button 
            onClick={() => toggleExpanded(item)}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #8bd3ff',
              background: isExpanded(item) ? '#8bd3ff' : 'transparent',
              color: isExpanded(item) ? '#0b1020' : '#e2e8ff',
              cursor: 'pointer',
              borderRadius: '4px',
              marginBottom: '5px'
            }}
          >
            {isExpanded(item) ? '▼' : '▶'} {item}
          </button>
          
          {isExpanded(item) && (
            <div style={{ 
              marginLeft: '20px', 
              padding: '10px', 
              background: '#121832',
              border: '1px solid #8bd3ff',
              borderRadius: '4px'
            }}>
              <p style={{ margin: 0, color: '#e2e8ff' }}>This is the expanded content for {item}!</p>
              <p style={{ margin: '5px 0 0 0', color: '#64ffa1' }}>You can put any content here when expanded.</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const meta: Meta<typeof ExpandedStateDemo> = {
  title: 'Hooks/useExpandedState',
  component: ExpandedStateDemo,
  parameters: {
    docs: {
      description: {
        component: `
# useExpandedState Hook

A custom hook for managing expand/collapse state for multiple items. This hook is designed to prevent duplication of expand/collapse logic across components.

## Features
- ✅ Toggle individual items
- ✅ Toggle all items at once  
- ✅ Check if item is expanded
- ✅ Get expanded count
- ✅ TypeScript support

## Usage
\`\`\`typescript
import { useExpandedState } from '../hooks/useExpandedState';

const { expandedItems, toggleExpanded, toggleAllExpanded, isExpanded } = useExpandedState();

// Toggle single item
toggleExpanded('item-id');

// Toggle all items
toggleAllExpanded(['item1', 'item2', 'item3']);

// Check if expanded
if (isExpanded('item-id')) {
  // Show expanded content
}
\`\`\`

## Duplication Prevention
This hook prevents the common pattern of:
\`\`\`typescript
// ❌ Don't do this - creates duplication
const [expanded, setExpanded] = useState<Set<string>>(new Set());
const toggleExpanded = (item: string) => {
  setExpanded(prev => {
    const newSet = new Set(prev);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    return newSet;
  });
};
\`\`\`

Instead, use this hook for consistent behavior across all components.
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof ExpandedStateDemo>;

export const Default: Story = {};

export const WithInitialExpanded: Story = {
  render: () => {
    const { expandedItems, toggleExpanded, isExpanded } = useExpandedState(
      new Set(['Topic 1', 'Topic 3']) // Start with some expanded
    );
    
    const items = ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4'];
    
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui', color: '#e2e8ff' }}>
        <h3 style={{ color: '#8bd3ff', marginBottom: '20px' }}>Pre-expanded Items</h3>
        {items.map(item => (
          <div key={item} style={{ marginBottom: '10px' }}>
            <button 
              onClick={() => toggleExpanded(item)}
              style={{
                padding: '8px 12px',
                border: '1px solid #8bd3ff',
                background: isExpanded(item) ? '#8bd3ff' : 'transparent',
                color: isExpanded(item) ? '#0b1020' : '#e2e8ff',
                cursor: 'pointer',
                borderRadius: '4px',
                marginBottom: '5px'
              }}
            >
              {isExpanded(item) ? '▼' : '▶'} {item}
            </button>
            {isExpanded(item) && (
              <div style={{ 
                marginLeft: '20px', 
                padding: '10px', 
                background: '#121832',
                border: '1px solid #8bd3ff',
                borderRadius: '4px'
              }}>
                <p style={{ margin: 0, color: '#e2e8ff' }}>Content for {item}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
};
