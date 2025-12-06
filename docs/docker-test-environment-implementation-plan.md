# Docker Test Environment - Implementation Plan

**Project**: Diabetify Mobile App
**Created**: 2025-12-06
**Target Completion**: 6 weeks (1 developer, 52 hours total)

---

## Executive Summary

This document provides a step-by-step implementation plan for building a Docker-based test environment with deterministic seed data, test control APIs, and CI/CD integration.

**Goal**: Replace Heroku-dependent integration tests with local Docker backend that supports:

- Deterministic test data (reset on-demand)
- Parallel test execution (isolated databases)
- Fast startup (<30s)
- CI/CD integration (CircleCI)

---

## Implementation Phases

### Phase 1: Foundation (Week 1 - 8 hours)

**Deliverable**: Basic test environment with manual reset

#### Tasks

- [x] **1.1 Create docker-compose.test.yml** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/container-managing/docker-compose.test.yml`
  - Features: Ephemeral databases (tmpfs), health checks, test-specific env vars
  - Status: ✅ COMPLETED (2025-12-06)

- [ ] **1.2 Add seed script to Glucoserver** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/glucoserver/scripts/seed_test_data.py`
  - Content: 150 glucose readings for users 1000 and 1002
  - Requirements:
    - Idempotent (safe to run multiple times)
    - Deterministic (same data every time)
    - Fast (<2s execution)
  - Reference: See architecture doc Appendix B for data specification

- [ ] **1.3 Add seed script to Appointments** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/appointments/scripts/seed_test_data.py`
  - Content: 2 completed appointments for user 1000
  - Requirements: Same as 1.2

- [ ] **1.4 Update Docker commands to run seeds** (1 hour)
  - Modify `command:` in docker-compose.test.yml
  - Add conditional check: `if [ -f scripts/seed_test_data.py ]; then python scripts/seed_test_data.py; fi`
  - Ensure seeds run AFTER migrations

- [ ] **1.5 Test startup and verify seed data** (1 hour)
  - Start environment: `docker-compose -f docker-compose.test.yml up -d --wait`
  - Verify users exist: `docker exec -it users_db_test psql ...`
  - Verify glucose readings: Check glucoserver_db_test
  - Verify appointments: Check appointments_db_test
  - Measure startup time (target: <30s)

**Validation Criteria**:

- ✅ All 8 containers healthy within 30s
- ✅ 3 test users exist in users_db_test
- ✅ 150+ glucose readings in glucoserver_db_test
- ✅ 2 appointments in appointments_db_test
- ✅ All services accessible via Swagger UI (/docs endpoints)

**Deliverables**:

- `docker-compose.test.yml` (✅ completed)
- `glucoserver/scripts/seed_test_data.py`
- `appointments/scripts/seed_test_data.py`
- Updated Docker commands in docker-compose.test.yml

---

### Phase 2: Test Control APIs (Week 2 - 12 hours)

**Deliverable**: Test reset and health check endpoints

#### Tasks

- [ ] **2.1 Add /health endpoint to Glucoserver** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/glucoserver/app/routes/health_routes.py` (new file)
  - Response format: See architecture doc Appendix A
  - Include: DB status, migration status, reading count
  - Register route in main.py

- [ ] **2.2 Add /health endpoint to Login Service** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/login/app/routes/health_routes.py`
  - Include: DB status, migration status, user count

- [ ] **2.3 Add /health endpoint to Appointments** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/appointments/app/routes/health_routes.py`
  - Include: DB status, migration status, appointment count, queue status

- [ ] **2.4 Add /test/reset endpoint to all services** (3 hours)
  - Create `test_routes.py` in each service
  - Implement reset logic (delete data + re-run seed script)
  - Add environment guard: `if os.getenv("ENV") != "test": raise HTTPException(403)`
  - Reference: See architecture doc section 3 for implementation example

