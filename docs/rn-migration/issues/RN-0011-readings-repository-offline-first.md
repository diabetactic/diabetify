# [RN] Readings repository: local-first CRUD + outbox enqueue + sync metadata

**Type:** Feature / Data layer  
**Priority:** P0 (core parity feature)  
**Suggested labels:** `rn-migration`, `readings`, `offline-first`, `agent-ready`  
**Suggested owner:** Jules (repo methods) + Codex (DB edge cases)

## Context

Readings are the core feature. Parity requires:

- create reading offline and see it immediately
- later auto-sync to backend
- display historical readings (potentially large list)

## Goal

Implement `ReadingsRepository` that provides:

- local CRUD
- query methods for list + time range
- sync metadata fields
- outbox enqueue for mutations

## Scope

1. Local schema fields for readings:

- `id` (local UUID)
- `value`, `unit`, `timestamp`, `mealContext`, `notes` (match existing domain)
- `isSynced`, `serverId`, `syncedAt`
- `isDeleted` (soft delete) if needed for offline deletes

2. Repository API

- `listLatest(limit)`
- `listInRange(start, end)`
- `create(readingInput)`:
  - write to SQLite immediately
  - enqueue outbox CREATE
- `update(id, patch)`:
  - update locally
  - enqueue outbox UPDATE
- `remove(id)`:
  - soft delete locally
  - enqueue outbox DELETE

3. Sync integration hooks

- Methods to mark synced after server confirms:
  - `markSynced(localId, serverId, syncedAt)`
  - `markSyncFailed(localId, reason)` (optional)

## Non-goals

- UI implementation (separate issue).
- Complex conflict resolution (later).

## Deliverables

- `diabetify-rn/src/data/repos/ReadingsRepo.ts`
- `diabetify-rn/src/domain/glucose/*` (types + validation)

## Acceptance criteria

- [ ] Offline create works: reading exists in DB immediately.
- [ ] Outbox item is created with correct endpointKey and requestBodyJson.
- [ ] Repository can return listLatest and listInRange deterministically.
- [ ] Sync engine can mark a reading as synced.

## Implementation notes

- Keep request payload mapping in one place (mapper function) so it matches backend contracts.
- Consider normalizing units at storage time (e.g. always mg/dL) to simplify stats.

## Agent packet

**Rules**

- No direct API calls from repo; enqueue outbox and let sync engine handle network.
