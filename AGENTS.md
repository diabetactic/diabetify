# Repository Guidelines

This document explains how to work effectively in the `diabetactic` Ionic/Angular codebase.

## Project Structure & Modules

- Application code lives in `src/app`, organized by feature (e.g. `dashboard`, `readings`, `appointments`, `tips`).
- Shared components, pipes, and utilities are in `src/app/shared`; cross-cutting services and models are in `src/app/core`.
- Styling is defined in `src/theme` and `src/global.css`; translations and static assets are under `src/assets`.
- End-to-end tests live in `playwright/tests`; additional docs are in `docs` (architecture, styling, testing, translations).

## Build, Test, and Development

- `npm start` – run the dev server (Angular + Ionic).
- `npm run build:prod` – production build for web.
- `npm test` / `npm run test:coverage` – Jest unit tests (with coverage).
- `npm run test:integration` – Jest integration suite in `src/app/tests/integration` (serial, no coverage).
- `npm run test:e2e` – Playwright end-to-end tests.
- `npm run lint` / `npm run lint:styles` – ESLint and Stylelint checks.
- `npm run format` – Prettier formatting for TS/HTML/SCSS/JSON/MD.

## Coding Style & Naming

- Use TypeScript with strict typing; prefer interfaces and enums over `any`.
- Follow ESLint rules (`eslint.config.js`) and Prettier defaults (2-space indentation).
- Components/services: `PascalCase` (e.g. `DashboardPage`, `ReadingsService`); variables and functions: `camelCase`.
- Keep feature code inside its folder (e.g. new readings feature → `src/app/readings/...`).

## Testing Guidelines

- Write Jest unit tests alongside features in `src/app/tests` or within the feature folder where appropriate.
- Name tests descriptively and group by feature; ensure new logic is covered (`npm run test:coverage` to verify).
- For UI flows, add or update Playwright specs in `playwright/tests` and run `npm run test:e2e`.

## Commit & Pull Request Practices

- Use conventional-style prefixes where possible: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc. (see `git log` for examples).
- Each PR should include a clear description, linked issue (if applicable), and testing notes (e.g. `npm test`, `npm run test:e2e`).
- Attach screenshots for UI changes (web or Android) and mention any configuration or migration steps required.
