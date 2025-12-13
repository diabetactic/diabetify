# [RN] Parity inventory + acceptance criteria (screens, endpoints, data, tests)

**Type:** Planning / Spec  
**Priority:** P0 (blocks everything)  
**Suggested labels:** `rn-migration`, `parity`, `planning`, `agent-ready`  
**Suggested owner:** Claude Code (spec/review) + Codex (repo scanning automation)

## Context

We are rewriting `diabetactic/diabetify` (Ionic/Angular + Capacitor) into a **new Android-only React Native app** (Expo + TypeScript). The rewrite must be **parity-first** with the current app.

The current repo explicitly lists parity requirements:

- Readings: create/list/history/trends
- Dashboard: stats + trends
- Appointments management
- Offline-first with automatic sync
- ES/EN i18n
- Light/Dark themes
- Tidepool authentication integration (optional auth path)

Sources of truth in this repo:

- Product + feature list: `README.md`
- API contracts: `postman/diabetactic.postman_collection.json`, `postman/tidepool.postman_collection.json`
- Existing mobile E2E culture: `maestro/` (flows, scripts, docs)
- Current offline engine implementation: Dexie/IndexedDB + sync logic (likely under `src/app/core/services/`)

## Goal

Produce a **parity inventory** that becomes the backlog + test oracle for the RN rewrite. This must be detailed enough that coding agents can implement features without guessing.

## Scope

1. **Screen + flow inventory**

- Enumerate existing routes/screens and group into `(auth)`, `(tabs)` targets for RN.
- For each screen: purpose, data dependencies (read/write), offline behavior, i18n keys, theme considerations.

2. **Endpoint inventory**

- From Postman collections, list endpoints used by the mobile app and categorize by domain:
  - auth (diabetactic)
  - tidepool auth
  - readings
  - appointments
  - dashboard/stats (if separate)
- For each endpoint: method, path, params, request/response shape, auth requirements, idempotency feasibility.

3. **Local data inventory**

- Identify Dexie schema: tables, indexes, sync metadata fields, outbox/queue mechanism (if any).
- Identify what data is truly “local-only” vs “can be fetched from backend”.

4. **Acceptance tests / “must-pass” flows**

- Define 3–5 **must-pass** flows for parity (Android-only, RN target):
  - Login in mock mode
  - Add reading offline → see it immediately
  - Reconnect → sync completes (status changes)
  - Dashboard shows correct stats from local store
  - Appointment create/cancel (at least one)

## Non-goals

- Designing final RN UI/UX polish.
- Adding new features not in the current app.
- Reworking backend contracts (unless absolutely required; if required, document it).

## Deliverables

Create these new docs (paths are suggestions; adjust if you prefer):

- `docs/rn-migration/PARITY_CHECKLIST.md`
- `docs/rn-migration/ENDPOINT_INVENTORY.md` (generated from Postman + confirmed in code)
- `docs/rn-migration/SCREEN_INVENTORY.md`
- `docs/rn-migration/OFFLINE_SYNC_NOTES.md` (Dexie behavior + required parity)
- `docs/rn-migration/TEST_ORACLE.md` (defines must-pass flows + what “done” means)

## Acceptance criteria

- [ ] The parity checklist covers **all** features in `README.md` and matches current behavior.
- [ ] Endpoint inventory is derived from `postman/` and cross-checked against current code.
- [ ] Screen inventory maps to an RN navigation plan (`(auth)` + `(tabs)` + modals).
- [ ] Offline behavior is described as executable rules (“write locally first, then sync queue FIFO…”).
- [ ] Must-pass flows are defined with step-by-step criteria that can be translated directly into Maestro tests.

## Implementation notes (how to do this quickly)

- Use ripgrep to find key services:
  - Search for Dexie usage: `rg -n "Dexie|indexedDB|db\\.version\\(|table\\(" src/app`
  - Search for API gateway: `src/app/core/services/api-gateway.service.ts`
  - Search for appointments service + readings service
  - Search for Tidepool integration mentions: `rg -n "tidepool" src/app`
- Parse Postman collections with `jq` to list endpoints and generate markdown tables.

## Commands

From repo root (`TPP/diabetactic/diabetify`):

- `rg -n "Dexie|tidepool|appointments|readings|offline|sync" src/app`
- `jq '.item[] | .. | objects | select(has(\"request\")) | .name' postman/diabetactic.postman_collection.json | head`

## Agent packet (copy/paste into an agent tool)

**Rules**

- Do not modify app code in this issue; only create docs + inventories.
- Keep outputs deterministic and reproducible (use scripts if needed).
- When uncertain, state assumption + how to validate in current code.

**Definition of done**

- The docs listed above exist and are accurate enough to open the remaining RN migration issues without ambiguity.
