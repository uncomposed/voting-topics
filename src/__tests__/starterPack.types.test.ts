import { describe, it, expect } from 'vitest';
import starterPack from '../../starter-pack.v1.json';
import type { StarterPackJson } from '../types';

describe('starter pack json types', () => {
  it('conforms to StarterPackJson shape', () => {
    const sp: StarterPackJson = starterPack;
    expect(Array.isArray(sp.topics)).toBe(true);
    const first = sp.topics[0];
    expect(typeof first.id).toBe('string');
    expect(typeof first.title).toBe('string');
    if (first.directions && first.directions.length > 0) {
      expect(typeof first.directions[0].id).toBe('string');
      expect(typeof first.directions[0].text).toBe('string');
    }
  });
});
