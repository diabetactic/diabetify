# Diabetactic Development Agents

This file describes the development environment, architecture, and tooling for the Diabetactic mobile health application. It helps AI coding agents (Jules, Codex, Claude Code) understand the project structure and setup requirements.

## Project Overview

**Diabetactic** is an Angular/Ionic mobile application for diabetes management with Tidepool API integration.

- **Type**: Mobile health application (iOS/Android)
- **Framework**: Angular 20 + Ionic 8
- **Mobile**: Capacitor 6
- **Backend**: Tidepool API integration
- **Offline**: Dexie (IndexedDB) for local storage
- **i18n**: English/Spanish translations

## Technology Stack

### Frontend
- **Angular**: v20 (standalone components)
- **Ionic Framework**: v8
- **Angular Material**: v20
- **RxJS**: Reactive state management
- **Tailwind CSS**: v4 (migration in progress)

### Mobile Platform
- **Capacitor**: v6 for native capabilities
- **Target Platforms**: iOS 13+, Android 8+

### Data & State
- **Dexie**: IndexedDB wrapper for offline storage
- **RxJS**: Reactive state management
- **Tidepool SDK**: OAuth2/PKCE authentication

### Testing
- **Unit Tests**: Jasmine + Karma
- **E2E Tests**: Playwright
- **Coverage**: Istanbul

### Translations
- **@ngx-translate/core**: Multi-language support (en, es)

## Environment Setup

### Required Tools

```bash
# Node.js & Package Manager
node >= 20.19.5
npm >= 10.9.2

# Mobile Development (optional for web-only development)
Android SDK (for Android builds)
Xcode (for iOS builds - macOS only)

# Testing
Chrome/Chromium (for E2E tests)
```

### Installation Steps

```bash
# 1. Install dependencies
npm install

# 2. Sync Capacitor (if working with mobile)
npm run cap:sync

# 3. Run tests to verify setup
npm run test:ci

# 4. Check code quality
npm run lint
npm run format:check
```

### Environment Variables

Create a `.env` file or configure in your AI agent platform:

```env
# Tidepool API Configuration
TIDEPOOL_API_URL=https://api.tidepool.org
TIDEPOOL_CLIENT_ID=your-client-id-here
TIDEPOOL_REDIRECT_URI=http://localhost:4200/callback

# Development
NODE_ENV=development
PORT=4200

# Testing
CI=true
```

## Project Structure

```
diabetify/
├── src/
│   ├── app/
│   │   ├── core/                    # Singleton services, guards, interceptors
│   │   │   ├── config/              # App configuration
│   │   │   ├── services/            # Business logic services
│   │   │   │   ├── tidepool-auth.service.ts
│   │   │   │   ├── tidepool-mock.adapter.ts
│   │   │   │   ├── readings.service.ts
│   │   │   │   ├── database.service.ts
│   │   │   │   └── logger.service.ts
│   │   │   ├── guards/              # Route guards
│   │   │   ├── interceptors/        # HTTP interceptors
│   │   │   └── models/              # TypeScript interfaces
│   │   ├── shared/                  # Reusable components
│   │   ├── tests/                   # Test helpers and page objects
│   │   ├── dashboard/               # Feature modules
│   │   ├── readings/
│   │   ├── appointments/
│   │   ├── profile/
│   │   └── login/
│   ├── assets/
│   │   ├── i18n/                    # Translation files (en.json, es.json)
│   │   └── mocks/                   # Mock data for development
│   ├── environments/                # Environment configurations
│   └── theme/                       # Global styles (Tailwind v4)
├── playwright/tests/                # E2E test files
├── android/                         # Capacitor Android project
├── ios/                             # Capacitor iOS project (if on macOS)
├── docs/                            # Project documentation
├── scripts/                         # Build and utility scripts
└── specs/                           # Feature specifications
```

## Development Workflows

### Daily Development

```bash
# Start dev server
npm start                           # http://localhost:4200

# Run unit tests (watch mode)
npm run test

# Run E2E tests
npm run test:e2e

# Lint and format
npm run lint
npm run format
```

