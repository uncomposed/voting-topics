# 📄 `CONTRIBUTING.md`

# Contributing to Voting Topics

Thank you for your interest in contributing to Voting Topics! This guide outlines our development methodology, testing approach, and contribution workflow.

## 🧪 **Testing Methodology**

### **Why Testing is Critical**

We've learned through experience that **code changes cannot be validated by guessing or intuition alone**. The testing methodology below ensures:

- **Reliable Validation**: Every feature and bug fix is verified through automated tests
- **Regression Prevention**: Changes don't break existing functionality
- **Confidence in Delivery**: Developers and product managers can trust that features actually work
- **Elimination of "It Works on My Machine"**: Tests run in a consistent environment

### **Testing Stack**

- **Vitest**: Fast unit testing framework
- **@testing-library/react**: React component testing utilities
- **jsdom**: DOM environment for testing
- **TypeScript**: Type safety and compile-time error checking

### **Test Structure**

```
src/__tests__/
├── App.test.tsx          # Main application behavior tests
├── components/            # Component-specific tests
└── utils/                # Utility function tests
```

### **Test Categories**

#### **1. Functional Tests**
- **View Toggle**: Card view ↔ List view switching
- **Topic Management**: Create, edit, delete, reorder
- **State Persistence**: Data saving and loading
- **Export Functionality**: JSON, PDF, JPEG generation

#### **2. User Experience Tests**
- **Input Focus**: Cursor position maintenance during typing
- **View Separation**: Only one view active at a time
- **Real-time Updates**: UI reflects state changes immediately
- **Responsive Behavior**: Mobile and desktop compatibility

#### **3. Edge Case Tests**
- **Empty States**: No topics, no data scenarios
- **Error Handling**: Invalid input, network failures
- **Boundary Conditions**: Maximum topics, long text, etc.

### **Writing Effective Tests**

#### **Test Naming Convention**
```typescript
describe('Feature Name', () => {
  it('should perform expected behavior when condition is met', () => {
    // Test implementation
  });
  
  it('should handle edge case gracefully', () => {
    // Edge case test
  });
});
```

#### **Test Structure (AAA Pattern)**
```typescript
it('should maintain input focus during typing', async () => {
  // Arrange: Set up test conditions
  render(<App />);
  const input = screen.getByDisplayValue('Test Topic');
  
  // Act: Perform the action being tested
  fireEvent.input(input, { target: { value: 'A' } });
  
  // Assert: Verify expected outcome
  expect(document.activeElement).toBe(input);
});
```

#### **Mocking Strategy**
```typescript
// Mock external dependencies
vi.mock('../store', () => ({
  useStore: vi.fn()
}));

// Mock DOM elements
const mockDOMElements = () => {
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  document.body.appendChild(toolbar);
};
```

### **Running Tests**

```bash
# Run all tests
npm run test

# Run tests in watch mode (development)
npm run test:ui

# Run tests once (CI/CD)
npm run test:run

# Run specific test file
npm run test App.test.tsx
```

## 🚀 **Development Workflow**

### **1. Issue Analysis**
Before writing code:
- **Reproduce the Issue**: Confirm the problem exists
- **Identify Root Cause**: Understand why it's happening
- **Plan the Solution**: Design the fix approach
- **Write Tests First**: Create tests that fail (TDD approach)

### **2. Implementation**
- **Make Minimal Changes**: Fix only what's necessary
- **Follow Existing Patterns**: Maintain code consistency
- **Handle Edge Cases**: Consider error scenarios
- **Update Tests**: Ensure all tests pass

### **3. Validation**
- **Run Tests**: Verify functionality works
- **Manual Testing**: Test in browser
- **Code Review**: Self-review before submission
- **Documentation**: Update relevant docs

### **4. Quality Gates**
- **TypeScript Compilation**: `npm run build` must succeed
- **Linting**: `npm run lint` must pass
- **Tests**: `npm run test:run` must pass
- **Manual Verification**: Feature works as expected

## 🏗️ **Architecture Principles**

### **State Management**
- **Zustand**: Lightweight state management
- **Single Source of Truth**: One store for all application state
- **Immutable Updates**: State changes create new objects
- **Persistence**: Local storage for data persistence

