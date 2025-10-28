# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Diabetify is an Ionic Angular mobile application for managing diabetes glucose readings with Tidepool integration.

**Current State**: Production-ready backend (85% complete) with OAuth2 authentication, data synchronization, and glucose statistics. Frontend is in prototype stage (15% complete) with UI shells. BLE functionality documented but not implemented (0%).

## Architecture Documentation

**⚠️ IMPORTANT**: Before implementing features related to readings, appointments, or Tidepool sync, consult these documents:

- **`ARCHITECTURE_READINGS_APPOINTMENTS.md`** - Comprehensive architecture for manual readings, appointment integration, and Tidepool data sync. Includes data flows, implementation roadmap, and API specifications.
- **`QUICK_REFERENCE_READINGS.md`** - Fast lookup reference for common code patterns, data types, and implementation snippets for readings-related features.

## Technology Stack

- **Framework**: Ionic 8 + Angular 20, TypeScript 5.8
- **Mobile Platform**: Capacitor 6.1.0
- **Key Libraries**: Dexie (IndexedDB), RxJS, Angular Material 20
- **Internationalization**: ngx-translate 17
- **Code Quality**: ESLint, Prettier, Husky + lint-staged

## Development Commands

### Essential Commands

```bash
# Development
npm start              # Start dev server at http://localhost:4200
npm run build          # Development build
npm run build:prod     # Production build (optimized)

# Testing
npm test               # Run tests in watch mode
npm run test:ci        # Single run with coverage (for CI)
npm run test:coverage  # Generate coverage report → coverage/diabetify/index.html

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format with Prettier
npm run format:check   # Verify formatting

# Capacitor
npx cap sync           # Sync web → native (run after web build)
npx cap open android   # Open in Android Studio
npx cap run android    # Build and run on device/emulator
```

## Architecture Overview

### Application Structure

Tab-based navigation with lazy-loaded modules:

```
app-routing.module.ts → TabsPageModule → 4 tabs (lazy-loaded)
  ├─ /tabs/dashboard  → Home/main view
  ├─ /tabs/readings   → Glucose reading history
  ├─ /tabs/devices    → BLE device management (not implemented)
  └─ /tabs/profile    → User profile settings
```

**⚠️ Technical Debt**: Folder names use semantic naming (`dashboard/`, `devices/`, `readings/`, `profile/`) but module classes still use legacy names (`Tab1Page`, `Tab1Module`). Refactor when renaming components.

### Core Layer Architecture

The `src/app/core/` directory contains the application's business logic:

```
core/
├── config/              # Configuration files
│   └── oauth.config.ts  # OAuth2/PKCE configuration
├── guards/              # Route guards
│   └── auth.guard.ts    # Authentication guard
├── interceptors/        # HTTP interceptors
│   └── tidepool.interceptor.ts  # Adds auth headers to Tidepool API requests
├── models/              # TypeScript interfaces/types
│   ├── glucose-reading.model.ts  # Glucose data structures
│   ├── tidepool-auth.model.ts    # Auth state & tokens
│   ├── tidepool-sync.model.ts    # Sync status & metadata
│   └── user-profile.model.ts     # User profile data
├── services/            # Business logic services (see below)
└── utils/               # Utility functions
    ├── http-retry.util.ts           # Exponential backoff retry logic
    ├── pkce.utils.ts                # PKCE challenge generation
    └── tidepool-transform.util.ts   # Transform Tidepool ↔ local format
```

### Core Services (Production-Ready Backend)

**TidepoolAuthService** (`tidepool-auth.service.ts`) - ✅ Complete

- OAuth2 Authorization Code Flow with PKCE
- Capacitor Browser for in-app auth flow + deep link handling
- Automatic token refresh with rotation
- Session restoration from stored refresh tokens
- **Exposes**: `authState$: Observable<AuthState>` (reactive)

**TidepoolSyncService** (`tidepool-sync.service.ts`) - ✅ Complete