### Testing Strategy

```bash
# Unit tests - all
npm run test:ci

# Unit tests - specific module (faster)
karma start karma-appointments-only.conf.js
karma start karma-auth-only.conf.js

# E2E tests
npm run test:e2e                    # Headless
npm run test:e2e:headed             # With browser UI

# Coverage
npm run test:coverage
```

### Mobile Development

```bash
# Sync web app to native platforms
npm run cap:sync

# Open in IDE
npm run cap:android                 # Android Studio
npm run cap:ios                     # Xcode (macOS only)

# Run on device/emulator
npm run cap:run:android
```

### Code Quality

```bash
# Check everything before commit
npm run test:ci && npm run lint && npm run format:check

# Auto-fix issues
npm run lint:fix
npm run format

# Check translations
npm run i18n:missing
```

## Architecture Patterns

### Standalone Components
All components use Angular's standalone API (no NgModule):

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
  templateUrl: './example.component.html'
})
export class ExampleComponent {}
```

### Service Pattern
Services are provided in root and use dependency injection:

```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  constructor(private http: HttpClient) {}
}
```

### Offline-First Data Flow
1. Check local cache (Dexie/IndexedDB)
2. If offline or cache valid, use cached data
3. If online, fetch from Tidepool API
4. Update cache
5. Handle sync conflicts

### Translation Pattern
All user-facing text uses the translate pipe:

```html
<ion-title>{{ 'DASHBOARD.TITLE' | translate }}</ion-title>
```

Translation keys defined in:
- `src/assets/i18n/en.json`
- `src/assets/i18n/es.json`

## API Integration

### Tidepool Authentication
OAuth2 PKCE flow:

```typescript
// Login
await tidepoolAuth.login();

// Get user
const user = await tidepoolAuth.getCurrentUser();

// Logout
await tidepoolAuth.logout();
```

### Tidepool Data
Fetch glucose readings:

```typescript
const readings = await readingsService.getReadings(
  userId,
  startDate,
  endDate
);
```

### Mock Mode
For development without Tidepool account:

```typescript
// Uses TidepoolMockAdapter for demo data
environment.useMockTidepool = true;
```

## Common Tasks

### Adding a New Feature

1. **Create feature module/component**
   ```bash
   ng generate component features/my-feature --standalone
   ```

2. **Add routing**
   ```typescript
   // src/app/app.routes.ts
   {
     path: 'my-feature',
     loadComponent: () => import('./features/my-feature/my-feature.component')
   }
   ```

3. **Add translations**
   ```json
   // src/assets/i18n/en.json
   {
     "MY_FEATURE": {
       "TITLE": "My Feature",
       "DESCRIPTION": "Feature description"
     }
   }
   ```

4. **Add tests**
   ```bash
   # Unit test auto-generated
   # Add E2E test in playwright/tests/
   ```

### Migrating to Tailwind v4

**Current Status**: Migration in progress
- ✅ Dashboard, readings, settings, login, profile pages migrated
- 🚧 Remaining pages use Angular Material + legacy CSS

**Pattern**:
```html
<!-- Old: Angular Material -->
<mat-card class="custom-card">
  <mat-card-content>Content</mat-card-content>
</mat-card>

<!-- New: Tailwind v4 -->
<div class="rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
  <div class="text-gray-900 dark:text-white">Content</div>
</div>
```

### Debugging

```bash
# Check logs
npm start                           # Browser console
npm run cap:run:android            # Android logcat

# Test specific file
npm run test -- --include='**/my.spec.ts'

