# [RN] Scaffold `diabetify-rn/` Expo app (Router + TS) with reproducible commands

**Type:** Feature / Foundation  
**Priority:** P0  
**Suggested labels:** `rn-migration`, `foundation`, `expo`, `agent-ready`  
**Suggested owner:** Codex (local executor)

## Context

We will create a **greenfield** React Native app alongside the existing Ionic app to avoid toolchain conflicts (Angular/Capacitor vs Metro/Expo).

We want the easiest path for agents:

- predictable folder layout
- a single set of commands
- easy Android dev build workflow

## Goal

Create `diabetify-rn/` as a working Expo app (Android-only focus) with:

- Expo Router + TypeScript
- `npm run` scripts that agents can rely on
- a minimal “health check” CI-ready command set (lint/typecheck/test placeholders)

## Scope

1. Create folder `diabetify-rn/` at repo root (sibling to current app).
2. Initialize Expo app using a template that includes Router + TS.
3. Add baseline scripts:
   - `dev` (expo start)
   - `android` (expo run:android)
   - `typecheck` (tsc --noEmit)
   - `lint` (eslint)
   - `test` (jest placeholder or minimal)
   - `doctor` (expo-doctor)
4. Add `.gitignore`, `.editorconfig` (if needed), and minimal README for the RN subproject.

## Non-goals

- No business logic or screens yet (that’s later issues).
- No “native extras” (notifications, biometrics, charts).
- No iOS support.

## Deliverables

- `diabetify-rn/` created and builds on Android via `npx expo run:android`.
- `diabetify-rn/package.json` scripts documented.
- `diabetify-rn/README.md` with quickstart commands.

## Acceptance criteria

- [ ] `cd diabetify-rn && npm install` works.
- [ ] `cd diabetify-rn && npx expo start --help` works.
- [ ] `cd diabetify-rn && npx expo run:android` launches on emulator/device.
- [ ] `cd diabetify-rn && npm run typecheck` runs (even if it checks only a stub).
- [ ] The project uses Expo Router and file-based routes under `diabetify-rn/app/`.

## Implementation notes

- Prefer a template that already sets up Expo Router + TS.
- Keep the RN project self-contained; avoid importing from the existing Angular codebase yet.
- Set up path aliases early (`tsconfig.json`) because agents will create many files.

## Commands

From `TPP/diabetactic/diabetify`:

- `npx create-expo-app@latest diabetify-rn --template tabs` (or `default`, choose one and document)
- `cd diabetify-rn && npx expo run:android`

## Agent packet

**Rules**

- Don’t add business features; keep this PR minimal.
- Keep scripts stable and documented.

**Definition of done**

- A new contributor can run the RN app on Android in <10 minutes by following `diabetify-rn/README.md`.