- Full/incremental sync with automatic pagination (RxJS `expand`)
- Exponential backoff retry logic, network awareness
- Persistent sync timestamps (Capacitor Preferences)
- Sync history tracking (last 10 entries)
- **Exposes**: `syncStatus$: Observable<SyncStatus>`

**ReadingsService** (`readings.service.ts`) - ✅ Complete

- CRUD operations with IndexedDB (Dexie)
- **Advanced statistics**: HbA1c (ADAG), GMI, Time in Range, CV%, median, std dev
- Unit conversion (mg/dL ↔ mmol/L, factor: 18.0182)
- Glucose status (normal/low/high/critical)
- Offline sync queue management
- **Exposes**: `readings$: Observable<LocalGlucoseReading[]>` (Dexie `liveQuery`)

**DatabaseService** (`database.service.ts`) - ✅ Complete

- Dexie-based IndexedDB (type-safe)
- `readings` table: indexed by id, time, type, userId, synced, localStoredAt
- `syncQueue` table: offline operations queue
- Singleton: `export const db = new DiabetifyDatabase()`

**Other Core Services**:

- **TidepoolStorageService**: Transform Tidepool ↔ local format, duplicate detection
- **TokenStorageService**: Secure token storage via Capacitor Preferences
- **ProfileService**: User profile management
- **ThemeService**: Dark/light mode theming
- **ErrorHandlerService**: Global error handling

**Backend Integration Services** (New Architecture):

- **ExternalServicesManagerService** (`external-services-manager.service.ts`) - ✅ Production-ready
  - Health monitoring with circuit breaker pattern
  - Network awareness and offline caching
  - Manages: Tidepool, Glucoserver, Appointments, LocalAuth
  - **Exposes**: `state$: Observable<ExternalServicesState>`

- **ServiceOrchestratorService** (`service-orchestrator.service.ts`) - ✅ Production-ready
  - Saga pattern for multi-service workflows
  - Compensating transactions for rollback
  - Workflow types: FULL_SYNC, AUTH_AND_SYNC, APPOINTMENT_WITH_DATA
  - **Exposes**: `activeWorkflows$: Observable<WorkflowState[]>`

- **ApiGatewayService** (`api-gateway.service.ts`) - ✅ Production-ready
  - Unified API entry point with request routing
  - Automatic authentication and caching
  - Response transformation and error standardization

- **AppointmentService** (`appointment.service.ts`) - ✅ Production-ready
  - Healthcare provider scheduling
  - Glucose data sharing with doctors
  - **Exposes**: `appointments$: Observable<Appointment[]>`

- **GlucoserverService** (`glucoserver.service.ts`) - ✅ Production-ready
  - Local backend for glucose management
  - Alternative to Tidepool for offline-first architecture

- **UnifiedAuthService** (`unified-auth.service.ts`) - ✅ Production-ready
  - Coordinates Tidepool and local authentication
  - Single sign-on experience

- **TranslationService** (`translation.service.ts`) - ✅ Production-ready
  - Multi-language support (English, Spanish)
  - Automatic device language detection
  - Locale-aware formatting (dates, numbers, glucose values)

### Data Flow

```
Tidepool API → TidepoolSyncService → TidepoolStorageService → DatabaseService (IndexedDB)
                                                                        ↓
                                                                ReadingsService
                                                                        ↓
                                                                  UI Components
```

### Authentication Flow (OAuth2 PKCE)

1. `TidepoolAuthService.login()` → Generate PKCE challenge → Build auth URL
2. Capacitor Browser opens Tidepool authorization page
3. User authenticates → Tidepool redirects to `diabetify://oauth/callback?code=...`
4. Deep link handler captures code → Exchange for tokens
5. Store tokens (access + refresh) via `TokenStorageService`
6. Decode JWT ID token for user info → Update `authState$`

### Sync Flow

1. Trigger sync (manual or automatic interval)
2. Check network + authentication
3. Fetch incremental data since last sync (or 30 days for first sync)
4. Transform Tidepool data → Local format (TidepoolStorageService)
5. Store in IndexedDB with duplicate detection
6. Update sync metadata/timestamps
7. Emit status updates via `syncStatus$`

