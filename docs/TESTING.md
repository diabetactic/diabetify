# Testing Guide

This project uses separate commands for unit tests and integration tests.

## Unit Tests

- Command: `npm test`
- Runner: Angular CLI + Karma
- Entry file: `src/test.ts`
- Discovers and runs `*.spec.ts` files under `src/`, excluding the integration test folder.
- Purpose: fast feedback on components, services, pipes and helpers without starting the Docker backend.

Typical usage:

```bash
npm test
```

Run in CI:

```bash
npm test -- --watch=false
```

## Integration Tests

- Command: `npm run test:integration`
- Pipeline:
  - Starts the Docker-based backend via `extServicesCompose/extServices/container-managing` (make build).
  - Waits for `/health` endpoints on all services.
  - Runs the Angular integration test target with Karma.
  - Stops the backend (make down) when finished.
- Entry file: `src/test.integration.ts`
  - Loads only `*.integration.ts` files under `src/app/tests/integration/`.
- TypeScript config: `tsconfig.spec.integration.json`
  - Compiles integration specs and shared helpers.

Typical usage:

```bash
npm run test:integration
```

This will:

1. Spin up backend microservices (including `api-gateway` on port 8004).
2. Run the integration suites.
3. Tear down the backend stack.

## Integration Test Layout

Integration tests live under:

- `src/app/tests/integration/backend/` – HTTP-level tests against the real backend (for example, `appointments-backend.integration.ts`).
- `src/app/tests/integration/components/` – component-level integration tests using real templates and stubbed services.
- `src/app/tests/integration/features/` – end-to-end-like flows within the Angular app (optional).

Shared helpers live in:

- `src/app/tests/helpers/`

These helpers are shared between unit and integration tests where appropriate.

## Quick Reference

- Run all unit tests: `npm test`
- Run integration tests (requires Docker backend): `npm run test:integration`
- Backend control (from project root):
  - Start: `cd extServicesCompose/extServices/container-managing && make build`
  - Stop: `cd extServicesCompose/extServices/container-managing && make down`

