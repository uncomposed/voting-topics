#!/usr/bin/env node

/**
 * Pre-commit Hook Setup Script
 * 
 * This script sets up pre-commit hooks for duplication detection.
 * It will be run automatically when the project is set up.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PRE_COMMIT_HOOK = `#!/bin/bash

echo "🔍 Running pre-commit checks..."

# Run duplication detection in warn-only mode
# This shows warnings but doesn't fail the commit
node scripts/check-duplicates.js --warn-only

echo "✅ Pre-commit checks complete. Proceeding with commit."
`;

function setupPreCommitHook() {
  const hookPath = '.git/hooks/pre-commit';
  
  try {
    // Check if .git directory exists
    if (!fs.existsSync('.git')) {
      console.log('⚠️  Not a git repository. Skipping pre-commit hook setup.');
      return;
    }
    
    // Create the pre-commit hook
    fs.writeFileSync(hookPath, PRE_COMMIT_HOOK);
    
    // Make it executable
    execSync(`chmod +x ${hookPath}`);
    
    console.log('✅ Pre-commit hook installed successfully!');
    console.log('🔍 Duplication detection will run before each commit');
    console.log('💡 To disable: rm .git/hooks/pre-commit');
    
  } catch (error) {
    console.error('❌ Failed to setup pre-commit hook:', error.message);
    process.exit(1);
  }
}

function setupHusky() {
  try {
    // Check if husky is already installed
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.devDependencies?.husky) {
      console.log('📦 Installing husky for better git hook management...');
      execSync('npm install --save-dev husky', { stdio: 'inherit' });
    }
    
    // Initialize husky
    if (!fs.existsSync('.husky')) {
      execSync('npx husky install', { stdio: 'inherit' });
    }
    
    // Create pre-commit hook with husky
    const huskyPreCommit = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run duplication check with options
# Use --warn-only to show warnings but not fail the commit
# Use --skip-high to ignore high severity issues
node scripts/check-duplicates.js --warn-only
`;
    
    fs.writeFileSync('.husky/pre-commit', huskyPreCommit);
    execSync('chmod +x .husky/pre-commit');
    
    console.log('✅ Husky pre-commit hook configured!');
    
  } catch (error) {
    console.log('⚠️  Husky setup failed, using basic git hooks instead');
    console.log('   Error:', error.message);
  }
}

// Main execution
console.log('🚀 Setting up duplication detection pre-commit hooks...\n');

// Try husky first, fallback to basic git hooks
try {
  setupHusky();
} catch (error) {
  console.log('📝 Setting up basic git pre-commit hook...');
  setupPreCommitHook();
}

console.log('\n🎉 Setup complete!');
console.log('📚 Run "npm run storybook" to explore available hooks and utilities');
console.log('🔍 Run "npm run check-duplicates" to test the detection manually');
