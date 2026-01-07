# Agent Handbook: Legacy Stabilization Protocol

**Target Repository:** `diabetactic/diabetify`
**Status:** Legacy / Maintenance Mode
**Primary Goal:** Stabilize the codebase to serve as a reliable reference for the Mobile Migration (RN/KMP).

---

## 🛑 Critical Warnings

1.  **Do NOT Trust Postman:** The `postman/diabetactic.postman_collection.json` file contains invalid ports (`8004`) and invalid Auth payloads (`application/json`).
2.  **Do NOT Trust `API_ENDPOINTS` comments:** The `api-gateway.service.ts` file contains dead legacy keys (`glucoserver.*`) mixed with active keys (`extservices.*`).
3.  **No AI Here:** This app uses **Rule-Based Logic** for Bolus/Trends. Do not hallucinate AI models.

---

## 🛠️ Repair Task List

### 1. Fix API Gateway Service (`src/app/core/services/api-gateway.service.ts`)

- [ ] **Delete Dead Keys:** Remove all `glucoserver.*` keys from the `API_ENDPOINTS` map. They point to `/v1/readings` which does not exist on the current Heroku gateway.
- [ ] **Delete Dead Keys:** Remove `appointments.list` etc. keys that point to `/appointments` (root). The correct path is `/appointments/mine` via `extservices.appointments.mine`.
- [ ] **Verify Active Keys:** Ensure `extservices.glucose.mine` maps to `/glucose/mine`.

### 2. Fix Postman Collection (`postman/diabetactic.postman_collection.json`)

- [ ] **Update Port:** Change `{{port_8004}}` to `8000`.
- [ ] **Update Auth:** Change `/token` request body to `x-www-form-urlencoded` with `username` and `password`.

### 2b. Use Unified API Helper (NEW - 2025-12-13)

Instead of fixing legacy scripts, use the new unified helper:

```bash
# Auto-detects Docker (8000/8001) or Heroku
node scripts/diabetify-api.js list-users
node scripts/diabetify-api.js login --user=julian --pass=tuvieja
node scripts/diabetify-api.js pending-appointments
node scripts/diabetify-api.js accept --placement=0
```

**Deprecated scripts** (wrong ports, Heroku-only):

- `maestro/scripts/backoffice-api.js` - uses port 8006
- `scripts/appointments/*.sh` - Heroku only
- `scripts/populate-docker-data.js` - uses port 8004

### 3. Missing Feature Cleanup

- [ ] **Trends Page:** The `trends/trends.page.ts` is empty. Either delete the route or implement a basic chart matching the RN/KMP migration.
- [ ] **Food Picker:** Ensure `FoodPickerComponent` is actually usable in `BolusCalculatorPage`.

---

## 🔍 Verification Guide

### How to verify API contract

Run the integration tests (which mock the backend, unfortunately). To verify against REAL backend:

1.  Start Docker services: `npm run docker:start` (in parent repo).
2.  Run E2E: `pnpm -s run test:e2e:docker`.

### How to verify Auth

Check `LocalAuthService.ts`. It manually calls `this.baseUrl + '/token'`. It DOES NOT use `ApiGateway.request('auth.token')` in many paths.
**Refactor Opportunity:** Make `LocalAuthService` use `ApiGateway` to ensure consistent logging/interceptors.
