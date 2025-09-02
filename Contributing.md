# Contributing to Voting Topics Builder

Thank you for your interest in contributing! This guide will help you understand the codebase structure and best practices for making changes.

## 🏗️ Codebase Organization

### Directory Structure
```
src/
├── components/          # React components (UI layer)
├── hooks/              # Custom React hooks (state logic)
├── types/              # TypeScript type definitions
├── utils/              # Pure utility functions (business logic)
├── schema.ts           # Zod schemas and validation
├── store.ts            # Zustand state management
└── exporters.ts        # Export functionality
```

### File Organization Guidelines

#### **Components** (`src/components/`)
- **One component per file** - Keep components focused and single-purpose
- **Keep under 300 lines** - Extract complex logic into custom hooks
- **Clear naming** - Use descriptive names that indicate purpose
- **Props interfaces** - Define clear, typed interfaces for component props

#### **Hooks** (`src/hooks/`)
- **Reusable state logic** - Extract state management from components
- **Custom hooks** - For complex interactions (filters, expanded state, etc.)
- **Type safety** - Always provide proper TypeScript types

#### **Types** (`src/types/`)
- **Shared interfaces** - Common types used across multiple files
- **Domain models** - Business logic types (diff, filters, etc.)
- **Barrel exports** - Use `index.ts` for clean imports

#### **Utils** (`src/utils/`)
- **Pure functions** - No side effects, easy to test
- **Business logic** - Complex computations (diff algorithms, etc.)
- **Validation helpers** - Schema validation utilities

## 🔍 Preventing Code Duplication

### Search Strategies Before Creating New Code

#### **1. Use `grep` to Find Similar Functionality**
```bash
# Search for similar function names
grep -r "toggleExpanded" src/
grep -r "useFilter" src/
grep -r "computeDiff" src/

# Search for similar patterns
grep -r "useState.*Set" src/
grep -r "filter.*all.*added.*removed" src/
grep -r "expanded.*collapsed" src/
```

#### **2. Search for Similar UI Patterns**
```bash
# Find similar component structures
grep -r "className.*filter" src/components/
grep -r "onClick.*toggle" src/components/
grep -r "expanded.*icon" src/components/
```

#### **3. Look for Existing Hooks**
```bash
# Check if similar hooks already exist
ls src/hooks/
grep -r "use.*State" src/hooks/
grep -r "use.*Filter" src/hooks/
```

#### **4. Search for Utility Functions**
```bash
# Find existing utility functions
grep -r "export.*function" src/utils/
grep -r "export.*const.*=" src/utils/
```

### **Before Creating New Files, Ask:**

1. **Does similar functionality exist?**
   - Search the codebase with `grep`
   - Check existing hooks and utilities
   - Look for similar component patterns

2. **Should this be a hook or utility?**
   - **Hook**: State management, React-specific logic
   - **Utility**: Pure functions, business logic, computations

3. **Where should this live?**
   - **Component**: UI-specific, not reusable
   - **Hook**: Reusable state logic
   - **Utility**: Pure functions, business logic
   - **Types**: Shared interfaces

4. **Is this the right level of abstraction?**
   - Don't over-engineer simple functionality
   - Don't under-abstract complex logic

## 🧪 Development Workflow

### **1. Before Making Changes**
```bash
# Search for existing similar functionality
grep -r "your-search-term" src/

# Check if hooks exist for your use case
ls src/hooks/
cat src/hooks/index.ts

# Look for similar utilities
ls src/utils/
cat src/utils/index.ts
```

### **2. Making Changes**
- **Start small** - Make incremental changes
- **Test frequently** - Run tests after each change
- **Follow patterns** - Use existing code as examples
- **Update imports** - Use barrel exports when possible

### **3. After Making Changes**
```bash
# Run tests
npm test

# Check for linting errors
npm run lint

# Verify imports work
npm run build
```

## 📝 Code Style Guidelines

### **Import Organization**
```typescript
// 1. React imports
import React, { useState, useMemo } from 'react';

// 2. Third-party imports
import { z } from 'zod';

// 3. Internal imports (use barrel exports when possible)
import type { PreferenceSet, Topic } from '../schema';
import { useExpandedState, useFilters } from '../hooks';
import { computePreferenceSetDiff } from '../utils';

// 4. Relative imports (components, etc.)
import { TopicCard } from './TopicCard';
```

### **Component Structure**
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Component definition
// 4. Hooks usage
// 5. Event handlers
// 6. Render logic
// 7. Export
```

### **Hook Structure**
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Hook definition
// 4. State management
// 5. Event handlers
// 6. Return object
// 7. Export
```

## 🚨 Common Pitfalls to Avoid

### **1. Duplicate State Management**
❌ **Don't do this:**
```typescript
// In Component A
const [expanded, setExpanded] = useState<Set<string>>(new Set());

// In Component B  
const [expanded, setExpanded] = useState<Set<string>>(new Set());
```

✅ **Do this:**
```typescript
// Create a reusable hook
export const useExpandedState = () => { /* ... */ };

// Use in both components
const { expandedItems, toggleExpanded } = useExpandedState();
```

### **2. Duplicate Filter Logic**
❌ **Don't do this:**
```typescript
// Duplicate filter logic in multiple components
const [filters, setFilters] = useState({...});
const updateFilter = (key, value) => { /* ... */ };
```

✅ **Do this:**
```typescript
// Create a reusable filter hook
export const useFilters = () => { /* ... */ };
```

### **3. Duplicate Utility Functions**
❌ **Don't do this:**
```typescript
// Same function in multiple files
const findTopicByTitle = (topics, title) => { /* ... */ };
```

✅ **Do this:**
```typescript
// Put in utils and import
import { findTopicByTitle } from '../utils';
```

## 🔧 Useful Commands

### **Search Commands**
```bash
# Find all function definitions
grep -r "export.*function" src/

# Find all hook definitions
grep -r "export.*use[A-Z]" src/hooks/

# Find all type definitions
grep -r "export.*interface\|export.*type" src/types/

# Find all utility functions
grep -r "export.*const.*=" src/utils/
```

### **Development Commands**
```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Check for linting errors
npm run lint

# Build for production
npm run build
```

## 📚 Key Files to Understand

### **Core Files**
- `src/schema.ts` - Data validation and types
- `src/store.ts` - Global state management
- `src/utils/diff.ts` - Diff computation logic
- `src/hooks/useExpandedState.ts` - Expand/collapse functionality
- `src/hooks/useFilters.ts` - Filter state management

### **Important Components**
- `src/components/PreferenceSetDiffView.tsx` - Main diff view
- `src/components/DirectionsDiffView.tsx` - Directions comparison
- `src/components/TopicDiffSection.tsx` - Topic details

## 🤝 Getting Help

1. **Search the codebase first** - Use `grep` to find similar functionality
2. **Check existing hooks** - Look in `src/hooks/` for reusable logic
3. **Look at similar components** - Use existing code as examples
4. **Ask questions** - Don't hesitate to ask for clarification

## 🎯 Contributing Checklist

Before submitting a PR:

- [ ] Searched for existing similar functionality
- [ ] Used appropriate directory structure
- [ ] Added proper TypeScript types
- [ ] Used barrel exports for clean imports
- [ ] Ran tests and they pass
- [ ] No linting errors
- [ ] Followed existing code patterns
- [ ] Added documentation for complex logic

---

**Remember**: The goal is to build maintainable, reusable code that follows established patterns. When in doubt, search first, then ask!