### Environment Configuration

**Environment files**: `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod)

**Tidepool Configuration**:
- `tidepool.baseUrl`: API base URL (default: `https://api.tidepool.org`)
- `tidepool.clientId`: OAuth2 client ID (**TODO: Replace with actual client ID from Tidepool developer portal**)
- `tidepool.redirectUri`: `diabetify://oauth/callback` (custom URL scheme for OAuth)
- `tidepool.scopes`: `data:read data:write profile:read`
- `tidepool.requestTimeout`: 30 seconds
- `tidepool.maxRetries`: 3 attempts

**Backend Services Configuration**:
- `backendServices.glucoserver.baseUrl`: Local glucose management service (default: `http://localhost:8001`)
- `backendServices.appointments.baseUrl`: Appointment service (default: `http://localhost:8002`)
- `backendServices.auth.baseUrl`: Authentication service (default: `http://localhost:8003`)
- `backendServices.apiGateway.baseUrl`: API gateway (default: `http://localhost:8000`)

**Feature Flags**:
- `features.offlineMode`: Enable offline support (default: `true`)
- `features.useLocalBackend`: Use local backend services (default: `true` in dev)
- `features.useTidepoolIntegration`: Enable Tidepool sync (default: `true`)

**Build Configuration**:
- Output: `www/` (Capacitor web directory)
- Java 17 required for Android builds
- Bundle budgets: 2MB warning, 5MB error

## BLE Integration (Not Implemented)

**⚠️ STATUS**: BLE functionality is documented but **not implemented**. The `@capacitor-community/bluetooth-le` dependency is installed but unused. `src/app/devices/tab1.page.ts` contains only a component shell.

### BLE Specifications (for future implementation)

**Glucose Service UUID**: `00001808-0000-1000-8000-00805f9b34fb`

**Key Characteristics**:

- Glucose Measurement: `00002a18-0000-1000-8000-00805f9b34fb`
- Glucose Context: `00002a34-0000-1000-8000-00805f9b34fb`
- Record Access Control Point: `00002a52-0000-1000-8000-00805f9b34fb`

**Workflow**:

1. Scan for devices (filter by Glucose Service UUID)
2. Connect + establish disconnect callback
3. Read Device Information Service for manufacturer
4. Setup notifications on glucose characteristics
5. Request all stored records
6. Parse readings: SFLOAT16 format (IEEE-11073), convert units, extract timestamps/metadata

**Important**: BLE callbacks run outside Angular's zone → Use `NgZone.run()` for UI updates.

**Glucose Unit Conversion**:

- Conversion factor: `MMOLL_TO_MGDL = 18.0182`
- mg/dL ↔ mmol/L: `mg/dL = mmol/L × 18.0182`

## Development Patterns

### Creating New Feature Modules

Use Ionic CLI for consistency:

```bash
ionic generate page [feature-name]
```

Pattern:

- Lazy-load modules through routing
- Import `ExploreContainerComponentModule` for placeholder content
- Place pages under `src/app/[feature-name]/`

### Shared Components

Reusable UI components in `src/app/shared/components/`:

**StatCardComponent** - Dashboard metric cards:
```html
<app-stat-card
  [title]="'Average Glucose'"
  [value]="avgGlucose"
  [unit]="'mg/dL'"
  [icon]="'analytics'"
  [trend]="'up'">
</app-stat-card>
```

**ReadingItemComponent** - Glucose reading display:
```html
<app-reading-item
  [reading]="reading"
  [showStatus]="true"
  (edit)="onEdit($event)"
  (delete)="onDelete($event)">
</app-reading-item>
```

**AlertBannerComponent** - Contextual alerts:
```html
<app-alert-banner
  [type]="'warning'"
  [message]="'Sync pending'"
  [dismissible]="true">
</app-alert-banner>
```

