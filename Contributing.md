# 📄 `CONTRIBUTING.md`

# Contributing to Voting Topics

## 🚀 Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/yourusername/voting-topics.git`
3. **Install dependencies**: `npm install`
4. **Start development server**: `npm run dev`
5. **Run tests**: `npm run test:run`

## 🧪 Testing Methodology

### **Test-Driven Development (TDD)**
- **Write tests FIRST** for any new feature or bug fix
- **Run tests BEFORE** implementing changes to establish baseline
- **Validate fixes** by running tests to confirm resolution
- **Never claim a fix works** without test validation

### **Test Environment Setup**
- **Vitest** + **React Testing Library** for component testing
- **JSDOM** for DOM simulation in test environment
- **Mock Store** for isolated component testing
- **Clean DOM** between tests to prevent state pollution

### **Critical Testing Principles**
1. **Test Isolation**: Each test should be completely independent
2. **Realistic Scenarios**: Test actual user interactions, not just component props
3. **State Validation**: Verify both UI changes AND internal state changes
4. **Timing Awareness**: Use `waitFor` for asynchronous operations

## 🐛 Bug Fixing Process

### **1. Reproduce the Issue**
- **User Report**: Document exact steps to reproduce
- **Environment**: Note browser, OS, and specific conditions
- **Expected vs Actual**: Clearly define what should happen vs what does happen

### **2. Investigate Root Cause**
- **Code Review**: Examine relevant components and logic
- **State Tracing**: Follow data flow through components
- **Console Logging**: Add temporary logging to understand execution path
- **Test Validation**: Create tests that reproduce the issue

### **3. Implement Fix**
- **Minimal Changes**: Make only necessary modifications
- **Preserve Functionality**: Ensure existing features still work
- **Update Tests**: Modify tests to reflect new expected behavior
- **Document Changes**: Comment on why the fix was necessary

### **4. Validate Resolution**
- **Manual Testing**: Test in browser to confirm fix works
- **Test Suite**: Run full test suite to ensure no regressions
- **Edge Cases**: Consider and test related scenarios
- **User Confirmation**: Get user feedback on the fix

## 🔍 Debugging Guide

### **Common Debugging Patterns**

#### **Closure Issues (State Capture)**
```typescript
// ❌ PROBLEMATIC: Button captures stale state
useEffect(() => {
  const btn = document.createElement('button');
  btn.onclick = () => setState(!state); // Captures initial state value
}, []); // Only runs once

// ✅ SOLUTION: Update handler when state changes
useEffect(() => {
  const btn = document.getElementById('btn');
  if (btn) {
    btn.onclick = () => setState(!state); // Always current state
  }
}, [state]); // Runs when state changes
```

#### **DOM vs React Conflicts**
```typescript
// ❌ PROBLEMATIC: Mixing DOM manipulation with React
useEffect(() => {
  document.getElementById('list').innerHTML = renderTopics(); // Conflicts with React
}, [topics]);

// ✅ SOLUTION: Pure React conditional rendering
return (
  <>
    {showCards && <TopicCards topics={topics} />}
    {!showCards && <TopicList topics={topics} />}
  </>
);
```

#### **Test Environment Conflicts**
```typescript
// ❌ PROBLEMATIC: Test creates DOM elements that conflict with React
const mockDOMElements = () => {
  const list = document.createElement('div');
  list.id = 'topic-list'; // Conflicts with React component
  document.body.appendChild(list);
};

// ✅ SOLUTION: Let React handle all rendering
const mockDOMElements = () => {
  // Only create necessary elements (toolbar, inputs)
  // Let React components render their own DOM structure
};
```

### **Debugging Strategies**

1. **Console Logging**: Add `console.log` statements to trace execution
2. **React DevTools**: Use browser extension to inspect component state
3. **Test Isolation**: Run individual tests to isolate specific issues
4. **State Inspection**: Log state changes to understand data flow
5. **DOM Inspection**: Use browser dev tools to examine rendered structure

## 🏗️ Architecture Principles

### **React-First Approach**
- **No Direct DOM Manipulation**: Use React components for all UI rendering
- **State-Driven Rendering**: Let component state determine what renders
- **Event Handler Consistency**: Ensure event handlers always reference current state
- **Component Isolation**: Each component should be independently testable

### **State Management**
- **Zustand Store**: Centralized state management for app data
- **Local Component State**: Use `useState` for UI-specific state (view toggles, modals)
- **State Synchronization**: Keep local and global state in sync
- **Immutable Updates**: Never mutate state directly

### **Component Design**
- **Single Responsibility**: Each component should have one clear purpose
- **Props Interface**: Define clear interfaces for component props
- **Event Callbacks**: Use consistent patterns for parent-child communication
- **Error Boundaries**: Handle errors gracefully at component level

## 📝 Code Standards

### **TypeScript**
- **Strict Mode**: Enable all strict TypeScript options
- **Type Definitions**: Define interfaces for all data structures
- **Generic Types**: Use generics for reusable components
- **Type Guards**: Validate data at runtime when necessary

### **React Patterns**
- **Functional Components**: Use function components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Effect Dependencies**: Always specify correct dependency arrays
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations

### **Error Handling**
- **Try-Catch Blocks**: Wrap async operations in try-catch
- **User Feedback**: Provide clear error messages to users
- **Graceful Degradation**: Handle errors without crashing the app
- **Logging**: Log errors for debugging purposes

## 🚨 Common Pitfalls

### **1. Stale Closures**
- **Problem**: Event handlers capture old state values
- **Solution**: Update handlers when dependencies change
- **Detection**: Tests fail intermittently, state seems "stuck"

### **2. DOM/React Conflicts**
- **Problem**: Direct DOM manipulation interferes with React rendering
- **Solution**: Use pure React components and conditional rendering
- **Detection**: Both views render simultaneously, unexpected DOM elements

### **3. Test Environment Pollution**
- **Problem**: Tests create DOM elements that conflict with components
- **Solution**: Clean DOM between tests, let React handle rendering
- **Detection**: Tests pass in isolation but fail in sequence

### **4. State Synchronization**
- **Problem**: Local component state gets out of sync with global state
- **Solution**: Use effects to synchronize state changes
- **Detection**: UI doesn't update when data changes

## 📚 Learning Resources

- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Testing Library**: https://testing-library.com/docs/
- **Zustand**: https://github.com/pmndrs/zustand
- **Vite**: https://vitejs.dev/guide/

## 🆘 Getting Help

### **Before Asking for Help**
1. **Reproduce the issue** in a minimal example
2. **Check existing issues** for similar problems
3. **Run the test suite** to identify specific failures
4. **Document your environment** (OS, Node version, etc.)

### **When Reporting Issues**
1. **Clear description** of what you're trying to do
2. **Steps to reproduce** the issue
3. **Expected vs actual behavior**
4. **Error messages** and console output
5. **Environment details** and versions

### **Code Review Process**
1. **Self-review** your changes before submitting
2. **Run tests** to ensure no regressions
3. **Update documentation** for any new features
4. **Explain the reasoning** behind significant changes

---

**Remember**: The goal is to build a robust, maintainable application that provides a great user experience. Every bug fix and feature addition should move us closer to that goal! 🎯
