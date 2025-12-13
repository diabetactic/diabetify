# pnpm Migration Guide

**Estimated time**: 2 hours
**Risk level**: LOW
**Expected impact**: 50-70% smaller node_modules, 40-50% faster installs

---

## Why pnpm?

- **Hard links** create a global store, eliminating duplicate packages
- **Strict dependency resolution** prevents phantom dependencies (better security)
- **Faster installs** with parallel downloading and efficient caching
- **Capacitor-compatible** (widely used in Ionic community)
- **Better monorepo support** (future-proof if you split backend/frontend)

---

## Pre-Migration Checklist

- [ ] Commit all pending changes (`git status` should be clean)
- [ ] Ensure CI build is passing
- [ ] Backup `package-lock.json` (just in case: `cp package-lock.json package-lock.json.backup`)
- [ ] Verify Node.js version: `node -v` (should be 18+)

---

## Step-by-Step Migration

### 1. Install pnpm globally

```bash
# Option A: Using npm
npm install -g pnpm@9

# Option B: Using standalone script (faster)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Verify installation
pnpm -v  # Should show 9.x.x
```

---

### 2. Create `.npmrc` configuration

Create `.npmrc` in project root:

```ini
# .npmrc
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true

# Optional: Speed optimizations
store-dir=~/.pnpm-store
package-import-method=hardlink
```

**Why these flags?**

- `shamefully-hoist=true` - Capacitor/Ionic expect dependencies to be hoisted (flattened)
- `strict-peer-dependencies=false` - Prevent install failures due to peer dep version mismatches
- `auto-install-peers=true` - Automatically install peer dependencies

---

### 3. Remove npm artifacts

```bash
# Remove old lock file and node_modules
rm -rf node_modules package-lock.json

# Optional: Clear npm cache
npm cache clean --force
```

---

### 4. Install dependencies with pnpm

```bash
# Install all dependencies
pnpm install

# This will create:
# - pnpm-lock.yaml (new lock file)
# - node_modules/ (with hard links to global store)
```

**Expected output:**

```
Packages: +1234
Progress: resolved 1234, reused 1234, downloaded 0, added 1234, done
Done in 8.5s
```

---

### 5. Update package.json scripts

**BEFORE:**

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

**AFTER:**

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

**No changes needed!** pnpm uses the same `npm run` interface.

---

### 6. Update .gitignore

Add to `.gitignore`:

```gitignore
# pnpm
pnpm-lock.yaml
.pnpm-debug.log*

# Keep npm lock file out (in case you committed it)
package-lock.json
```

**IMPORTANT**: Commit `pnpm-lock.yaml` to ensure reproducible builds!

---

### 7. Verify local build

```bash
# Test build
pnpm run build

# Test tests
pnpm test

# Test dev server
pnpm start
```

**All should work identically to npm.**

---

### 8. Update CircleCI configuration

**File**: `.circleci/config.yml`

**BEFORE:**

```yaml
- restore_cache:
    keys:
      - v1-dependencies-{{ checksum "package-lock.json" }}
      - v1-dependencies-

- run:
    name: Install dependencies
    command: npm ci

- save_cache:
    paths:
      - node_modules
    key: v1-dependencies-{{ checksum "package-lock.json" }}
```

**AFTER:**

```yaml
# Install pnpm first
- run:
    name: Install pnpm
    command: npm install -g pnpm@9

# Restore pnpm cache (much smaller than node_modules!)
- restore_cache:
    keys:
      - v2-pnpm-{{ checksum "pnpm-lock.yaml" }}
      - v2-pnpm-

# Install dependencies (uses cached store)
- run:
    name: Install dependencies
    command: pnpm install --frozen-lockfile

# Cache the pnpm store (NOT node_modules!)
- save_cache:
    paths:
      - ~/.pnpm-store
    key: v2-pnpm-{{ checksum "pnpm-lock.yaml" }}
```

**Key changes:**

- Install pnpm in CI environment
- Cache `~/.pnpm-store` instead of `node_modules`
- Use `pnpm install --frozen-lockfile` (equivalent to `npm ci`)
- Update cache key to `v2-pnpm-*` (forces cache refresh)

---

### 9. Update Husky/lint-staged

**File**: `.husky/pre-commit`

**BEFORE:**

```bash
npx lint-staged
```

**AFTER:**

```bash
pnpm exec lint-staged
```

**OR** (if using pnpx):

```bash
pnpx lint-staged
```

---

### 10. Test on CI

1. Push changes to a feature branch
2. Verify CI build passes
3. Compare build times (should be 30-50% faster)
4. Check cache hit rates in CircleCI UI

---

## Verification Checklist