### **Component Architecture**
- **Separation of Concerns**: Each component has a single responsibility
- **Props Interface**: Clear contracts between components
- **Event Handling**: Consistent event handling patterns
- **Error Boundaries**: Graceful error handling

### **Performance Considerations**
- **Smart Re-rendering**: Only update what's necessary
- **Event Listener Management**: Proper cleanup and re-addition
- **DOM Manipulation**: Minimize unnecessary DOM recreation
- **Memory Management**: Prevent memory leaks

## 🐛 **Bug Fixing Process**

### **1. Reproduce the Issue**
```bash
# Start development server
npm run dev

# Reproduce the bug in browser
# Document exact steps to reproduce
```

### **2. Write Failing Test**
```typescript
it('should not lose input focus during typing', async () => {
  // This test should fail initially
  // It documents the expected behavior
});
```

### **3. Implement Fix**
- Make minimal code changes
- Focus on the root cause
- Don't introduce new bugs

### **4. Verify Fix**
- Test passes
- Manual verification works
- No regressions introduced

## 📝 **Code Standards**

### **TypeScript**
- **Strict Mode**: Enable all strict TypeScript options
- **Type Safety**: Avoid `any` types, use proper interfaces
- **Null Safety**: Handle undefined/null cases explicitly
- **Generic Types**: Use generics for reusable components

### **React Best Practices**
- **Functional Components**: Use hooks and functional components
- **Effect Dependencies**: Proper dependency arrays in useEffect
- **Event Handling**: Consistent event handler patterns
- **State Updates**: Use proper state update patterns

### **CSS/Styling**
- **CSS Variables**: Use CSS custom properties for theming
- **Responsive Design**: Mobile-first approach
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Performance**: Minimize CSS-in-JS overhead

## 🔍 **Debugging Guide**

### **Common Issues**

#### **Input Focus Loss**
- **Symptom**: Cursor jumps out of input fields
- **Cause**: DOM elements being recreated on state changes
- **Solution**: Implement smart DOM updates that preserve existing elements

#### **View State Conflicts**
- **Symptom**: Multiple views showing simultaneously
- **Cause**: React and DOM manipulation running concurrently
- **Solution**: Ensure only one view rendering method is active

#### **State Synchronization**
- **Symptom**: UI not reflecting latest data
- **Cause**: Component state not syncing with store
- **Solution**: Proper useEffect dependencies and state updates

### **Debugging Tools**
- **Browser DevTools**: Console, Elements, Network tabs
- **React DevTools**: Component state and props inspection
- **Vitest**: Test output and failure details
- **TypeScript**: Compile-time error checking

## 📚 **Learning Resources**

### **Testing**
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### **React & TypeScript**
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

### **Development Tools**
- [Vite Documentation](https://vitejs.dev/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [CSS Best Practices](https://developer.mozilla.org/en-US/docs/Learn/CSS)

## 🤝 **Getting Help**

### **When You're Stuck**
1. **Check the Tests**: Run tests to understand expected behavior
2. **Review Recent Changes**: Look at git history for context
3. **Search Issues**: Check if similar problems were solved
4. **Ask Questions**: Provide specific error messages and reproduction steps

### **Contributing Guidelines**
- **Small, Focused Changes**: One fix per pull request
- **Clear Commit Messages**: Explain what and why, not how
- **Test Coverage**: Include tests for new functionality
- **Documentation**: Update docs for user-facing changes

## 🎯 **Success Metrics**

### **Quality Indicators**
- **Test Coverage**: >90% for critical paths
- **Build Success**: 100% successful builds
- **Lint Clean**: Zero linting errors
- **User Satisfaction**: Features work as expected

### **Development Velocity**
- **Bug Fix Time**: Faster resolution through testing
- **Feature Delivery**: Confident deployment of new features
- **Regression Prevention**: Fewer bugs introduced by changes
- **Code Confidence**: Developers trust their changes work

---

**Remember**: Testing isn't just about finding bugs—it's about building confidence that your code actually works. Every test you write makes the project more reliable and your contributions more valuable.

Happy coding! 🚀
