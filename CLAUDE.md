# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 🎯 CRITICAL: Claude Code Task Tool for Agent Execution

**Claude Code's Task tool is the PRIMARY way to spawn agents:**
```javascript
// ✅ CORRECT: Use Claude Code's Task tool for parallel agent execution
[Single Message]:
  Task("Research agent", "Analyze requirements and patterns...", "researcher")
  Task("Coder agent", "Implement core features...", "coder")
  Task("Tester agent", "Create comprehensive tests...", "tester")
  Task("Reviewer agent", "Review code quality...", "reviewer")
  Task("Architect agent", "Design system architecture...", "system-architect")
```

**MCP tools are ONLY for coordination setup:**
- `mcp__claude-flow__swarm_init` - Initialize coordination topology
- `mcp__claude-flow__agent_spawn` - Define agent types for coordination
- `mcp__claude-flow__task_orchestrate` - Orchestrate high-level workflows

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/playwright/tests` - E2E test files
- `/docs` - Documentation and markdown files
- `/scripts` - Utility scripts
- `/specs` - Feature specifications

## 📱 Project Overview: Diabetify Mobile Health App

**Diabetify** is an Angular/Ionic mobile application for diabetes management with Tidepool API integration.

### Tech Stack
- **Frontend**: Angular 20 + Ionic 8 + Angular Material 20
- **Styling**: Tailwind CSS v4 + DaisyUI v5.4.7 (see UI Components section)
- **Mobile**: Capacitor 6 (iOS/Android)
- **Data**: Dexie (IndexedDB) for offline storage, RxJS for reactive state
- **Testing**: Jasmine/Karma (unit), Playwright (E2E)
- **i18n**: @ngx-translate for multi-language support
- **Backend**: Tidepool API for glucose readings and patient data

### Key Features
1. **Tidepool Authentication**: OAuth2/PKCE login flow
2. **Glucose Readings**: Fetch and display patient glucose data
3. **Patient Dashboard**: Link to Tidepool clinic dashboard
4. **Offline-First**: Local data storage with sync
5. **Multi-Language**: English/Spanish translations

### Development Methodology
This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## 🚀 Claude-Flow: Multi-Agent Orchestration

Claude-Flow is the primary orchestration framework for coordinating agents, memory, and workflows.

### Core Commands

```bash
# SPARC Development Workflow
npx claude-flow sparc modes                    # List available modes
npx claude-flow sparc run <mode> "<task>"      # Execute specific mode
npx claude-flow sparc tdd "<feature>"          # Run complete TDD workflow
npx claude-flow sparc info <mode>              # Get mode details

# Batch Processing
npx claude-flow sparc batch <modes> "<task>"   # Parallel execution
npx claude-flow sparc pipeline "<task>"        # Full pipeline processing
npx claude-flow sparc concurrent <mode> "<tasks-file>"  # Multi-task

# Hooks (for agent coordination)
npx claude-flow hooks pre-task --description "[task]"
npx claude-flow hooks post-edit --file "[file]"
npx claude-flow hooks post-task --task-id "[task]"
npx claude-flow hooks session-restore --session-id "[id]"
npx claude-flow hooks session-end --export-metrics true
```

### MCP Tools

Claude-flow MCP tools coordinate multi-agent workflows. Use with Claude Code's Task tool:

```javascript
// Step 1: Initialize swarm topology (optional)
mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }

// Step 2: Define agent types for coordination
mcp__claude-flow__agent_spawn { type: "researcher", name: "Research Agent" }
mcp__claude-flow__agent_spawn { type: "coder", name: "Implementation Agent" }

// Step 3: Claude Code Task tool spawns ACTUAL agents
Task("Research agent", "Analyze API patterns. Store findings in memory.", "researcher")
Task("Coder agent", "Implement endpoints. Check memory for decisions.", "coder")
Task("Tester agent", "Write comprehensive tests. Coordinate via hooks.", "tester")

