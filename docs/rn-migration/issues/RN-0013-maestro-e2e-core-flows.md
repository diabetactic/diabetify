# [RN] Maestro E2E: core parity flows (login, offline add reading, reconnect sync)

**Type:** Testing  
**Priority:** P0 (becomes the oracle)  
**Suggested labels:** `rn-migration`, `testing`, `maestro`, `agent-ready`  
**Suggested owner:** Claude Code (test design) + Jules (flow writing)

## Context

We already use Maestro in this repo (`maestro/`). For the RN rewrite, Maestro should be the main Android E2E oracle so agents can prove parity without manual testing.

## Goal

Create RN app E2E flows that validate the offline-first behavior:

1. Login (mock mode ok for CI)
2. Add reading while offline (airplane mode)
3. Re-enable network and verify sync completes

## Scope

In `diabetify-rn/e2e/` (or reuse top-level `maestro/` — pick one convention and document):

- `flows/login-mock.yaml`
- `flows/readings-add-offline.yaml`
- `flows/readings-sync-on-reconnect.yaml` (can be combined with previous)
- `maestro.config.yaml` (appId, timeouts)

## Non-goals

- Full regression suite. Start with 2–3 flows only.

## Deliverables

- Maestro flows in RN app folder
- A shell script to run them:
  - `diabetify-rn/scripts/e2e.sh`

## Acceptance criteria

- [ ] `maestro test` runs against RN Android build with reliable selectors.
- [ ] Offline add flow is deterministic (no flaky sleeps; prefer `waitFor`).
- [ ] Sync verification checks a real UI state change (badge/text).

## Implementation notes

- Add `testID` props in RN components so Maestro selectors are stable.
- Prefer `id:` selectors over text selectors to support ES/EN.
- For “offline”, avoid device-level toggles if unreliable; alternatively run in mock mode and simulate “network off” via app setting/flag.

## Agent packet

**Rules**

- Do not rely on UI text that changes with translations.
- Keep flows short and composable.
