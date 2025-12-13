# Turborepo Caching Setup Guide

**Estimated time**: 1 hour
**Risk level**: LOW
**Expected impact**: 60-80% faster CI on cache hits
**Prerequisites**: pnpm migration completed

---

## Why Turborepo?

- **Task caching** - Cache outputs of build/test/lint by content hash
- **Remote caching** - Share cache across team and CI
- **Incremental builds** - Only rebuild what changed
- **Works with single repos** - No monorepo required!
- **Zero config** - Sane defaults out of the box

**Key insight**: Turborepo isn't just for monorepos. It's a build system cache that works with ANY project.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Developer                        │
│  (runs: pnpm turbo run build)                      │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│              Turborepo (Local)                      │
│  - Hash inputs (code, deps, env)                   │
│  - Check local cache (.turbo/)                     │
│  - Check remote cache (Vercel)                     │
│  - Execute if cache miss                           │
│  - Store outputs to cache                          │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│          Vercel Remote Cache (Optional)             │
│  - Shared cache across team                        │
│  - Shared cache with CI                            │
│  - Free tier: 100GB storage                        │
└─────────────────────────────────────────────────────┘
```

---

## Step 1: Install Turborepo

```bash
pnpm add -D turbo
```

---

## Step 2: Create `turbo.json`

Create `turbo.json` in project root:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "tsconfig.json",
    "angular.json",
    "jest.config.js",
    ".eslintrc.json",
    "tailwind.config.js"
  ],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["www/**", ".angular/**"],
      "inputs": [
        "src/**/*.ts",
        "src/**/*.html",
        "src/**/*.scss",
        "src/**/*.css",
        "src/**/*.json",
        "angular.json",
        "tsconfig.json",
        "tailwind.config.js"
      ]
    },
    "build:prod": {
      "dependsOn": ["^build:prod"],
      "outputs": ["www/**"],
      "inputs": ["$TURBO_DEFAULT$"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**", "test-results/**"],
      "inputs": ["src/**/*.ts", "src/**/*.spec.ts", "jest.config.js", "setup-jest.ts"],
      "cache": true
    },
    "test:coverage": {
      "dependsOn": ["^test"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": [],
      "inputs": ["src/**/*.ts", "src/**/*.html", ".eslintrc.json"],
      "cache": true
    },
    "lint:styles": {
      "outputs": [],
      "inputs": ["src/**/*.scss", "src/**/*.css", ".stylelintrc.json"],
      "cache": true
    },
    "format": {
      "outputs": [],
      "inputs": ["src/**/*", ".prettierrc"],
      "cache": true
    },
    "mobile:sync": {
      "dependsOn": ["build:prod"],
      "outputs": ["android/app/build/**"],
      "cache": false,
      "persistent": true
    },
    "android:build": {
      "dependsOn": ["mobile:sync"],
      "outputs": ["android/app/build/outputs/apk/**"],
      "cache": false,
      "persistent": true
    }
  }
}
```

**Key concepts:**

- `outputs` - Files to cache (e.g., `www/`, `coverage/`)
- `inputs` - Files that affect the task (code, configs)
- `dependsOn` - Task dependencies (e.g., test depends on build)
- `cache: false` - Disable caching for non-deterministic tasks (native builds)
- `persistent: true` - Long-running tasks (dev servers, Gradle)

---

## Step 3: Update `package.json` scripts

**BEFORE:**

```json
{
  "scripts": {
    "build": "ng build",
    "test": "jest",
    "lint": "eslint . --ext .ts,.js",
    "quality": "npm run lint && npm test"
  }
}
```

**AFTER:**

```json
{
  "scripts": {
    "build": "turbo run build",
    "build:prod": "turbo run build:prod",
    "test": "turbo run test",
    "test:coverage": "turbo run test:coverage",
    "lint": "turbo run lint",
    "lint:styles": "turbo run lint:styles",
    "format": "turbo run format",
    "quality": "turbo run lint test",

    "// Keep direct access for debugging": "",
    "ng:build": "ng build",
    "jest": "jest"
  }
}
```

**OR** (if you prefer explicit task running):

```json
{
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  }
}
```

Both syntaxes work identically.

---

## Step 4: Test local caching

