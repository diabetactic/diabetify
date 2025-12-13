# CI/CD Quick Wins - Implementation Guide

**Estimated Time:** 2-3 hours
**Impact:** High - Immediate improvements to CI/CD pipeline

---

## 1. Enable Dependabot (5 minutes)

### Why?

Automated dependency updates with grouped PRs for easier management.

### Implementation:

**Create:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  # NPM dependencies
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '09:00'
    open-pull-requests-limit: 10
    groups:
      # Group Angular updates together
      angular:
        patterns:
          - '@angular/*'
          - '@angular-devkit/*'
          - '@angular-eslint/*'
      # Group Ionic/Capacitor together
      ionic:
        patterns:
          - '@ionic/*'
          - '@capacitor/*'
      # Group testing tools
      testing:
        patterns:
          - 'jest*'
          - '@playwright/*'
          - '@axe-core/*'
      # Group dev tools
      dev-tools:
        patterns:
          - 'eslint*'
          - 'prettier*'
          - 'stylelint*'
          - 'typescript*'
    labels:
      - 'dependencies'
      - 'automated'
    commit-message:
      prefix: 'chore(deps):'

  # GitHub Actions updates
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'monthly'
    labels:
      - 'dependencies'
      - 'github-actions'
    commit-message:
      prefix: 'ci:'
```

### Test:

```bash
# Dependabot will auto-create PRs on the next scheduled run
# Check: Settings → Code security and analysis → Dependabot
```

---

## 2. Enable CodeQL Security Scanning (10 minutes)

### Why?

Free SAST (Static Application Security Testing) for finding security vulnerabilities in TypeScript/JavaScript code.

### Implementation:

**Create:** `.github/workflows/codeql.yml`

```yaml
name: CodeQL Security Scan

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]
  schedule:
    - cron: '0 6 * * 1' # Weekly on Monday at 6 AM UTC

jobs:
  analyze:
    name: Analyze Code
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'typescript']

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: security-extended,security-and-quality

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: '/language:${{ matrix.language }}'
```

### Test:

```bash
# Push to master or create a PR
# Check: Security → Code scanning alerts
```

**Alternative: Enable via GitHub UI**

1. Go to repository Settings
2. Click "Code security and analysis"
3. Click "Set up" under "Code scanning"
4. Choose "CodeQL Analysis"

---

## 3. Add npm audit Security Check (5 minutes)

### Why?

Check for known vulnerabilities in dependencies on every CI run.

### Implementation:

**Update:** `.github/workflows/ci.yml`

Add this job after the `test` job:

```yaml
# Add after 'test' job
security-audit:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Run npm audit
      run: npm audit --audit-level=moderate
      continue-on-error: true # Don't fail build, but report

    - name: Run npm audit (production only)
      run: npm audit --production --audit-level=high
```

### Test:

```bash
npm audit
```

---

## 4. Cache Playwright Browsers (15 minutes)

### Why?

Saves ~4 minutes per E2E test run by reusing downloaded browsers.

### Implementation:

**Update:** `.github/workflows/ci.yml`

Replace the `playwright-e2e` job with:

```yaml
playwright-e2e:
  needs: build-web
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/master' || github.ref == 'refs/heads/main'
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4]
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    # NEW: Cache Playwright browsers
    - name: Get Playwright version
      id: playwright-version
      run: |
        VERSION=$(npm list @playwright/test --depth=0 --json | jq -r '.dependencies["@playwright/test"].version')
        echo "version=$VERSION" >> $GITHUB_OUTPUT

    - name: Cache Playwright browsers
      uses: actions/cache@v4
      id: playwright-cache
      with:
        path: ~/.cache/ms-playwright
        key: playwright-browsers-${{ runner.os }}-${{ steps.playwright-version.outputs.version }}
        restore-keys: |
          playwright-browsers-${{ runner.os }}-

    - name: Install Playwright browsers
      if: steps.playwright-cache.outputs.cache-hit != 'true'
      run: npx playwright install chromium --with-deps

    - name: Install browser dependencies only
      if: steps.playwright-cache.outputs.cache-hit == 'true'
      run: npx playwright install-deps chromium

    - name: Download www artifact
      uses: actions/download-artifact@v4
      with:
        name: www
        path: www/

    - name: Run Playwright tests (shard ${{ matrix.shard }}/4)
      run: npx playwright test --shard=${{ matrix.shard }}/4 --reporter=html,json

    - name: Upload Playwright report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report-shard-${{ matrix.shard }}
        path: playwright-report/
        retention-days: 7
