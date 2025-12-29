# DevOps Implementation Guide

**Diabetify CI/CD Enhancement Roadmap**
**Timeline:** 12-14 weeks across 4 phases

---

## Quick Reference: Implementation Priority Matrix

| Priority    | Area                      | Effort | Impact    | Timeline   |
| ----------- | ------------------------- | ------ | --------- | ---------- |
| 🔴 Critical | Android Credentials Fix   | 0.5h   | High      | Week 1     |
| 🔴 Critical | Coverage Thresholds       | 1h     | High      | Week 1     |
| 🟠 High     | Staging Automation        | 8h     | High      | Week 1-2   |
| 🟠 High     | Sentry Integration        | 6h     | High      | Week 2     |
| 🟠 High     | Android Play Store Deploy | 24h    | Very High | Week 3-4   |
| 🟠 High     | iOS Pipeline              | 32h    | Very High | Week 5-6   |
| 🟡 Medium   | Feature Flags             | 16h    | High      | Week 7-8   |
| 🟡 Medium   | Monitoring Stack          | 20h    | Medium    | Week 9-12  |
| 🟢 Low      | Progressive Delivery      | 12h    | Medium    | Week 11-14 |

---

## Phase 1: Security & Stability (Weeks 1-2)

### 1.1 Fix Android Hardcoded Credentials

**Current Issue:**

```yaml
# .github/workflows/android.yml (INSECURE)
maestro-tests:
  env:
    TEST_USER_ID: '1000'
    TEST_USER_PASSWORD: 'tuvieja' # EXPOSED!
```

**Step 1: Create GitHub Secrets**

1. Go to: Settings → Secrets and variables → Actions
2. Create these secrets:
   - `TEST_USER_ID` = your test user ID
   - `TEST_USER_PASSWORD` = your test password
   - `BACKOFFICE_ADMIN_USERNAME` = admin username
   - `BACKOFFICE_ADMIN_PASSWORD` = admin password

**Step 2: Update Workflow**

```yaml
# .github/workflows/android.yml
maestro-tests:
  runs-on: ubuntu-latest
  if: inputs.run_maestro == true
  env:
    TEST_USER_ID: ${{ secrets.TEST_USER_ID }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
    BACKOFFICE_API_URL: ${{ secrets.BACKOFFICE_API_URL }}
    BACKOFFICE_ADMIN_USERNAME: ${{ secrets.BACKOFFICE_ADMIN_USERNAME }}
    BACKOFFICE_ADMIN_PASSWORD: ${{ secrets.BACKOFFICE_ADMIN_PASSWORD }}
```

**Verification:**

```bash
git log --all --source --grep="password" --grep="secret" --grep="token"
```

Should show no results.

**Effort:** 30 minutes
**Testing:** Run workflow manually to verify secrets are used

---

### 1.2 Implement Coverage Thresholds

**Current State:**

- Coverage tracked but not enforced
- No minimum threshold

**Implementation:**

**File:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    // ... existing config ...
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: [
        'src/app/**/*.spec.ts',
        'src/app/**/*.mock.ts',
        'src/app/tests/**',
        'src/app/testing/**',
        'src/app/**/*.module.ts',
        'src/app/**/index.ts',
        'src/app/**/*.model.ts',
        'src/app/**/constants/**',
        'src/app/shared/components/debug-panel/**',
        'src/app/shared/components/env-badge/**',
        'src/app/shared/icons/**',
      ],
      // NEW: Enforce coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

**Update CI Pipeline:**

**File:** `.github/workflows/ci.yml`

```yaml
unit-tests:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Setup pnpm
      uses: ./.github/actions/setup-pnpm

    - name: Unit Tests with Coverage
      run: pnpm exec vitest run --coverage
      # Will now fail if coverage drops below thresholds

    - name: Upload coverage to DeepSource
      if: always()
      uses: deepsourcelabs/test-coverage-action@master
      with:
        key: javascript
        coverage-file: coverage/lcov.info
        dsn: ${{ secrets.DEEPSOURCE_DSN }}
```

