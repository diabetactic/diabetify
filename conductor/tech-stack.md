# Technology Stack

## Core Technologies

- **Language:** TypeScript 5.9
- **Frontend Framework:** Angular 21 (Standalone components)
- **UI Framework:** Ionic 8
- **Mobile Platform:** Capacitor 8.0
- **Styling:** Tailwind CSS 3.4 + DaisyUI 5
- **Local Database:** Dexie 4.2 (IndexedDB)

## Testing & Quality

- **Unit & Integration Testing:** Vitest 4
- **E2E Testing:** Playwright 1.48
- **Mocking:** MSW (Mock Service Worker)
- **Linting:** ESLint & Stylelint
- **Formatting:** Prettier

## Infrastructure & Tools

- **Build System:** Turborepo
- **Package Manager:** pnpm 10
- **Observability:** OpenTelemetry SDK
- **CI/CD:** GitHub Actions (inferred from .github/workflows)
- **Deployment:** Netlify & Heroku (inferred from documentation)

## Architecture Patterns

- **Offline-First:** IndexedDB as primary store with background synchronization.
- **Modular:** Feature-based folder structure.
- **Reactive:** RxJS for state and data flow management.
