import type { Meta, StoryObj } from '@storybook/react';

const ColorPalette = () => (
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
    gap: '20px',
    padding: '20px',
    fontFamily: 'system-ui'
  }}>
    {[
      { name: 'Background', value: 'var(--bg)', color: '#0b1020', description: 'Main background color' },
      { name: 'Panel', value: 'var(--panel)', color: '#121832', description: 'Panel and card backgrounds' },
      { name: 'Text', value: 'var(--text)', color: '#e2e8ff', description: 'Primary text color' },
      { name: 'Accent', value: 'var(--accent)', color: '#8bd3ff', description: 'Primary accent color' },
      { name: 'Accent 2', value: 'var(--accent-2)', color: '#64ffa1', description: 'Secondary accent color' },
      { name: 'Danger', value: 'var(--danger)', color: '#ff6b6b', description: 'Error and danger states' },
      { name: 'Warning', value: 'var(--warn)', color: '#ffd166', description: 'Warning states' },
      { name: 'Success', value: 'var(--success)', color: '#64ffa1', description: 'Success states' }
    ].map(({ name, value, color, description }) => (
      <div key={name} style={{ textAlign: 'center' }}>
        <div 
          style={{ 
            width: '100%', 
            height: '80px', 
            backgroundColor: color,
            borderRadius: '8px',
            marginBottom: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color === '#0b1020' || color === '#121832' ? '#e2e8ff' : '#0b1020',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          {name}
        </div>
        <div style={{ fontWeight: 'bold', color: '#e2e8ff', marginBottom: '4px' }}>{name}</div>
        <div style={{ fontSize: '12px', color: '#8bd3ff', marginBottom: '2px' }}>{value}</div>
        <div style={{ fontSize: '12px', color: '#64ffa1', marginBottom: '2px' }}>{color}</div>
        <div style={{ fontSize: '11px', color: '#8bd3ff', opacity: 0.8 }}>{description}</div>
      </div>
    ))}
  </div>
);

const meta: Meta<typeof ColorPalette> = {
  title: 'Design System/Colors',
  component: ColorPalette,
  parameters: {
    docs: {
      description: {
        component: `
# Color Palette

The color palette used throughout the Voting Topics Builder application. These colors are defined as CSS custom properties for consistent theming and easy maintenance.

## Usage
\`\`\`css
/* Use CSS custom properties for consistency */
.my-component {
  background-color: var(--bg);
  color: var(--text);
  border: 1px solid var(--accent);
}

.my-button {
  background-color: var(--accent);
  color: var(--bg);
}
\`\`\`

## Design Principles
- **Dark Theme**: Optimized for low-light usage and reduced eye strain
- **High Contrast**: Ensures accessibility and readability
- **Semantic Colors**: Each color has a specific purpose and meaning
- **Consistent**: All components use the same color tokens

## Accessibility
All color combinations meet WCAG AA contrast requirements for text readability.
        `
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof ColorPalette>;

export const Palette: Story = {};

export const ColorUsage: Story = {
  render: () => (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h3 style={{ color: '#8bd3ff', marginBottom: '20px' }}>Color Usage Examples</h3>
      
      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Buttons */}
        <div>
          <h4 style={{ color: '#e2e8ff', marginBottom: '10px' }}>Buttons</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#8bd3ff',
              color: '#0b1020',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Primary Button
            </button>
            <button style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#8bd3ff',
              border: '1px solid #8bd3ff',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Secondary Button
            </button>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#ff6b6b',
              color: '#0b1020',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Danger Button
            </button>
          </div>
        </div>

        {/* Cards */}
        <div>
          <h4 style={{ color: '#e2e8ff', marginBottom: '10px' }}>Cards</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{
              padding: '15px',
              backgroundColor: '#121832',
              border: '1px solid #8bd3ff',
              borderRadius: '8px'
            }}>
              <h5 style={{ color: '#8bd3ff', margin: '0 0 8px 0' }}>Card Title</h5>
              <p style={{ color: '#e2e8ff', margin: 0, fontSize: '14px' }}>
                This is a sample card with the panel background color.
              </p>
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: '#121832',
              border: '1px solid #64ffa1',
              borderRadius: '8px'
            }}>
              <h5 style={{ color: '#64ffa1', margin: '0 0 8px 0' }}>Success Card</h5>
              <p style={{ color: '#e2e8ff', margin: 0, fontSize: '14px' }}>
                This card uses the success accent color.
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div>
          <h4 style={{ color: '#e2e8ff', marginBottom: '10px' }}>Status Indicators</h4>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#64ffa1',
              color: '#0b1020',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Added
            </span>
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#ffd166',
              color: '#0b1020',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Modified
            </span>
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#ff6b6b',
              color: '#0b1020',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Removed
            </span>
            <span style={{
              padding: '4px 8px',
              backgroundColor: '#8bd3ff',
              color: '#0b1020',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Unchanged
            </span>
          </div>
        </div>
      </div>
    </div>
  )
};