**EmptyStateComponent** - Empty list states:
```html
<app-empty-state
  [icon]="'glucose-outline'"
  [message]="'No readings yet'"
  [actionText]="'Add Reading'"
  (action)="navigateToAddReading()">
</app-empty-state>
```

**ProfileItemComponent** - Settings/profile list items
**LanguageSwitcherComponent** - Language selection
**ServiceMonitorComponent** - Real-time service health display

See `src/app/shared/components/README.md` and `USAGE_EXAMPLES.md` for detailed usage.

### Reactive Patterns with RxJS

Services use BehaviorSubjects for reactive state:

```typescript
// Subscribe to auth state changes
this.authService.authState$.subscribe(state => {
  if (state.isAuthenticated) {
    /* ... */
  }
});

// Subscribe to sync status updates
this.syncService.syncStatus$.subscribe(status => {
  if (status.status === 'syncing') {
    /* show spinner */
  }
});

// Subscribe to readings (live query from IndexedDB)
this.readingsService.readings$.subscribe(readings => {
  /* update UI with latest readings */
});

// Monitor external services health
this.externalServices.state$.subscribe(state => {
  if (state.overallHealth === 'unhealthy') {
    /* show error banner */
  }
});
```

### HTTP Interceptors

**TidepoolInterceptor** (`tidepool.interceptor.ts`):

- Automatically adds `Authorization: Bearer <token>` header to Tidepool API requests
- Registered in `app.module.ts` via `HTTP_INTERCEPTORS`

### Route Guards

**AuthGuard** (`auth.guard.ts`):

- Protects routes requiring authentication
- Redirects to login if not authenticated
- Usage: `{ path: 'profile', canActivate: [AuthGuard], ... }`

### Internationalization (i18n)

**Translation System**:
- Automatic device language detection on first launch
- Supported languages: English (en), Spanish (es)
- Language preference persisted via Capacitor Preferences
- Locale-aware formatting for dates, numbers, and glucose values

**Usage in templates**:
```html
<!-- Simple translation -->
<ion-title>{{ 'dashboard.title' | translate }}</ion-title>

<!-- With parameters -->
<p>{{ 'messages.welcome' | translate:{ name: userName } }}</p>
```

**Usage in components**:
```typescript
constructor(private translationService: TranslationService) {}

// Get instant translation
const title = this.translationService.instant('dashboard.title');

// Format glucose value with locale
const formatted = this.translationService.formatGlucose(120);
```

**LanguageSwitcherComponent** (`shared/components/language-switcher/`):
- Reusable component with 3 display modes: button, select, popover
- Visual feedback with flag emojis
- Import `TranslateModule` in each lazy-loaded module that needs translations

**Translation Files**: `src/assets/i18n/en.json`, `src/assets/i18n/es.json`

**Key Structure**:
- `app.*` - Global strings
- `dashboard.*`, `readings.*`, `devices.*`, `profile.*` - Page-specific
- `glucose.*` - Glucose terminology
- `errors.*`, `messages.*` - System messages

See `TRANSLATION_GUIDE.md` for detailed documentation.

## Testing

**Framework**: Jasmine + Karma

**Current Status**: Test files (`.spec.ts`) exist but contain only boilerplate (0% coverage).

**Commands**:

- `npm test` - Watch mode
- `npm run test:ci` - Single run with coverage (CI)
- `npm run test:coverage` - Generate HTML report → `coverage/diabetify/index.html`

**Priority for test implementation**:

1. **ReadingsService** - Statistics calculations (A1C, GMI, Time in Range)
2. **TidepoolSyncService** - Sync state machine, error handling
3. **TidepoolAuthService** - Token refresh, OAuth edge cases

## Project Status Summary

### ✅ Complete (Production-Ready)

- Backend services: OAuth2 auth, sync engine, glucose statistics, IndexedDB persistence
- Data layer: Dexie with reactive RxJS observables
- Architecture: Service-based design with proper separation of concerns

### ⚠️ In Progress / Missing