- [ ] **2.5 Add backoffice orchestration endpoints** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/api-gateway-backoffice/app/routes/test_routes.py`
  - Endpoints:
    - `POST /test/reset-all` - Reset all services
    - `GET /test/health-all` - Aggregated health check
  - Use httpx.AsyncClient to call individual service endpoints

- [ ] **2.6 Test reset functionality** (1 hour)
  - Start environment
  - Modify data (add glucose reading via API)
  - Call `POST /test/reset-all`
  - Verify data reverted to seed state
  - Measure reset time (target: <5s)

**Validation Criteria**:

- ✅ `GET /health` returns 200 on all services
- ✅ `GET /test/health-all` returns aggregated status
- ✅ `POST /test/reset` works on individual services
- ✅ `POST /test/reset-all` resets all services in <5s
- ✅ Test endpoints return 403 when ENV != test

**Deliverables**:

- Health endpoints on all 3 backend services
- Test control endpoints (reset, health)
- Backoffice orchestration endpoints

---

### Phase 3: Playwright Integration (Week 3 - 8 hours)

**Deliverable**: E2E tests running against local Docker

#### Tasks

- [ ] **3.1 Add ENV=local support to Playwright config** (1 hour)
  - Location: `/home/julito/TPP/diabetactic/diabetify/playwright.config.ts`
  - Add conditional baseURL: `process.env.ENV === 'local' ? 'http://localhost:8004' : herokuUrl`
  - Add environment check in webServer config

- [ ] **3.2 Create test helper utilities** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/diabetify/playwright/helpers/docker-test-helpers.ts`
  - Functions:
    - `resetAllServices()` - Call backoffice reset endpoint
    - `waitForHealthy()` - Poll health endpoint until ready
    - `getAdminToken()` - Authenticate as admin
  - Export as fixtures

- [ ] **3.3 Add global setup hook** (1 hour)
  - Location: `playwright/global-setup.ts`
  - Check if ENV=local
  - Wait for `http://localhost:8006/test/health-all`
  - Timeout after 60s with helpful error message

- [ ] **3.4 Migrate existing Heroku tests** (3 hours)
  - Copy `heroku-integration.spec.ts` → `local-integration.spec.ts`
  - Replace Heroku URLs with localhost
  - Use test control APIs for setup/teardown
  - Update test data expectations (seed data vs Heroku data)
  - Add `beforeAll` hook to reset services

- [ ] **3.5 Run tests and verify** (1 hour)
  - Start Docker: `docker-compose -f docker-compose.test.yml up -d --wait`
  - Run tests: `ENV=local npm run test:e2e`
  - Verify all tests pass
  - Check for flakiness (run 5 times)

**Validation Criteria**:

- ✅ Tests run successfully with `ENV=local`
- ✅ Tests pass consistently (5/5 runs)
- ✅ Test data resets between test files
- ✅ No test pollution (parallel execution works)

**Deliverables**:

- Updated `playwright.config.ts`
- Test helper utilities
- Global setup/teardown hooks
- Migrated test files for local backend

---

### Phase 4: Testcontainers (Week 4 - 12 hours)

**Deliverable**: Parallel test execution with isolated environments

#### Tasks

- [ ] **4.1 Install Testcontainers dependencies** (0.5 hours)

  ```bash
  cd /home/julito/TPP/diabetactic/diabetify
  npm install --save-dev testcontainers @testcontainers/compose
  ```

- [ ] **4.2 Create Testcontainers setup class** (4 hours)
  - Location: `/home/julito/TPP/diabetactic/diabetify/tests/setup/testcontainers-setup.ts`
  - Features:
    - Auto-start docker-compose.test.yml
    - Dynamic port allocation (avoid conflicts)
    - Unique TEST_RUN_ID per test run
    - Wait for health checks
    - Expose API URLs to tests
  - Reference: See architecture doc section 4 for implementation

- [ ] **4.3 Update Playwright config for Testcontainers** (2 hours)
  - Modify `playwright.config.ts`
  - Use Testcontainers in `globalSetup`
  - Pass dynamic URLs via environment variables
  - Add graceful shutdown in `globalTeardown`

- [ ] **4.4 Add multi-stage Dockerfiles** (3 hours)
  - Update Dockerfiles for all services
  - Add `FROM ... AS dependencies` stage
  - Add `FROM dependencies AS test` stage
  - Separate prod and test dependencies
  - Benefits: Faster CI builds (layer caching)

- [ ] **4.5 Test parallel execution** (2 hours)
  - Run tests with `--workers=4`
  - Verify no port conflicts
  - Verify isolated data (no cross-test pollution)
  - Measure performance improvement

- [ ] **4.6 Document usage** (0.5 hours)
  - Update quick start guide
  - Add troubleshooting section for Testcontainers
  - Document dynamic port allocation

**Validation Criteria**:

- ✅ Tests auto-start Docker (no manual `docker-compose up`)
- ✅ Parallel execution works (`--workers=4`)
- ✅ No port conflicts between test runs
- ✅ Faster CI builds with multi-stage Dockerfiles

