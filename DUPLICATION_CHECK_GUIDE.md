# 🔍 Duplication Check Guide

## Overview

The duplication detection system helps maintain clean architecture by identifying potential code duplication and suggesting better alternatives. It's designed to be flexible - you can choose how strict you want it to be.

## 🎯 Different Check Modes

### **1. Pre-commit Hook (Default)**
```bash
# Automatically runs on every commit
git commit -m "your message"
```
- **Mode**: `--warn-only` (shows warnings but doesn't fail)
- **Purpose**: Gentle reminders without blocking commits
- **Best for**: Daily development workflow

### **2. Manual Checks**

#### **Warning Mode (Recommended for Development)**
```bash
npm run check-duplicates:warn
# or
npm run check-duplicates --warn-only
```
- **Behavior**: Shows all warnings but doesn't fail
- **Use when**: You want to see issues but continue working
- **Exit code**: 0 (success)

#### **Strict Mode (CI/CD or Before PRs)**
```bash
npm run check-duplicates:strict
# or
npm run check-duplicates
```
- **Behavior**: Shows warnings AND fails if issues found
- **Use when**: You want to enforce clean code
- **Exit code**: 1 if issues found, 0 if clean

#### **Skip High Severity**
```bash
npm run check-duplicates:skip-high
# or
npm run check-duplicates --skip-high --warn-only
```
- **Behavior**: Ignores high-severity issues, warns about others
- **Use when**: You're in the middle of refactoring high-severity issues
- **Exit code**: 0 (success)

## 🚨 Severity Levels

### **🔴 High Severity**
- **Patterns**: `useState` with `Set<string>`, manual diff computation
- **Impact**: Significant duplication that should be addressed
- **Action**: Use existing hooks/utilities instead

### **🟡 Medium Severity**
- **Patterns**: Topic/direction finding logic, expand/collapse patterns
- **Impact**: Moderate duplication that could be improved
- **Action**: Consider extracting to utilities

### **🟢 Low Severity**
- **Patterns**: Multiple similar imports, minor patterns
- **Impact**: Minor duplication that's acceptable in some cases
- **Action**: Consider refactoring when convenient

## 🛠️ Common Scenarios

### **Scenario 1: Daily Development**
```bash
# Pre-commit hook runs automatically
git commit -m "Add new feature"
# Shows warnings but allows commit
```

### **Scenario 2: Before Creating a PR**
```bash
# Run strict check to ensure clean code
npm run check-duplicates:strict
# Fix any issues before submitting PR
```

### **Scenario 3: In the Middle of Refactoring**
```bash
# Skip high-severity issues you're already working on
npm run check-duplicates:skip-high
# Focus on medium/low severity issues
```

### **Scenario 4: Quick Check During Development**
```bash
# Just see what issues exist without failing
npm run check-duplicates:warn
# Continue working, address issues later
```

## 🔧 Customizing the Pre-commit Hook

### **Option 1: Change to Strict Mode**
Edit `.husky/pre-commit`:
```bash
# Change from:
npm run check-duplicates --warn-only

# To:
npm run check-duplicates
```

### **Option 2: Skip High Severity in Pre-commit**
Edit `.husky/pre-commit`:
```bash
# Change to:
npm run check-duplicates --skip-high --warn-only
```

### **Option 3: Disable Pre-commit Hook**
```bash
# Remove the hook entirely
rm .husky/pre-commit
```

## 📊 Understanding the Output

### **Warning Output**
```
🔍 Running duplication detection...

🔴 useState with Set<string> detected:
   Consider using useExpandedState hook instead
   Files affected: 2
   Severity: HIGH
   Suggestion: import { useExpandedState } from '../hooks/useExpandedState'
   Files: src/components/TopicList.tsx, src/hooks/useExpandedState.ts

📊 Summary: 2 potential duplication issues found
   🔴 High severity: 2
   🟡 Medium severity: 0
   🟢 Low severity: 0

⚠️  Running in warn-only mode - not failing the build
```

### **Success Output**
```
🔍 Running duplication detection...

✅ No duplication patterns detected!
🎉 Your codebase follows clean architecture principles
```

## 🎯 Best Practices

### **For Individual Developers**
1. **Use warn-only mode** for daily development
2. **Run strict mode** before creating PRs
3. **Address high-severity issues** first
4. **Use Storybook** to see available hooks/utilities

### **For Teams**
1. **Set pre-commit to warn-only** to avoid blocking development
2. **Run strict mode in CI/CD** to enforce quality
3. **Document exceptions** when duplication is intentional
4. **Regular refactoring sessions** to address accumulated issues

### **For CI/CD Pipelines**
```yaml
# Example GitHub Actions step
- name: Check for code duplication
  run: npm run check-duplicates:strict
```

## 🚀 Quick Commands Reference

```bash
# Show available hooks and utilities
npm run show-resources

# Get refactoring suggestions
npm run suggest-refactors

# Check with different modes
npm run check-duplicates:warn      # Warning mode
npm run check-duplicates:strict    # Strict mode
npm run check-duplicates:skip-high # Skip high severity

# Start Storybook to see examples
npm run storybook
```

## 🤔 When to Ignore Warnings

### **Legitimate Cases**
- **Prototyping**: Quick experiments that will be refactored
- **Legacy Code**: Working with existing code that needs gradual refactoring
- **Performance**: When the "duplicated" code is actually optimized differently
- **Context**: When the code serves different purposes despite similar patterns

### **Temporary Exceptions**
- **Mid-refactor**: When you're actively working on the duplication
- **Feature branches**: When the duplication will be resolved in the final merge
- **Learning**: When you're experimenting with different approaches

## 🎉 The Goal

The duplication detection system is designed to **educate and guide**, not to be a rigid blocker. It helps you:

1. **Learn** about available hooks and utilities
2. **Maintain** clean architecture principles
3. **Prevent** accidental duplication
4. **Improve** code quality over time

Remember: The goal is **better code**, not **perfect code**. Use the system as a helpful guide, not a strict enforcer! 🚀