- **UI Components (85% missing)**: All pages are placeholder shells
- **BLE Integration (100% missing)**: Documented but not implemented
- **Tests (100% missing)**: No test coverage (`.spec.ts` files are boilerplate only)
- **Technical Debt**: Tab1\* class names should be renamed to semantic names (Dashboard, Readings, Devices, Profile)

### Development Priorities

1. **Implement UI components** - Connect existing services to actual UI in dashboard/readings/profile pages
2. **Add tests** - Focus on ReadingsService statistics, TidepoolSyncService state machine, TidepoolAuthService token refresh
3. **Rename components** - Tab1Page → DashboardPage, etc. (update modules, routing, and references)
4. **BLE decision** - Either implement Bluetooth integration or remove from scope

## Important Notes

### Pre-commit Hooks

This project uses **Husky + lint-staged** to automatically format and lint code on commit:

- TypeScript/JavaScript: Prettier → ESLint (auto-fix)
- HTML: Prettier
- JSON/SCSS/Markdown: Prettier

Configured in `package.json` (lint-staged section) and `.husky/pre-commit`.

### Android Development

- **Java 17 required** for Android builds
- Sync web assets before opening Android Studio: `npx cap sync`
- Deep link configured: `diabetify://oauth/callback` (for OAuth flow)

### Key Files to Reference

- **Architecture Documentation**:
  - `ARCHITECTURE_READINGS_APPOINTMENTS.md` - Complete readings & appointments architecture
  - `EXTERNAL_SERVICES_INTEGRATION.md` - Service orchestration and integration patterns
  - `QUICK_REFERENCE_READINGS.md` - Quick lookup for readings implementation

- **Development Guides**:
  - `TRANSLATION_GUIDE.md` - i18n system and adding new languages
  - `TRANSLATION_MAPPING.md` - Complete translation key reference
  - `MATERIAL_DESIGN_SETUP.md` - Angular Material 20 integration

- **Reference**:
  - `tidepool_some_resources.md` - Tidepool API documentation
  - `.taskmaster/CLAUDE.md` - Task Master AI workflows

---

## External Services Integration Architecture

The app implements a sophisticated multi-service integration layer with:

### Circuit Breaker Pattern

Prevents cascading failures when external services are down:
- Each service has configurable failure threshold
- States: CLOSED (normal) → OPEN (blocked) → HALF_OPEN (testing)
- Automatic recovery attempts after timeout period

### Service Health Monitoring

Real-time monitoring of all external services:
- Periodic health checks with configurable intervals
- Network awareness (online/offline detection)
- Response time tracking
- Visual monitoring via ServiceMonitorComponent

### Workflow Orchestration (Saga Pattern)

Complex multi-service operations with automatic rollback:
- **FULL_SYNC**: Complete data synchronization across all services
- **AUTH_AND_SYNC**: Authentication followed by initial sync
- **APPOINTMENT_WITH_DATA**: Share glucose data with healthcare provider

Example workflow with compensation:
```typescript
// ServiceOrchestratorService automatically handles rollback on failure
const result = await orchestrator.executeFullSync();
// On failure, compensating transactions execute in reverse order
```

### Caching Strategy

Multi-level caching for offline support and performance:
- HTTP response cache with per-endpoint TTL
- Service-level data cache
- IndexedDB for persistent offline storage
- Automatic cache invalidation on mutations

### API Gateway Pattern

Unified entry point for all external API calls:
- Request routing to appropriate backend service
- Automatic authentication token injection
- Response transformation and normalization
- Consistent error handling across services

**Managed Services**:
1. **Tidepool** - OAuth2, CGM data sync
2. **Glucoserver** - Local glucose management
3. **Appointments** - Healthcare provider integration
4. **LocalAuth** - User authentication

See `EXTERNAL_SERVICES_INTEGRATION.md` for complete documentation.

---

**For MCP Workflow Strategies and Task Master AI integration, see the imported instructions from `.taskmaster/CLAUDE.md`**
