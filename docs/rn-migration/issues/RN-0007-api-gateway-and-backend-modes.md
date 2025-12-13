# [RN] Implement API Gateway + endpoint registry + backend modes (mock/local/cloud)

**Type:** Feature / Core spine  
**Priority:** P0 (core contract boundary)  
**Suggested labels:** `rn-migration`, `core`, `api`, `backend-modes`, `agent-ready`  
**Suggested owner:** Codex

## Context

The current app enforces a **single API gateway** rule (`ApiGatewayService`) and supports backend modes:

- `mock` (recommended)
- `local` (Docker)
- `cloud` (Heroku)

The RN rewrite must preserve this “single choke point” so agents don’t create scattered network calls.

## Goal

Create `diabetify-rn/src/services/apiGateway/` that is the **only** place allowed to do network I/O.

## Scope

1. Endpoint registry (typed)

- Define endpoint keys (e.g. `readings.list`, `readings.create`, `appointments.create`, `auth.login`, `tidepool.*`)
- Map each key → `{ method, path, authType }`
- Use Postman collections as canonical reference:
  - `postman/diabetactic.postman_collection.json`
  - `postman/tidepool.postman_collection.json`

2. Backend mode resolution

- Implement mode selection (mock/local/cloud), using Expo config:
  - `EXPO_PUBLIC_BACKEND_MODE=mock|local|cloud`
  - base URLs configured per mode
- Ensure mock mode works offline (returns deterministic fixtures).

3. Auth injection + error normalization

- Inject tokens for diabetactic backend.
- Tidepool flows likely use different headers/tokens; add separate auth type.
- Normalize errors into `AppError { code, message, httpStatus, details }`.

4. Guardrails

- Add lint rule or a simple repository check script to fail CI if `fetch(` or `axios` is used outside apiGateway.

## Non-goals

- Full Tidepool auth flow (separate issue).
- Real sync engine (separate issue).

## Deliverables

- `diabetify-rn/src/services/apiGateway/endpoints.ts` (registry)
- `diabetify-rn/src/services/apiGateway/client.ts` (http client wrapper)
- `diabetify-rn/src/services/apiGateway/mock/*` (mock handlers + fixtures)
- `diabetify-rn/src/services/apiGateway/errors.ts` (AppError + helpers)
- `diabetify-rn/scripts/no-direct-network-check.mjs` (optional)

## Acceptance criteria

- [ ] A screen/repo can call `apiGateway.request('readings.list', …)` and get a response in mock mode.
- [ ] Switching `EXPO_PUBLIC_BACKEND_MODE` changes routing without code changes.
- [ ] Direct network calls outside apiGateway are caught (lint or script).

## Implementation notes

- Start with `fetch` (Expo built-in) to reduce dependencies.
- Keep request/response typing incremental; don’t block progress on perfect types.

## Agent packet

**Rules**

- Absolutely no network calls in UI/components/hooks.
- Any new endpoint must be added to the registry (no raw URL usage).
