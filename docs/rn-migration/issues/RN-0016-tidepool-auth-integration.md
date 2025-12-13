# [RN] Tidepool auth integration (Android-only): AuthSession + deep link callback + token persistence

**Type:** Feature / Auth  
**Priority:** P1 (can land after mock mode works)  
**Suggested labels:** `rn-migration`, `auth`, `tidepool`, `agent-ready`  
**Suggested owner:** Codex

## Context

The current app supports Tidepool authentication (optional). Parity requires Tidepool integration exists and works on Android.

## Goal

Implement Tidepool login via browser flow with deep link callback:

- start auth flow
- handle redirect callback into RN app
- exchange/store tokens
- integrate with session model and apiGateway auth injection rules

## Scope

1. Expo config

- Configure Android scheme / intent filters for deep links
- Document required env vars for Tidepool (client id, redirect URI)

2. Auth flow

- Use AuthSession-like flow
- On success:
  - store tokens in secure storage
  - update session state
  - route to main tabs

3. apiGateway integration

- Add auth type `tidepool` and ensure proper header injection / base URL mapping.

## Non-goals

- Refresh token rotation unless required.
- iOS support.

## Deliverables

- `src/services/tidepool/*` (auth helpers)
- `app/(auth)/tidepool-login.tsx` (or integrated in login screen)
- Session repo updates for Tidepool token metadata

## Acceptance criteria

- [ ] Tidepool login completes on Android emulator/device.
- [ ] Tokens are stored securely and restored on restart.
- [ ] apiGateway can make a Tidepool-authenticated call when tokens exist.

## Agent packet

**Rules**

- Do not commit secrets; use env vars only.
- Avoid logging sensitive token values.
