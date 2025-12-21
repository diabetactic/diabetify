---
name: Codex AI Task
about: Task assignment for OpenAI Codex agent
title: '[Codex] '
labels: agent:codex, e2e-testing
assignees: ''
---

## Repository Context

**Stack**: Angular 21.0.5, Ionic 8.7.14, Capacitor 8.0.0, Tailwind CSS + DaisyUI

**Backend Modes**: `mock` (offline), `local` (Docker), `cloud` (Heroku)

## Task Description

<!-- Clear description of what needs to be done -->

## Technical Requirements

- [ ] Read `AGENTS.md` in repo root for coding standards
- [ ] All API calls through `ApiGatewayService`
- [ ] Include `CUSTOM_ELEMENTS_SCHEMA` in standalone components
- [ ] Add translations to both `en.json` AND `es.json`

## Target Branch

<!-- NEVER merge to master! -->

**Branch**: `test/e2e-mobile-mcp`

## Acceptance Criteria

- [ ] `npm test` passes (all 1012 tests)
- [ ] `npm run lint` has no errors
- [ ] PR targets correct branch (NOT master)

## Testing Instructions

```bash
npm install
npm test
cd maestro/mobile-mcp && node run-tests.js
```
