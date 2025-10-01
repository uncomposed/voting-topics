import { describe, it, expect } from 'vitest';
import starterPackV1 from '../../starter-pack.v1.json';
import starterPackV24 from '../../starter-pack.v2.4.json';
import type { StarterPackJson } from '../types';

const packs: Array<[string, unknown]> = [
  ['v1', starterPackV1],
  ['v2.4', starterPackV24],
];

describe('starter pack json types', () => {
  packs.forEach(([label, pack]) => {
    it(`conforms to StarterPackJson shape for ${label}`, () => {
      const sp: StarterPackJson = pack as StarterPackJson;
      expect(Array.isArray(sp.topics)).toBe(true);
      expect(sp.topics.length).toBeGreaterThan(0);
      sp.topics.forEach((topic) => {
        expect(typeof topic.id).toBe('string');
        expect(typeof topic.title).toBe('string');
        if (topic.directions && topic.directions.length > 0) {
          topic.directions.forEach(direction => {
            expect(typeof direction.id).toBe('string');
            expect(typeof direction.text).toBe('string');
          });
        }
      });
    });
  });
});