# E2E debug mode
npm run test:e2e:headed
```

## CI/CD Hooks

Pre-commit hooks (via Husky):
- Auto-format with Prettier
- Auto-fix with ESLint
- Runs on staged files only

## Security Considerations

- **API Keys**: Never commit `.env` files
- **Tidepool Credentials**: OAuth2 tokens stored securely
- **Offline Data**: Encrypted in IndexedDB
- **HTTPS Only**: Production uses HTTPS

## Common Pitfalls

1. **Missing translations**: Always add keys to both `en.json` and `es.json`
2. **Standalone imports**: Remember to import all dependencies in `imports: []`
3. **Capacitor sync**: Run `npm run cap:sync` after installing plugins
4. **Test isolation**: Ensure tests clean up after themselves
5. **Async operations**: Use `fakeAsync` and `tick()` in tests

## Support Resources

- **Angular**: https://angular.dev
- **Ionic**: https://ionicframework.com/docs
- **Capacitor**: https://capacitorjs.com/docs
- **Tidepool**: https://developer.tidepool.org
- **Tailwind**: https://tailwindcss.com/docs

## For AI Agents

### What You Can Do
- Add features, fix bugs, write tests
- Migrate pages to Tailwind v4
- Improve translations
- Add documentation
- Refactor code

### What to Check First
1. Run `npm install` to ensure dependencies
2. Run `npm run test:ci` to verify tests pass
3. Run `npm run lint` to check code quality
4. Check `CLAUDE.md` for project-specific instructions

### Quick Test
```bash
npm install && npm run test:ci && npm run lint
```

### Android Emulator Navigation Helpers (Pixel‑like 1080x2400)

When driving the Android emulator via `adb` for this app, these tap coordinates have been verified on the current AVD (1080x2400). They are useful for quickly navigating without re‑dumping the UI tree:

- Welcome screen (package `io.diabetify.app`)
  - `Empezar` button center: `adb shell input tap 540 2169`  
    - Bounds (uiautomator): `[105,2136][976,2202]`
  - `Iniciar Sesión` button center: `adb shell input tap 540 2263`  
    - Bounds: `[105,2231][976,2296]`

- Login screen
  - “DNI o Email” label area center (near username input): `adb shell input tap 251 1085`  
    - Bounds: `[133,1057][370,1113]`
  - “Contraseña” label area center (near password input): `adb shell input tap 256 1211`  
    - Bounds: `[133,1183][380,1239]`
  - “Recordar mis datos” label center (checkbox + text): `adb shell input tap 330 1382`  
    - Bounds: `[154,1357][506,1407]`
  - Main `Iniciar Sesión` button center: `adb shell input tap 539 1547`  
    - Bounds: `[133,1514][945,1580]`

Notes:
- These coordinates assume a 1080x2400 emulator with no navigation bar overlap; if you change AVD resolution or orientation, re‑capture with `adb shell uiautomator dump /sdcard/view.xml` and update this table.
- On some emulator configurations `adb shell input text` may not populate WebView inputs reliably; prefer using these taps to focus fields and then type with the emulator keyboard when possible.

### ADB Text Editing Patterns (for automation)

When scripting text entry via `adb`, always **clear existing text before typing** to avoid concatenating values:

- Focus a text field by coordinate (see helpers above), then:

  ```bash
  # Move cursor to end of the field
  adb shell input keyevent 123   # KEYCODE_MOVE_END

  # Delete up to ~50 characters (repeat DEL as needed)
  for i in $(seq 1 50); do adb shell input keyevent 67; done  # KEYCODE_DEL

  # Type new value
  adb shell input text 1000
  ```

- This pattern is based on community ADB recipes (e.g., StackOverflow’s `clear_input` helper): `KEYCODE_CLEAR` is unreliable, and `input text ''` does not clear the field.

- For the current login screen on the 1080x2400 AVD, the `EditText` centers are approximately:
  - Username input center: `adb shell input tap 539 871`
  - Password input center: `adb shell input tap 539 1064`

  Example to set both fields:

  ```bash
  # Username
  adb shell input tap 539 871
  adb shell input keyevent 123
  for i in $(seq 1 50); do adb shell input keyevent 67; done
  adb shell input text 1000

  # Password
  adb shell input tap 539 1064
  adb shell input keyevent 123
  for i in $(seq 1 50); do adb shell input keyevent 67; done
  adb shell input text tuvieja
  ```

Keep this clear‑then‑type pattern in mind when updating Maestro flows or other automation: **tap → KEYCODE_MOVE_END → many KEYCODE_DEL → `input text`**.

### Maestro Testing Patterns and Best Practices

**Critical Lessons from Test Suite Overhaul (2025-11-24)**

#### Language-Independent Navigation

**❌ WRONG: Language-specific selectors**
```yaml
# These break when language changes
- tapOn: "menu_book Lecturas"    # Spanish only
- tapOn: "Readings"               # English only
- tapOn: "person Perfil"          # Spanish only
```

**✅ CORRECT: Resource-ID selectors**
```yaml
# Always use resource-ids for navigation
- tapOn:
    id: "tab-button-dashboard"
