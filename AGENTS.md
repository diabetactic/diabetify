# AGENTS.md - Diabetactic AI Agent Configuration

> Config for AI coding agents (Google Jules, OpenAI Codex, Claude Code)

## Project Overview

**Diabetactic** - Ionic/Angular mobile app for diabetes glucose management.  
**Stack**: Angular 21, Ionic 8, Capacitor 8, Tailwind CSS + DaisyUI, Vitest 4, Playwright 1.48

## Commands

```bash
# Build & Dev
pnpm install              # Install deps (pnpm required)
pnpm run start:mock       # Dev server - mock backend (RECOMMENDED)
pnpm run start:cloud      # Dev server - Heroku production
pnpm run build:prod       # Production build
pnpm run lint             # ESLint + Stylelint
pnpm run typecheck        # TypeScript check

# Testing
pnpm test                            # All unit tests
pnpm test -- src/path/to/file.spec.ts  # Single test file
pnpm test -- --grep "test name"      # Filter by test name
pnpm run test:watch                  # Watch mode
pnpm run test:coverage               # Coverage report
pnpm run test:e2e:mock               # Playwright E2E - mock backend (headless)
pnpm run test:e2e:docker             # Playwright E2E - Docker backend (headless)
pnpm run test:e2e:docker:headed      # Playwright E2E - Docker backend (visible browser)
```

## Code Style

### Formatting (Prettier)

- Single quotes, semicolons, 2-space indent, 100 char line width
- Trailing commas in ES5 contexts; Arrow parens only when required: `x => x`

### TypeScript

- **Strict mode** - no implicit any, strict null checks
- **NO type suppressions**: Never use `as any`, `@ts-ignore`, `@ts-expect-error`
- Unused variables prefixed with `_`: `(_unused, value) => value`

### Path Aliases (tsconfig.json)

```typescript
import { ReadingsService } from '@services/readings.service';
import { GlucoseReading } from '@models/glucose-reading.model';
import { environment } from '@env/environment';
// @core/* → src/app/core/*      @shared/* → src/app/shared/*
// @services/* → src/app/core/services/*   @models/* → src/app/core/models/*
// @guards/* → src/app/core/guards/*       @env/* → src/environments/*
// @mocks/* → src/mocks/*        @test-setup/* → src/test-setup/*
```

### Naming Conventions

- **Components**: `kebab-case` selector with `app-` prefix: `app-reading-item`
- **Directives**: `camelCase` selector with `app` prefix: `appHighlight`
- **Files**: `kebab-case.type.ts` (e.g., `readings.service.ts`)
- **Classes**: `PascalCase`; **Interfaces**: `PascalCase`, no `I` prefix

### Angular Components

```typescript
@Component({
  selector: 'app-my-component',
  templateUrl: './my-component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,  // Prefer OnPush
  schemas: [CUSTOM_ELEMENTS_SCHEMA],                // REQUIRED for Ionic
  imports: [
    IonHeader, IonToolbar, IonTitle,                // Import Ionic individually
    TranslateModule,
  ],
})
```

### API Calls

```typescript
// ALWAYS use ApiGatewayService - NEVER HttpClient directly
this.apiGateway.request('readings.list', { params });
this.apiGateway.request('readings.create', { body: reading });
```

### Error Handling

- Use `catchError` operator for Observable errors
- Never swallow errors silently - always log or rethrow
- Use `LoggerService` for consistent logging

### Internationalization

- All user-facing text in BOTH `assets/i18n/en.json` AND `es.json`
- Template: `{{ 'READINGS.TITLE' | translate }}`
- Run `pnpm run i18n:check` before committing

## File Structure

```
src/app/
├── core/
│   ├── services/      # Singleton services (auth, api, database)
│   ├── models/        # TypeScript interfaces
│   ├── guards/        # Route guards
│   └── interceptors/  # HTTP interceptors
├── shared/            # Reusable components
├── dashboard/         # Main dashboard page
├── readings/          # Glucose readings management
├── appointments/      # Medical appointments
└── profile/           # User profile
```

## Testing

- **Unit tests**: `*.spec.ts` files alongside source
- **Mocks**: Capacitor plugins mocked in `src/test-setup/`
- **Use `vi.fn()`** for mocks (Vitest, not Jest)
- **Coverage thresholds**: 80% lines, 75% functions, 70% branches

```typescript
// Test file structure
import '../../../test-setup'; // Required at top
import { TestBed } from '@angular/core/testing';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService /* mocks */],
    });
    service = TestBed.inject(MyService);
  });

  it('should do something', () => {
    expect(service.doSomething()).toBe(expected);
  });
});
```

## Key Files

| File                                           | Purpose                   |
| ---------------------------------------------- | ------------------------- |
| `src/app/core/services/api-gateway.service.ts` | All API calls (endpoints) |
| `src/app/core/services/local-auth.service.ts`  | Authentication            |
| `src/app/core/services/database.service.ts`    | IndexedDB (Dexie)         |
| `src/environments/environment.ts`              | Backend mode config       |
| `vitest.config.ts`                             | Test config               |
| `playwright.config.ts`                         | E2E config                |

## Test Credentials

| System     | Username | Password     |
| ---------- | -------- | ------------ |
| Mobile App | 40123456 | thepassword  |
| Secondary  | 40123457 | thepassword2 |
| Backoffice | admin    | admin        |

Credentials are centralized in `playwright/config/test-config.ts`. Never hardcode in tests.

## Git Workflow

- **NEVER** commit to `master` directly
- Branch naming: `feature/[agent]/[task]`, `fix/[issue]`
- All PRs require passing CI checks
- Squash merge preferred

## Pre-Commit Checklist

- [ ] `pnpm test` passes
- [ ] `pnpm run lint` clean
- [ ] `pnpm run typecheck` clean
- [ ] Translations in both `en.json` AND `es.json`
- [ ] `CUSTOM_ELEMENTS_SCHEMA` in new components
- [ ] PR targets correct branch (NOT master)

## Common Gotchas

1. **CUSTOM_ELEMENTS_SCHEMA** - Required in ALL standalone components for Ionic
2. **ApiGatewayService** - Never use HttpClient directly in components/services
3. **Path aliases** - Use `@services/` not `../../core/services/`
4. **OnPush change detection** - Prefer for performance; use `ChangeDetectorRef.markForCheck()`
5. **Test isolation** - Tests run in forks with sequential execution per file

## Hierarchical Documentation

Additional AGENTS.md files in subdirectories:

- `src/app/core/services/AGENTS.md` - Service layer patterns, API architecture
- `src/app/tests/AGENTS.md` - Integration testing patterns, test helpers
- `src/mocks/AGENTS.md` - MSW handlers, mock data
- `playwright/AGENTS.md` - E2E testing, Page Object Model
- `docs/AGENTS.md` - Documentation index
- `scripts/AGENTS.md` - Build/CI automation scripts

---

Repository: https://github.com/diabetactic/diabetify  
Last Updated: 2026-01-09 (commit a1ba245)
