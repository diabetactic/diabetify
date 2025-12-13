# GitHub Actions Workflow Templates

Ready-to-use workflow files for Diabetactic CI/CD improvements.

---

## 1. Dependabot Configuration

**File:** `.github/dependabot.yml`

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
      angular:
        patterns:
          - '@angular/*'
          - '@angular-devkit/*'
          - '@angular-eslint/*'
      ionic:
        patterns:
          - '@ionic/*'
          - '@capacitor/*'
      testing:
        patterns:
          - 'jest*'
          - '@playwright/*'
          - '@axe-core/*'
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

  # GitHub Actions
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

---

## 2. CodeQL Security Scanning

**File:** `.github/workflows/codeql.yml`

```yaml
name: CodeQL Security Scan

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]
  schedule:
    - cron: '0 6 * * 1' # Weekly Monday 6 AM UTC

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

---

## 3. PR Checks Workflow

**File:** `.github/workflows/pr-checks.yml`

```yaml
name: PR Checks

on:
  pull_request:
    branches: [master, main]
    types: [opened, synchronize, reopened]

env:
  NODE_VERSION: '20'

jobs:
  quick-checks:
    name: Quick Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

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

  unit-tests:
    name: Unit Tests
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
          comment_mode: off

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pr-coverage
          path: coverage/
          retention-days: 7

  build-check:
    name: Build Verification
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
          MAX_SIZE=$((50 * 1024 * 1024))  # 50MB
          if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
            echo "::error::Bundle size exceeds 50MB limit"
            exit 1
          fi

  pr-metadata:
    name: PR Metadata
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

      - name: Check PR Title
        uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: |
            feat
            fix
            docs
            style
            refactor
            perf
            test
            ci
            chore
          requireScope: false
```

---

## 4. Security Audit Workflow

**File:** `.github/workflows/security-audit.yml`

```yaml
name: Security Audit

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday

jobs:
  npm-audit:
    name: NPM Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Run npm audit (all dependencies)
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Run npm audit (production only)
        run: npm audit --production --audit-level=high

  secret-scan:
    name: Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

---

## 5. Improved CI Workflow (with caching)

**File:** `.github/workflows/ci.yml` (updated version)

```yaml
name: CI

on:
  push:
    branches: [master, main, develop]
  pull_request:
    branches: [master, main]

env:
  NODE_VERSION: '20'

jobs:
  test:
    name: Lint & Test
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

      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: test-results/jest/junit.xml
          check_name: Unit Test Results
          comment_mode: off

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

  typecheck:
    name: TypeScript Type Check
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

      - name: Type Check
        run: npx tsc --noEmit

  build-web:
    name: Build Production
    needs: [test, typecheck]
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

      - name: Build Production
        run: npm run build:prod

      - name: Upload www artifact
        uses: actions/upload-artifact@v4
        with:
          name: www
          path: www/
          retention-days: 1

  playwright-e2e:
    name: E2E Tests (Playwright)
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

      # Cache Playwright browsers
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
        run: npx playwright test --shard=${{ matrix.shard }}/4 --reporter=html,json,junit

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

  deploy-netlify:
    name: Deploy to Netlify
    needs: build-web
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/master' || github.ref == 'refs/heads/main'
    steps:
      - name: Download www artifact
        uses: actions/download-artifact@v4
        with:
          name: www
          path: www/

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.1
        with:
          publish-dir: './www'
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

      - name: Post-deploy smoke test
        run: |
          sleep 10
          curl -f https://your-site.netlify.app || exit 1
```

---

## 6. Semantic Release Configuration

**File:** `.releaserc.json`

```json
{
  "branches": ["master", "main"],
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "preset": "angular",
        "releaseRules": [
          { "type": "docs", "release": "patch" },
          { "type": "refactor", "release": "patch" },
          { "type": "style", "release": "patch" },
          { "type": "perf", "release": "patch" }
        ]
      }
    ],
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md"
      }
    ],
    "@semantic-release/npm",
    [
      "@semantic-release/git",
      {
        "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

**File:** `.github/workflows/release-automation.yml`

```yaml
name: Release Automation

on:
  push:
    branches: [master, main]

jobs:
  release:
    name: Semantic Release
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, '[skip ci]')"
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Semantic Release
        uses: cycjimmy/semantic-release-action@v4
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          extra_plugins: |
            @semantic-release/changelog
            @semantic-release/git
```

**Install dependencies:**

```bash
npm install --save-dev \
  semantic-release \
  @semantic-release/changelog \
  @semantic-release/git