After migration, verify:

- [ ] `pnpm install` completes without errors
- [ ] `pnpm test` runs all 1012 tests successfully
- [ ] `pnpm run build` produces identical output to npm
- [ ] `pnpm run mobile:sync` works with Capacitor
- [ ] `pnpm run lint` passes
- [ ] Git hooks still work (pre-commit)
- [ ] CI build passes
- [ ] `node_modules` is 50-70% smaller (check with `du -sh node_modules`)

---

## Troubleshooting

### Issue: "Cannot find module 'X'"

**Cause**: Phantom dependency (your code imported a package that wasn't in `dependencies`)

**Fix**:

```bash
pnpm add X
```

**Example**:

```bash
# If you see "Cannot find module 'zone.js'"
pnpm add zone.js  # zone.js is already a dependency, this shouldn't happen
```

---

### Issue: "Peer dependency version mismatch"

**Cause**: Strict peer dependency checking

**Fix**: Already handled by `.npmrc` with `strict-peer-dependencies=false`

If error persists:

```bash
pnpm install --no-strict-peer-dependencies
```

---

### Issue: Capacitor CLI fails

**Cause**: Capacitor expects hoisted dependencies

**Fix**: Ensure `.npmrc` has `shamefully-hoist=true`

Then:

```bash
rm -rf node_modules
pnpm install
```

---

### Issue: Android Gradle build fails

**Cause**: Gradle scripts may use `npm` directly

**Fix**: Update `android/build.gradle` if it references npm:

**BEFORE:**

```gradle
exec {
    commandLine "npm", "install"
}
```

**AFTER:**

```gradle
exec {
    commandLine "pnpm", "install"
}
```

**NOTE**: This is unlikely for Diabetify (Gradle doesn't call npm directly)

---

### Issue: CI cache not working

**Cause**: Cache key still references `package-lock.json`

**Fix**: Update all cache keys to use `pnpm-lock.yaml`

```yaml
- restore_cache:
    keys:
      - v2-pnpm-{{ checksum "pnpm-lock.yaml" }} # ← Must match this exactly
```

---

## Performance Comparison

### Before (npm)

```
$ du -sh node_modules
902M    node_modules

$ time npm install
npm install  21.47s user 12.33s system 85% cpu 39.745 total

$ ls -lh package-lock.json
-rw-r--r--  1 user  staff   2.1M Dec 13 10:00 package-lock.json
```

### After (pnpm)

```
$ du -sh node_modules
384M    node_modules  # -57% (hard links to ~/.pnpm-store)

$ time pnpm install
pnpm install  8.12s user 4.21s system 92% cpu 13.421 total  # -66%

$ ls -lh pnpm-lock.yaml
-rw-r--r--  1 user  staff   1.4M Dec 13 10:05 pnpm-lock.yaml  # -33%
```

---

## Rollback Plan

If migration fails, rollback:

```bash
# 1. Remove pnpm artifacts
rm -rf node_modules pnpm-lock.yaml .npmrc

# 2. Restore npm lock file
cp package-lock.json.backup package-lock.json

# 3. Reinstall with npm
npm ci

# 4. Revert CI config changes
git checkout .circleci/config.yml

# 5. Revert Husky changes
git checkout .husky/
```

---

## Next Steps

After successful pnpm migration:

1. Delete npm backup: `rm package-lock.json.backup`
2. Update team documentation
3. Add pnpm installation to onboarding docs
4. Consider adding `pnpm-lock.yaml` to git LFS (optional, for large projects)
5. Proceed to Turborepo migration (builds on pnpm)

---

## FAQ

**Q: Can I use `npm` and `pnpm` in the same project?**
A: No, choose one. Mixing causes lock file conflicts.

**Q: Do I need to update `package.json` dependencies?**
A: No, `package.json` format is identical.

**Q: Will this break my teammates' local environments?**
A: They need to install pnpm globally and run `pnpm install`. Coordinate the migration.

**Q: Can I still use `npx`?**
A: Yes, but use `pnpx` instead (pnpm's equivalent) or `pnpm exec`.

**Q: What about global packages?**
A: Install globally with `pnpm add -g <package>`. Separate from project dependencies.

**Q: Is pnpm slower than Bun?**
A: Bun is faster, but pnpm is 2-3x faster than npm and has better ecosystem support.

---

## Additional Resources

- [pnpm official docs](https://pnpm.io/)
- [pnpm vs npm benchmark](https://pnpm.io/benchmarks)
- [Capacitor with pnpm guide](https://capacitorjs.com/docs/getting-started/environment-setup)
- [pnpm Workspace guide](https://pnpm.io/workspaces) (for future monorepo split)
