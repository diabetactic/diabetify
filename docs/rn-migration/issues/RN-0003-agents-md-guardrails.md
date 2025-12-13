# [RN] Add `diabetify-rn/AGENTS.md` guardrails + definition-of-done gates (anti-chaos)

**Type:** Process / Foundation  
**Priority:** P0 (prevents agent drift)  
**Suggested labels:** `rn-migration`, `agent-ready`, `process`, `guardrails`  
**Suggested owner:** Claude Code (draft) + Codex (wire checks)

## Context

We will use multiple coding agents (Codex, Claude Code, Gemini CLI/Jules, Aider, etc.). Without strict guardrails, agents will:

- scatter network calls throughout UI
- invent inconsistent patterns
- break offline-first requirements

The current repo already uses AGENTS.md conventions; we should replicate them for the RN subproject.

## Goal

Create `diabetify-rn/AGENTS.md` as the single “source of truth for agents” describing:

- folder boundaries
- how to run and test
- what patterns are prohibited
- what must pass for a PR to be acceptable

## Scope

Write `diabetify-rn/AGENTS.md` containing at minimum:

1. **Golden rules (non-negotiable)**
   - UI must not call HTTP directly.
   - Only `src/services/apiGateway/*` may do network calls.
   - Offline writes must be “SQLite first, then Outbox”.
   - Every user-facing string must exist in `en` and `es`.
2. **Commands**
   - install, dev, android build/run, lint, typecheck, tests, maestro tests
3. **Definition of Done**
   - required checks, demo path, proof (unit or maestro)
4. **How to add a feature**
   - add endpoint in registry
   - add repo method
   - add sync/outbox behavior if mutation
5. **PR rules**
   - one PR touches one “core spine” area at a time (apiGateway vs db schema vs sync engine)

## Non-goals

- Implementing code. This issue is documentation + workflow policy.

## Acceptance criteria

- [ ] `diabetify-rn/AGENTS.md` exists and is specific (not generic).
- [ ] It includes explicit forbidden patterns (e.g. “no fetch() in components”).
- [ ] It includes exact commands (copy/paste).
- [ ] It defines minimal CI gates and how to prove offline sync behavior.

## Suggested “Definition of Done” (include verbatim)

Every PR must include:

- A **demo path** (route + steps)
- A **proof**: at least one unit test OR an updated Maestro flow
- `npm run lint`, `npm run typecheck`, `npm test` passing
- If the PR touches a mutation: outbox enqueue + sync policy covered

## Agent packet

**Rules**

- Keep this doc short enough to read (<5 minutes) but strict enough to constrain agents.
- Prefer explicit “DO / DO NOT” lists.