```

---

## 7. Bundle Size Monitoring

**File:** `.github/workflows/bundle-size.yml`

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [master, main]

jobs:
  bundle-size:
    name: Check Bundle Size
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Production
        run: npm run build:prod

      - name: Analyze bundle size
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          build_script: build:prod
          skip_step: install

      - name: Report size
        run: |
          BUNDLE_SIZE=$(du -sh www | cut -f1)
          echo "📦 Bundle size: $BUNDLE_SIZE"
          echo "bundle_size=$BUNDLE_SIZE" >> $GITHUB_ENV

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📦 Bundle size: ${{ env.bundle_size }}`
            })
```

---

## 8. PR Template

**File:** `.github/pull_request_template.md`

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

---

## 9. Issue Templates

**File:** `.github/ISSUE_TEMPLATE/bug_report.yml`

```yaml
name: Bug Report
description: File a bug report
title: '[Bug]: '
labels: ['bug', 'triage']
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!

  - type: input
    id: contact
    attributes:
      label: Contact Details
      description: How can we get in touch with you if we need more info?
      placeholder: ex. email@example.com
    validations:
      required: false

  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us, what did you expect to happen?
      placeholder: Tell us what you see!
    validations:
      required: true

  - type: dropdown
    id: version
    attributes:
      label: Version
      description: What version of our software are you running?
      options:
        - 0.0.1 (latest)
        - Other (specify below)
    validations:
      required: true

  - type: dropdown
    id: platform
    attributes:
      label: Platform
      description: Where are you experiencing the issue?
      options:
        - Web (Browser)
        - Android (Device)
        - Android (Emulator)
      multiple: true
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output. This will be automatically formatted into code, so no need for backticks.
      render: shell

  - type: checkboxes
    id: terms
    attributes:
      label: Code of Conduct
      description: By submitting this issue, you agree to follow our [Code of Conduct](https://example.com)
      options:
        - label: I agree to follow this project's Code of Conduct
          required: true
```

**File:** `.github/ISSUE_TEMPLATE/feature_request.yml`

```yaml
name: Feature Request
description: Suggest an idea for this project
title: '[Feature]: '
labels: ['enhancement', 'triage']
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a new feature!

  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: Is your feature request related to a problem? Please describe.
      placeholder: I'm always frustrated when...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe the solution you'd like
      placeholder: I would like to see...
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Describe alternatives you've considered
      placeholder: I also thought about...
    validations:
      required: false

  - type: dropdown
    id: priority
    attributes:
      label: Priority
      description: How important is this feature to you?
      options:
        - Low (nice to have)
        - Medium (would be useful)
        - High (need this soon)
        - Critical (blocking work)
    validations:
      required: true

  - type: checkboxes
    id: contribution
    attributes:
      label: Contribution
      description: Would you be willing to contribute to this feature?
      options:
        - label: I would like to implement this feature
        - label: I can help with testing
        - label: I can help with documentation
```

---

## 10. Jest Configuration Update

**File:** `jest.config.js` (ensure junit output)

```javascript
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/www/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/environments/**',
  ],
  coverageDirectory: 'coverage/diabetactic',
  coverageReporters: ['html', 'lcov', 'text', 'text-summary'],
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
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
  },
  transform: {
    '^.+\\.(ts|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.html$',
      },
    ],
  },
  testMatch: ['**/*.spec.ts'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
```

---

## Usage Instructions

### Quick Setup

```bash
# Create all workflow files
mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

# Copy templates from this file to respective locations
# Then commit and push

git add .github/
git commit -m "ci: add comprehensive CI/CD workflows

- Add Dependabot configuration
- Add CodeQL security scanning
- Add PR checks workflow
- Add security audit workflow
- Add PR and issue templates
- Update jest config for test reporting
"

git push origin master
```

### Verify Setup

1. **Dependabot**: Check Settings → Code security → Dependabot
2. **CodeQL**: Check Security → Code scanning
3. **Workflows**: Check Actions tab for new workflows
4. **Templates**: Create a PR or issue to verify templates appear

---

## Customization

### Replace Placeholders

Before committing, replace:

- `YOUR-SITE-ID` with actual Netlify site ID
- `your-site.netlify.app` with actual Netlify URL
- `diabetactic/diabetify` with actual repo path (if different)

### Adjust Limits

Customize thresholds in workflows:

- Bundle size limit: `MAX_SIZE=$((50 * 1024 * 1024))` (50MB)
- PR size labels: `xs_max_size: '10'`, `s_max_size: '100'`, etc.
- npm audit level: `--audit-level=moderate` or `high`

---

**Last Updated:** 2025-12-13
**Compatibility:** GitHub Actions, Node.js 20, Angular 20
