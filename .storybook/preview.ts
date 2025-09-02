import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0b1020',
        },
        {
          name: 'panel',
          value: '#121832',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
  },
  tags: ['autodocs'],
};

export default preview;