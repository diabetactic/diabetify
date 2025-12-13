# [RN] CI gates for `diabetify-rn/`: lint + typecheck + unit + i18n check + “no direct network” guard

**Type:** DevOps / Quality  
**Priority:** P0 (keeps agents honest)  
**Suggested labels:** `rn-migration`, `ci`, `quality`, `agent-ready`  
**Suggested owner:** Codex

## Context

With multiple agents, CI is the main guardrail. We need fast, deterministic checks that prevent:

- direct network calls outside apiGateway
- i18n key drift (EN/ES mismatch)
- typecheck regressions
- unit test regressions

## Goal

Add a GitHub Actions workflow (or equivalent) that runs on PRs and enforces baseline quality for the RN app.

## Scope

1. Add workflow file(s):

- `.github/workflows/rn.yml` (suggested)

2. CI steps (from repo root):

- `cd diabetify-rn`
- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run i18n:check`
- `node scripts/no-direct-network-check.mjs` (if implemented)
- optionally: `npx expo-doctor@latest` (fast check for dependency health)

## Non-goals

- Full Android build in CI (can be expensive); add later if desired.
- Maestro emulator E2E in CI (later; start local-first).

## Deliverables

- CI workflow that passes on main branch and runs in <10 minutes.
- Document in `diabetify-rn/README.md` how to run checks locally.

## Acceptance criteria

- [ ] CI fails if an i18n key is missing in either language.
- [ ] CI fails if `fetch(` is used outside apiGateway (if the guard exists).
- [ ] CI runs deterministically with `npm ci`.

## Agent packet

**Rules**

- Keep CI checks fast; prefer static checks over heavy builds early.
