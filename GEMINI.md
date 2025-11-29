# Diabetactic Project Context

## Project Overview

**Diabetactic** is a cross-platform mobile application for diabetes management, built with **Ionic 8** and **Angular 18** (using standalone components). It integrates with **Tidepool** for data synchronization and backend microservices via an **API Gateway**. The app is designed to be "Offline-First", using IndexedDB (Dexie) for local storage and syncing when online.

## Key Technologies

- **Frontend:** Angular 18 (Standalone Components), Ionic 8
- **Mobile Runtime:** Capacitor 6.1
- **Styling:** Tailwind CSS + DaisyUI (configured in `src/global.css`)
- **State/Storage:** Dexie (IndexedDB), RxJS
- **Testing:** Jest (Unit/Integration), Playwright (E2E)
- **Backend Integration:** API Gateway (Heroku/Local/Mock)

## Architecture

The project follows a modular architecture with a clear separation of concerns:

- **API Gateway Pattern:** All external requests (except Tidepool Auth) go through `ApiGatewayService`.
- **Offline-First:** Data is read from local Dexie DB first. Background sync services push changes to the backend.
- **Environments:**
  - `mock`: Pure frontend with in-memory data (fastest for UI dev).
  - `local`: Connects to local Docker backend (`localhost:8000`).
  - `cloud`: Connects to Heroku staging/prod.

## Directory Structure

- `src/app/core`: Singleton services (API Gateway, Auth, Sync), Guards, Models.
- `src/app/shared`: Reusable UI components.
- `src/app/dashboard`: Main user dashboard.
- `src/app/readings`: Glucose reading management.
- `src/app/appointments`: Appointment scheduling and management.
- `playwright/tests`: End-to-End test suites.
- `docs/`: detailed architectural, styling, and testing documentation.

## Development Workflow

### Starting the App

- **Mock Mode (Default):** `npm start` (Runs on `http://localhost:4200` with mock data)
- **Local Backend:** `ENV=local npm start`
- **Heroku Backend:** `ENV=heroku npm start`

### Building

- **Web:** `npm run build`
- **Android:** `npm run cap:sync` then `npm run cap:run:android`

### Testing

- **Unit Tests:** `npm run test:unit` (Jest)
- **E2E Tests:** `npm run test:e2e` (Playwright)
- **Integration:** `npm run test:integration`

## Key Configuration Files

- `angular.json`: Build configurations and file replacements.
- `capacitor.config.ts`: Native app configuration (App ID: `io.diabetactic.app`).
- `src/environments/environment.ts`: Central config for API URLs and Feature Flags.
- `proxy.conf.json`: Proxy setup for bypassing CORS in web development.

## Styling & Conventions

- **Tailwind First:** Use Tailwind utility classes for everything. Avoid custom CSS unless necessary.
- **DaisyUI:** Use DaisyUI component classes (e.g., `btn`, `card`).
- **Dark Mode:** Support dark mode using Tailwind's `dark:` prefix.
- **Strict Typing:** TypeScript strict mode is enabled.
- **Standalone Components:** Angular modules are avoided in favor of standalone components.
- **Linting:** ESLint and Prettier are enforced via `npm run lint` and pre-commit hooks.
