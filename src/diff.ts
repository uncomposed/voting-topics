// Backward compatibility re-exports
// This file is deprecated - use imports from '../types' and '../utils' instead

// Re-export types
export type * from './types/diff';

// Re-export utilities
export * from './utils/diff';

// Specific backward compatibility aliases
export { computePreferenceSetDiff as computeTemplateDiff } from './utils/diff';
export type { PreferenceSetDiff as TemplateDiff } from './types/diff';