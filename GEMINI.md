# Diabetify (Diabetactic) - Project Context

**Diabetify** is a mobile application for diabetes management (glucose tracking, appointments) built with **Ionic 8** and **Angular 21**. It follows an offline-first architecture, syncing with a Python-based microservices backend.

## Tech Stack

| Category            | Technology             | Version    | Notes                                                     |
| :------------------ | :--------------------- | :--------- | :-------------------------------------------------------- |
| **Framework**       | Ionic + Angular        | 8.x / 21.x | Standalone Components, Signals                            |
| **Mobile**          | Capacitor              | 8.x        | Native native bridge                                      |
| **Language**        | TypeScript             | 5.9        | Strict mode, no `any`                                     |
| **Styling**         | Tailwind CSS + DaisyUI | 3.4 / 5.x  | Utility-first, standardized components                    |
| **State/Data**      | Dexie (IndexedDB)      | 4.2        | Offline-first, sync via `ApiGatewayService`               |
| **Testing**         | Vitest + Playwright    | 4.x / 1.48 | Unit (Vitest), Integration (Vitest+MSW), E2E (Playwright) |
| **Linting**         | ESLint + Stylelint     | 9.x / 16.x | Strict rules (imports, circular deps, dead code)          |
| **Package Manager** | pnpm                   | 10.x       | Workspace support                                         |

## Key Commands

### Development

- **Start (Mock)**: `pnpm run start:mock` (Recommended for FE dev, no backend required)
- **Start (Local)**: `pnpm run start:local` (Connects to local Docker backend)
- **Build (Prod)**: `pnpm run build:prod` (AOT, optimized)
- **Lint & Fix**: `pnpm run lint:fix` (Run this before committing)

### Testing

- **Unit Tests**: `pnpm test` (Runs all Vitest tests)
  - **Watch**: `pnpm run test:watch`
  - **Single File**: `pnpm test -- src/path/to/file.spec.ts`
- **E2E Tests**: `pnpm run test:e2e` (Requires Docker backend)
  - **Visual Update**: `pnpm run test:e2e -- --update-snapshots`
- **Quality Check**: `pnpm run quality` (Full suite: lint, typecheck, circular deps, tests)

### Backend (Docker)

- **Start Backend**: `pnpm run docker:start`
- **Reset DB**: `pnpm run docker:reset`
- **Logs**: `pnpm run docker:logs`

## Architecture & Patterns

### 1. Offline-First Data Flow

- **Read**: Always read from `ReadingsService` (facade), which queries `DatabaseService` (Dexie/IndexedDB).
- **Write**: Write to `ReadingsService`, which persists to IndexedDB immediately and queues a sync job.
- **Sync**: Background process pushes changes to backend via `ApiGatewayService`.

### 2. API Communication

- **Gateway**: ALL external calls go through `ApiGatewayService` (centralized auth, error handling).
- **No Direct HttpClient**: Do not inject `HttpClient` in feature services. Use `ApiGatewayService.request()`.
- **Backend Location**: Sibling directories (`../glucoserver`, `../appointments`, etc.). **VERIFY** backend models in those repos before assuming shapes.

### 3. Component Style

- **Standalone**: All components are `standalone: true`.
- **OnPush**: `changeDetection: ChangeDetectionStrategy.OnPush` is standard.
  - **Requirement**: Manually trigger `cdr.markForCheck()` after async data updates if not using `AsyncPipe` or Signals.
- **Ionic**: Must include `schemas: [CUSTOM_ELEMENTS_SCHEMA]` in component metadata.

### 4. Testing Strategy ("Testing Trophy")

- **Unit (70%)**: Logic in services/components. Mock dependencies using `vi.fn()`.
- **Integration (25%)**: `src/app/tests/integration/`. Use MSW (`src/mocks/handlers/`) to mock API responses.
- **E2E (5%)**: Critical user flows. Page Object Model in `playwright/pages/`.

## Development Rules (Strict)

1.  **No `any`**: TypeScript strict mode is on. Define interfaces in `src/app/core/models/`.
2.  **No `ts-ignore`**: Fix the underlying type issue.
3.  **Path Aliases**: Use mapped paths (e.g., `@core/services/readings.service`) instead of relative `../../`.
4.  **Backend Verification**: Before implementing API integration, check the actual backend code in `/home/julito/code/facu/diabetactic/` (python repos).
5.  **Agents**: Refer to `.opencode/skill/*/SKILL.md` for specialized agent instructions (Angular, Reviewer, QA).

## Directory Structure

- `src/app/core/`: Singleton services, guards, interceptors, models.
- `src/app/shared/`: Reusable UI components (buttons, cards).
- `src/app/dashboard/`, `src/app/readings/`: Feature modules (Lazy loaded).
- `playwright/`: End-to-End tests and config.
- `docker/`: Scripts for local backend environment.
