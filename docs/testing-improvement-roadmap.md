# Diabetify Testing Improvement Roadmap

> Generated: 2025-12-06
> Based on: Hive-mind swarm analysis of Angular 20, Ionic 8, Playwright, TypeScript, Android, and testing best practices

## Executive Summary

| Metric             | Current        | Target     | Priority |
| ------------------ | -------------- | ---------- | -------- |
| Unit Test Coverage | 42% statements | 70%        | High     |
| Branch Coverage    | 29%            | 60%        | High     |
| E2E Tests Passing  | 70/182         | 150+       | Medium   |
| Untested Files     | 30             | 0 critical | Critical |
| Technical Debt     | 184 hours      | <50 hours  | High     |

---

## Phase 1: Critical Security Tests (Week 1) - 48 hours

### P0: Security-Critical Services (Must Test)

| File                       | Risk                           | Tests Needed              |
| -------------------------- | ------------------------------ | ------------------------- |
| `error-handler.service.ts` | PHI redaction, PII exposure    | 15 tests                  |
| `token-storage.service.ts` | Token security, XSS prevention | 12 tests                  |
| `local-auth.service.ts`    | PKCE flow, session management  | 8 tests (extend existing) |

### Implementation Checklist

- [ ] Create `error-handler.service.spec.ts` with PHI redaction verification
- [ ] Create `token-storage.service.spec.ts` with secure storage tests
- [ ] Add PKCE code verifier tests to `local-auth.service.spec.ts`
- [ ] Verify no sensitive data in error logs

---

## Phase 2: Core Business Logic (Week 2) - 72 hours

### P1: Business-Critical Services

| File                       | Importance                  | Tests Needed |
| -------------------------- | --------------------------- | ------------ |
| `food.service.ts`          | Carb calculations for bolus | 20 tests     |
| `bolus-calculator.page.ts` | Insulin dose calculations   | 25 tests     |
| `demo-data.service.ts`     | Mock data consistency       | 10 tests     |
| Translation services       | i18n integrity              | 15 tests     |

### Implementation Checklist

- [ ] Create `food.service.spec.ts` with edge cases
- [ ] Create `bolus-calculator.page.spec.ts` with form validation
- [ ] Create `demo-data.service.spec.ts` for data integrity
- [ ] Add i18n key validation tests

---

## Phase 3: Jest Performance Optimization (Week 2)

### Current Configuration Issues

```javascript
// jest.config.js - Current (slow)
maxWorkers: 2,
testEnvironment: 'jsdom',
```

### Recommended Optimizations

```javascript
// jest.config.js - Optimized (2-3x faster)
module.exports = {
  // Enable ESM mode for native ES modules (faster)
  extensionsToTreatAsEsm: ['.ts'],

  // Use SWC instead of ts-jest for 5x faster transpilation
  transform: {
    '^.+\\.(ts|js|html)$': [
      '@swc/jest',
      { jsc: { transform: { react: { runtime: 'automatic' } } } },
    ],
  },

  // Parallel execution with optimal workers
  maxWorkers: '50%', // Use 50% of CPU cores

  // Memory optimization
  workerIdleMemoryLimit: '512MB',

  // Caching for faster subsequent runs
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};
```

### Expected Improvement

- **Before**: ~45s for 1099 tests
- **After**: ~15-20s for 1099 tests (2-3x faster)

---

## Phase 4: Contract Testing (Week 3)

### Hybrid Approach: OpenAPI + Pact + MSW

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTRACT TESTING STACK                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   OpenAPI    │───▶│     Pact     │───▶│     MSW      │  │
│  │   Schemas    │    │  Contracts   │    │    Mocks     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│        │                    │                   │          │
│        ▼                    ▼                   ▼          │
│  Schema validation    Consumer-driven    Request mocking   │
│  Type generation      contract tests     for E2E tests     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Files

```
src/app/tests/
├── contracts/
│   ├── readings.pact.spec.ts      # Pact consumer tests
│   ├── appointments.pact.spec.ts
│   └── auth.pact.spec.ts
├── mocks/
│   ├── handlers/
│   │   ├── readings.handlers.ts   # MSW request handlers
│   │   ├── auth.handlers.ts
│   │   └── appointments.handlers.ts
│   └── browser.ts                 # MSW browser setup
└── schemas/
    └── openapi.yaml               # OpenAPI spec (copy from backend)
```

---

## Phase 5: Docker Test Environment (Week 3-4)

### Existing Infrastructure

The test environment is already configured in:

```
container-managing/docker-compose.test.yml
```

