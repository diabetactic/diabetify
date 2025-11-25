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

## 📱 Project Overview: Diabetactic Mobile Health App

**Diabetactic** is an Angular/Ionic mobile application for diabetes management with Tidepool API integration.

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
  projectName: "Diabetactic Web Tests",
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
  project: "Diabetactic Mobile",
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

### 6. 🎬 Maestro - Mobile UI Testing (FREE)

Simple, effective mobile UI testing framework with MCP integration.

**Installation Required:**
```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
```

**MCP Tools Available:**

```javascript
// Run Maestro flow files
mcp__maestro__run_flow_files {
  flowFiles: ["maestro/tests/auth/01-login-flow.yaml"]
}

// Run inline flow
mcp__maestro__run_flow {
  flow: "- launchApp\n- tapOn: 'Login'\n- inputText: 'test@example.com'"
}

// Take screenshot
mcp__maestro__take_screenshot {
  outputPath: "screenshots/current-state.png"
}

// Inspect view hierarchy (for finding elements)
mcp__maestro__inspect_view_hierarchy {}
```

**YAML Flow Example:**
```yaml
# maestro/tests/login-flow.yaml
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

**When to use Maestro MCP:**
- Automated mobile UI testing via MCP
- Run test flows programmatically
- Capture screenshots for debugging
- Inspect UI hierarchy to find selectors
- Quick mobile test automation
- Integration with Claude Code workflows
- Cross-platform iOS/Android tests



## 🎨 UI Components

### Two-Library Approach

Diabetactic uses a **complementary two-library UI system**:

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

## 📱 Mobile Testing & Debugging

### Maestro Mobile Testing

**Maestro** is our primary mobile UI testing framework. Tests are located in `maestro/` directory.

#### Test Structure

```
maestro/
├── flows/              # Reusable test components
├── tests/              # Actual test files
│   ├── smoke/         # Quick validation tests
│   ├── auth/          # Authentication flows
│   ├── readings/      # Glucose readings tests
│   ├── dashboard/     # Dashboard tests
│   ├── appointments/  # Appointments tests
│   ├── profile/       # Settings/profile tests
│   └── integration/   # End-to-end workflows
└── config/            # Maestro configuration
```

#### Core Maestro Patterns

**Pattern 1: Form Input (Ionic Components)**
```yaml
# Use coordinates for Ionic inputs (often lack stable IDs)
- tapOn:
    point: "50%,45%"  # Percentage-based coordinates
- eraseText           # ALWAYS clear before input
- inputText: "value"
- hideKeyboard        # Prevent keyboard interference
```

**Pattern 2: Bilingual Assertions**
```yaml
# Support both English and Spanish
- assertVisible: "Inicio|Home|Dashboard"
- tapOn: "Guardar|Save"
```

**Pattern 3: Wait Strategies**
```yaml
# After every action/navigation
- waitForAnimationToEnd

# For slow operations
- waitForAnimationToEnd:
    timeout: 5000
```

**Pattern 4: Reusable Flows**
```yaml
# Login flow
- runFlow:
    file: flows/auth-login.yaml
    env:
      USERNAME: "demo@example.com"
      PASSWORD: "demo123"
```

**Pattern 5: Screenshot Documentation**
```yaml
# Capture at key milestones
- takeScreenshot: maestro/screenshots/step-01-initial.png
```

#### Running Maestro Tests

```bash
# Single test
maestro test maestro/tests/auth/01-login-flow.yaml

# All tests in directory
maestro test maestro/tests/

# Specific device
maestro test --device emulator-5554 maestro/tests/smoke-test.yaml
```

### ADB Mobile Debugging

**Common ADB workflows for Ionic/Capacitor apps:**

#### Device Management
```bash
# List connected devices
adb devices

# Target specific device
adb -s emulator-5554 shell

# Install APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Clear app data and restart
adb shell pm clear io.diabetify.app
adb shell am start -n io.diabetify.app/.MainActivity
```

#### Log Analysis
```bash
# Clear and monitor logs
adb logcat -c
adb logcat | grep -E "Capacitor|Ionic|chromium"