```bash
# First run (cold cache)
pnpm run build
# Should take normal time (~15-30s)

# Second run (warm cache)
pnpm run build
# Should show:
# >>> FULL TURBO
# build: cache hit, replaying logs [1.2s]
```

**Expected output:**

```
>>> FULL TURBO

Tasks:    1 successful, 1 total
Cached:   1 cached, 1 total
Time:     1.234s >>> FULL TURBO
```

---

## Step 5: Inspect cache

```bash
# Cache is stored in .turbo/
ls -lah .turbo/cache/

# View cache metadata
turbo run build --dry-run=json
```

**Add to `.gitignore`:**

```gitignore
# Turborepo
.turbo
```

---

## Step 6: Setup Remote Cache (Optional but Recommended)

### Option A: Vercel Remote Cache (Free Tier)

1. **Sign up for Vercel** (free tier includes 100GB cache storage):

   ```bash
   pnpm dlx turbo login
   ```

2. **Link repository**:

   ```bash
   pnpm dlx turbo link
   ```

3. **Test remote cache**:

   ```bash
   # Clear local cache
   rm -rf .turbo/cache

   # Run build (should hit remote cache if team member ran it)
   pnpm run build --force
   ```

4. **Verify remote cache**:
   ```bash
   pnpm run build
   # Should show:
   # build: cache hit, replaying logs [1.2s] (remote)
   ```

---

### Option B: Self-Hosted Remote Cache

**Using `turbo-remote-cache`** (for self-hosting):

```bash
pnpm add -D turbo-remote-cache

# Start cache server
pnpm exec turbo-remote-cache --port 3000

# Configure Turborepo to use it
export TURBO_API="http://localhost:3000"
export TURBO_TOKEN="your-secret-token"
export TURBO_TEAM="diabetify"
```

**NOTE**: Vercel remote cache is easier and free for most use cases.

---

## Step 7: Update CircleCI for Remote Cache

**File**: `.circleci/config.yml`

**Add environment variables in CircleCI UI:**

- `TURBO_TOKEN` (from Vercel dashboard)
- `TURBO_TEAM` (your team slug)

**Update build job:**

```yaml
jobs:
  build:
    docker:
      - image: cimg/node:20.11
    steps:
      - checkout
      - run:
          name: Install pnpm
          command: npm install -g pnpm@9

      - restore_cache:
          keys:
            - v2-pnpm-{{ checksum "pnpm-lock.yaml" }}

      - run:
          name: Install dependencies
          command: pnpm install --frozen-lockfile

      - save_cache:
          paths:
            - ~/.pnpm-store
          key: v2-pnpm-{{ checksum "pnpm-lock.yaml" }}

      # NEW: Turborepo with remote cache
      - run:
          name: Build with Turbo
          command: pnpm turbo run build --token=$TURBO_TOKEN --team=$TURBO_TEAM

      - persist_to_workspace:
          root: .
          paths:
            - www
            - .turbo # Include Turbo cache metadata
```

**Key changes:**

- Pass `--token` and `--team` to enable remote cache
- Include `.turbo` in workspace (for downstream jobs)

---

## Step 8: Optimize CI with Parallel Tasks

**Update quality job to run lint + test in parallel:**

```yaml
jobs:
  quality:
    docker:
      - image: cimg/node:20.11
    steps:
      - checkout
      - attach_workspace:
          at: .

      # Single command runs both tasks in parallel!
      - run:
          name: Quality checks
          command: pnpm turbo run lint test --parallel
```

**Turborepo automatically parallelizes independent tasks.**

---

## Step 9: Monitor Cache Performance

```bash
# View cache statistics
pnpm turbo run build --summarize

# Output includes:
# - Tasks run
# - Cache hits
# - Time saved
# - Remote vs local cache hits
```

**Example output:**

```
Tasks:    3 successful, 3 total
Cached:   2 cached, 3 total
Time:     5.234s (75% cached)

Remote cache hits: 1
Local cache hits:  1
Cache misses:      1
```

---

## Verification Checklist

- [ ] `pnpm turbo run build` completes successfully
- [ ] Second `pnpm turbo run build` shows "FULL TURBO" (cache hit)
- [ ] `.turbo/cache/` directory contains cached outputs
- [ ] Remote cache is enabled (if using Vercel)
- [ ] CI build uses Turbo with `--token` and `--team`
- [ ] Cache hit rate is >50% on CI after first run
- [ ] Parallel tasks work: `pnpm turbo run lint test --parallel`