### Quick Start

```bash
# Start isolated test environment
cd ../container-managing
docker-compose -f docker-compose.test.yml up -d --wait

# Verify all services healthy
curl http://localhost:8004/docs  # API Gateway
curl http://localhost:8006/docs  # Backoffice API

# Run E2E tests against local backend
cd ../diabetify
ENV=local npm run test:e2e

# Cleanup (all data destroyed - tmpfs)
docker-compose -f docker-compose.test.yml down
```

### Port Mapping

| Service       | Port | Internal |
| ------------- | ---- | -------- |
| API Gateway   | 8004 | 8000     |
| Glucoserver   | 8002 | 8000     |
| Login Service | 8003 | 8000     |
| Appointments  | 8005 | 8000     |
| Backoffice    | 8006 | 8000     |

### Data Reset API (TODO)

Add to API Gateway for test cleanup:

```python
# app/routes/test.py
@router.post("/test/reset")
async def reset_test_data():
    """Reset all test data to initial seed state."""
    # Only enabled when ENV=test
    ...
```

---

## Phase 6: TypeScript Strict Mode (Week 4)

### Current Score: 7.5/10

### Improvements Needed

#### 1. Branded Types for Type-Safe IDs

```typescript
// src/app/core/types/branded.ts
declare const brand: unique symbol;

export type Brand<T, B> = T & { [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type ReadingId = Brand<string, 'ReadingId'>;
export type AppointmentId = Brand<string, 'AppointmentId'>;

// Factory functions
export const UserId = (id: string): UserId => id as UserId;
export const ReadingId = (id: string): ReadingId => id as ReadingId;
```

#### 2. Discriminated Unions for State Machines

```typescript
// src/app/core/types/appointment-state.ts
type AppointmentState =
  | { status: 'NONE' }
  | { status: 'PENDING'; requestedAt: Date }
  | { status: 'ACCEPTED'; acceptedAt: Date; doctorId: string }
  | { status: 'CREATED'; appointmentId: string; scheduledAt: Date }
  | { status: 'DENIED'; deniedAt: Date; reason?: string };

// Type-safe state transitions
function handleAppointmentState(state: AppointmentState): string {
  switch (state.status) {
    case 'NONE':
      return 'Request Appointment';
    case 'PENDING':
      return `Requested ${state.requestedAt}`;
    case 'ACCEPTED':
      return `Accepted by Dr. ${state.doctorId}`;
    case 'CREATED':
      return `Scheduled for ${state.scheduledAt}`;
    case 'DENIED':
      return `Denied: ${state.reason ?? 'No reason given'}`;
  }
}
```

#### 3. Additional tsconfig.json Flags

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## Phase 7: Playwright Optimization (Week 4-5)

### Current Issues

- 112 tests skipped
- 12 tests did not run
- No CircleCI sharding

### Improvements

#### 1. ARIA Snapshots (Playwright 1.49+)

```typescript
// accessibility-audit.spec.ts
test('dashboard accessibility tree', async ({ page }) => {
  await page.goto('/tabs/dashboard');
  await expect(page.locator('main')).toMatchAriaSnapshot(`
    - heading "Dashboard" [level=1]
    - region "Glucose Stats":
      - heading "Current Glucose" [level=2]
      - text: /\\d+ mg\\/dL/
  `);
});
```

#### 2. Route Mocking for Deterministic Tests

```typescript
// Use route() instead of real API calls
test.beforeEach(async ({ page }) => {
  await page.route('**/api/glucose/**', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ readings: mockReadings }),
    });
  });
});
```

#### 3. CircleCI Sharding (60% faster)

```yaml
# .circleci/config.yml
playwright-e2e:
  parallelism: 4 # 4 shards
  steps:
    - run: |
        npx playwright test \
          --shard=$((CIRCLE_NODE_INDEX + 1))/$CIRCLE_NODE_TOTAL
```

---

## Phase 8: Maestro Mobile Tests (Week 5)

### Current Status

- 14 tests defined
- Requires Android emulator
- Uses real Heroku backend

### Improvements Needed

#### 1. Add Network Failure Tests

```yaml
# maestro/tests/errors/01-network-error.yaml
appId: io.diabetactic.app
---
- launchApp:
    clearState: true
# Simulate offline mode
- runScript: adb shell svc wifi disable
- assertVisible: 'No connection|Sin conexión'
- runScript: adb shell svc wifi enable
```

#### 2. ProGuard Fixes for Release Builds

