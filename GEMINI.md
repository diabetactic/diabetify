# Diabetactic (Diabetify) Context

## Project Overview

Diabetactic is a cross-platform mobile application designed for diabetes glucose management. It allows users to log glucose readings, view trends, and manage medical appointments. It is built with **Ionic 8** and **Angular 21**, using **Capacitor 8** for native mobile capabilities.

## Architecture

- **Offline-First:** Uses **Dexie.js (IndexedDB)** as the primary local data store with background synchronization to a backend.
- **Modular Design:** Angular Standalone Components, feature-based directory structure.
- **Reactive:** Heavily relies on **RxJS** for state management and data flow.
- **Styling:** **Tailwind CSS** combined with **DaisyUI** components.

## Tech Stack

- **Framework:** Angular 21 + Ionic 8
- **Language:** TypeScript 5.9
- **Mobile Runtime:** Capacitor 8.0
- **State/Data:** Dexie 4.2 (Local), RxJS
- **Styling:** Tailwind CSS 3.4, DaisyUI 5
- **Build Tool:** Turborepo, Angular CLI
- **Package Manager:** pnpm 10

## Key Commands

### Development

- **Start (Mock Backend):** `pnpm run start:mock` (Recommended for local dev)
- **Start (Local Backend):** `pnpm run start:local`
- **Serve (Dev Server):** `pnpm start`

### Building

- **Web Build:** `pnpm run build`
- **Prod Build:** `pnpm run build:prod`
- **Mobile Sync:** `pnpm run mobile:sync`
- **Android Build:** `pnpm run mobile:build`

### Testing

- **Unit Tests:** `pnpm run test:unit` (Vitest)
- **E2E Tests:** `pnpm run test:e2e` (Playwright)
- **Test Coverage:** `pnpm run test:coverage`
- **Linting:** `pnpm run lint`
- **Formatting:** `pnpm run format`

## Directory Structure

- `src/app/`: Main application source code.
  - `core/`: Singleton services, models, guards.
  - `shared/`: Reusable components (UI, etc).
  - `dashboard/`, `readings/`, `appointments/`, `profile/`, `login/`: Feature modules.
- `android/`: Native Android project files.
- `docker/`: Docker configuration for backend/testing services.
- `playwright/`: E2E test definitions.
- `conductor/`: Project documentation and architectural guidelines.

## Conventions

- **Code Style:** Enforced via ESLint and Prettier.
- **Commits:** Follow conventional commits (inferred).
- **Components:** Angular Standalone components are the standard.
- **Testing:** Unit tests (Vitest) are required for logic; E2E (Playwright) for critical flows.