**Deliverables**:

- Testcontainers setup class
- Updated Playwright config
- Multi-stage Dockerfiles
- Parallel execution documentation

---

### Phase 5: CI/CD Integration (Week 5 - 8 hours)

**Deliverable**: CircleCI running tests against Docker

#### Tasks

- [ ] **5.1 Create CircleCI job for integration tests** (2 hours)
  - Location: `/home/julito/TPP/diabetactic/diabetify/.circleci/config.yml`
  - Add `test-integration` job
  - Use `setup_remote_docker` with layer caching
  - Set `TEST_RUN_ID=$CIRCLE_BUILD_NUM`
  - Run `docker-compose -f docker-compose.test.yml up -d --wait`

- [ ] **5.2 Add health check wait step** (1 hour)
  - Use `timeout 60 bash -c` loop
  - Poll `http://localhost:8006/test/health-all`
  - Fail fast with helpful error if timeout

- [ ] **5.3 Run tests in CI** (1 hour)
  - Add step: `ENV=local npm run test:e2e`
  - Store test results: `store_test_results: path: playwright-report`
  - Store artifacts: Screenshots and videos on failure

- [ ] **5.4 Add cleanup step** (0.5 hours)
  - Use `when: always` to ensure cleanup
  - Run `docker-compose down -v`
  - Prevents resource leaks in CI

- [ ] **5.5 Optimize Docker layer caching** (2 hours)
  - Enable `docker_layer_caching: true` in CircleCI
  - Pre-build base images (optional)
  - Add cache key for npm dependencies
  - Measure build time improvement (target: 5min → 2min)

- [ ] **5.6 Add workflow integration** (1 hour)
  - Add `test-integration` to CI workflow
  - Run on `master` branch only (initially)
  - Add job to deployment pipeline (before deploy)

- [ ] **5.7 Test CI pipeline** (0.5 hours)
  - Push to master and verify job runs
  - Check test results in CircleCI UI
  - Verify artifacts uploaded
  - Check total pipeline time (target: <5min)

**Validation Criteria**:

- ✅ CircleCI job completes successfully
- ✅ Test results visible in CircleCI UI
- ✅ Total job time <5 minutes
- ✅ Layer caching reduces rebuild time by 50%+
- ✅ Artifacts (screenshots/videos) accessible

**Deliverables**:

- CircleCI job configuration
- Docker layer caching setup
- Test result reporting
- Artifact storage

---

### Phase 6: Documentation & Handoff (Week 6 - 4 hours)

**Deliverable**: Documentation and developer training

#### Tasks

- [ ] **6.1 Write developer quick start guide** (1 hour)
  - Location: `/home/julito/TPP/diabetactic/diabetify/docs/docker-test-environment-quickstart.md`
  - Status: ✅ COMPLETED (2025-12-06)
  - Content: How to start, verify, test, cleanup
  - Include common use cases and troubleshooting

- [ ] **6.2 Create troubleshooting runbook** (1 hour)
  - Document common errors and solutions
  - Add debugging commands
  - Include health check diagnostics
  - Add FAQ section

- [ ] **6.3 Write API endpoint reference** (1 hour)
  - Document all test control endpoints
  - Include request/response examples
  - Add authentication instructions
  - Create Postman collection (optional)

- [ ] **6.4 Conduct team training session** (1 hour)
  - Schedule 1-hour meeting with team
  - Demo test environment setup
  - Walk through test reset flow
  - Live coding: Add new test with Docker backend
  - Q&A and collect feedback

**Validation Criteria**:

- ✅ New developer can run tests in <15 minutes
- ✅ All common issues documented
- ✅ Team understands how to use test environment
- ✅ Feedback collected and incorporated

**Deliverables**:

- Quick start guide (✅ completed)
- Troubleshooting runbook
- API reference documentation
- Training session slides/recording

---

## Dependencies & Critical Path

### Critical Path (Sequential)

```
Phase 1 (Foundation)
  ↓
Phase 2 (Test Control APIs)
  ↓
Phase 3 (Playwright Integration)
  ↓
Phase 5 (CI/CD Integration)
  ↓
Phase 6 (Documentation)
```

**Phase 4 (Testcontainers) can run in parallel with Phase 3**.

### External Dependencies

