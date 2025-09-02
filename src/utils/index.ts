// Export all utilities from a single entry point
export * from './diff';

// Re-export for backward compatibility
export { computePreferenceSetDiff as computeTemplateDiff } from './diff';