**Testing:**

```bash
# Test locally
pnpm test:coverage

# Should fail with message:
# ERROR: Line coverage 72.5% does not meet global threshold 80%
```

**Effort:** 1 hour
**Impact:** Prevents coverage degradation

---

### 1.3 Implement Staging Environment

**Goal:** Validate changes before production

**Step 1: Create Staging Deployment Job**

**File:** `.github/workflows/ci.yml` (add new job)

```yaml
# Add to ci.yml after ui-tests
deploy-staging:
  needs: [lint, unit-tests, build, ui-tests]
  if: github.ref == 'refs/heads/develop'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Download www artifact
      uses: actions/download-artifact@v4
      with:
        name: www
        path: www/

    - name: Deploy to Netlify (Staging)
      uses: nwtgck/actions-netlify@v3.0
      with:
        publish-dir: './www'
        production-deploy: false # Not production
        alias: 'staging-${{ github.run_number }}'
        github-token: ${{ secrets.GITHUB_TOKEN }}
      env:
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN_STAGING }}
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID_STAGING }}

    - name: Comment on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: `✅ Staged to: https://staging-${{ github.run_number }}--diabetify.netlify.app`
          })
```

**Step 2: Create Staging Site in Netlify**

1. Create new Netlify site (or use subdomain)
2. Get SITE_ID and AUTH_TOKEN
3. Store in GitHub Secrets:
   - `NETLIFY_SITE_ID_STAGING`
   - `NETLIFY_AUTH_TOKEN_STAGING`

**Step 3: Run E2E Against Staging**

**File:** `.github/workflows/ci.yml` (add job)

```yaml
e2e-staging:
  needs: deploy-staging
  if: github.ref == 'refs/heads/develop'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup pnpm
      uses: ./.github/actions/setup-pnpm

    - name: Install Playwright
      run: pnpm exec playwright install --with-deps chromium

    - name: Run E2E Tests Against Staging
      run: pnpm test:e2e
      env:
        E2E_BASE_URL: 'https://staging-${{ github.run_number }}--diabetify.netlify.app'
```

**Effort:** 3-4 hours
**Testing:**

1. Push to develop branch
2. Verify staging URL in PR comment
3. Check E2E tests run

---

### 1.4 Add Sentry Error Tracking

**Step 1: Setup Sentry Project**

1. Go to sentry.io
2. Create new organization
3. Create project for "Angular"
4. Get DSN value

**Step 2: Install Sentry SDK**

```bash
pnpm add @sentry/angular @sentry/tracing
```

**Step 3: Configure Sentry**

**File:** `src/main.ts`

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import * as Sentry from '@sentry/angular';
import { APP_COMPONENT } from './app/app.component';
import { environment } from '@env/environment';

if (environment.production || environment.sentryEnabled) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.name,
    release: `diabetify@${environment.version}`,
    // Sample 10% of transactions in production
    tracesSampleRate: environment.production ? 0.1 : 1.0,
    // Capture console errors
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Capture replays for 10% of all sessions
    replaySessionSampleRate: 0.1,
    // Capture replays for 100% of sessions with an error
    replayOnErrorSampleRate: 1.0,
  });
}

bootstrapApplication(APP_COMPONENT, {
  providers: [provideHttpClient(withInterceptors([Sentry.captureRequestsInterceptor()]))],
}).catch(err => {
  Sentry.captureException(err);
  console.error(err);
});
```

**File:** `src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  name: 'production',
  version: '1.0.0',
  sentryDsn: 'https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID',
  sentryEnabled: true,
  // ... other config
};
```

**Step 4: Store DSN in GitHub Secrets**

```bash
# Go to Settings → Secrets → Actions
# Add SENTRY_DSN secret
```

**Step 5: Add to CI Pipeline**

**File:** `.github/workflows/deploy.yml`

