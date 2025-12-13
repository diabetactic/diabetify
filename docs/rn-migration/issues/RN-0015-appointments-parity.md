# [RN] Appointments parity: offline-first CRUD + outbox + minimal UI

**Type:** Feature  
**Priority:** P1  
**Suggested labels:** `rn-migration`, `appointments`, `offline-first`, `agent-ready`  
**Suggested owner:** Jules

## Context

Appointments are a core parity feature and must support offline-first behavior similar to readings.

## Goal

Implement appointments module in RN:

- list appointments
- create appointment request
- cancel appointment (if supported)
- offline-first: mutations go to SQLite then outbox

## Scope

1. DB schema (if not already): `appointments` table with sync metadata.
2. `AppointmentsRepo`:

- `list()`
- `create()`: local insert + outbox enqueue
- `cancel()` or `remove()`: local update + outbox enqueue

3. UI

- Tab screen `app/(tabs)/appointments.tsx`
- Detail screen or modal for appointment request

4. Maestro flow (optional but recommended)

- create appointment in mock mode

## Non-goals

- Backoffice admin UI.
- Complex calendar/slot picking; keep minimal parity-first UI.

## Deliverables

- `src/data/repos/AppointmentsRepo.ts`
- `app/(tabs)/appointments.tsx`
- `app/modal/appointment-request.tsx` (or similar)

## Acceptance criteria

- [ ] Appointments list renders from local DB.
- [ ] Create appointment offline works and appears immediately.
- [ ] Outbox enqueues appointment mutations with correct endpoint keys.

## Agent packet

**Rules**

- No direct API calls in UI.
- Keep strings i18n’d.
