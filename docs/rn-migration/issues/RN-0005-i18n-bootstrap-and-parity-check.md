# [RN] i18n bootstrap (ES/EN) + CI key parity check for `diabetify-rn/`

**Type:** Feature / Foundation  
**Priority:** P0  
**Suggested labels:** `rn-migration`, `i18n`, `foundation`, `agent-ready`  
**Suggested owner:** Jules (bulk wiring) + Codex (CI/check script)

## Context

Current app is bilingual ES/EN with translation JSON at:

- `src/assets/i18n/en.json`
- `src/assets/i18n/es.json`

Parity requires:

- every user string exists in both languages
- agents cannot “forget to add Spanish”

## Goal

Wire i18n in the RN app and add an automated guard that fails CI if:

- keys differ between `en.json` and `es.json`
- a new key exists in one language only

## Scope

1. Copy translation files into RN app:
   - from `src/assets/i18n/en.json` → `diabetify-rn/src/i18n/en.json`
   - from `src/assets/i18n/es.json` → `diabetify-rn/src/i18n/es.json`
2. Setup i18n runtime (recommended: `i18next` + `react-i18next`).
3. Add a script (Node) to validate key parity:
   - compares flattened key paths
   - reports missing keys in either language
   - exits non-zero on mismatch
4. Add `npm run i18n:check` and wire it into CI and/or pre-commit.

## Non-goals

- Translating new copy (parity only).
- Building a language picker UI (separate issue).

## Deliverables

- `diabetify-rn/src/i18n/*`
- `diabetify-rn/src/i18n/index.ts` (init + export helpers)
- `diabetify-rn/scripts/i18n-check.mjs`
- `diabetify-rn/package.json` scripts:
  - `i18n:check`

## Acceptance criteria

- [ ] `npm run i18n:check` fails if a key is missing in either language.
- [ ] RN app can render at least one screen using a translated key.
- [ ] Default language selection strategy is documented (e.g. device locale → fallback).

## Implementation notes

- Flatten keys (dot-notation) including nested objects.
- Ignore ordering differences; compare sets.
- Consider allowing an ignore list for known intentional differences (ideally empty).

## Agent packet

**Rules**

- Do not change translation content beyond copying/moving for now.
- Keep the check script fast (runs in <1s).
