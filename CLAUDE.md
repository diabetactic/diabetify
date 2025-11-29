# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Diabetactic is an Ionic/Angular mobile application for glucose reading management in diabetic patients with Tidepool API integration. Built as an offline-first, cross-platform app using Angular 20, Ionic 8, and Capacitor 6.

**Tech Stack**: Angular 20 + Ionic 8 + Capacitor 6 + TypeScript 5.8 + Tailwind CSS + DaisyUI + Dexie (IndexedDB)

## Development Commands

### Development Server

```bash
npm start                    # Start dev server (includes env loading)
```

### Building

```bash
npm run build                # Development build
npm run build:prod           # Production build (AOT + optimization)
npm run build:mock           # Build with mock data
npm run build:heroku         # Build for Heroku backend
npm run build:mobile         # Production build + capacitor sync
```

### Testing

```bash
# Unit & Integration (Jest)
npm run test:unit            # Run Jest unit tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
npm run test:integration     # Integration suite in src/app/tests/integration (serial)

# E2E (Playwright)
npm run test:e2e             # Headless
npm run test:e2e:headed      # Visible browser
```

### Code Quality

```bash
npm run quality              # Run lint + format check
npm run quality:fix          # Fix lint + format issues
npm run lint                 # ESLint check
npm run lint:fix             # Auto-fix ESLint issues
npm run format               # Format with Prettier
npm run format:check         # Check format without changes
```

### Mobile Development

```bash
npm run build:mobile         # Production build + capacitor sync
```

### Internationalization

```bash
npm run i18n:check           # Check for missing translations
```

## Critical Architecture Patterns

### API Gateway Pattern - MANDATORY

**All backend communication MUST go through ApiGatewayService** (`src/app/core/services/api-gateway.service.ts`)

The gateway provides:

- Centralized request routing
- Automatic token injection
- Response transformation
- Error standardization
- Cache strategy with LRU
- Exponential backoff retry

**Exceptions (only two services allowed direct HTTP):**

1. `TidepoolAuthService` - External OAuth provider
2. `ExternalServicesManagerService` - Health checks only

### Authentication Architecture

Three-layer authentication system:

1. **UnifiedAuthService**: Coordinates all auth flows
2. **TidepoolAuthService**: OAuth2/PKCE for Tidepool integration
3. **LocalAuthService**: Backend authentication with JWT

### Offline-First Data Flow

```
User Action → Component → Service (Business Logic) → ApiGatewayService
                                                      ↓
                                        DatabaseService (Dexie/IndexedDB)
                                                      ↓
                                        Backend Microservices / Tidepool API
```

**Data Strategy:**

1. Check IndexedDB cache first
2. Fetch from network if cache miss/stale
3. Update cache on network response
4. Background sync when connection available

### Service Layer Organization

**Core Services** (`src/app/core/services/`):

- `api-gateway.service.ts` - Central HTTP communication
- `unified-auth.service.ts` - Authentication coordinator
- `database.service.ts` - IndexedDB management (Dexie)
- `readings.service.ts` - Glucose readings with cache
- `appointment.service.ts` - Medical appointments
- `profile.service.ts` - User profile management
- `tidepool-sync.service.ts` - Tidepool synchronization

**Models** (`src/app/core/models/`): TypeScript interfaces and types

**Guards** (`src/app/core/guards/`): Route protection

**Interceptors** (`src/app/core/interceptors/`): HTTP interceptors

## Environment Configuration

Multiple environment files in `src/environments/`:

- `environment.ts` - Development (default)
- `environment.prod.ts` - Production
- `environment.mock.ts` - Mock data for testing
- `environment.heroku.ts` - Heroku backend
- `environment.local.ts` - Local development
- `environment.test.ts` - Test configuration

**Backend URL**: `environment.backendServices.apiGateway.baseUrl`

## Component Structure

The app uses **standalone components** (Angular 18+ pattern - no NgModules):

**Main Modules:**

- `dashboard/` - Main dashboard with statistics
- `readings/` - Glucose reading management
- `appointments/` - Medical appointments
- `profile/` - User profile
- `login/` - Authentication
- `register/` - User registration
- `settings/` - App settings
- `trends/` - Historical trends visualization
- `tips/` - Health tips
- `bolus-calculator/` - Insulin dose calculator

**Shared** (`src/app/shared/`): Reusable components across modules

## Routing

Routes defined in `src/app/app.routes.ts` and `src/app/app-routing.module.ts`

Uses lazy loading for optimal bundle size (target: <2MB initial)

## Testing Requirements

### Unit Tests (Jest)

- **Services**: 90% minimum coverage
- **Components**: 80% minimum coverage
- **Overall**: 85% target
- **Parallelization**: Tests run in parallel (50% of CPU cores by default)

Run specific test: `npm test -- --testPathPattern='service-name'`

### Integration Tests (Jest)

- Location: `src/app/tests/integration/`
- Command: `npm run test:integration`
- Runs in-band to avoid resource contention; no coverage collection

### E2E Tests (Playwright)

- Location: `playwright/tests/`
- Base URL: `http://localhost:4200`
- Screenshots on failure; video on retry
- Debug: `npx playwright test --debug`

## Styling

**Framework**: Tailwind CSS + DaisyUI components

**Theme Support**: Light/dark themes with CSS variables

**Global Styles**: `src/global.css`

## Internationalization (i18n)

- English and Spanish support
- Translation files: `src/assets/i18n/en.json` and `src/assets/i18n/es.json`
- Uses `@ngx-translate/core`

## Mobile-Specific

**Capacitor Plugins:**

- Secure Storage
- Device Info
- Keyboard
- Network Status
- Preferences
- Haptics
- Status Bar
- Splash Screen

## Database (IndexedDB via Dexie)

All local data persistence uses Dexie for IndexedDB access. Service: `DatabaseService`

**Tables:**

- Glucose readings
- Appointments
- User profiles
- Sync queue

## Security

- OAuth2/PKCE for Tidepool
- JWT tokens for backend services
- Automatic token refresh
- Secure storage via Capacitor Secure Storage
- No direct HTTP calls outside ApiGateway (except approved exceptions)

## Performance Targets

- Initial bundle: <2MB
- IndexedDB caching for offline support
- Request debouncing
- Lazy loading routes
- Image optimization

## Git Hooks (Husky)

Pre-commit hooks run:

- Prettier formatting
- ESLint fixing
- Stylelint for SCSS

Configuration in `package.json` under `lint-staged`

## External Documentation

For detailed information, see:

- `docs/ARCHITECTURE.md` - Detailed architecture patterns
- `docs/TESTING_GUIDE.md` - Comprehensive testing guide
- `docs/STYLING_GUIDE.md` - Styling conventions
- `docs/TRANSLATION_GUIDE.md` - i18n guidelines
- `docs/TIDEPOOL_SETUP.md` - Tidepool integration setup