```gradle
// android/app/build.gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                          'proguard-rules.pro',
                          'proguard-capacitor.pro'
        }
    }
}
```

---

## Phase 9: Test Data Factories (Week 5-6)

### Fishery Pattern Implementation

```typescript
// src/app/tests/factories/index.ts
import { Factory } from 'fishery';
import { LocalGlucoseReading } from '../../core/models';

export const readingFactory = Factory.define<LocalGlucoseReading>(({ sequence, params }) => ({
  id: `local_${sequence}`,
  type: params.type ?? 'cbg',
  time: params.time ?? new Date().toISOString(),
  value: params.value ?? 100 + Math.random() * 100,
  units: params.units ?? 'mg/dL',
  synced: params.synced ?? false,
  notes: params.notes,
}));

// Usage
const readings = readingFactory.buildList(10, { type: 'smbg' });
const highReading = readingFactory.build({ value: 300 });
```

### Factory Organization

```
src/app/tests/factories/
├── index.ts              # Re-exports all factories
├── reading.factory.ts    # Glucose readings
├── appointment.factory.ts
├── profile.factory.ts
└── device.factory.ts
```

---

## Testing Pyramid

```
                    ┌─────────────┐
                    │   E2E (70)  │  Playwright + Maestro
                    │   Slow      │  Real user flows
                   ─┴─────────────┴─
                  ┌─────────────────┐
                  │ Integration (50)│  Docker backend
                  │   Medium        │  API contracts
                 ─┴─────────────────┴─
                ┌───────────────────────┐
                │    Unit (1099+)       │  Jest
                │    Fast               │  Pure functions
               ─┴───────────────────────┴─
```

### Ratio Target

- **Unit**: 70% of tests (fast, isolated)
- **Integration**: 20% of tests (service interactions)
- **E2E**: 10% of tests (critical user flows)

---

## Quick Wins (Can Do Now)

| Task                      | Impact              | Effort  |
| ------------------------- | ------------------- | ------- |
| Enable Jest caching       | 30% faster          | 5 min   |
| Add `--shard` to CircleCI | 60% faster E2E      | 15 min  |
| Run Docker test env       | Deterministic tests | 10 min  |
| Add branded types         | Type safety         | 2 hours |
| Enable route mocking      | Stable E2E          | 4 hours |

---

## Metrics to Track

| Metric          | Tool              | Target     |
| --------------- | ----------------- | ---------- |
| Coverage %      | Jest --coverage   | 70%        |
| E2E pass rate   | Playwright        | 95%        |
| Test duration   | CI timing         | <10 min    |
| Flaky test rate | CircleCI insights | <2%        |
| WCAG violations | axe-core          | 0 critical |

---

## Commands Reference

```bash
# Unit Tests
npm test                        # Run all 1099 tests
npm run test:coverage           # With coverage report
npm run test:watch              # TDD mode

# E2E Tests
npm run test:e2e                # Headless
npm run test:e2e:headed         # With browser
npm run test:a11y               # Accessibility audit

# Docker Test Environment
cd ../container-managing
docker-compose -f docker-compose.test.yml up -d --wait
docker-compose -f docker-compose.test.yml down

# Mobile
npm run mobile:run              # Build + install + logs
cd maestro && maestro test tests/

# Quality
npm run quality                 # Lint + test
npm run lint:fix                # Auto-fix issues
```

---

## Timeline Summary

| Week | Phase                   | Hours | Deliverable                        |
| ---- | ----------------------- | ----- | ---------------------------------- |
| 1    | P0 Security Tests       | 48    | error-handler, token-storage, PKCE |
| 2    | P1 Business Logic       | 72    | food, bolus, demo-data, i18n       |
| 2    | Jest Optimization       | 8     | 2-3x faster tests                  |
| 3    | Contract Testing        | 24    | Pact + MSW setup                   |
| 3-4  | Docker Integration      | 16    | Data reset API                     |
| 4    | TypeScript Strict       | 16    | Branded types, unions              |
| 4-5  | Playwright Optimization | 16    | Sharding, route mocking            |
| 5    | Maestro Enhancement     | 8     | Network failure tests              |
| 5-6  | Test Factories          | 12    | Fishery migration                  |

**Total: ~220 hours over 6 weeks**

---

## Next Actions

1. **Immediate**: Run `docker-compose -f docker-compose.test.yml up -d` to verify test environment
2. **This week**: Create `error-handler.service.spec.ts` (P0 security)
3. **This sprint**: Add Jest caching and CircleCI sharding
4. **This month**: Implement contract testing with Pact + MSW
