# [RN] Session handling: secure token storage + logout “kill switch” (privacy baseline)

**Type:** Feature / Core spine  
**Priority:** P0  
**Suggested labels:** `rn-migration`, `auth`, `security`, `agent-ready`  
**Suggested owner:** Codex

## Context

We handle health-related data. Even if parity doesn’t mandate encryption-at-rest yet, we must:

- store tokens securely
- ensure logout removes sensitive data from device (“kill switch”)
- avoid leaving caches around (query cache, outbox, etc.)

## Goal

Implement a session module that:

- stores tokens in secure storage
- loads session on app start
- supports logout that wipes local app data (SQLite + outbox + caches)

## Scope

1. Session model

- `Session` type: userId, auth token(s), backend mode, optional tidepool token metadata

2. Secure storage

- Store only credentials/session tokens securely (not large app data)

3. Logout kill switch

- delete secure tokens
- wipe SQLite DB tables (readings, appointments, outbox, settings as appropriate)
- clear TanStack Query cache (if used)
- return to `(auth)` route

## Non-goals

- Token refresh flows (unless required early).
- Tidepool integration specifics (separate issue).

## Deliverables

- `diabetify-rn/src/services/session/*` or `src/data/repos/SessionRepo.ts`
- `diabetify-rn/src/domain/auth/*` (types only)
- `diabetify-rn/src/ui/auth/useSession.ts` (or similar hook)

## Acceptance criteria

- [ ] Starting the app restores session if tokens exist.
- [ ] Logout fully clears local DB + outbox and removes tokens.
- [ ] After logout, reopening the app does not show previous data.

## Implementation notes

- Keep secure store usage minimal and centralized.
- Consider adding a “dangerous operations” confirmation before wipe in debug builds (optional).

## Agent packet

**Rules**

- Never log raw tokens in console output.
- Never store tokens in plain AsyncStorage.