```yaml
build:
  runs-on: ubuntu-latest
  env:
    SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
  steps:
    - uses: actions/checkout@v4
    - name: Setup pnpm
      uses: ./.github/actions/setup-pnpm
    - name: Build Production
      run: pnpm run build:prod

    # Upload source maps to Sentry
    - name: Upload source maps
      run: |
        npm install -g @sentry/cli
        sentry-cli releases files upload-sourcemaps ./www
      env:
        SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
        SENTRY_ORG: YOUR_ORG
        SENTRY_PROJECT: diabetify
```

**Testing:**

```bash
# Trigger an error
throw new Error('Test Sentry integration');
```

Should appear in Sentry dashboard

**Effort:** 2-3 hours
**Verification:**

1. Build app
2. Check Sentry project for events
3. Verify source maps uploaded

---

## Phase 2: Mobile Automation (Weeks 3-6)

### 2.1 Setup Fastlane for Android Play Store

**Step 1: Install Fastlane**

```bash
cd android
gem install fastlane -NV
fastlane init android
```

**Step 2: Create Signing Configuration**

**File:** `android/app/build.gradle`

```gradle
android {
  // ... existing config ...

  signingConfigs {
    release {
      storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
      storePassword System.getenv("KEYSTORE_PASSWORD")
      keyAlias System.getenv("KEYSTORE_KEY_ALIAS")
      keyPassword System.getenv("KEYSTORE_KEY_PASSWORD")
    }
  }

  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
  }
}
```

**Step 3: Create Keystore**

```bash
# One-time setup (do locally, not in CI)
keytool -genkey -v \
  -keystore release.keystore \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias diabetify

# Then encrypt and store in GitHub Secrets
base64 release.keystore | pbcopy  # macOS
# On Linux: cat release.keystore | base64
```

**Step 4: Add to GitHub Secrets**

- `KEYSTORE_BASE64` = base64 encoded keystore
- `KEYSTORE_PASSWORD` = your password
- `KEYSTORE_KEY_ALIAS` = key alias
- `KEYSTORE_KEY_PASSWORD` = key password

**Step 5: Configure Fastlane**

**File:** `android/fastlane/Fastfile`

```ruby
default_platform(:android)

platform :android do
  desc "Build and release to Play Store beta"
  lane :beta do
    build_android_app(
      task: 'bundle',
      project_dir: 'android/',
      gradle_options: '-x test',
    )

    upload_to_play_store(
      track: 'beta',
      release_status: 'draft',
    )
  end

  desc "Release to Play Store production"
  lane :release do
    build_android_app(
      task: 'bundle',
      project_dir: 'android/',
      gradle_options: '-x test',
    )

    upload_to_play_store(
      track: 'production',
      release_status: 'completed',
    )
  end

  desc "Build release APK"
  lane :build_release do
    build_android_app(
      task: 'assemble',
      build_type: 'Release',
      project_dir: 'android/',
      gradle_options: '-x test',
    )
  end
end
```

**Step 6: Setup Play Store Access**

1. Go to Google Play Console
2. Create service account (Settings → Service accounts)
3. Download JSON key
4. Encode and store in secrets:
   - `PLAY_STORE_JSON_KEY` = base64 encoded JSON

**Step 7: Add CI Workflow**

**File:** `.github/workflows/deploy-android.yml` (new file)