- **Backend Team**: Review and approve test endpoint design (Phase 2)
- **DevOps Team**: CircleCI permissions and Docker layer caching setup (Phase 5)
- **QA Team**: Validate test data specification (Phase 1)
- **Product Team**: Approve seed data (user IDs, passwords)

---

## Risk Mitigation

### Risk: Docker startup timeout in CI

**Probability**: Medium
**Impact**: High (blocks CI pipeline)

**Mitigation**:

- Increase timeout to 3 minutes in CircleCI
- Add progress logging (echo statements in Docker commands)
- Pre-build base images to speed up builds
- Use tmpfs for databases (faster startup)

---

### Risk: Seed data drift from production

**Probability**: Medium
**Impact**: Medium (tests pass locally, fail in production)

**Mitigation**:

- Regular audits (monthly) to compare seed vs production data
- Document seed data specification in architecture doc
- Use production-like data ranges (glucose levels, timestamps)
- Sync with backoffice team on queue behavior

---

### Risk: tmpfs memory exhaustion

**Probability**: Low
**Impact**: Medium (containers OOM killed)

**Mitigation**:

- Monitor memory usage with `docker stats`
- Typical test DB: 50-100MB (well within limits)
- Fallback: Use regular volumes if tmpfs fails
- Document memory requirements in quick start guide

---

### Risk: Testcontainers flakiness

**Probability**: Medium
**Impact**: Medium (random test failures)

**Mitigation**:

- Use stable version (testcontainers@10.x)
- Add retry logic in global setup
- Increase health check timeouts
- Support both Testcontainers and manual docker-compose

---

## Success Metrics

### Performance Metrics

| Metric         | Target         | Measurement                                  |
| -------------- | -------------- | -------------------------------------------- |
| Startup time   | <30s           | Time from `docker-compose up` to all healthy |
| Reset time     | <5s            | Time for `POST /test/reset-all`              |
| CI build time  | <5min          | Total CircleCI job duration                  |
| Test execution | Same as Heroku | No regression in test speed                  |

### Reliability Metrics

| Metric                | Target | Measurement                        |
| --------------------- | ------ | ---------------------------------- |
| Test flakiness        | <1%    | Failure rate over 100 runs         |
| Health check accuracy | 100%   | Correlation with service readiness |
| Data determinism      | 100%   | Same data every run                |

### Developer Experience

| Metric                | Target | Measurement                |
| --------------------- | ------ | -------------------------- |
| Onboarding time       | <15min | Clone to running tests     |
| Feedback loop         | <2min  | Code change to test result |
| Documentation clarity | >90%   | Team survey rating         |

---

## Progress Tracking

### Phase 1: Foundation

- [x] Task 1.1: Create docker-compose.test.yml (✅ 2025-12-06)
- [ ] Task 1.2: Add seed script to Glucoserver
- [ ] Task 1.3: Add seed script to Appointments
- [ ] Task 1.4: Update Docker commands
- [ ] Task 1.5: Test and verify

**Progress**: 20% (1/5 tasks completed)

### Phase 2: Test Control APIs

- [ ] Task 2.1-2.6: All pending

**Progress**: 0%

### Phase 3: Playwright Integration

- [ ] Task 3.1-3.5: All pending

**Progress**: 0%

### Phase 4: Testcontainers

- [ ] Task 4.1-4.6: All pending

**Progress**: 0%

### Phase 5: CI/CD Integration

- [ ] Task 5.1-5.7: All pending

**Progress**: 0%

### Phase 6: Documentation

- [x] Task 6.1: Quick start guide (✅ 2025-12-06)
- [ ] Task 6.2-6.4: Pending

**Progress**: 25% (1/4 tasks completed)

**Overall Progress**: 10% (2/32 tasks completed)

---

## Next Steps (Immediate Actions)

### Week 1 Priorities

1. **Create Glucoserver seed script** (Task 1.2)
   - File: `/home/julito/TPP/diabetactic/glucoserver/scripts/seed_test_data.py`
   - 150 glucose readings for users 1000 and 1002
   - Reference architecture doc Appendix B for data spec

2. **Create Appointments seed script** (Task 1.3)
   - File: `/home/julito/TPP/diabetactic/appointments/scripts/seed_test_data.py`
   - 2 completed appointments for user 1000

3. **Update Docker commands** (Task 1.4)
   - Modify docker-compose.test.yml to run seed scripts

4. **Test and validate** (Task 1.5)
   - Verify startup time <30s
   - Confirm all seed data present