// Monitoring
mcp__claude-flow__swarm_status { swarmId: "swarm-123" }
mcp__claude-flow__agent_metrics { agentId: "agent-456" }
mcp__claude-flow__task_status { taskId: "task-789" }

// Memory Management
mcp__claude-flow__memory_usage {
  action: "store",
  key: "api-design",
  value: "REST endpoints specification",
  namespace: "project"
}
mcp__claude-flow__memory_search { pattern: "api-*", limit: 10 }
```

### Available Agents (54 Total)

**Core Development**: `coder`, `reviewer`, `tester`, `planner`, `researcher`

**SPARC Methodology**: `sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

**Specialized**: `backend-dev`, `mobile-dev`, `system-architect`, `code-analyzer`, `api-docs`

**Testing**: `tdd-london-swarm`, `production-validator`

**Performance**: `perf-analyzer`, `performance-benchmarker`, `task-orchestrator`

**GitHub**: `github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

**Coordination**: `hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

**Consensus**: `byzantine-coordinator`, `raft-manager`, `gossip-coordinator`

## 🔧 Development MCP Servers

Your project has these MCP servers configured. Use them for specialized tasks:

### 1. 🔍 Tavily - Web Search & Content Extraction (FREE)

Real-time web search and content extraction for research.

```javascript
// Search the web for current information
mcp__tavily__tavily-search {
  query: "Angular 20 standalone components best practices",
  max_results: 10,
  search_depth: "advanced"
}

// Extract content from specific URLs
mcp__tavily__tavily-extract {
  urls: ["https://angular.dev/guide/standalone-components"],
  format: "markdown",
  extract_depth: "advanced"
}

// Crawl documentation sites
mcp__tavily__tavily-crawl {
  url: "https://ionicframework.com/docs",
  max_depth: 2,
  limit: 50,
  instructions: "Focus on Ionic 8 migration guides"
}

// Map website structure
mcp__tavily__tavily-map {
  url: "https://capacitorjs.com/docs",
  max_depth: 3,
  limit: 100
}
```

**When to use Tavily:**
- Research current best practices
- Find solutions to specific problems
- Extract content from documentation sites
- Stay updated on framework changes
- Discover community solutions

### 2. 📚 Context7 - Library Documentation (FREE)

Get up-to-date documentation for any library or framework.

```javascript
// Find library documentation
mcp__context7__resolve-library-id {
  libraryName: "angular"
}

// Get specific docs with focused topic
mcp__context7__get-library-docs {
  context7CompatibleLibraryID: "/angular/docs",
  topic: "dependency injection",
  tokens: 5000  // Adjust for more/less context
}

// Examples for this project
// - Angular: "/angular/docs"
// - Ionic: "/ionic-team/ionic-framework"
// - Capacitor: "/ionic-team/capacitor"
// - RxJS: "/reactivex/rxjs"
```

**When to use Context7:**
- Look up API documentation
- Understand framework features
- Find usage examples
- Check migration guides
- Verify method signatures

### 3. 🎭 Playwright - Browser Automation & E2E Testing (FREE)

Comprehensive browser automation for E2E testing.

```javascript
// Navigate and capture state
mcp__playwright__browser_navigate { url: "http://localhost:4200" }
mcp__playwright__browser_snapshot {}  // Get accessibility tree

// Interact with UI
mcp__playwright__browser_click {
  element: "Login button",
  ref: "[data-testid='login-btn']"
}

mcp__playwright__browser_type {
  element: "Username input",
  ref: "input[name='username']",
  text: "testuser@example.com",
  submit: false
}

mcp__playwright__browser_fill_form {
  fields: [
    { name: "email", type: "textbox", ref: "#email", value: "test@example.com" },
    { name: "password", type: "textbox", ref: "#password", value: "password123" },
    { name: "remember", type: "checkbox", ref: "#remember-me", value: "true" }
  ]
}

// Take screenshots and visual validation
mcp__playwright__browser_take_screenshot {
  filename: "playwright/screenshots/login-page.png",
  fullPage: true
}

// Handle navigation
mcp__playwright__browser_navigate_back {}

// Tabs management
mcp__playwright__browser_tabs { action: "list" }
mcp__playwright__browser_tabs { action: "new" }
mcp__playwright__browser_tabs { action: "select", index: 1 }

// Wait for conditions
mcp__playwright__browser_wait_for { text: "Welcome" }
mcp__playwright__browser_wait_for { time: 2 }  // seconds

// Network and console monitoring
mcp__playwright__browser_network_requests {}
mcp__playwright__browser_console_messages { onlyErrors: false }
```

