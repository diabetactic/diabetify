# Repo Health Check + Report Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Verify local repo vs `upstream`/`origin`, run all checks/tests (including E2E with Docker + snapshot regen), audit tracked files, attempt an optimized Android APK build for Heroku, and summarize gaps vs the project’s final written report.

**Architecture:** Treat the repo as source of truth; gather git state first, then run verifications in increasing cost (lint → typecheck → unit → e2e). If verifications fail, fix root-cause issues and re-run until green. Keep any snapshot updates intentional and recorded in git diff.

**Tech Stack:** Git, pnpm, Angular/Ionic/Capacitor, Vitest, Playwright, Docker.

---

### Task 1: Superpowers update (optional)

**Files:** none

**Step 1: Check superpowers version drift**

Run: `cd ~/.codex/superpowers && git status -sb`

Expected: clean or behind-ahead info

**Step 2: Update if behind**

Run: `cd ~/.codex/superpowers && git pull`

Expected: fast-forward update (or already up-to-date)

---

### Task 2: Git state + remotes + branch base

**Files:** none

**Step 1: Capture local status**

Run: `git status -sb`

Expected: clean working tree (or list of modified files to address)

**Step 2: Capture remotes**

Run: `git remote -v`

Expected: `origin` and/or `upstream` present

**Step 3: Fetch remote refs**

Run: `git fetch --all --prune`

Expected: no errors

**Step 4: Identify branch and upstream tracking**

Run: `git branch -vv`

Expected: current branch shows tracking (e.g. `[origin/master]`)

**Step 5: Determine merge-base with upstream mainline**

Run: `git rev-parse --abbrev-ref HEAD && git merge-base HEAD upstream/master && git merge-base HEAD origin/master`

Expected: merge-base SHAs printed (or errors if remote branch differs)

---

### Task 3: Dependency install + basic checks

**Files:** may update lockfiles if out of date

**Step 1: Install deps**

Run: `pnpm install`

Expected: install completes without errors

**Step 2: Lint**

Run: `pnpm run lint`

Expected: exit code 0

**Step 3: Typecheck**

Run: `pnpm run typecheck`

Expected: exit code 0

---

### Task 4: Unit tests (Vitest)

**Files:** may update snapshots if any exist in unit tests

**Step 1: Run unit tests**

Run: `pnpm test`

Expected: all tests pass

---

### Task 5: E2E tests (Docker backend) + regenerate ALL snapshots

**Files:** Playwright snapshots under `playwright/**` and related artifacts

**Step 1: Ensure Docker is available**

Run: `docker version`

Expected: server + client OK

**Step 2: Run E2E with snapshot update**

Run: `pnpm run test:e2e -- --update-snapshots`

Expected: e2e suite passes; snapshots updated where needed

**Step 3: Re-run E2E without update to confirm stability**

Run: `pnpm run test:e2e`

Expected: green run with no snapshot drift

---

### Task 6: Audit PR diff + tracked files that shouldn’t be tracked

**Files:** `.gitignore` (if fixes needed)

**Step 1: List changed files**

Run: `git status --porcelain=v1 && git diff --name-only && git diff --name-only --cached`

Expected: list of changes (or empty)

**Step 2: Scan tracked files for common mistakes**

Run:
- `git ls-files | rg -n \"(^|/)(node_modules|dist|www|build|coverage|.cache|.angular|.pnpm-store|playwright-report|test-results)($|/)\" || true`
- `git ls-files | rg -n \"(^|/)(\\.env|\\.env\\.|\\.pem|id_rsa|\\.p12)\" || true`
- `git ls-files | rg -n \"(^|/)(\\.DS_Store|Thumbs\\.db)\" || true`

Expected: ideally no matches (or matches reviewed/justified)

**Step 3: Fix `.gitignore` / untrack if needed**

Run (if needed): `git rm -r --cached <path>` then update `.gitignore`

Expected: unwanted files removed from index

---

### Task 7: Check open PRs (best-effort)

**Files:** none

**Step 1: If GitHub CLI is available, list PRs**

Run: `gh --version && gh pr list --limit 50`

Expected: list PRs; if auth missing, record blocker

---

### Task 8: Build optimized Android APK for Heroku environment (best-effort)

**Files:** Android build outputs (not committed)

**Step 1: Find build scripts**

Run: `cat package.json | rg -n \"(build|android|cap)\"`

Expected: scripts for production builds

**Step 2: Build production web assets**

Run: `pnpm run build:prod`

Expected: build completes without errors

**Step 3: Build Android release (if Android SDK present)**

Run (one of):
- `npx cap sync android`
- `cd android && ./gradlew assembleRelease`

Expected: APK at `android/app/build/outputs/apk/release/app-release.apk` (or similar)

---

### Task 9: Report alignment (anteproyecto PDF vs current implementation)

**Files:** none (output is recommendations)

**Step 1: Compare claims vs current docs**

Review:
- `docs/PROYECTO.md`
- `docs/ARCHITECTURE.md`
- `docs/DESPLIEGUE.md`
- `docs/TESTING_GUIDE.md`
- `/tmp/informe_tpp.txt` (extracted PDF text)

Expected: a concise list of what to update/add/remove in final report.

