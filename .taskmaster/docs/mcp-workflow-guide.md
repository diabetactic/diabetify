# MCP Workflow Guide - Diabetify Project

This guide documents efficient strategies for using Model Context Protocol (MCP) servers available in this project to optimize development workflow.

## Table of Contents

- [Available MCPs](#available-mcps)
- [Claude-Context: Semantic Code Search](#claude-context-semantic-code-search)
- [Context7: Library Documentation](#context7-library-documentation)
- [Specialized Subagents](#specialized-subagents)
- [Parallelization Techniques](#parallelization-techniques)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)

---

## Available MCPs

This project has three main MCP servers configured in `.mcp.json`:

1. **claude-context** - Semantic code search powered by vector embeddings
2. **context7** - Up-to-date library documentation for dependencies
3. **taskmaster-ai** - Task management and project planning

---

## Claude-Context: Semantic Code Search

### Setup

The codebase must be indexed once per session before searching:

```javascript
mcp__claude -
  context__index_codebase({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
    splitter: 'ast', // AST-based splitting with automatic fallback
    force: false, // Set to true to re-index
  });
```

### Usage Patterns

#### When to Use Semantic Search

Use claude-context BEFORE:

- Implementing new features (find similar patterns)
- Debugging issues (locate error handling code)
- Refactoring (find all usages of a pattern)
- Understanding architecture (discover component relationships)

#### Effective Search Queries

**Good queries** (natural language describing intent):

```javascript
// ✅ Finding glucose parsing logic
mcp__claude -
  context__search_code({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
    query: 'glucose measurement parsing and SFLOAT16 conversion',
    limit: 10,
  });

// ✅ Finding BLE connection handling
mcp__claude -
  context__search_code({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
    query: 'bluetooth low energy device connection and disconnect callbacks',
    limit: 10,
  });

// ✅ Finding routing patterns
mcp__claude -
  context__search_code({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
    query: 'lazy loaded routing modules with tab navigation',
    limit: 10,
  });
```

**Poor queries** (too broad or generic):

```javascript
// ❌ Too generic
query: 'angular';
query: 'function';
query: 'data';
```

#### Extension Filtering

Narrow results by file type:

```javascript
mcp__claude -
  context__search_code({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
    query: 'ion-tab components and tab routing',
    extensionFilter: ['.ts', '.html'], // Only TypeScript and HTML
    limit: 10,
  });
```

### Project-Specific Search Examples

#### Finding Glucose Data Handling

```javascript
// Find where glucose readings are stored/displayed
mcp__claude -
  context__search_code({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
    query: 'glucose reading array storage and display in UI',
    extensionFilter: ['.ts'],
    limit: 5,
  });
```

#### Finding BLE Service Implementation

```javascript
// Locate all BLE service UUID definitions and usage
mcp__claude -
  context__search_code({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
    query: 'bluetooth GATT service UUID definitions and characteristic notifications',
    limit: 8,
  });
```

#### Finding Navigation Patterns

```javascript
// Understand tab-based navigation structure
mcp__claude -
  context__search_code({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
    query: 'ionic tabs navigation routing configuration',
    extensionFilter: ['.ts', '.html'],
    limit: 10,
  });
```

### Performance Tips

1. **Index once per session** - Indexing takes time, do it at the start
2. **Use specific queries** - More specific = better results
3. **Limit results appropriately** - Start with 5-10 results, increase if needed
4. **Filter by extension** - Reduce noise by targeting specific file types

### Checking Index Status

```javascript
mcp__claude -
  context__get_indexing_status({
    path: 'C:\\Users\\Julian\\Codigo\\diabetify',
  });
```

---

## Context7: Library Documentation

### Setup

Context7 requires a two-step process:

1. Resolve library name to Context7 ID
2. Fetch documentation for that library

### Usage Pattern

#### Step 1: Resolve Library ID

```javascript
mcp__context7__resolve -
  library -
  id({
    libraryName: 'ionic',
  });
```

Returns a Context7-compatible library ID (e.g., `/ionic-team/ionic-framework`).

#### Step 2: Get Documentation

```javascript
mcp__context7__get -
  library -
  docs({
    context7CompatibleLibraryID: '/ionic-team/ionic-framework',
    topic: 'ion-tabs', // Optional: focus on specific topic
    tokens: 5000, // Optional: control documentation size
  });
```

### Project Dependencies

Key libraries to document with Context7:

| Library       | Typical Library ID                  | Use Cases                     |
| ------------- | ----------------------------------- | ----------------------------- |
| Ionic         | `/ionic-team/ionic-framework`       | UI components, navigation     |
| Angular       | `/angular/angular`                  | Component lifecycle, services |
| Capacitor     | `/ionic-team/capacitor`             | Native APIs, plugins          |
| Capacitor BLE | `/capacitor-community/bluetooth-le` | Bluetooth integration         |
| RxJS          | `/reactivex/rxjs`                   | Observables, operators        |

### When to Use Context7

- **Before implementing new features** - Get latest API documentation
- **When encountering errors** - Check for breaking changes or new patterns
- **During upgrades** - Understand migration paths
- **Learning new APIs** - Get comprehensive, up-to-date examples

### Example Workflows

#### Getting Ionic Component Documentation

```javascript
// 1. Resolve Ionic library
mcp__context7__resolve - library - id({ libraryName: 'ionic' });

// 2. Get specific component docs
mcp__context7__get -
  library -
  docs({
    context7CompatibleLibraryID: '/ionic-team/ionic-framework',
    topic: 'ion-tabs navigation and routing',
    tokens: 3000,
  });
```

#### Getting Capacitor BLE Documentation

```javascript
// 1. Resolve BLE plugin
mcp__context7__resolve -
  library -
  id({
    libraryName: 'capacitor bluetooth-le',
  });

// 2. Get BLE API docs
mcp__context7__get -
  library -
  docs({
    context7CompatibleLibraryID: '/capacitor-community/bluetooth-le',
    topic: 'GATT service notifications and characteristic reads',
    tokens: 5000,
  });
```

---

## Specialized Subagents

Claude Code provides specialized agents for complex tasks. Deploy them proactively for better results.

### Available Agents for This Project

#### Frontend Development

```javascript
Task({
  subagent_type: 'frontend-developer',
  description: 'Implement glucose chart component',
  prompt:
    'Create an Ionic Angular component that displays glucose readings in a line chart using Chart.js. The component should show the last 24 hours of readings with color-coded zones (low/normal/high).',
});
```

**Use for:**

- React/Angular component implementation
- Responsive UI layouts
- Client-side state management
- Performance optimization

#### Mobile Development

```javascript
Task({
  subagent_type: 'mobile-developer',
  description: 'Add background BLE scanning',
  prompt:
    'Implement background Bluetooth scanning for glucose monitors using Capacitor. Handle iOS/Android platform differences and maintain connection state across app lifecycle events.',
});
```

**Use for:**

- Capacitor plugin integration
- Native platform features
- Cross-platform compatibility
- App store optimization

#### TypeScript Expert

```javascript
Task({
  subagent_type: 'typescript-pro',
  description: 'Refactor glucose data types',
  prompt:
    'Refactor the GlucoseReading interface and related types to use discriminated unions for different reading types. Add proper type guards and ensure type safety across the parsing logic.',
});
```

**Use for:**

- Complex TypeScript patterns
- Type system optimization
- Advanced generics
- Type safety improvements

#### Performance Engineering

```javascript
Task({
  subagent_type: 'performance-engineer',
  description: 'Optimize BLE data processing',
  prompt:
    'Analyze and optimize the glucose reading parsing performance. The app processes 100+ readings on connection. Profile the SFLOAT16 conversion and identify bottlenecks.',
});
```

**Use for:**

- Performance profiling
- Optimization strategies
- Caching implementation
- Bundle size reduction

#### Test Automation

```javascript
Task({
  subagent_type: 'test-automator',
  description: 'Add BLE service tests',
  prompt:
    'Create comprehensive Jasmine unit tests for the BLE glucose service. Mock Capacitor BLE plugin, test connection flows, and validate glucose reading parsing logic.',
});
```

**Use for:**

- Test suite creation
- Mock implementation
- E2E test scenarios
- Test coverage improvement

### Agent Deployment Strategy

1. **Use specific agents** - Match agent specialization to task type
2. **Provide context** - Include relevant code references and requirements
3. **Deploy in parallel** - Run multiple agents simultaneously when tasks are independent
4. **Chain agents** - Use output from one agent as input to another for complex workflows

---

## Parallelization Techniques

Maximize efficiency by batching independent operations.

### Tool Call Parallelization

When multiple operations have no dependencies, execute them simultaneously:

```xml
<!-- ❌ Sequential (slow) -->
Read({ file_path: "src/app/devices/tab1.page.ts" })
<!-- Wait... -->
Read({ file_path: "src/app/tabs/tabs-routing.module.ts" })
<!-- Wait... -->

<!-- ✅ Parallel (fast) -->
<function_calls>
<invoke name="Read">
<parameter name="file_path">src/app/devices/tab1.page.ts
```