# Filter for specific patterns
adb logcat | grep -E "Native HTTP|CORS|401|403|500"

# Errors only
adb logcat *:E

# Save logs to file
adb logcat -d > app-logs.txt
```

#### Screenshots & UI Inspection
```bash
# Capture screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ./screenshots/

# Get current activity
adb shell dumpsys activity top | grep ACTIVITY

# View hierarchy (UI elements)
adb shell dumpsys activity top
```

#### Network Debugging
```bash
# Monitor HTTP requests (native)
adb logcat | grep HttpURLConnection

# Check active connections
adb shell netstat | grep ESTABLISHED

# View network state
adb shell dumpsys connectivity
```

### Native HTTP vs Web HTTP

**Critical Difference for Mobile Apps:**

| Aspect | Web (Browser) | Native (Capacitor) |
|--------|---------------|-------------------|
| **HTTP Client** | Angular HttpClient → fetch | CapacitorHttp → OkHttp |
| **CORS** | ❌ Subject to CORS | ✅ No CORS restrictions |
| **Debugging** | Browser DevTools | ADB logcat |
| **Proxy** | Needs proxy.conf.json | Direct URL access |

**Implementation Pattern:**

```typescript
// CapacitorHttpService - Hybrid approach
export class CapacitorHttpService {
  constructor(private http: HttpClient, private platform: Platform) {}

  private shouldUseNativeHttp(): boolean {
    return this.platform.is('capacitor') && !this.platform.is('mobileweb');
  }

  get<T>(url: string, options?: { headers?: any }): Observable<T> {
    if (this.shouldUseNativeHttp()) {
      return this.nativeGet<T>(url, options);  // Uses CapacitorHttp
    }
    return this.http.get<T>(url, options);      // Uses Angular HttpClient
  }
}
```

**Debugging Pattern:**

1. **Check logs:** `adb logcat | grep -E "HTTP|Native HTTP"`
2. **Verify headers:** Look for `Authorization: Bearer` in logs
3. **Test backend directly:** `curl -H "Authorization: Bearer TOKEN" URL`
4. **Compare web vs mobile:** Same endpoint, different results = CORS or native issue

### CORS Solutions

**For Web Development (CORS issues):**

```json
// proxy.conf.json
{
  "/api": {
    "target": "https://your-api.herokuapp.com",
    "secure": true,
    "changeOrigin": true,
    "pathRewrite": { "^/api": "" }
  }
}
```

```bash
# Start with proxy
npm start  # Uses proxy.conf.json automatically
```

**For Mobile (Capacitor):**

```typescript
// environment.ts - Use direct URLs on mobile
function getBaseUrl(mode: BackendMode): string {
  if (Capacitor.isNativePlatform()) {
    return 'https://your-api.herokuapp.com';  // Direct URL, no proxy
  }
  return '/api';  // Proxy for web
}
```

**No proxy needed for mobile** - Native HTTP bypasses CORS completely.

### Common Debugging Workflows

**Workflow 1: Login Debugging**
```bash
# 1. Clear app state
adb shell pm clear io.diabetify.app

# 2. Start with logs
adb logcat -c
adb shell am start -n io.diabetify.app/.MainActivity
adb logcat | grep -E "Capacitor|Auth|HTTP"

# 3. Run Maestro test
maestro test maestro/tests/auth/01-login-flow.yaml

# 4. Check for errors
adb logcat -d | grep -E "401|403|CORS"

# 5. Capture failure state
adb shell screencap /sdcard/login-fail.png
adb pull /sdcard/login-fail.png
```

**Workflow 2: API Call Verification**
```bash
# Monitor all HTTP activity
adb logcat | grep -E "Native HTTP|HttpURLConnection" > api-activity.log

# Check specific endpoint
adb logcat | grep "/appointments/mine"

# Verify request/response
adb logcat | grep -E "POST|GET|Response.*200|Response.*4"
```

**Workflow 3: UI State Inspection**
```bash
# Capture current screen
adb shell screencap /sdcard/current.png
adb pull /sdcard/current.png

# Get UI hierarchy
adb shell dumpsys activity top > ui-hierarchy.txt