- tapOn:
    id: "tab-button-readings"
- tapOn:
    id: "tab-button-appointments"
- tapOn:
    id: "tab-button-profile"
```

#### Bilingual Text Assertions

Support both languages with pipe patterns:
```yaml
# Basic bilingual pattern
- assertVisible: "Inicio|Home|Dashboard"
- assertVisible: "Lecturas|Readings"

# Complex bilingual patterns
- assertVisible: ".*([Rr]ecientes|[Rr]ecent).*"
- tapOn: "Guardar|Save|OK|Aceptar"
```

#### Ionic Component Interaction

Ionic components often lack stable IDs or text. Use coordinate-based taps:

```yaml
# Input fields (percentage-based coordinates)
- tapOn:
    point: "50%,40%"  # Common input position
- eraseText           # Always clear first
- inputText: "${VALUE}"
- hideKeyboard        # Prevent keyboard issues

# FAB buttons
- tapOn:
    point: "50%,93%"  # Bottom FAB position

# Common save button positions
- tapOn:
    point: "50%,70%"  # Save button area
```

#### Test Organization and Structure

**Proper test setup:**
```yaml
appId: io.diabetify.app  # Note: actual package, not io.diabetactic.app
tags:
  - category (auth, dashboard, readings, etc.)
  - test-type (smoke, regression, integration)
  - mode (mock-compatible, heroku-only, etc.)
---
# Test steps here
```

**Reusable flows:**
```yaml
# Use runFlow for common patterns
- runFlow:
    file: ../../flows/auth/login.yaml
    env:
      USERNAME: "${USERNAME:demo@example.com}"
      PASSWORD: "${PASSWORD:demo123}"
```

#### Wait Strategies

Always wait after actions to prevent flaky tests:
```yaml
# Standard wait after navigation/action
- waitForAnimationToEnd

# Extended wait for slow operations
- waitForAnimationToEnd:
    timeout: 5000  # 5 seconds

# Wait after app launch
- waitForAnimationToEnd:
    timeout: 3000  # Initial load
```

#### Screenshot Documentation

Capture state at key milestones:
```yaml
- takeScreenshot: maestro/screenshots/test-01-initial.png
- takeScreenshot: maestro/screenshots/test-02-after-action.png
- takeScreenshot: maestro/screenshots/test-03-final.png
```

#### Simplified Flows vs Complex Flows

**Create simplified versions for resilient testing:**

```yaml
# Complex flow (fragile)
- tapOn: "Add Reading"
- selectDropdown: "Type"
- selectOption: "Blood Glucose"
- inputText: "120"
- tapOn:
    id: "save-button"

# Simplified flow (resilient)
- tapOn:
    point: "50%,93%"  # FAB
- tapOn:
    point: "50%,40%"  # Input
- eraseText
- inputText: "120"
- hideKeyboard
- tapOn:
    text: "Guardar|Save|OK"
    optional: true