**When to use Playwright:**
- E2E test automation (npm run test:e2e)
- UI interaction testing
- Visual regression testing
- Form validation testing
- Network request monitoring
- Console error detection

### 4. 📱 Android-ADB - Android Device Management (FREE)

Interact with Android devices and emulators via ADB.

```javascript
// List connected devices
mcp__android-adb__adb_devices {}

// Install APK (after npm run cap:sync)
mcp__android-adb__adb_install {
  path: "android/app/build/outputs/apk/debug/app-debug.apk"
}

// Uninstall app
mcp__android-adb__adb_uninstall {
  package_name: "com.diabetactic.app"
}

// List installed packages
mcp__android-adb__adb_list_packages {
  filter: "diabetactic"
}

// Execute shell commands
mcp__android-adb__adb_shell {
  command: "dumpsys activity top | grep ACTIVITY"
}

// Launch app
mcp__android-adb__launch_app {
  package_name: "com.diabetactic.app"
}

// Take screenshot
mcp__android-adb__take_screenshot_and_save {
  output_path: "screenshots/android-home.png",
  format: "png"
}

// Push/pull files
mcp__android-adb__adb_push {
  local_path: "test-data.json",
  remote_path: "/sdcard/Download/test-data.json"
}

mcp__android-adb__adb_pull {
  remote_path: "/sdcard/DCIM/Screenshots/",
  local_path: "./android-screenshots/"
}
```

**When to use Android-ADB:**
- Install development builds on devices
- Debug app behavior on real devices
- Capture screenshots for documentation
- Test with different data sets
- Inspect app state and logs
- Automate device testing workflows

### 5. 🧪 BrowserStack - Cross-Device Testing (Requires Account)

Test on real devices and browsers in the cloud.

**Note**: Requires BrowserStack account. Update `.mcp.json` with your credentials:
```json
"BROWSERSTACK_USERNAME": "your-username",
"BROWSERSTACK_ACCESS_KEY": "your-access-key"
```

```javascript
// Start live testing session (desktop)
mcp__browserstack__runBrowserLiveSession {
  platformType: "desktop",
  desiredURL: "http://localhost:4200",
  desiredOS: "Windows",
  desiredOSVersion: "11",
  desiredBrowser: "chrome",
  desiredBrowserVersion: "latest"
}

// Start live testing session (mobile)
mcp__browserstack__runBrowserLiveSession {
  platformType: "mobile",
  desiredURL: "http://localhost:4200",
  desiredOS: "android",
  desiredOSVersion: "14.0",
  desiredDevice: "Samsung Galaxy S24"
}

// Run app on real device
mcp__browserstack__runAppLiveSession {
  desiredPlatform: "android",
  desiredPhone: "Samsung Galaxy S24",
  desiredPlatformVersion: "14.0",
  appPath: "android/app/build/outputs/apk/debug/app-debug.apk"
}

// Automated testing setup
mcp__browserstack__setupBrowserStackAutomateTests {
  projectName: "Diabetify Web Tests",
  detectedLanguage: "nodejs",
  detectedBrowserAutomationFramework: "playwright",
  detectedTestingFramework: "playwright",
  devices: [
    ['windows', '11', 'chrome', 'latest'],
    ['android', 'Samsung Galaxy S24', '14', 'chrome']
  ]
}

// App automation setup
mcp__browserstack__setupBrowserStackAppAutomateTests {
  project: "Diabetify Mobile",
  detectedFramework: "appium",
  detectedLanguage: "nodejs",
  detectedTestingFramework: "mocha",
  appPath: "android/app/build/outputs/apk/debug/app-debug.apk",
  devices: [
    ['android', 'Samsung Galaxy S24', '14'],
    ['ios', 'iPhone 15', '17']
  ]
}

// Take screenshot on device
mcp__browserstack__takeAppScreenshot {
  desiredPlatform: "android",
  desiredPhone: "Google Pixel 8",
  desiredPlatformVersion: "14",
  appPath: "android/app/build/outputs/apk/debug/app-debug.apk"
}
```