---

## Troubleshooting

### Issue: "No tasks found"

**Cause**: Turbo can't find tasks in `turbo.json`

**Fix**: Ensure task names in `turbo.json` match `package.json` scripts:

```json
// package.json
{
  "scripts": {
    "build": "turbo run build"  // ← This runs the "build" task
  }
}

// turbo.json
{
  "tasks": {
    "build": { ... }  // ← Must match exactly
  }
}
```

---

### Issue: Cache never hits (always rebuilds)

**Cause**: Inputs are too broad or include dynamic files

**Fix**: Exclude auto-generated files from inputs:

```json
{
  "tasks": {
    "build": {
      "inputs": [
        "src/**/*.ts",
        "!src/**/*.spec.ts", // Exclude test files
        "!node_modules/**", // Exclude deps
        "!.turbo/**" // Exclude Turbo cache
      ]
    }
  }
}
```

---

### Issue: Remote cache authentication fails

**Cause**: `TURBO_TOKEN` or `TURBO_TEAM` not set

**Fix**: Verify env vars:

```bash
echo $TURBO_TOKEN
echo $TURBO_TEAM

# If empty, export them:
export TURBO_TOKEN="your-token-from-vercel"
export TURBO_TEAM="your-team-slug"
```

**In CircleCI**: Add to Project Settings → Environment Variables

---

### Issue: Android/Capacitor builds fail with cache

**Cause**: Native builds are non-deterministic (timestamps, build IDs)

**Fix**: Disable caching for native builds:

```json
{
  "tasks": {
    "mobile:sync": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Performance Benchmarks

### Before Turborepo (npm/pnpm only)

```
# First run (cold)
$ time pnpm run build
real    0m18.234s

# Second run (no changes)
$ time pnpm run build
real    0m17.891s  # Full rebuild!
```

### After Turborepo (local cache)

```
# First run (cold)
$ time pnpm run build
real    0m18.123s

# Second run (warm cache)
$ time pnpm run build
real    0m1.234s  # 93% faster!
```

### After Turborepo (remote cache, CI)

```
# CI Job 1: Fresh checkout
Build time: 5m 23s

# CI Job 2: Re-run on same commit (remote cache hit)
Build time: 1m 12s  # 77% faster!
```

---

## Advanced: Turborepo Metrics Dashboard

Add to `package.json`:

```json
{
  "scripts": {
    "turbo:summary": "pnpm turbo run build test lint --summarize",
    "turbo:graph": "pnpm turbo run build --graph",
    "turbo:trace": "pnpm turbo run build --trace"
  }
}
```

**Generate visual task graph:**

```bash
pnpm run turbo:graph
# Opens browser with interactive task dependency graph
```

---

## Next Steps

After Turborepo setup:

1. **Monitor cache hit rates** on CI (aim for >70%)
2. **Tune task inputs** to improve cache accuracy
3. **Add more tasks** to `turbo.json` (e.g., `i18n:check`, `docs:sync`)
4. **Consider workspace setup** if splitting into multiple packages later
5. **Proceed to Vitest migration** (faster tests + Turbo caching = huge win)

---

## FAQ

**Q: Does Turborepo work with Angular CLI?**
A: Yes! Turborepo wraps existing scripts, including `ng build`.

**Q: Can I use Turborepo without pnpm?**
A: Yes, works with npm/yarn/bun. But pnpm + Turbo is the fastest combo.

**Q: Is remote cache secure?**
A: Yes, Vercel encrypts cache artifacts. Self-host if you need full control.

**Q: Does this replace CircleCI caching?**
A: No, it complements it. Use both for maximum speed.

**Q: What if I don't want remote cache?**
A: Local cache alone is still valuable. Skip Step 6.

**Q: Can I cache Android Gradle builds?**
A: Technically yes, but native builds are often non-deterministic. Use Gradle's own cache instead.

---

## Resources

- [Turborepo docs](https://turbo.build/repo/docs)
- [Turborepo with Angular example](https://github.com/vercel/turborepo/tree/main/examples/with-angular)
- [Remote caching guide](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Task configuration](https://turbo.build/repo/docs/reference/configuration#tasks)
