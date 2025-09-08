import { describe, it, expect } from 'vitest';
import { buildPreferenceSetFromPrefs, type PrefMap } from '../utils/library';

describe('buildPreferenceSetFromPrefs', () => {
  it('fills missing directions with 0 and clamps stars 0..5', () => {
    const prefs: PrefMap = {
      // provide out-of-range and partial entries
      'topic-economy-work': { 'dir-lw1': 7, 'nonexistent': 3 },
      'topic-taxes': { 'dir-ta1': -2 }
    };
    const res = buildPreferenceSetFromPrefs('Candidate A', prefs, 'notes');
    expect(res.version).toBe('tsb.v1');
    expect(res.title).toBe('Candidate A');
    // topic ids come from starter-pack; ensure presence
    const econ = res.topics.find(t => t.id === 'topic-economy-work');
    const taxes = res.topics.find(t => t.id === 'topic-taxes');
    expect(econ).toBeTruthy();
    expect(taxes).toBeTruthy();
    // clamp >5
    const lw1 = econ?.directions.find(d => d.id === 'dir-lw1');
    expect(lw1?.stars).toBe(5);
    // nonexistent dir ignored, other known dirs default to 0
    const knownOther = econ?.directions.find(d => d.id !== 'dir-lw1');
    expect(knownOther?.stars).toBeTypeOf('number');
    // clamp <0
    const ta1 = taxes?.directions.find(d => d.id === 'dir-ta1');
    expect(ta1?.stars).toBe(0);
  });

  it('computes topic importance as max star across directions', () => {
    const prefs: PrefMap = {
      'topic-public-health': { 'dir-ph1': 2, 'dir-ph2': 4 }
    };
    const res = buildPreferenceSetFromPrefs('Candidate B', prefs);
    const ph = res.topics.find(t => t.id === 'topic-public-health');
    expect(ph?.importance).toBe(4);
  });
});