**When to use BrowserStack:**
- Test on specific devices/browsers
- Verify cross-platform compatibility
- Debug device-specific issues
- Automated testing on multiple platforms
- Visual testing on real devices
- Performance testing on actual hardware

### 6. 🎬 Maestro - Mobile UI Testing (Requires Installation)

Simple, effective mobile UI testing framework.

**Installation Required:**
```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
```

**Configuration**: Maestro MCP requires maestro CLI to be installed and in PATH. The MCP server will work once maestro is installed.

```yaml
# Example: maestro/tests/login-flow.yaml
appId: com.diabetactic.app
---
- launchApp
- tapOn: "Login"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Welcome"
```

**When to use Maestro:**
- Simple, readable UI tests
- Quick mobile test automation
- Integration with CI/CD
- Cross-platform iOS/Android tests
- Visual flow documentation

### 7. 🧠 Zen - Multi-Model AI CLI with Agent Delegation

Zen is an AI-powered CLI that complements claude-flow by providing multi-model comparisons and agent delegation.

**Key Differences from Claude-Flow:**
- **Claude-Flow**: Coordinates Claude agents with memory/hooks for code implementation
- **Zen**: Delegates tasks to external AI CLIs, compares results across models, manages workflows

```bash
# Zen uses Gemini by default (configured in .mcp.json)
# Can delegate to other CLI tools via "clink" feature

# Use Cases (Non-overlapping with claude-flow):

# 1. Compare AI Model Results
# Use zen to get Gemini's perspective, compare with claude-flow's Claude agents
Task("Zen Researcher", "Research Angular patterns using Gemini", "researcher")
Task("Claude Researcher", "Research Angular patterns using Claude", "researcher")
# Then compare approaches

# 2. Delegate to External CLI Tools via Clink
# Zen can invoke other CLI tools and process their output
# Example: Use aider for code refactoring, compare with claude-flow
zen clink --tool aider --task "Refactor auth service"
zen clink --tool cursor --task "Generate component boilerplate"

# 3. Workflow Orchestration Across Tools
# Zen can chain multiple CLI tools in a workflow
zen workflow --steps "aider:refactor,cursor:test,claude:review"

# 4. Model Benchmarking
# Compare performance/quality across different AI models
zen benchmark --task "Generate test cases" --models "gemini,claude,gpt4"
```

**Zen MCP Usage:**

```javascript
// Note: Zen MCP tools are not directly exposed
// Zen works as a CLI tool that can be called via Bash

// Example workflow: Compare solutions
Bash("zen ask 'Best approach for Ionic navigation guards' --model gemini")
// Then use claude-flow agents to implement the chosen approach
Task("Coder", "Implement navigation guards based on research", "coder")

// Example: Delegate to external tools
Bash("zen clink --tool aider --task 'Refactor database.service.ts'")
// Review the changes with claude-flow
Task("Reviewer", "Review refactored database service", "reviewer")
```

**When to use Zen:**
- Get alternative perspectives (Gemini vs Claude)
- Delegate to specialized CLI tools (aider, cursor, etc.)
- Compare implementation approaches across models
- Workflow orchestration with multiple tools
- Benchmark AI model performance
- Chain CLI tools together via clink

