# [RN] First-login “fresh pull” seeding strategy (replace Dexie data without migration)

**Type:** Feature / Migration strategy  
**Priority:** P1 (needed before real users)  
**Suggested labels:** `rn-migration`, `migration`, `data`, `offline-first`, `agent-ready`  
**Suggested owner:** Codex

## Context

Current app stores offline data in Dexie/IndexedDB, which is not directly portable to RN SQLite. Since this is a greenfield rewrite (Android-only) and we’re allowed to change implementation details, the simplest safe strategy is:

- On first login in RN app, fetch recent server data and seed SQLite.

This avoids a complex local data migration.

## Goal

Implement first-login seeding that:

- pulls the last N days/readings/appointments from backend
- stores them in SQLite
- marks them `isSynced=true`
- avoids duplicating data across retries (idempotent)

## Scope

1. Seed policy

- Choose initial window: e.g. last 90 days or last 500 readings (configurable).
- Decide what happens if user is offline on first login:
  - show empty state + “Sync when online”
  - or require network for first login (document)

2. Implementation

- Add a “bootstrap” use-case:
  - `bootstrapAccountData()`
- Use apiGateway endpoints to fetch:
  - readings list
  - appointments list
- Upsert into SQLite using `serverId` uniqueness.

3. UX

- Show progress indicator (minimal)
- Do not block the entire app longer than needed (allow navigation after auth, then background seed).

## Non-goals

- Export/import of old Dexie local-only data (optional future enhancement).

## Deliverables

- `src/domain/bootstrap/*` policy + types
- `src/data/repos/*` upsert helpers
- `src/ui/bootstrap/*` minimal UI states

## Acceptance criteria

- [ ] First login results in recent history visible without manual refresh.
- [ ] Re-running bootstrap is safe (no duplicates).
- [ ] Seeded records are marked synced and do not enqueue outbox items.

## Agent packet

**Rules**

- Keep seeding logic in one place (no ad-hoc “fetch then insert” in screens).
- Ensure idempotency by upserting on `serverId`.