# Find text/elements
adb shell dumpsys activity top | grep "mText="
```

### Mobile Testing Best Practices

1. **Always Clear State** - `adb shell pm clear` before critical tests
2. **Use Screenshots** - Visual verification is crucial for UI tests
3. **Bilingual Testing** - All assertions support English/Spanish
4. **Coordinate-based Taps** - Ionic components often need `point: "X%,Y%"`
5. **Keyboard Management** - Always `hideKeyboard` after text input
6. **Wait for Animations** - `waitForAnimationToEnd` prevents flaky tests
7. **Native HTTP Logging** - Look for `🔵 [Native HTTP]` in logs
8. **CORS = Web Issue** - If CORS error on mobile, HTTP client misconfigured

### Maestro Test Examples

**Simple Navigation Test:**
```yaml
appId: io.diabetify.app
---
- launchApp
- waitForAnimationToEnd
- tapOn: "Lecturas|Readings"
- assertVisible: "mg/dL"
```

**Complete User Flow:**
```yaml
appId: io.diabetify.app
---
- launchApp
- runFlow: flows/auth/login.yaml  # CORRECT path
- runFlow:
    file: flows/add-glucose-reading.yaml
    env:
      GLUCOSE_VALUE: "120"
- tapOn: "Inicio|Home"
- assertVisible: "120"
- takeScreenshot: maestro/screenshots/success.png
```

## 🧪 Maestro Test Suite Management

### CRITICAL: Always Clear State Before Tests

**Run single test with clean state:**
```bash
./scripts/run-maestro-clean.sh maestro/tests/auth/01-login-flow.yaml
```

### Test Execution Scripts

```bash
# Run all 41 tests
./scripts/test-maestro-all.sh

# Run only working tests (5 confirmed)
./scripts/test-maestro-working.sh

# Run mock mode tests only
./scripts/test-maestro-mock.sh

# Run with test-all-modes.sh options
./scripts/test-all-modes.sh --smoke   # Just smoke test
./scripts/test-all-modes.sh --quick   # 5 working tests
./scripts/test-all-modes.sh --full    # All 41 tests × 3 modes
```

### Maestro Golden Rules

1. **ALWAYS** clear state with `adb shell pm clear io.diabetify.app`
2. **ALWAYS** use correct flow paths: `flows/auth/login.yaml` NOT `auth-login.yaml`
3. **ALWAYS** add `waitForAnimationToEnd` after actions
4. **ALWAYS** use `hideKeyboard` after text input
5. **ALWAYS** use bilingual: `"Text|Texto"`
6. **ALWAYS** use coordinates for Ionic: `point: "50%,45%"`
7. **ALWAYS** `eraseText` before `inputText`
8. **NEVER** assume clean state - clear explicitly

### Test Status (41 Total)

- ✅ **5 Working**: smoke-test, dashboard-nav, theme, language, login-mock
- ✅ **22 Fixed**: Path references corrected
- 🔧 **7 Need Fixes**: Complex tests, clean state issues
- ⚠️ **7 Need Review**: May work with adjustments

See `docs/MAESTRO_TEST_STATUS.md` for complete matrix.

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

- **tavily**: Web research, find solutions, extract documentation
- **context7**: Look up library APIs, framework documentation
- **playwright**: E2E testing, browser automation, UI testing
- **android-adb**: Android device management, APK installation, debugging
- **maestro**: Automated mobile UI testing, run test flows, capture screenshots, inspect UI hierarchy
- **browserstack**: Cross-device testing, real device testing (requires account)
- **zen**: Multi-model comparison, delegate to other CLIs, workflow orchestration



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

## 🔧 Environment & Build Setup

### Java/Gradle/Android Environment (CRITICAL)

**Environment is pre-configured in user's `.zshrc` and project's `mise.toml`:**
- ✅ `JAVA_HOME` - Auto-set to Java 21 for this project (via mise)
- ✅ `ANDROID_HOME` - `/home/julito/Android/Sdk`
- ✅ `JAVA_TOOL_OPTIONS` - Suppresses Maestro/Gradle warnings
- ✅ Android SDK tools in PATH
- ✅ Maestro in PATH

**NEVER manually set these in commands** - they're automatic:
```bash
# ❌ WRONG (unnecessary)
JAVA_HOME=$(mise where java) ANDROID_HOME=/path/to/sdk ./gradlew installDebug

