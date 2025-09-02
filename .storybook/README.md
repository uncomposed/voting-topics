# Storybook Documentation

This Storybook serves as both a living documentation system and a duplication prevention tool for the Voting Topics Builder project.

## 🎯 Purpose

### 1. **Living Documentation**
- Interactive examples of all hooks and components
- Self-documenting codebase that teaches itself
- Visual regression testing and quality assurance

### 2. **Duplication Prevention**
- Showcases available hooks and utilities
- Provides examples of proper usage patterns
- Serves as a reference for developers to avoid reinventing the wheel

## 📚 Story Organization

### **Hooks** (`/hooks/`)
- `useExpandedState` - Manage expand/collapse state for multiple items
- `useFilters` - Centralized filter state management

### **Components** (`/components/`)
- `PreferenceSetDiffView` - Main diff comparison component
- `DirectionsDiffView` - Specialized direction-level comparison
- `PriorityHeatmap` - Visual priority comparison
- `TopicDiffSection` - Detailed topic changes

### **Design System** (`/design-system/`)
- `Colors` - Color palette and usage examples
- Typography and spacing guidelines
- Component styling patterns

## 🚀 Getting Started

```bash
# Start Storybook
npm run storybook

# Build static Storybook
npm run build-storybook
```

## 🔍 Duplication Detection Integration

Storybook works hand-in-hand with our duplication detection system:

### **Pre-commit Hooks**
```bash
# Manual duplication check
npm run check-duplicates

# Show available resources
npm run show-resources

# Get refactoring suggestions
npm run suggest-refactors
```

### **How It Works**
1. **Detection**: Pre-commit hooks scan for duplication patterns
2. **Education**: Storybook shows proper usage examples
3. **Prevention**: Developers see available hooks before writing new code

## 🎨 Design Principles

### **Dark Theme**
- Optimized for low-light usage
- High contrast for accessibility
- Consistent color tokens

### **Component Architecture**
- Separation of concerns
- Reusable hooks and utilities
- Type-safe interfaces
- Modular design

## 📖 Usage Examples

### **Using Hooks**
```typescript
// ✅ Good - Use existing hooks
import { useExpandedState } from '../hooks/useExpandedState';
import { useFilters } from '../hooks/useFilters';

// ❌ Bad - Don't reinvent the wheel
const [expanded, setExpanded] = useState<Set<string>>(new Set());
const [filter, setFilter] = useState('all');
```

### **Component Composition**
```typescript
// ✅ Good - Compose with existing components
<PreferenceSetDiffView 
  leftPreferenceSet={left}
  rightPreferenceSet={right}
/>

// ❌ Bad - Don't duplicate diff logic
// Manual diff computation here...
```

## 🔧 Adding New Stories

### **Hook Stories**
1. Create demo component showcasing the hook
2. Include usage examples and code snippets
3. Show different configurations and edge cases
4. Document duplication prevention benefits

### **Component Stories**
1. Provide realistic mock data
2. Show different states and variations
3. Include accessibility considerations
4. Document architectural benefits

### **Design System Stories**
1. Show color usage examples
2. Demonstrate typography and spacing
3. Include accessibility guidelines
4. Provide copy-paste code snippets

## 🎯 Future Enhancements

### **Automated Testing**
- Visual regression testing
- Interaction testing
- Accessibility testing

### **Documentation Generation**
- Auto-generate API docs from TypeScript
- Extract usage examples from stories
- Generate contribution guidelines

### **Integration with CI/CD**
- Storybook deployment
- Automated screenshot testing
- Performance monitoring

## 🤝 Contributing

When adding new features:

1. **Check Storybook first** - See if similar functionality exists
2. **Use existing hooks** - Don't duplicate state management logic
3. **Follow patterns** - Maintain consistency with existing components
4. **Update stories** - Document new functionality with examples
5. **Run duplication check** - Ensure no patterns are duplicated

## 📞 Support

- **Storybook Issues**: Check the Storybook documentation
- **Duplication Detection**: Run `npm run check-duplicates --help`
- **Architecture Questions**: Review the hooks and utils directories
- **Design Questions**: Check the design system stories

---

*This Storybook is a living document that grows with the project. It's not just documentation—it's a tool for maintaining code quality and preventing duplication.*