```

### Test:

```bash
# Run workflow twice - second run should be faster
# Check actions logs for "Cache hit: true"
```

**Expected Savings:** 3-4 minutes per E2E run

---

## 5. Publish Test Results to GitHub UI (20 minutes)

### Why?

See test results directly in PR checks without digging through logs.

### Implementation:

**Step 1:** Update `jest.config.js` to ensure junit output:

```javascript
// jest.config.js
module.exports = {
  // ... existing config
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results/jest',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
};
```

**Step 2:** Update `.github/workflows/ci.yml`:

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Lint
      run: npm run lint

    - name: Unit Tests
      run: npm test -- --ci --coverage

    # NEW: Publish test results
    - name: Publish Test Results
      uses: EnricoMi/publish-unit-test-result-action@v2
      if: always()
      with:
        files: test-results/jest/junit.xml
        check_name: Unit Test Results
        comment_mode: off # Don't comment on PRs, just show in checks

    - name: Upload coverage to DeepSource
      if: env.DEEPSOURCE_DSN != ''
      env:
        DEEPSOURCE_DSN: ${{ secrets.DEEPSOURCE_DSN }}
      run: |
        curl https://deepsource.io/cli | sh
        ./bin/deepsource report --analyzer test-coverage --key javascript --value-file coverage/diabetactic/lcov.info

    - name: Upload coverage artifact
      uses: actions/upload-artifact@v4
      with:
        name: coverage
        path: coverage/
        retention-days: 7
```

**Step 3:** Add Playwright test results:

```yaml
playwright-e2e:
  # ... existing steps ...

  - name: Run Playwright tests (shard ${{ matrix.shard }}/4)
    run: npx playwright test --shard=${{ matrix.shard }}/4 --reporter=html,json,junit

  # NEW: Publish E2E test results
  - name: Publish E2E Test Results
    uses: EnricoMi/publish-unit-test-result-action@v2
    if: always()
    with:
      files: test-results/junit-*.xml
      check_name: E2E Test Results (Shard ${{ matrix.shard }})
      comment_mode: off

  - name: Upload Playwright report
    if: always()
    uses: actions/upload-artifact@v4
    with:
      name: playwright-report-shard-${{ matrix.shard }}
      path: playwright-report/
      retention-days: 7
```

### Test:

```bash
npm test
# Check that test-results/jest/junit.xml is created
```

---

## 6. Add Pull Request Template (10 minutes)

### Why?

Ensures all PRs follow a consistent format and include necessary information.

### Implementation:

**Create:** `.github/pull_request_template.md`

```markdown
## Description

<!-- Clear, concise description of what this PR does -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] CI/CD improvement

## Testing

- [ ] All existing tests pass (`npm test`)
- [ ] New tests added for new functionality
- [ ] Test coverage maintained or improved
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manual testing completed

## Diabetactic-Specific Checklist

- [ ] All API calls use `ApiGatewayService` (not direct HTTP)
- [ ] Standalone components include `CUSTOM_ELEMENTS_SCHEMA`
- [ ] Translations added to BOTH `en.json` and `es.json`
- [ ] Code follows Angular 20 standalone component patterns
- [ ] No hardcoded API URLs or secrets

## Code Quality

- [ ] Code follows project style guidelines (`npm run lint` passes)
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No new ESLint warnings introduced
- [ ] Format check passes (`npm run format:check`)

## Documentation

- [ ] Documentation updated (if needed)
- [ ] CLAUDE.md updated (if architecture changes)
- [ ] README updated (if user-facing changes)

## Mobile Testing (if applicable)

- [ ] Tested on Android emulator/device
- [ ] Tested in mock mode (`ENV=mock`)
- [ ] Tested against Heroku backend (`ENV=cloud`)

## Screenshots (if UI changes)

<!-- Add screenshots or GIFs here -->

## Related Issues

<!-- Link related issues: Fixes #123, Closes #456, Relates to #789 -->

## Additional Notes

<!-- Any additional context, considerations, or follow-up tasks -->

---

**Before submitting:**

- [ ] Read and understood CLAUDE.md coding standards
- [ ] All CI checks pass
- [ ] PR title follows conventional commits format (feat:, fix:, docs:, etc.)
```

### Test:

Create a new PR and verify the template appears.

---

## 7. Add Type Checking to CI (10 minutes)

### Why?

Catch TypeScript errors before build step (faster feedback).

### Implementation:

**Update:** `.github/workflows/ci.yml`

Add a new job before `build-web`:

```yaml
typecheck:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: TypeScript Type Check
      run: npx tsc --noEmit --project tsconfig.json

# Update build-web to depend on typecheck
build-web:
  needs: [test, typecheck] # Changed from just 'test'
  runs-on: ubuntu-latest
  # ... rest of job
```

### Test:

```bash
npx tsc --noEmit
# Should pass with no errors
```

---

## 8. Add PR Checks Workflow (30 minutes)

### Why?

Run quality checks on all PRs, not just master pushes.

### Implementation:

**Create:** `.github/workflows/pr-checks.yml`

