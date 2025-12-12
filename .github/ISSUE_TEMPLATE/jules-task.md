---
name: Jules AI Task
about: Task assignment for Google Jules AI agent
title: '[Jules] '
labels: agent:jules, e2e-testing
assignees: ''
---

## Repository Context

**Stack**: Angular 20.3.14, Ionic 8.7.11, Capacitor 6.2.1, Tailwind CSS + DaisyUI

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

**Branch**: `test/e2e-webdriverio-appium`

## Acceptance Criteria

- [ ] `npm test` passes (all 1012 tests)
- [ ] `npm run lint` has no errors
- [ ] PR targets correct branch (NOT master)

## Testing Instructions

```bash
npm install
npm test
npm run lint
```
