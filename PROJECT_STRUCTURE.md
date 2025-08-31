# Project Structure

This document outlines the structure of the Voting Topics application after refactoring from a monolithic HTML file to a modern React TypeScript application.

## 📁 Directory Structure

```
voting-topics/
├── src/                          # Source code
│   ├── components/               # React components
│   │   ├── Stars.tsx            # Star rating component (0-5 stars)
│   │   ├── TopicCard.tsx        # Individual topic editing card
│   │   └── TopicList.tsx        # Container for all topic cards
│   ├── schema.ts                 # Zod schema definitions and types
│   ├── store.ts                  # Zustand state management
│   ├── utils.ts                  # Utility functions
│   ├── exporters.ts              # Export functionality (PDF, JPEG, JSON)
│   ├── App.tsx                   # Main application component
│   ├── main.tsx                  # Application entry point
│   └── index.css                 # Global styles and CSS variables
├── scripts/                      # Development and build scripts
│   └── setup.sh                  # Setup script for new developers
├── dist/                         # Build output (generated)
├── node_modules/                 # Dependencies (generated)
├── index.html                    # Main HTML file (simplified)
├── package.json                  # Project configuration and dependencies
├── package-lock.json             # Dependency lock file
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.node.json            # TypeScript config for Node.js tools
├── vite.config.ts                # Vite build configuration
├── .eslintrc.cjs                 # ESLint configuration
├── .gitignore                    # Git ignore patterns
├── README.md                     # Project documentation
├── Contributing.md               # Contribution guidelines
├── PROJECT_STRUCTURE.md          # This file
└── issues.json                   # Issue tracking data
```

## 🔧 Key Files Explained

### Source Code (`src/`)

#### Components
- **`Stars.tsx`**: Interactive star rating component with keyboard navigation (arrow keys)
- **`TopicCard.tsx`**: Form for editing individual topics including title, importance, direction, notes, and sources
- **`TopicList.tsx`**: Container component that renders the list of topics and handles empty state

#### Core Logic
- **`schema.ts`**: Zod schemas for data validation and TypeScript type definitions
- **`store.ts`**: Zustand store for global state management (topics, title, notes)
- **`utils.ts`**: Helper functions for ID generation, date formatting, file downloads, etc.
- **`exporters.ts`**: Functions for exporting data as JSON, PDF, or JPEG images

#### Application
- **`App.tsx`**: Main application component that sets up event handlers and renders the topic list
- **`main.tsx`**: React application entry point
- **`index.css`**: Global styles including CSS variables for theming

### Configuration Files

- **`package.json`**: Project metadata, scripts, and dependencies
- **`tsconfig.json`**: TypeScript compiler options
- **`vite.config.ts`**: Vite build tool configuration
- **`.eslintrc.cjs`**: Code linting rules and configuration

### Build Output

- **`dist/`**: Generated production build files (created by `npm run build`)

## 🚀 Development Workflow

### Getting Started
1. Run `./scripts/setup.sh` to set up the development environment
2. Run `npm run dev` to start the development server
3. Open `http://localhost:3000` in your browser

### Available Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Check code quality
- `npm run lint:fix` - Automatically fix linting issues

### Code Organization Principles

1. **Separation of Concerns**: Each component has a single responsibility
2. **Type Safety**: Full TypeScript coverage with Zod schema validation
3. **State Management**: Centralized state with Zustand
4. **Reusability**: Components are designed to be reusable and composable
5. **Accessibility**: ARIA labels and keyboard navigation support

## 🔄 Migration from Monolithic HTML

The original `index.html` contained:
- Inline CSS styles
- Inline JavaScript with React components
- CDN imports for dependencies
- Mixed concerns (HTML structure + React logic + styles)

The new structure provides:
- **Modularity**: Each concern is in its own file
- **Maintainability**: Easier to find and modify specific functionality
- **Type Safety**: TypeScript prevents runtime errors
- **Build Process**: Modern tooling for development and production
- **Dependency Management**: Proper package management with npm
- **Code Quality**: ESLint ensures consistent code style

## 📱 Component Architecture

```
App
└── TopicList
    └── TopicCard (multiple)
        └── Stars
```

- **App**: Manages global state and event handlers
- **TopicList**: Renders the list of topics and handles empty state
- **TopicCard**: Individual topic editing interface
- **Stars**: Reusable star rating component

## 🎨 Styling Approach

- **CSS Variables**: Centralized theming with CSS custom properties
- **Component Scoping**: Styles are organized by component
- **Responsive Design**: Mobile-first approach with media queries
- **Accessibility**: High contrast colors and proper focus states

## 🔍 State Management

The application uses Zustand for state management with the following structure:

```typescript
interface Store {
  title: string;           // Template title
  notes: string;           // Template notes
  topics: Topic[];         // Array of topics
  // ... actions for updating state
}
```

State is persisted to localStorage automatically, providing a seamless user experience.

## 📦 Build Process

1. **Development**: Vite provides fast hot module replacement
2. **Production**: Optimized bundle with tree-shaking and minification
3. **Type Checking**: TypeScript compilation ensures type safety
4. **Linting**: ESLint maintains code quality standards

This structure provides a solid foundation for future development while maintaining the original functionality and user experience.
