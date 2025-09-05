import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { App } from '../../src/App';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations as any);

describe('App accessibility', () => {
  it('has no obvious axe violations on initial render', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

