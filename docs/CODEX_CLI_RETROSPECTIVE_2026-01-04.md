# Codex CLI Retrospective (2026-01-04)

This document summarizes what Codex CLI did in the last session (based on the working tree diff + generated artifacts in `playwright-report/` and `playwright/artifacts/`).

## Goals from the session

- Confirm MCP Docker availability and validate Docker state (containers, networks, volumes, logs).
- “Clean slate” the environment (deps/caches/docker volumes) and re-run full quality gates.
- Stabilize Docker-based Playwright E2E (reduce flake and fix hard failures).
- Fix repo references to the previous working-copy path (now `/home/julito/code/facu/diabetactic/diabetify`).

## Environment constraints

- `approval_policy=never`, `sandbox_mode=danger-full-access`, `network_access=enabled`
- Project conventions enforced by `AGENTS.md` (standalone Ionic, `CUSTOM_ELEMENTS_SCHEMA`, i18n in `en.json` + `es.json`, etc.)

## What changed (high-signal)

### Docker + MCP

- Docker MCP is available via Codex’ Docker MCP tooling (used to list containers/images/networks/volumes).
- `.mcp.json` exists and defines a `docker` MCP server using `uvx` + `mcp-server-docker`.
- Docker runtime was left clean after test runs:
  - Containers: none
  - Volumes: none
  - Networks: default only

### Playwright Docker E2E stability

- Fixed a hard failure in the Ionic “scroll and click” helper: the previous implementation attempted `document.querySelector(selector)` with Playwright selectors like `:has-text()` / `:visible`, which are _not_ valid CSS selectors and crash inside the page. The helper now resolves the locator in Playwright first, then evaluates against the attached element.
- Added an explicit helper documenting a Playwright gotcha: `locator.isVisible({ timeout })` does not wait (timeout is ignored); a “wait then check” helper is used instead.
- Reduced flake by avoiding interactions that open overlay modals accidentally (notably the Food Picker modal).
- Serialized the Bolus Calculator spec because it is UI-heavy and prone to flake under high worker count in Docker.
- Updated visual snapshots after making UI/test interaction changes.

### Bolus calculator UI / OnPush sync

- Addressed reactive form ↔ `ion-input` synchronization issues under `OnPush`:
  - Ensure values are reflected in DOM (form reset should actually clear inputs).
  - Ensure change detection runs when reactive form values change.
  - Adjusted reset defaults to avoid null/DOM mismatch.
- Adjusted unit tests accordingly.

### Quality gates / formatting

- `.prettierignore` was updated to exclude local tool directories/config that should not be formatted as part of the repo.
- Prettier formatting was applied to touched Playwright helpers/specs to satisfy `quality:full`.

### Old path reference cleanup

- Found remaining tracked references to the previous working-copy path in a couple of documentation reports and updated them to `/home/julito/code/facu/diabetactic/diabetify`.

## Root causes & key learnings

### 1) “Playwright selector” ≠ “CSS selector”

If a helper takes a selector string and calls `querySelector()` inside the browser context, it will break for Playwright-specific selectors.

**Safer pattern**: resolve a `locator()` in Playwright, `waitFor({ state: 'attached' })`, then `evaluate()` on the element handle.

### 2) Ionic overlays + hydration make “click-to-focus” risky

In mobile layouts, “clicking the input” to focus can hit nearby overlay triggers (e.g. food picker), causing test nondeterminism.

**Safer pattern**: set `ion-input` values without clicking (set component value + dispatch `ionInput`).

### 3) `OnPush` + `ion-input` needs explicit sync points

Reactive forms can update while UI does not repaint (or vice-versa), especially when values are reset and `ion-input` is not fully bound.

**Safer patterns**:

- Bind `[value]` for display-only values that must always mirror form state.
- Call `markForCheck()` from reactive form streams when using `OnPush`.

### 4) Visual tests must eliminate transient UI

If an overlay/modal can exist (even briefly), close it before snapshotting. Treat “transient UI” as test state.

### 5) `ripgrep` + `.gitignore` can hide important matches

Some report files are ignored by `.gitignore`, so `rg` won’t search them unless you:

- Target the file explicitly, or
- Use `rg --no-ignore`

## Debugging playbook (next time)

### Docker E2E (fast loop)

- Run: `pnpm -s run test:e2e:docker`
- Narrow: `pnpm -s run test:e2e:docker -- --grep "Bolus Calculator"`

### Artifacts

- HTML report: `playwright-report/index.html`
- Traces/screenshots: `playwright/artifacts/`

If artifacts are owned by `root` (common after Docker runs), fix permissions with:

```bash
sudo chown -R "$USER":"$USER" playwright-report playwright/artifacts
```

## Follow-ups worth doing

- Consolidate “Docker E2E” docs so they consistently use `pnpm` (not `npm`) and mention the artifact/trace workflow.
- Consider adjusting Docker compose to run Playwright container as the host UID/GID to avoid `root`-owned artifacts.