**Zen + Claude-Flow Pattern:**
```javascript
// 1. Use Zen for multi-model research
Bash("zen ask 'Compare Tidepool OAuth implementations' --verbose")

// 2. Use claude-flow agents for implementation
Task("Architect", "Design auth based on Zen research", "system-architect")
Task("Coder", "Implement OAuth flow", "coder")
Task("Tester", "Write auth tests", "tester")

// 3. Use Zen clink to delegate specialized tasks
Bash("zen clink --tool aider --task 'Optimize auth performance'")

// 4. Use claude-flow for review and integration
Task("Reviewer", "Review all auth changes", "reviewer")
```

## 🎨 UI Components

### Two-Library Approach

Diabetify uses a **complementary two-library UI system**:

**DaisyUI v5.4.7** - Content Components
- Semantic HTML components with Tailwind utility classes
- Pure CSS, no JavaScript runtime
- Use for: badges, cards, alerts, forms, stats
- Bundle impact: +12-15 KB gzipped
- Documentation: [docs/DAISYUI_QUICK_GUIDE.md](./docs/DAISYUI_QUICK_GUIDE.md)

**Ionic Angular** - Native Mobile Interactions
- Platform-specific mobile UI components
- Native gestures and animations
- Use for: navigation, buttons, lists, modals, action sheets
- Provides mobile-first, touch-optimized experience

### When to Use Each

**Use DaisyUI for:**
```html
<!-- Content badges -->
<div class="badge badge-success">Normal</div>

<!-- Data cards -->
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Reading Details</h2>
    <p>Content here</p>
  </div>
</div>

<!-- Alert messages -->
<div role="alert" class="alert alert-info">
  <span>Information message</span>
</div>

<!-- Forms -->
<input type="text" class="input input-bordered" />
<select class="select select-bordered">
  <option>Option 1</option>
</select>

<!-- Statistics -->
<div class="stats shadow">
  <div class="stat">
    <div class="stat-title">Avg Glucose</div>
    <div class="stat-value">126</div>
  </div>
</div>
```

**Use Ionic for:**
```html
<!-- Navigation -->
<ion-header>
  <ion-toolbar>
    <ion-title>Dashboard</ion-title>
  </ion-toolbar>
</ion-header>

<!-- Action buttons -->
<ion-button expand="block" (click)="save()">
  Save Reading
</ion-button>

<!-- Lists with gestures -->
<ion-list>
  <ion-item-sliding>
    <ion-item>Content</ion-item>
    <ion-item-options>
      <ion-item-option (click)="delete()">Delete</ion-item-option>
    </ion-item-options>
  </ion-item-sliding>
</ion-list>

<!-- Modals and overlays -->
<ion-modal>
  <ng-template>Modal content</ng-template>
</ion-modal>
```

### Theme Integration

**DaisyUI themes** are controlled via `data-theme` attribute on `<html>`:
```typescript
// Theme service automatically syncs Ionic and DaisyUI themes
this.themeService.setTheme('dark'); // Sets both Ionic and DaisyUI dark mode
```

**Available themes:** `light`, `dark` (configured in `tailwind.config.js`)

### Custom Utilities Preserved

Custom utilities work alongside DaisyUI:
```html
<!-- Button glow effect -->
<ion-button class="btn-glow" color="primary">Glowing</ion-button>

<!-- Card variants -->
<div class="card-elevated">Elevated shadow</div>
<div class="card-gradient">Gradient background</div>
<div class="card-glass">Glass morphism</div>

<!-- Animations -->
<div class="alert animate-fade-in">Fades in</div>
<div class="card animate-slide-up">Slides up</div>
```

### Important: Shadow DOM Limitations

**Ionic components use Shadow DOM**, which isolates their internal styles. DaisyUI classes only work in Light DOM (regular Angular templates), not inside Shadow DOM.

**Works:**
```html
<ion-content>
  <div class="alert alert-success">This works!</div>
</ion-content>
```

**Doesn't work:**
```html
<ion-button class="btn btn-primary">DaisyUI classes won't apply</ion-button>
```

**Solution:** Use Ionic styling for Ionic components, DaisyUI for content.

### Quick Reference