```yaml
name: Deploy Android

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      track:
        description: 'Play Store track'
        required: true
        default: 'beta'
        type: choice
        options:
          - beta
          - production

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '10'
  JAVA_VERSION: '17'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: ${{ env.JAVA_VERSION }}

      - name: Setup pnpm
        uses: ./.github/actions/setup-pnpm

      - name: Build Web
        run: pnpm run build:prod

      - name: Sync Capacitor
        run: pnpm exec cap sync android

      - name: Setup Android Signing
        run: |
          mkdir -p ~/signing
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > ~/signing/release.keystore

          echo "KEYSTORE_PATH=$HOME/signing/release.keystore" >> $GITHUB_ENV
          echo "KEYSTORE_PASSWORD=${{ secrets.KEYSTORE_PASSWORD }}" >> $GITHUB_ENV
          echo "KEYSTORE_KEY_ALIAS=${{ secrets.KEYSTORE_KEY_ALIAS }}" >> $GITHUB_ENV
          echo "KEYSTORE_KEY_PASSWORD=${{ secrets.KEYSTORE_KEY_PASSWORD }}" >> $GITHUB_ENV

      - name: Setup Play Store Key
        run: |
          mkdir -p ~/play-store
          echo "${{ secrets.PLAY_STORE_JSON_KEY }}" | base64 -d > ~/play-store/key.json
          echo "PLAY_STORE_JSON_KEY_PATH=$HOME/play-store/key.json" >> $GITHUB_ENV

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
          working-directory: android

      - name: Install Fastlane
        run: |
          cd android
          gem install fastlane
          bundle install

      - name: Deploy to Play Store
        run: |
          cd android
          fastlane android beta
        env:
          FASTLANE_SKIP_UPDATE_CHECK: true
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD }}

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v6
        with:
          name: android-release-apk
          path: android/app/build/outputs/apk/release/
          retention-days: 90

      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v2
        with:
          files: android/app/build/outputs/apk/release/app-release.apk
          draft: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Testing:**

```bash
# Test locally first
cd android
fastlane beta --dry_run

# Then deploy
cd android
fastlane beta
```

**Effort:** 8-10 hours
**Timeline:** Week 3-4

---

### 2.2 Configure iOS Build Pipeline

**Step 1: Setup iOS Signing**

**Requirements:**

- Apple Developer Account
- Certificates (Development, Distribution)
- Provisioning profiles

**File:** `.github/workflows/deploy-ios.yml` (new file)

```yaml
name: Deploy iOS

on:
  push:
    tags:
      - 'v*-ios'
  workflow_dispatch:
    inputs:
      testflight:
        description: 'Deploy to TestFlight'
        required: true
        default: true
        type: boolean

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '10'

jobs:
  build-and-deploy:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: ./.github/actions/setup-pnpm

      - name: Build Web
        run: pnpm run build:prod

      - name: Sync Capacitor
        run: pnpm exec cap sync ios

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
          working-directory: ios/Podfile

      - name: Install dependencies
        run: |
          cd ios
          pod install

      - name: Setup Code Signing
        uses: apple-actions/import-codesign-certs@v1
        with:
          p12-file-base64: ${{ secrets.IOS_CERTIFICATE_P12_BASE64 }}
          p12-password: ${{ secrets.IOS_CERTIFICATE_PASSWORD }}

      - name: Install Fastlane
        run: gem install fastlane

      - name: Deploy to TestFlight
        run: |
          cd ios
          fastlane ios beta
        env:
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD }}
          MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
```

**Step 2: Setup Fastlane for iOS**

```bash
cd ios
fastlane init
```

**File:** `ios/fastlane/Fastfile`

```ruby
default_platform(:ios)

platform :ios do
  lane :beta do
    setup_ci if is_ci

    match(
      type: 'appstore',
      readonly: true,
    )

    build_app(
      workspace: 'App/App.xcworkspace',
      scheme: 'App',
      configuration: 'Release',
      export_method: 'app-store',
      export_options: {
        provisioningProfileSpecifier: 'match AppStore io.diabetactic.app',
      },
    )

    upload_to_testflight(
      skip_waiting_for_build_processing: true,
    )
  end

  lane :release do
    setup_ci if is_ci

    build_app(
      workspace: 'App/App.xcworkspace',
      scheme: 'App',
      configuration: 'Release',
      export_method: 'app-store',
    )

    upload_to_app_store(
      release_status: 'ready_for_sale',
    )
  end
