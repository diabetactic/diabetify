# [RN] Readings UI slice: list + add (FlashList) with “pending sync” indicators

**Type:** Feature / UI  
**Priority:** P0  
**Suggested labels:** `rn-migration`, `ui`, `readings`, `flashlist`, `agent-ready`  
**Suggested owner:** Jules

## Context

We need a visible, testable vertical slice early:

- list readings from local DB
- add a reading offline
- show sync status

## Goal

Implement two screens:

1. Readings list screen (history)
2. Add reading screen/modal

Both must work offline and integrate with the repository + outbox.

## Scope

1. Routing

- Add route under `app/(tabs)/readings.tsx`
- Add route/modal under `app/modal/add-reading.tsx` (or similar)

2. Readings list

- Use FlashList for performance.
- Group by date (optional) to match current UX.
- Display:
  - value + unit
  - timestamp
  - status badge: `Synced` / `Pending` / `Failed`

3. Add reading

- Form with validation (Zod + react-hook-form recommended)
- On submit:
  - call `ReadingsRepo.create()`
  - close modal
  - show toast/snackbar (optional)

4. Offline UX

- Ensure screen renders with local data even without network.

## Non-goals

- Charts/trends (dashboard issue).
- Advanced input widgets (keep minimal).

## Deliverables

- `diabetify-rn/app/(tabs)/readings.tsx`
- `diabetify-rn/app/modal/add-reading.tsx`
- Shared components under `diabetify-rn/src/ui/components/…`

## Acceptance criteria

- [ ] List renders from local DB.
- [ ] Add reading works offline and immediately appears in list.
- [ ] Pending sync badge appears for newly created offline readings.
- [ ] No direct network calls in UI.

## Commands

- `cd diabetify-rn && npm run android`
- (later) `cd diabetify-rn && maestro test e2e/flows/readings-add-offline.yaml`

## Agent packet

**Rules**

- Use theme tokens (no random hex colors).
- All user-facing text must come from i18n keys (EN+ES).