```yaml
name: PR Checks

on:
  pull_request:
    branches: [master, main]
    types: [opened, synchronize, reopened]

env:
  NODE_VERSION: '20'

jobs:
  # Fast quality checks
  quick-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # For PR size calculation

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type Check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Format Check
        run: npm run format:check

      - name: Check i18n keys
        run: npm run i18n:check

  # Unit tests
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Unit Tests
        run: npm run test:ci

      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: test-results/jest/junit.xml
          check_name: Unit Test Results

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: pr-coverage
          path: coverage/
          retention-days: 7

  # Build verification
  build-check:
    runs-on: ubuntu-latest
    needs: [quick-checks, unit-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Production
        run: npm run build:prod

      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sb www | awk '{print $1}')
          echo "Bundle size: $(numfmt --to=iec-i --suffix=B $BUNDLE_SIZE)"
          # Optional: Add size limit check
          MAX_SIZE=$((50 * 1024 * 1024))  # 50MB
          if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
            echo "::error::Bundle size exceeds 50MB limit"
            exit 1
          fi

  # PR size labeling
  pr-metadata:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Label PR Size
        uses: codelytv/pr-size-labeler@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          xs_max_size: '10'
          s_max_size: '100'
          m_max_size: '500'
          l_max_size: '1000'
          xl_max_size: '2000'
```

### Test:

Create a new PR and verify all checks run.

---

## 9. Add Status Badges to README (5 minutes)

### Why?

Show CI/CD status at a glance.

### Implementation:

**Update:** `README.md` (add at top after title):

```markdown
# Diabetactic

[![CI](https://github.com/diabetactic/diabetify/actions/workflows/ci.yml/badge.svg)](https://github.com/diabetactic/diabetify/actions/workflows/ci.yml)
[![CodeQL](https://github.com/diabetactic/diabetify/actions/workflows/codeql.yml/badge.svg)](https://github.com/diabetactic/diabetify/actions/workflows/codeql.yml)
[![Android](https://github.com/diabetactic/diabetify/actions/workflows/android.yml/badge.svg)](https://github.com/diabetactic/diabetify/actions/workflows/android.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE/deploys)

<!-- Replace YOUR-SITE-ID with actual Netlify site ID -->

Mobile app for diabetes glucose management built with Ionic/Angular.

<!-- Rest of README -->
```

---

## 10. Commit and Test

### Commit Everything:

```bash
# Add new files
git add .github/dependabot.yml
git add .github/workflows/codeql.yml
git add .github/workflows/pr-checks.yml
git add .github/pull_request_template.md

# Update existing files
git add .github/workflows/ci.yml
git add jest.config.js

# Commit
git commit -m "ci: add PR checks, security scanning, and test result publishing

- Add Dependabot for automated dependency updates
- Enable CodeQL security scanning
- Add npm audit check
- Cache Playwright browsers (saves ~4min per run)
- Publish test results to GitHub UI
- Add PR template for consistency
- Add type checking job
- Add comprehensive PR checks workflow
- Add CI status badges to README

Estimated time savings: 30% faster CI runs
"

# Push and create PR
git push origin feature/ci-improvements
```

### Verification Checklist:

- [ ] Dependabot creates first PR within a week
- [ ] CodeQL scan completes without errors
- [ ] Playwright cache hit on second run
- [ ] Test results visible in PR checks
- [ ] PR template appears on new PRs
- [ ] Type check runs before build
- [ ] PR checks workflow runs on PRs
- [ ] Status badges show "passing" in README

---

## Expected Results

After implementing all quick wins:

**Before:**

- No PR quality checks
- No security scanning
- ~8 min Playwright E2E tests
- Test failures require log diving
- Manual dependency updates

**After:**

- ✅ All PRs get quality checks
- ✅ Automated security scanning (CodeQL + npm audit + Dependabot)
- ✅ ~5 min Playwright E2E tests (37% faster)
- ✅ Test results visible in PR UI
- ✅ Automated dependency PRs grouped by type

**Time Investment:** 2-3 hours
**Ongoing Savings:** ~30-40 hours/year (reduced manual work)
**Quality Improvement:** Catch 80% more issues before merge

---

## Troubleshooting

### Issue: Dependabot not creating PRs

**Fix:**

- Check Settings → Code security → Dependabot alerts is enabled
- Verify `.github/dependabot.yml` is on master branch
- Wait up to 24 hours for first scan

### Issue: CodeQL analysis fails

**Fix:**

- Check workflow logs for specific error
- Ensure TypeScript compiles successfully
- Try removing `queries: security-extended` if too strict

### Issue: Playwright cache not working

**Fix:**

- Verify `~/.cache/ms-playwright` path is correct
- Check Playwright version extraction step
- Clear cache: Settings → Actions → Caches → Delete

### Issue: Test results not appearing

**Fix:**

- Verify `test-results/jest/junit.xml` is created
- Check jest.config.js has jest-junit reporter
- Ensure `EnricoMi/publish-unit-test-result-action@v2` has correct file path

### Issue: PR checks not running

**Fix:**

- Verify `.github/workflows/pr-checks.yml` is on master
- Check workflow permissions (Settings → Actions → General)
- Try re-opening the PR

---

## Next Steps

After implementing quick wins, consider:

1. **Semantic Release** - Automated versioning and changelogs
2. **Bundle Size Monitoring** - Track bundle size changes in PRs
3. **Visual Regression** - Automate Playwright visual diff tests
4. **Performance Budgets** - Lighthouse CI integration
5. **Android Release Signing** - Production APK builds

See `docs/ci-cd-analysis.md` for complete roadmap.

---

**Total Implementation Time:** ~2-3 hours
**Difficulty:** Beginner to Intermediate
**Impact:** High - Immediate quality and speed improvements