### Week 2 Priorities

5. **Add health endpoints** (Tasks 2.1-2.3)
6. **Add test reset endpoints** (Task 2.4)
7. **Add backoffice orchestration** (Task 2.5)

---

## Files Created

### Completed (2025-12-06)

1. ✅ `/home/julito/TPP/diabetactic/container-managing/docker-compose.test.yml`
   - 300+ lines, comprehensive test environment
   - Ephemeral databases (tmpfs)
   - Health checks on all services
   - Test-specific configurations

2. ✅ `/home/julito/TPP/diabetactic/diabetify/docs/architecture/docker-test-environment.md`
   - 1000+ lines, complete architecture design
   - Detailed implementation examples
   - Troubleshooting guide
   - References to industry best practices

3. ✅ `/home/julito/TPP/diabetactic/diabetify/docs/docker-test-environment-quickstart.md`
   - 600+ lines, developer-friendly guide
   - Common use cases
   - Troubleshooting section
   - API endpoint reference

4. ✅ `/home/julito/TPP/diabetactic/diabetify/docs/docker-test-environment-implementation-plan.md`
   - This file (current)
   - Step-by-step task breakdown
   - Progress tracking
   - Risk mitigation strategies

### To Be Created (Phases 1-6)

5. ⏳ `/home/julito/TPP/diabetactic/glucoserver/scripts/seed_test_data.py`
6. ⏳ `/home/julito/TPP/diabetactic/appointments/scripts/seed_test_data.py`
7. ⏳ `/home/julito/TPP/diabetactic/glucoserver/app/routes/health_routes.py`
8. ⏳ `/home/julito/TPP/diabetactic/login/app/routes/health_routes.py`
9. ⏳ `/home/julito/TPP/diabetactic/appointments/app/routes/health_routes.py`
10. ⏳ `/home/julito/TPP/diabetactic/glucoserver/app/routes/test_routes.py`
11. ⏳ `/home/julito/TPP/diabetactic/login/app/routes/test_routes.py`
12. ⏳ `/home/julito/TPP/diabetactic/appointments/app/routes/test_routes.py`
13. ⏳ `/home/julito/TPP/diabetactic/api-gateway-backoffice/app/routes/test_routes.py`
14. ⏳ `/home/julito/TPP/diabetactic/diabetify/playwright/helpers/docker-test-helpers.ts`
15. ⏳ `/home/julito/TPP/diabetactic/diabetify/tests/setup/testcontainers-setup.ts`

---

## Estimated Timeline

**Start Date**: 2025-12-06
**End Date**: 2026-01-17 (6 weeks)

| Week      | Phase   | Hours  | Key Deliverables                      |
| --------- | ------- | ------ | ------------------------------------- |
| 1         | Phase 1 | 8      | docker-compose.test.yml, seed scripts |
| 2         | Phase 2 | 12     | Health endpoints, test control APIs   |
| 3         | Phase 3 | 8      | Playwright integration, local tests   |
| 4         | Phase 4 | 12     | Testcontainers, parallel execution    |
| 5         | Phase 5 | 8      | CircleCI integration, layer caching   |
| 6         | Phase 6 | 4      | Documentation, training               |
| **Total** |         | **52** | Fully functional test environment     |

**Assumptions**:

- 1 developer working 8-10 hours/week
- Backend team reviews in <2 days
- No major blockers or scope changes

---

## Contact & Support

**Project Lead**: [TBD]
**Backend Team**: [TBD]
**DevOps Team**: [TBD]

**Questions?** Open an issue in the repository or ping in #diabetify-dev Slack channel.

---

## Appendix: Command Quick Reference

### Start Test Environment

```bash
cd /home/julito/TPP/diabetactic/container-managing
docker-compose -f docker-compose.test.yml up -d --wait
```

### Check Health

```bash
curl http://localhost:8006/test/health-all
```

### Reset All Data

```bash
curl -X POST http://localhost:8006/test/reset-all
```

### Run Tests

```bash
cd /home/julito/TPP/diabetactic/diabetify
ENV=local npm run test:e2e
```

### Cleanup

```bash
cd /home/julito/TPP/diabetactic/container-managing
docker-compose -f docker-compose.test.yml down
```

### View Logs

```bash
docker-compose -f docker-compose.test.yml logs -f [service_name]
```

---

**Document Version**: 1.0
**Last Updated**: 2025-12-06
**Next Review**: After Phase 1 completion