```

#### Clean State Management

**Always start with clean state:**
```bash
#!/bin/bash
# Before each test
adb shell pm clear io.diabetify.app
adb shell am start -n io.diabetify.app/.MainActivity
sleep 3
maestro test "$TEST_FILE"
```

#### Common Failure Patterns and Solutions

| Problem | Solution |
|---------|----------|
| "Text not found" | Use bilingual patterns or resource-ids |
| "Element not visible" | Add `waitForAnimationToEnd` before assertion |
| "Tap failed" | Use percentage-based coordinates |
| "Flow not found" | Check relative path (../../flows/) |
| "YAML syntax error" | Validate indentation, remove invalid directives |
| "Test passes sometimes" | Add proper waits, use `optional: true` |
| "Wrong language" | Never hardcode labels, use pipes or IDs |

#### Test Categories and Run Strategies

```bash
# Run individual test with clean state
./scripts/run-maestro-clean.sh maestro/tests/auth/01-login-flow.yaml

# Run category
maestro test maestro/tests/auth/

# Run all tests
./scripts/test-maestro-all.sh

# Quick validation (7 core tests)
./scripts/test-status-check.sh
```

#### YAML Common Pitfalls

```yaml
# ❌ WRONG
- scroll:
    direction: DOWN  # Invalid syntax

# ✅ CORRECT
- scroll  # Simple form
# OR
- swipe:
    start: 50%, 70%
    end: 50%, 30%

# ❌ WRONG (incorrect indentation)
- assertVisible:
  text: "Hello"
    optional: true

# ✅ CORRECT
- assertVisible:
    text: "Hello"
    optional: true
```

#### Mode-Aware Testing

Tests should be aware of backend mode:
- **Mock mode**: In-memory data, instant responses
- **Heroku mode**: Real API, network delays
- **Local mode**: Docker backend, local delays

Add appropriate waits based on mode:
```yaml
# For API operations
- waitForAnimationToEnd:
    timeout: ${API_TIMEOUT:3000}  # Longer for Heroku
```

### Mobile Testing
Web environments cannot build mobile apps (need Android SDK/Xcode). For mobile:
- Test web version first: `npm start`
- Note mobile-specific changes in PR description
- Local developer will test on devices

## Multi-Agent Coordination Patterns

This project is designed for multi-agent development workflows using Claude Code, Jules, and other AI agents.

### Parallel Task Execution

**Pattern: Feature Development with Multiple Agents**

Execute all agents in a **single message** for maximum efficiency:

```javascript
// ✅ CORRECT: Single message with all agent tasks
Task("Architect", "Design appointments feature architecture", "system-architect")
Task("Coder", "Implement appointment service and components", "coder")
Task("Tester", "Write unit and E2E tests for appointments", "tester")
Task("Mobile", "Create Maestro test flows for appointments", "mobile-dev")
Task("Reviewer", "Review all appointments code changes", "reviewer")

// ❌ INCORRECT: Sequential messages
// Task("Architect", ...) → wait → Task("Coder", ...) → wait → Task("Tester", ...)
```

### Memory-Driven Coordination

**Pattern: Shared Context Across Agents**

Use memory to share findings between agents:

```javascript
// Agent 1: Research and store
Task("Research",
  "Analyze Ionic form patterns. Store findings in memory key 'ionic-forms'",
  "researcher")

// Agent 2: Use research (can run in parallel)
Task("Coder",
  "Check memory 'ionic-forms' and implement login form using best patterns",
  "coder")

// Agent 3: Test based on research (can run in parallel)
Task("Tester",
  "Check memory 'ionic-forms' and write comprehensive form tests",
  "tester")
```

**Memory Commands:**
```javascript
// Store
mcp__claude-flow__memory_usage {
  action: "store",
  key: "api-design",
  value: "REST endpoints specification",
  namespace: "project"
}

// Retrieve
mcp__claude-flow__memory_search {
  pattern: "api-*",
  limit: 10
}
```

### Sequential Workflows

**Pattern: Dependent Tasks**

When tasks have dependencies, execute in rounds:

```javascript
// Round 1: Architecture (single message)
Task("Architect",
  "Design readings sync architecture. Store in memory 'sync-arch'",
  "system-architect")

