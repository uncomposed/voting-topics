// Export all types from a single entry point
export type * from './diff';

// Re-export for backward compatibility
export type { PreferenceSetDiff as TemplateDiff } from './diff';