end
```

**Effort:** 8-12 hours
**Timeline:** Week 5-6
**Note:** Requires macOS runner (~3x cost of Linux)

---

## Phase 3: Progressive Delivery (Weeks 7-10)

### 3.1 Implement Feature Flags

**Option A: LaunchDarkly (Recommended for Enterprise)**

```bash
pnpm add launchdarkly-js-client-sdk
```

**Option B: Open Source Alternative (Flagr)**

```bash
# Self-hosted
docker run -d -p 18000:18000 checkr/flagr
```

**Implementation Example:**

**File:** `src/app/core/services/feature-flags.service.ts`

```typescript
import { Injectable } from '@angular/core';
import * as LDClient from 'launchdarkly-js-client-sdk';

@Injectable({
  providedIn: 'root',
})
export class FeatureFlagsService {
  private ldClient: LDClient.LDClient;

  constructor() {
    this.ldClient = LDClient.initialize('sdk-key-here', { key: 'user-id' }, { sendEvents: true });
  }

  async isFeatureEnabled(flag: string): Promise<boolean> {
    return await this.ldClient.waitUntilReady();
  }
}
```

**Usage in Component:**

```typescript
export class ReadingsComponent {
  showNewChart$ = this.flags.isFeatureEnabled('new-glucose-chart');

  constructor(private flags: FeatureFlagsService) {}
}
```

**In Template:**

```html
<div *ngIf="showNewChart$ | async; else oldChart">
  <!-- New chart implementation -->
</div>
<ng-template #oldChart>
  <!-- Old chart implementation -->
</ng-template>
```

**Effort:** 6-8 hours
**Timeline:** Week 7-8

---

### 3.2 Implement Canary Deployments

**Using Netlify Edge Functions:**

**File:** `netlify/edge-functions/canary.ts`

```typescript
import type { Context } from 'https://edge.netlify.com';

export default async (request: Request, context: Context) => {
  const canaryPercentage = 10; // 10% traffic to canary
  const random = Math.random() * 100;

  if (random < canaryPercentage) {
    // Route to canary version
    return context.next({ path: '/.netlify/canary' });
  } else {
    // Route to stable version
    return context.next();
  }
};
```

**Configuration:**

```toml
# netlify.toml
[[edge_functions]]
path = "/*"
function = "canary"
```

**Effort:** 4-6 hours
**Timeline:** Week 9-10

---

## Phase 4: Monitoring & Observability (Weeks 11-14)

### 4.1 Setup Prometheus Metrics

**Step 1: Add Metrics Dependencies**

```bash
pnpm add @prometheus/client
```

**Step 2: Create Metrics Service**

**File:** `src/app/core/services/metrics.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { Counter, Histogram, Gauge } from '@prometheus/client';

