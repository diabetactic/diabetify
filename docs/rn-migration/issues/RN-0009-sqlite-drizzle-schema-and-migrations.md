# [RN] SQLite foundation: schema v1 + migrations (parity-first tables)

**Type:** Feature / Core spine  
**Priority:** P0  
**Suggested labels:** `rn-migration`, `sqlite`, `db`, `migrations`, `agent-ready`  
**Suggested owner:** Codex

## Context

Current app uses Dexie/IndexedDB and supports offline-first sync. RN rewrite needs durable persistence across restarts and a real outbox.

We will use SQLite as the durable store. Drizzle is optional but strongly recommended for schema discipline and typed queries.

## Goal

Create a DB layer that:

- initializes SQLite on app start
- supports schema migrations
- provides minimal parity-first tables:
  - `settings`
  - `session`
  - `readings`
  - `appointments`
  - `outbox`

## Scope

1. Choose DB approach:

- **Option A (fastest):** raw SQL migrations + thin query helpers
- **Option B (preferred):** Drizzle + expo-sqlite driver + drizzle-kit migrations
  Pick one and document why.

2. Define schema v1

- Ensure each domain entity has fields needed for:
  - local UUID
  - createdAt/updatedAt
  - sync status (`isSynced`, `serverId`, `syncedAt`, `isDeleted` if needed)

3. Implement migration runner

- on app boot, run pending migrations
- keep it deterministic and debuggable

## Non-goals

- Perfect normalization; keep parity-first minimal.
- Encryption-at-rest (SQLCipher) in phase 1.

## Deliverables

- `diabetify-rn/src/data/db/schema.ts`
- `diabetify-rn/src/data/db/migrations/*`
- `diabetify-rn/src/data/db/client.ts` (open db + run migrations)

## Acceptance criteria

- [ ] App initializes DB on start without blocking UI forever (show splash/loading if needed).
- [ ] Insert/select works for `readings` at minimum.
- [ ] DB survives app restart and data persists.
- [ ] Migrations can be rerun safely (idempotent).

## Implementation notes

- Keep `outbox` table design aligned with the sync engine issue:
  - includes idempotencyKey, status, retry metadata
- Use integer timestamps (unix ms) consistently to simplify ordering.

## Agent packet

**Rules**

- Any schema change requires a migration (no manual edits without migration).
- Keep schema changes backward compatible when possible.