- Full guide: [docs/DAISYUI_QUICK_GUIDE.md](./docs/DAISYUI_QUICK_GUIDE.md)
- CSS migration: [docs/CSS_MIGRATION_QUICK_REFERENCE.md](./docs/CSS_MIGRATION_QUICK_REFERENCE.md)
- Styling conventions: [docs/STYLING_GUIDE.md](./docs/STYLING_GUIDE.md)

## 🚀 Daily Development Commands

```bash
# Development
npm start                           # Dev server (http://localhost:4200)
npm run build                       # Production build

# Testing
npm run test                        # Unit tests (watch mode)
npm run test:ci                     # Unit tests (CI, headless)
npm run test:coverage               # Coverage report
npm run test:e2e                    # Playwright E2E tests
npm run test:e2e:headed             # E2E with visible browser

# Specialized test runs (faster)
karma start karma-appointments-only.conf.js  # Test appointments only
karma start karma-auth-only.conf.js         # Test auth only

# Code Quality
npm run lint                        # Check lint errors
npm run lint:fix                    # Auto-fix lint errors
npm run format                      # Format all code
npm run format:check                # Check formatting

# Mobile
npm run cap:sync                    # Sync to native platforms
npm run cap:android                 # Open Android Studio
npm run cap:run:android             # Run on Android device

# i18n
npm run i18n:missing                # Check missing translations

# Maintenance
npm run clean                       # Clean reinstall
```

## 📂 Project Structure

```
src/
├── app/
│   ├── core/                       # Singleton services
│   │   ├── config/                 # App configuration
│   │   ├── services/               # Business logic
│   │   │   ├── tidepool-auth.service.ts
│   │   │   ├── tidepool-mock.adapter.ts
│   │   │   ├── readings.service.ts
│   │   │   ├── database.service.ts
│   │   │   ├── logger.service.ts
│   │   │   └── demo-data.service.ts
│   │   ├── guards/                 # Route guards
│   │   ├── interceptors/           # HTTP interceptors
│   │   └── models/                 # TypeScript types
│   ├── shared/                     # Reusable components
│   ├── tests/                      # Test helpers
│   │   ├── helpers/
│   │   ├── setup/
│   │   ├── pages/                  # Page objects
│   │   └── integration/
│   ├── dashboard/
│   ├── readings/
│   ├── appointments/
│   ├── profile/
│   └── login/
├── assets/
│   ├── i18n/                       # Translations (en, es)
│   └── mocks/                      # Mock data
├── environments/
│   ├── environment.ts              # Development
│   ├── environment.prod.ts         # Production
│   └── environment.test.ts         # Testing
└── theme/                          # Global styles

playwright/tests/                   # E2E tests
docs/                               # Documentation
scripts/                            # Utility scripts
specs/                              # Feature specs
```

## 🎯 Development Workflows

### Adding a New Feature

```bash
# 1. SPARC workflow with claude-flow
npx claude-flow sparc run spec-pseudocode "Add glucose chart"
npx claude-flow sparc tdd "Implement glucose chart"

# 2. Or use Task tool directly
Task("Architect", "Design chart component architecture", "system-architect")
Task("Coder", "Implement chart component", "coder")
Task("Tester", "Write unit and E2E tests", "tester")

# 3. Compare approaches with Zen (optional)
Bash("zen ask 'Best charting library for Ionic Angular' --model gemini")
```

### Testing Strategy

```bash
# Unit tests (services, components)
npm run test                        # Watch mode
npm run test:coverage               # With coverage

# Faster targeted runs
karma start karma-auth-only.conf.js

# E2E tests with Playwright
npm run test:e2e                    # All tests
npm run test:e2e:headed             # Debug mode

# Mobile testing
npm run cap:run:android             # Run on device
# Use android-adb MCP for screenshots/debugging
# Use BrowserStack for cross-device testing
```

### Working with Tidepool API