@Injectable({
  providedIn: 'root',
})
export class MetricsService {
  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency',
    labelNames: ['method', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  readonly glucoseCalculationDuration = new Histogram({
    name: 'glucose_calculation_seconds',
    help: 'Time to calculate glucose readings',
    buckets: [0.001, 0.01, 0.1, 1],
  });

  readonly dataSyncErrors = new Counter({
    name: 'data_sync_errors_total',
    help: 'Total data sync errors',
    labelNames: ['type'],
  });

  readonly activeUsers = new Gauge({
    name: 'active_users',
    help: 'Number of active users',
  });
}
```

**Step 3: Export Metrics Endpoint**

```typescript
// backend endpoint
GET /metrics
Returns: Prometheus-formatted metrics
```

**Effort:** 6-8 hours
**Timeline:** Week 11-12

---

### 4.2 Setup Grafana Dashboards

**Docker Compose Addition:**

```yaml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - '9090:9090'

grafana:
  image: grafana/grafana:latest
  environment:
    GF_SECURITY_ADMIN_PASSWORD: admin
  ports:
    - '3000:3000'
  depends_on:
    - prometheus
```

**Prometheus Configuration:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'diabetify'
    static_configs:
      - targets: ['localhost:4200/metrics']
```

**Dashboard Metrics:**

- Build success rate
- Test coverage trend
- Deployment frequency
- API latency
- Error rate
- User activity

**Effort:** 8-10 hours
**Timeline:** Week 12-13

---

### 4.3 Uptime Monitoring

**Using Uptime Kuma (Self-Hosted):**

```yaml
# docker-compose.yml addition
uptime-kuma:
  image: louislam/uptime-kuma:latest
  ports:
    - '3001:3001'
  volumes:
    - uptime-data:/app/data
```

**Monitors to Setup:**

1. Web app availability (Netlify)
2. API health endpoints
3. Database connectivity
4. GitHub Actions health

**Effort:** 3-4 hours
**Timeline:** Week 13-14

---

## Quick Start Commands

### Setup Local Environment

```bash
# Install dependencies
pnpm install

# Start development stack
docker compose up dev

# Run tests
docker compose run --rm test

# Run full CI pipeline
docker compose run --rm ci
```

### Generate Security Certificates

```bash
# Android keystore (one-time)
keytool -genkey -v \
  -keystore release.keystore \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias diabetify

# iOS certificates (via Apple Developer)
# Use Fastlane match for management
```

### Local Testing

```bash
# Test coverage locally
pnpm test:coverage

# E2E tests against mock
pnpm test:e2e

# E2E tests against Docker backend
docker compose -f docker/docker-compose.ci.yml up -d
pnpm test:e2e --grep "@docker"
docker compose -f docker/docker-compose.ci.yml down
```

---

## Troubleshooting

### Issue: Coverage threshold not enforced

**Solution:**

```bash
# Clear vitest cache
rm -rf .vitest

# Run tests with fresh cache
pnpm test:coverage
```

### Issue: Play Store deployment fails

**Solution:**

```bash
# Verify credentials
fastlane supply init

# Test locally first
cd android && fastlane android beta --dry_run
```

### Issue: Sentry not capturing errors

**Solution:**

```typescript
// Verify DSN is set
console.log(Sentry.getCurrentHub().getClient()?.getOptions().dsn);

// Manually capture test error
Sentry.captureException(new Error('Test error'));
```

### Issue: iOS tests fail on Linux CI

**Solution:**
Use macOS runner (self-hosted or GitHub's macos-latest)

---

## Success Criteria

### Phase 1 Completion

- [ ] Android secrets migrated to GitHub Secrets
- [ ] Coverage thresholds enforced
- [ ] Staging environment accessible
- [ ] Sentry events captured

### Phase 2 Completion

- [ ] Android Play Store beta deploys automatically
- [ ] iOS TestFlight deploys automatically
- [ ] Signed release APKs generated
- [ ] GitHub releases created

### Phase 3 Completion

- [ ] Feature flags operational
- [ ] Canary deployments working
- [ ] Rollback automated
- [ ] A/B testing framework ready

### Phase 4 Completion

- [ ] Prometheus metrics collected
- [ ] Grafana dashboards showing data
- [ ] Uptime monitoring active
- [ ] All KPIs tracked

---

## Cost Summary

| Service                       | Monthly Cost | Year 1           |
| ----------------------------- | ------------ | ---------------- |
| GitHub Actions (free tier)    | $0           | $0               |
| Netlify                       | $0-19        | $0-228           |
| Sentry Pro                    | $29          | $348             |
| Fastlane (free)               | $0           | $0               |
| Play Store (one-time)         | $25          | $25              |
| App Store (annual)            | $99          | $99              |
| macOS CI Runner (self-hosted) | $50-200      | $600-2,400       |
| **Total**                     | **$178-347** | **$1,300-3,100** |

---

## Next Steps

1. **This Week:** Fix credentials, implement coverage thresholds
2. **Next Week:** Deploy to staging, integrate Sentry
3. **Following 2 Weeks:** Play Store automation
4. **Following 2 Weeks:** iOS pipeline
5. **Months 2-3:** Progressive delivery & monitoring

**Questions?** Contact your DevOps lead

---

**Document Version:** 1.0
**Last Updated:** 2025-12-29
**Maintained By:** [Your Name]
