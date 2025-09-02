#!/usr/bin/env node

/**
 * Duplication Detection Script
 * 
 * This script scans the codebase for potential code duplication patterns
 * and provides suggestions for using existing hooks and utilities.
 * 
 * Future enhancement: This will be integrated with pre-commit hooks
 * to prevent duplication before it enters the repository.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Duplication patterns to detect
const DUPLICATION_PATTERNS = [
  // State management patterns
  {
    name: "useState with Set<string>",
    pattern: "useState.*Set.*string",
    message: "Consider using useExpandedState hook instead",
    suggestion: "import { useExpandedState } from '../hooks/useExpandedState'",
    severity: "high"
  },
  {
    name: "Filter state management", 
    pattern: "useState.*filter.*all.*added.*removed",
    message: "Consider using useFilters hook instead",
    suggestion: "import { useFilters } from '../hooks/useFilters'",
    severity: "high"
  },
  
  // Component patterns
  {
    name: "Expand/collapse logic",
    pattern: "toggleExpanded.*new Set",
    message: "Consider using useExpandedState hook instead",
    suggestion: "const { expandedItems, toggleExpanded } = useExpandedState()",
    severity: "medium"
  },
  
  // Utility patterns
  {
    name: "Topic finding logic",
    pattern: "find.*topic.*title.*toLowerCase",
    message: "Consider extracting to utils/topicHelpers.ts",
    suggestion: "import { findTopicByTitle } from '../utils/topicHelpers'",
    severity: "medium"
  },
  
  // Import patterns that suggest duplication
  {
    name: "Multiple similar imports",
    pattern: "import.*useState.*useState",
    message: "Multiple useState imports - consider custom hook",
    suggestion: "Consider creating a custom hook to encapsulate this logic",
    severity: "low"
  },

  // Direction finding patterns
  {
    name: "Direction finding logic",
    pattern: "find.*direction.*text.*toLowerCase",
    message: "Consider extracting to utils/directionHelpers.ts",
    suggestion: "import { findDirectionByText } from '../utils/directionHelpers'",
    severity: "medium"
  },

  // Diff computation patterns
  {
    name: "Manual diff computation",
    pattern: "comparison.*left.*right.*importance",
    message: "Consider using computePreferenceSetDiff utility",
    suggestion: "import { computePreferenceSetDiff } from '../utils/diff'",
    severity: "high"
  }
];

// Available hooks and utilities (for suggestions)
const AVAILABLE_RESOURCES = {
  hooks: [
    { name: 'useExpandedState', path: '../hooks/useExpandedState', description: 'Manage expand/collapse state' },
    { name: 'useFilters', path: '../hooks/useFilters', description: 'Manage filter state' }
  ],
  utils: [
    { name: 'computePreferenceSetDiff', path: '../utils/diff', description: 'Compute differences between preference sets' },
    { name: 'computePriorityComparison', path: '../utils/diff', description: 'Compare topic priorities' }
  ]
};

function checkForDuplicates() {
  console.log('🔍 Running duplication detection...\n');
  
  let hasDuplicates = false;
  let totalIssues = 0;
  let highSeverityIssues = 0;
  let mediumSeverityIssues = 0;
  let lowSeverityIssues = 0;
  
  // Parse command line options
  const warnOnly = process.argv.includes('--warn-only');
  const skipHigh = process.argv.includes('--skip-high');
  const skipMedium = process.argv.includes('--skip-medium');
  const skipLow = process.argv.includes('--skip-low');
  
  for (const { name, pattern, message, suggestion, severity } of DUPLICATION_PATTERNS) {
    // Skip based on severity if requested
    if ((severity === 'high' && skipHigh) || 
        (severity === 'medium' && skipMedium) || 
        (severity === 'low' && skipLow)) {
      continue;
    }
    
    try {
      const result = execSync(`grep -r "${pattern}" src/ --include="*.ts" --include="*.tsx"`, 
        { encoding: 'utf8' });
      
      if (result.trim()) {
        const files = result.split('\n').filter(Boolean);
        const fileCount = files.length;
        totalIssues += fileCount;
        
        // Count by severity
        if (severity === 'high') highSeverityIssues += fileCount;
        else if (severity === 'medium') mediumSeverityIssues += fileCount;
        else if (severity === 'low') lowSeverityIssues += fileCount;
        
        const severityIcon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
        console.log(`${severityIcon} ${name} detected:`);
        console.log(`   ${message}`);
        console.log(`   Files affected: ${fileCount}`);
        console.log(`   Severity: ${severity.toUpperCase()}`);
        console.log(`   Suggestion: ${suggestion}`);
        console.log(`   Files: ${files.map(f => f.split(':')[0]).join(', ')}\n`);
        
        hasDuplicates = true;
      }
    } catch (error) {
      // grep returns non-zero when no matches found - this is expected
    }
  }
  
  if (hasDuplicates) {
    console.log(`\n📊 Summary: ${totalIssues} potential duplication issues found`);
    if (highSeverityIssues > 0) console.log(`   🔴 High severity: ${highSeverityIssues}`);
    if (mediumSeverityIssues > 0) console.log(`   🟡 Medium severity: ${mediumSeverityIssues}`);
    if (lowSeverityIssues > 0) console.log(`   🟢 Low severity: ${lowSeverityIssues}`);
    
    console.log('\n💡 Run "npm run suggest-refactors" for specific recommendations');
    console.log('📚 Check Storybook for available hooks and utilities');
    
    if (warnOnly) {
      console.log('\n⚠️  Running in warn-only mode - not failing the build');
      return false; // Don't fail in warn-only mode
    }
    
    return true;
  } else {
    console.log('✅ No duplication patterns detected!');
    console.log('🎉 Your codebase follows clean architecture principles');
    return false;
  }
}

function showAvailableResources() {
  console.log('\n📚 Available Resources:\n');
  
  console.log('🔧 Hooks:');
  AVAILABLE_RESOURCES.hooks.forEach(hook => {
    console.log(`   • ${hook.name}: ${hook.description}`);
    console.log(`     import { ${hook.name} } from '${hook.path}'`);
  });
  
  console.log('\n🛠️  Utilities:');
  AVAILABLE_RESOURCES.utils.forEach(util => {
    console.log(`   • ${util.name}: ${util.description}`);
    console.log(`     import { ${util.name} } from '${util.path}'`);
  });
  
  console.log('\n📖 For more examples, run: npm run storybook');
}

// Main execution
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Duplication Detection Script

Usage:
  node scripts/check-duplicates.js [options]

Options:
  --help, -h     Show this help message
  --resources    Show available hooks and utilities
  --suggest      Show refactoring suggestions
  --warn-only    Show warnings but don't fail (exit code 0)
  --skip-high    Skip high severity checks
  --skip-medium  Skip medium severity checks
  --skip-low     Skip low severity checks

Examples:
  node scripts/check-duplicates.js
  node scripts/check-duplicates.js --resources
  node scripts/check-duplicates.js --suggest
  node scripts/check-duplicates.js --warn-only
  node scripts/check-duplicates.js --skip-high --warn-only
  `);
  process.exit(0);
}

if (process.argv.includes('--resources')) {
  showAvailableResources();
  process.exit(0);
}

if (process.argv.includes('--suggest')) {
  console.log('🔧 Refactoring Suggestions:\n');
  // This would be expanded with more detailed suggestions
  console.log('Run "npm run storybook" to see examples of proper hook usage');
  console.log('Check the hooks/ and utils/ directories for reusable code');
  process.exit(0);
}

// Run the main duplication check
const hasDuplicates = checkForDuplicates();

if (hasDuplicates) {
  process.exit(1);
} else {
  process.exit(0);
}