```typescript
// Authentication (OAuth2 PKCE)
await tidepoolAuth.login();

// Fetch glucose readings
const readings = await readingsService.getReadings(userId, startDate, endDate);

// Clinic dashboard link
const url = `https://app.tidepool.org/patients/${userId}/data`;
```

### Multi-Language Support

```bash
# 1. Add translation keys to assets/i18n/en.json and es.json
# 2. Use in templates: {{ 'KEY' | translate }}
# 3. Check for missing translations
npm run i18n:missing
```

## 🔧 Critical Files

| File | Purpose |
|------|---------|
| `src/app/core/services/tidepool-auth.service.ts` | OAuth2/PKCE authentication |
| `src/app/core/services/tidepool-mock.adapter.ts` | Mock Tidepool for demo |
| `src/app/core/services/database.service.ts` | Dexie/IndexedDB setup |
| `src/app/core/services/logger.service.ts` | Centralized logging |
| `src/app/core/config/app-config.ts` | App configuration |
| `karma.conf.js` | Main test config |
| `karma-appointments-only.conf.js` | Targeted appointments tests |
| `karma-auth-only.conf.js` | Targeted auth tests |
| `playwright.config.ts` | E2E test config |
| `capacitor.config.ts` | Native platform config |
| `.mcp.json` | MCP server configuration |

## 🐛 Troubleshooting

```bash
# Build errors
npm run clean                       # Clean reinstall
rm -rf .angular                     # Clear cache

# Test failures
npm run test -- --include='**/specific.spec.ts'
rm -rf .angular/cache

# Capacitor issues
npx cap sync
npx cap doctor

# MCP connection issues
claude mcp list                     # Check MCP status
claude mcp restart <server-name>    # Restart specific server

# Maestro MCP not working?
# Install maestro first:
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
```

## ✅ Best Practices

1. **Pre-commit hooks** (Husky + lint-staged)
   - Auto-format with Prettier
   - Auto-fix with ESLint
   - Runs on staged files only

2. **Standalone components** (Angular 20)
   - Import dependencies directly
   - No NgModule needed

3. **Offline-first**
   - Cache in IndexedDB
   - Sync when online
   - Handle network errors

4. **Translation coverage**
   - All UI text in i18n files
   - Use `| translate` pipe
   - Check `npm run i18n:missing`

5. **Mobile optimization**
   - Test on real devices
   - Use Ionic components
   - Handle touch gestures

## 🔄 Git Workflow

```bash
# Feature branches
git checkout -b feat/feature-name

# Conventional commits
git commit -m "feat: add glucose chart visualization"
git commit -m "fix: resolve auth token refresh"
git commit -m "test: add E2E tests for appointments"

# Pre-commit hooks run automatically
# Manual check:
npm run test:ci && npm run lint && npm run format:check
```

## 🎯 MCP Server Selection Guide

**When to use each MCP:**

- **claude-flow**: Multi-agent coordination, memory, workflows, code implementation
- **tavily**: Web research, find solutions, extract documentation
- **context7**: Look up library APIs, framework documentation
- **playwright**: E2E testing, browser automation, UI testing
- **android-adb**: Android device management, APK installation, debugging
- **browserstack**: Cross-device testing, real device testing (requires account)
- **maestro**: Simple mobile UI tests (requires installation)
- **zen**: Multi-model comparison, delegate to other CLIs, workflow orchestration

**Complementary Usage:**
- Use **zen** for research/comparison, **claude-flow** for implementation
- Use **tavily** for general research, **context7** for API docs
- Use **playwright** for web E2E, **android-adb** for mobile debugging
- Use **browserstack** for cross-device, **maestro** for quick mobile tests

## 📝 Environment Configuration

```typescript
// src/environments/environment.ts - Development
export const environment = {
  production: false,
  tidepool: {
    apiUrl: 'https://api.tidepool.org',
    clientId: 'your-client-id',
    redirectUri: 'http://localhost:4200/callback'
  },
  apiGateway: 'http://localhost:3000'
};

// src/environments/environment.test.ts - Testing
// Includes mock adapters and demo data
```

---

## Important Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files
- NEVER proactively create documentation files
- Never save working files to root folder
- Use TodoWrite for task tracking (5-10+ todos batched)
- Batch all operations in single messages