# ✅ CORRECT (environment is already set)
cd android && ./gradlew installDebug

# ✅ BETTER (use mise tasks)
mise run android:install
```

### Gradle Wrapper Location

**CRITICAL:** Gradle wrapper is in `android/gradlew`, NOT root `./gradlew`

```bash
# ✅ CORRECT
cd android && ./gradlew installDebug
./android/gradlew installDebug
mise run android:install

# ❌ WRONG (doesn't exist)
./gradlew installDebug
```

### Java Version Requirements

- **Gradle 8.x requires Java 21** (not 17, 11, or 8)
- Project uses `mise` to manage Java 21 automatically
- `mise.toml` specifies `java = "21"`
- User's shell auto-switches to Java 21 when in this directory

### Common Build Commands

```bash
# Install APK on device
cd android && ./gradlew installDebug
# OR: mise run android:install

# Full clean rebuild
mise run android:rebuild
# Equivalent to: clean + build:mock + cap:sync + gradle install

# Clean build artifacts
mise run android:clean
rm -rf .angular www android/app/build
```

### Android Package Name

**IMPORTANT:** Package name mismatch
- `capacitor.config.ts` shows: `io.diabetactic.app`
- **Actual installed package:** `io.diabetify.app`

Always use `io.diabetify.app` in ADB commands:
```bash
adb shell pm clear io.diabetify.app
adb shell am start -n io.diabetify.app/.MainActivity
```

### Maestro Java Warnings (Safe to Ignore)

Maestro shows Java deprecation warnings - these are **harmless**:
```
WARNING: sun.misc.Unsafe::objectFieldOffset has been called
WARNING: Restricted methods will be blocked in a future release
```

These are from Maestro's dependencies (jansi, netty) using deprecated Java APIs. Tests work fine despite warnings. The `JAVA_TOOL_OPTIONS` in the environment suppresses most of these.

### Build Mode Configurations

Three build modes available:
```bash
npm run build:mock     # In-memory mock data (no backend)
npm run build:heroku   # Heroku cloud backend
npm run build:local    # Local Docker backend (requires setup)
```

After building, sync to Capacitor:
```bash
npm run cap:sync
```

### Quick Reference Commands

```bash
# Verify environment
mise env | grep -E "JAVA_HOME|ANDROID_HOME"
java -version  # Should show 21.x in this project

# Build and test workflow
npm run build:mock       # Build for mock mode
npm run cap:sync         # Sync to Capacitor
mise run android:install # Install APK
maestro test maestro/tests/smoke-test.yaml

# Full test suite
npm run test:everything  # Quality + Unit + E2E + All modes

# Clean restart
adb shell pm clear io.diabetify.app
mise run android:rebuild
```

### Troubleshooting

**If Java version is wrong:**
```bash
mise use java@21
mise where java  # Verify Java 21 path
```

**If Gradle fails with "Unsupported class file":**
- Means Java version is not 21
- Open new terminal (to reload .zshrc)
- Or run: `mise trust` in project directory

**If gradlew not found:**
- Check you're using `android/gradlew`, not `./gradlew`
- Use helper: `./scripts/android-build.sh installDebug`

**Full documentation:**
- `/tmp/JAVA_GRADLE_ANDROID_MAESTRO_LEARNINGS.md` - Comprehensive guide
- `docs/ENVIRONMENT_SETUP_MEMORY.md` - Quick reference

---

## Important Reminders

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files
- NEVER proactively create documentation files
- Never save working files to root folder
- Use TodoWrite for task tracking (5-10+ todos batched)
- Batch all operations in single messages
- **NEVER manually set JAVA_HOME or ANDROID_HOME** - they're pre-configured
- **ALWAYS use `android/gradlew`**, not root `./gradlew`
- **Package name is `io.diabetify.app`**, not `io.diabetactic.app`
