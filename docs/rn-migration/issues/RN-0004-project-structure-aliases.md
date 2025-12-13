# [RN] Define project structure + TS path aliases for `diabetify-rn/`

**Type:** Foundation  
**Priority:** P0  
**Suggested labels:** `rn-migration`, `foundation`, `typescript`, `agent-ready`  
**Suggested owner:** Codex

## Context

Agents create many files quickly. Without a fixed structure and path aliases, the project becomes unmaintainable and import paths become noisy.

## Goal

Establish a stable folder structure and TS path aliases from day 1:

- `src/domain` for pure logic
- `src/services` for API gateway + auth helpers
- `src/data` for SQLite/Drizzle + repositories
- `src/sync` for outbox + sync engine
- `src/ui` for design system + shared components
- `src/i18n` for translations

## Scope

In `diabetify-rn/`:

1. Create folders (empty or with `README.md` stubs):
   - `src/domain/`
   - `src/services/`
   - `src/data/`
   - `src/sync/`
   - `src/ui/`
   - `src/i18n/`
2. Add TS path aliases in `tsconfig.json`, e.g.:
   - `@/domain/*`
   - `@/services/*`
   - `@/data/*`
   - `@/sync/*`
   - `@/ui/*`
   - `@/i18n/*`
3. Ensure Metro/babel resolves aliases (document approach; implement only if needed).

## Non-goals

- No actual feature code, only structure + config.

## Acceptance criteria

- [ ] `diabetify-rn/src/*` structure exists.
- [ ] TypeScript can resolve `@/...` imports (validated via `npm run typecheck`).
- [ ] A short `diabetify-rn/README.md` section documents aliases and folder intent.

## Agent packet

**Rules**

- Keep aliases simple and consistent.
- Don’t introduce multiple competing alias systems.
