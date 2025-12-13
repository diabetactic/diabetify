# [RN] Outbox table + Sync Engine skeleton (FIFO, retries/backoff, auth pause)

**Type:** Feature / Core spine  
**Priority:** P0  
**Suggested labels:** `rn-migration`, `offline-first`, `sync`, `core`, `agent-ready`  
**Suggested owner:** Codex

## Context

Offline-first parity means:

- user actions succeed offline (writes go local immediately)
- uploads happen later automatically
- retries/backoff and auth failures are handled consistently

TanStack Query persistence is not sufficient for durable offline mutation queues. We need a real outbox.

## Goal

Implement an outbox + sync engine that can process queued mutations reliably.

## Scope

1. Outbox repo

- enqueue items with:
  - entityType, entityId, operation
  - endpointKey, requestBodyJson
  - idempotencyKey
  - timestamps and retry fields

2. Sync engine

- triggers:
  - app start
  - app resume
  - network regain
  - manual “Sync now”
- FIFO processing (oldest first)
- error classification:
  - 401/403 → pause auth
  - 4xx → failed_permanent
  - network/5xx → retry with exponential backoff

3. Instrumentation

- structured logs: sync started, item processed, outcome, next attempt time
- (optional) a debug screen to view outbox state

## Non-goals

- Full conflict resolution UI (later).
- Fancy background tasks; keep it “foreground + resume + net regain”.

## Deliverables

- `diabetify-rn/src/sync/outbox/OutboxRepo.ts`
- `diabetify-rn/src/sync/SyncEngine.ts`
- `diabetify-rn/src/sync/SyncPolicies.ts` (retry schedule + rules)
- `diabetify-rn/src/services/apiGateway/*` integration

## Acceptance criteria

- [ ] You can enqueue a fake outbox item and see it processed in mock mode.
- [ ] Retry/backoff updates `nextAttemptAt` and does not spin endlessly.
- [ ] Auth failure marks items `paused_auth` and stops processing until session is valid.
- [ ] Sync engine is safe to start multiple times (single-flight lock).

## Implementation notes

- Idempotency key:
  - generate once per mutation and include it as a header if backend supports it
  - if backend doesn’t support it, still store it for future-proofing + debugging
- Ensure FIFO ordering is stable even across restarts.

## Agent packet

**Rules**

- Sync engine must call network only via apiGateway.
- Never mutate UI state directly; update DB and let UI react.