// Wait for Round 1 completion, then Round 2 (single message):
Task("Backend",
  "Check memory 'sync-arch'. Implement backend sync API",
  "backend-dev")
Task("Frontend",
  "Check memory 'sync-arch'. Implement frontend sync service",
  "coder")

// Wait for Round 2 completion, then Round 3:
Task("Integration",
  "Test complete sync workflow with all components",
  "tester")
```

### SPARC Methodology with Claude-Flow

**Pattern: Test-Driven Development**

SPARC modes for systematic development:

```bash
# Full pipeline
npx claude-flow sparc tdd "Add glucose chart visualization"

# Individual modes (in sequence)
npx claude-flow sparc run specification "Define chart requirements"
npx claude-flow sparc run pseudocode "Chart implementation pseudocode"
npx claude-flow sparc run architecture "Chart component architecture"
npx claude-flow sparc run refinement "Optimize chart performance"
npx claude-flow sparc run completion "Complete chart implementation"

# Parallel batch
npx claude-flow sparc batch specification,pseudocode "Multiple features"
```

### Agent Types Available

| Agent Type | Purpose | Best For |
|------------|---------|----------|
| `researcher` | Code analysis, pattern discovery | Understanding existing code |
| `coder` | Implementation | Writing new features |
| `tester` | Test creation | Unit/E2E/integration tests |
| `reviewer` | Code review | Quality assurance |
| `system-architect` | Architecture design | System design, patterns |
| `backend-dev` | Backend services | API development |
| `mobile-dev` | Mobile-specific | Capacitor, native features |
| `sparc-coord` | SPARC coordination | Full SPARC workflow |

### Best Practices

1. **Batch Operations**: Always group related tasks in single message
2. **Use Memory**: Share context via memory for better coordination
3. **Parallel First**: Default to parallel execution unless dependencies exist
4. **Clear Instructions**: Agents work best with specific, detailed tasks
5. **Memory Keys**: Use descriptive keys like `api-design`, `test-patterns`
6. **Round-Based**: For dependencies, execute in clear rounds with waits
7. **SPARC for Complex**: Use SPARC methodology for new features

### Example: Complete Feature Development

```javascript
// Round 1: Planning (parallel)
Task("Architect",
  "Design appointment reminder system. Store architecture in memory 'reminder-arch'",
  "system-architect")
Task("Research",
  "Research Capacitor local notifications. Store examples in memory 'notif-examples'",
  "researcher")

// Round 2: Implementation (parallel, after Round 1)
Task("Backend",
  "Check memory 'reminder-arch'. Implement reminder API endpoints",
  "backend-dev")
Task("Frontend",
  "Check memories 'reminder-arch' and 'notif-examples'. Implement reminder service",
  "coder")
Task("Mobile",
  "Check memory 'notif-examples'. Add Capacitor notification plugin integration",
  "mobile-dev")

// Round 3: Testing (parallel, after Round 2)
Task("Unit Tester",
  "Write unit tests for reminder service",
  "tester")
Task("E2E Tester",
  "Create Playwright tests for reminder flow",
  "tester")
Task("Mobile Tester",
  "Create Maestro tests for notification display",
  "mobile-dev")

// Round 4: Review (after Round 3)
Task("Reviewer",
  "Review all reminder feature code, tests, and architecture",
  "reviewer")
```

### Coordination via Hooks

Use hooks for workflow automation:

```bash
# Pre-task hook (runs before agent starts)
npx claude-flow hooks pre-task --description "Implement auth service"

# Post-edit hook (runs after file edit)
npx claude-flow hooks post-edit --file "src/app/core/services/auth.service.ts"

# Post-task hook (runs after task completion)
npx claude-flow hooks post-task --task-id "task-123"

# Session management
npx claude-flow hooks session-restore --session-id "session-456"
npx claude-flow hooks session-end --export-metrics true
```

## Version Info

- **Angular**: 20.x
- **Ionic**: 8.x
- **Capacitor**: 6.x
- **Node**: 20.x
- **TypeScript**: 5.x

Last updated: 2025-11-11
