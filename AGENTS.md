# AGENTS.md - Diabetify

> Ionic/Angular mobile app for diabetes glucose management

**Stack**: Angular 21, Ionic 8, Capacitor 8, Tailwind CSS + DaisyUI, Vitest 4, Playwright 1.48

## Commands

```bash
pnpm install              # Install deps (pnpm required)
pnpm run start:mock       # Dev server - mock backend (RECOMMENDED)
pnpm run start:cloud      # Dev server - Heroku production
pnpm run build:prod       # Production build
pnpm run lint             # ESLint + Stylelint
pnpm run typecheck        # TypeScript check

# Testing
pnpm test                            # All unit tests (2392 tests)
pnpm test -- src/path/to/file.spec.ts  # Single test file
pnpm run test:e2e                    # Playwright E2E (requires Docker backend)
pnpm run test:e2e -- --update-snapshots  # Update visual baselines
```

## Architecture

```
src/app/
├── core/
│   ├── services/      # 38 singleton services (see services/AGENTS.md)
│   ├── models/        # TypeScript interfaces
│   ├── guards/        # Route guards
│   └── interceptors/  # HTTP interceptors
├── shared/            # Reusable components
├── dashboard/         # Main dashboard page
├── readings/          # Glucose readings management
├── appointments/      # Medical appointments
├── profile/           # User profile
└── tests/             # Integration tests (see tests/AGENTS.md)
```

**Key Patterns**:

- **Standalone Components**: Angular 21 style, no NgModules
- **Offline-First**: IndexedDB (Dexie) as primary, sync to backend
- **Facade Pattern**: `ReadingsService` coordinates mapper/statistics/sync
- **Gateway Pattern**: `ApiGatewayService` centralizes ALL HTTP calls

## Code Style

### TypeScript

- Strict mode enabled, `strictTemplates: true`
- **NO type suppressions**: Never use `as any`, `ts-ignore`, `ts-expect-error`
- Unused vars prefixed with `_`

### Path Aliases

```typescript
import { ReadingsService } from '/services/readings.service';
import { GlucoseReading } from '/models/glucose-reading.model';
import { environment } from '/env/environment';
// AT-core/* AT-shared/* AT-services/* AT-models/* AT-guards/* AT-env/* AT-mocks/* AT-test-setup/*
```

### Angular Components

```typescript
AT -
  Component({
    selector: 'app-my-component',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    schemas: [CUSTOM_ELEMENTS_SCHEMA], // REQUIRED for Ionic
    imports: [IonHeader, IonToolbar, TranslateModule],
  });
```

## Backend Repos (CRITICAL)

**Location**: `/home/julito/code/facu/diabetactic/`

| Repo                      | Purpose                 | Key Files                                                |
| ------------------------- | ----------------------- | -------------------------------------------------------- |
| `login/`                  | User auth, registration | `app/models/user_model.py`, `app/schemas/user_schema.py` |
| `glucoserver/`            | Glucose readings        | `app/models/`, `app/routes/`                             |
| `appointments/`           | Medical appointments    | `app/models/`, `app/routes/`                             |
| `api-gateway/`            | Main API proxy          | Routes requests to services                              |
| `api-gateway-backoffice/` | Admin API               | User management, queue control                           |

**MANDATORY**: Before making assumptions about backend behavior:

1. **READ the actual backend code** at `/home/julito/code/facu/diabetactic/`
2. Check model definitions (`*_model.py`) for constraints (UNIQUE, nullable, defaults)
3. Check schemas (`*_schema.py`) for required fields and types
4. Check routes (`*_routes.py`) for endpoint behavior
5. **NEVER assume** field types, defaults, or constraints - verify in backend repos

## Anti-Patterns (THIS PROJECT)

| Forbidden                        | Why                   | Correct                                |
| -------------------------------- | --------------------- | -------------------------------------- |
| `HttpClient` injection           | Bypasses caching/auth | Use `ApiGatewayService.request()`      |
| `as any`, `ts-ignore`            | Hides bugs            | Fix types properly                     |
| Hardcoded credentials            | Security risk         | Use `playwright/config/test-config.ts` |
| Inline `style=` in templates     | Breaks theming        | Use Tailwind classes                   |
| Missing `CUSTOM_ELEMENTS_SCHEMA` | Ionic fails           | Add to all components                  |
| Assuming backend behavior        | Causes bugs           | **Verify in backend repos first**      |

## Key Files

| File                                           | Purpose                                 |
| ---------------------------------------------- | --------------------------------------- |
| `src/app/core/services/api-gateway.service.ts` | ALL external API calls (100+ endpoints) |
| `src/app/core/services/readings.service.ts`    | Glucose CRUD facade                     |
| `src/app/core/services/database.service.ts`    | IndexedDB (Dexie)                       |
| `src/app/core/services/local-auth.service.ts`  | JWT auth                                |
| `vitest.config.ts`                             | Unit test config                        |
| `playwright.config.ts`                         | E2E config                              |

## Test Credentials

| System     | Username | Password     |
| ---------- | -------- | ------------ |
| Mobile App | 40123456 | thepassword  |
| Secondary  | 40123457 | thepassword2 |
| Backoffice | admin    | admin        |

Centralized in `playwright/config/test-config.ts`. Never hardcode.

## Testing

- Unit tests: `*.spec.ts` alongside source, use `vi.fn()` (Vitest)
- First line: `import '../../../test-setup';`
- Coverage: 80% lines, 75% functions, 70% branches
- E2E: Page Object Model, `BasePage` handles Ionic hydration

## Internationalization

All text in BOTH `assets/i18n/en.json` AND `es.json`. Check: `pnpm run i18n:check`

## Git Workflow

- **NEVER** commit to `master` directly
- Branch: `feature/[agent]/[task]`, `fix/[issue]`
- Pre-commit: `pnpm test && pnpm run lint && pnpm run typecheck`

## Subdirectory Documentation

| Path                              | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `src/app/core/services/AGENTS.md` | Service architecture, API patterns          |
| `src/app/tests/AGENTS.md`         | Integration testing, setupTestBed()         |
| `src/mocks/AGENTS.md`             | MSW handlers, Capacitor mocks               |
| `playwright/AGENTS.md`            | E2E testing, Page Object Model              |
| `scripts/AGENTS.md`               | CI/CD automation                            |
| `docs/AGENTS.md`                  | Documentation index                         |
| `docker/AGENTS.md`                | Local backend, **backend validation rules** |

## AI Agent: DON'T GUESS - USE YOUR TOOLS

**STOP guessing. You have powerful web/doc tools. USE THEM:**

| Tool                                                  | When to Use                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `context7_resolve-library-id` + `context7_query-docs` | Library/framework APIs, best practices, version-specific docs |
| `firecrawl_search` / `firecrawl_scrape`               | Web search, scrape specific URLs                              |
| `tavily-search` / `tavily-extract`                    | Real-time web search, content extraction                      |
| `websearch_web_search_exa`                            | AI-powered web search                                         |
| `grep_app_searchGitHub`                               | Find real code examples in public repos                       |

**MANDATORY before any of these:**

- Unfamiliar library/API → `context7` or `librarian` agent
- Tool/framework configuration → search docs first
- "How does X work?" → search before guessing
- Version-specific behavior → verify in official docs

**OpenCode Skills**: Located in `.opencode/skill/*/SKILL.md` - use `angular`, `playwright`, `backend`, `qa`, `quality`, `reviewer`, `tester`, `full-test`

---

**Generated**: 2026-01-15 | **Commit**: 09787eb | **Branch**: master
