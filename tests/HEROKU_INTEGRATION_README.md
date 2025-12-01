# Heroku Integration Tests

## Overview

The `playwright/tests/heroku-integration.spec.ts` file contains end-to-end tests that verify the Diabetify app works correctly with the real Heroku backend API Gateway.

**API Endpoint:** https://diabetactic-api-gateway-37949d6f182f.herokuapp.com

## Test Categories

### 1. API Gateway Health (Always Runs)

- Tests that the Heroku API Gateway is reachable
- Verifies health check endpoint returns valid response
- Validates response time is acceptable

**Tests:**

- ✅ API Gateway is reachable and returns 200
- ✅ API Gateway returns valid health response structure
- ✅ API Gateway responds within acceptable time

### 2. Authentication and Login

- Tests login functionality with real credentials
- Verifies token generation and format
- Tests invalid credential handling

**Tests:**

- ✅ Login with valid credentials returns auth token
- ✅ Login response contains user information
- ✅ Login with invalid credentials returns 401

**Requirements:**

- Set `E2E_TEST_USERNAME` environment variable
- Set `E2E_TEST_PASSWORD` environment variable

### 3. Authenticated API Endpoints

- Tests dashboard data fetching
- Tests readings data retrieval
- Tests appointments data retrieval
- Tests user profile endpoint
- Tests authorization validation

**Tests:**

- ✅ Get dashboard data with valid token
- ✅ Get readings data with valid token
- ✅ Get appointments data with valid token
- ✅ Get user profile with valid token
- ✅ Reject request without auth token with 401
- ✅ Reject request with invalid auth token with 401

**Requirements:**

- Set `E2E_TEST_USERNAME` and `E2E_TEST_PASSWORD` environment variables

### 4. End-to-End UI Flow with Heroku Backend

- Tests complete user journey through the UI
- Verifies dashboard loads with real data
- Tests readings page with Heroku data
- Tests appointments page with Heroku data
- Tests user profile with Heroku data

**Tests:**

- ✅ Dashboard loads real data after login with Heroku backend
- ✅ Readings page fetches real data from Heroku
- ✅ Appointments page loads with real Heroku data
- ✅ User profile displays data from Heroku

**Requirements:**

- Set `E2E_TEST_USERNAME` and `E2E_TEST_PASSWORD` environment variables

### 5. Error Handling and Edge Cases

- Tests concurrent request handling
- Tests timeout behavior
- Tests invalid endpoint handling

**Tests:**

- ✅ API Gateway handles concurrent requests gracefully
- ✅ API Gateway handles timeout gracefully
- ✅ Invalid endpoints return 404

## Running the Tests

### Skip All Heroku Tests (Default)

By default, Heroku integration tests are skipped. To run them, you must explicitly enable them.

### Run with Environment Variables

```bash
# Set credentials and enable Heroku tests
export E2E_TEST_USERNAME="your_test_username"
export E2E_TEST_PASSWORD="your_test_password"
export E2E_HEROKU_TESTS="true"

# Run all tests
npm run test

# Or run only Heroku integration tests
npx playwright test heroku-integration.spec.ts
```

### Run via npm script (Recommended)

```bash
# Set up environment and run
E2E_TEST_USERNAME=your_username E2E_TEST_PASSWORD=your_password E2E_HEROKU_TESTS=true npm run test
```

### Run Only Health Check Tests (No Credentials Required)

```bash
# This runs only the health check tests, no credentials needed
npx playwright test heroku-integration.spec.ts -g "API Gateway Health"
```

### Run Specific Test Groups

```bash
# Run only authentication tests
E2E_TEST_USERNAME=your_username E2E_TEST_PASSWORD=your_password E2E_HEROKU_TESTS=true npx playwright test heroku-integration.spec.ts -g "Authentication"

# Run only API endpoint tests
E2E_TEST_USERNAME=your_username E2E_TEST_PASSWORD=your_password E2E_HEROKU_TESTS=true npx playwright test heroku-integration.spec.ts -g "Authenticated API Endpoints"

# Run only UI flow tests
E2E_TEST_USERNAME=your_username E2E_TEST_PASSWORD=your_password E2E_HEROKU_TESTS=true npx playwright test heroku-integration.spec.ts -g "End-to-End UI Flow"

# Run only error handling tests
npx playwright test heroku-integration.spec.ts -g "Error Handling"
```

## Environment Variables

| Variable            | Required       | Description                     | Example                    |
| ------------------- | -------------- | ------------------------------- | -------------------------- |
| `E2E_HEROKU_TESTS`  | Yes            | Enable Heroku integration tests | `true`                     |
| `E2E_TEST_USERNAME` | For auth tests | Test account username           | `test_patient@example.com` |
| `E2E_TEST_PASSWORD` | For auth tests | Test account password           | `testpassword123`          |

## Test Execution Flow

### Without Credentials (Health Checks Only)

```
E2E_HEROKU_TESTS=true npx playwright test heroku-integration.spec.ts
├── API Gateway Health Tests ✅ (RUNS)
├── Authentication Tests ⏭️ (SKIPPED - no credentials)
├── Authenticated API Endpoints ⏭️ (SKIPPED - no credentials)
├── End-to-End UI Flow ⏭️ (SKIPPED - no credentials)
└── Error Handling Tests ✅ (RUNS)
```

### With Credentials (Full Test Suite)

```
E2E_HEROKU_TESTS=true E2E_TEST_USERNAME=xxx E2E_TEST_PASSWORD=xxx npx playwright test heroku-integration.spec.ts
├── API Gateway Health Tests ✅ (RUNS)
├── Authentication Tests ✅ (RUNS)
├── Authenticated API Endpoints ✅ (RUNS)
├── End-to-End UI Flow ✅ (RUNS)
└── Error Handling Tests ✅ (RUNS)
```

## Expected Outcomes

### API Gateway Health Tests

- Should complete in < 1 second
- All requests should return 200 OK
- Health endpoint should return `{"status":"ok"}`

### Authentication Tests

- Login should return valid JWT token
- Response should include user information
- Invalid credentials should return 401

### API Endpoint Tests

- All authenticated endpoints should return 200 with valid token
- All requests without token should return 401
- Requests with invalid token should return 401
- Data structures should match API schema

### UI Flow Tests

- Dashboard should load and display content
- Readings page should load and be interactive
- Appointments page should load and be interactive
- Profile page should load and display user information

### Error Handling Tests

- Concurrent requests should all succeed
- Timeouts should be handled gracefully
- Invalid endpoints should return 404

## Troubleshooting

### Tests Skip When Running

**Solution:** Ensure `E2E_HEROKU_TESTS=true` is set

### Authentication Tests Skip

**Solution:** Set both `E2E_TEST_USERNAME` and `E2E_TEST_PASSWORD`

### Tests Timeout

**Solution:** The Heroku app might be sleeping. Wake it up by visiting the URL in your browser first, or increase timeout values in the test file

### API Gateway Unreachable

**Solution:** Check your internet connection or verify the Heroku URL is correct

### Invalid Credentials Error

**Solution:** Verify the test account exists and credentials are correct

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Heroku Integration Tests
  env:
    E2E_HEROKU_TESTS: 'true'
    E2E_TEST_USERNAME: ${{ secrets.HEROKU_TEST_USERNAME }}
    E2E_TEST_PASSWORD: ${{ secrets.HEROKU_TEST_PASSWORD }}
  run: npm run test -- heroku-integration.spec.ts
```

### GitLab CI Example

```yaml
heroku_integration_tests:
  script:
    - export E2E_HEROKU_TESTS=true
    - export E2E_TEST_USERNAME=$HEROKU_TEST_USERNAME
    - export E2E_TEST_PASSWORD=$HEROKU_TEST_PASSWORD
    - npm run test -- heroku-integration.spec.ts
```

## File Structure

```
playwright/
├── tests/
│   ├── heroku-integration.spec.ts    ← Main test file (419 lines)
│   ├── e2e-flow.spec.ts
│   ├── appointment-full-flow.spec.ts
│   └── ... (other test files)
├── config/
├── snapshots/
└── screenshots/
```

## Related Documentation

- Playwright Testing Guide: https://playwright.dev/docs/intro
- Heroku API Gateway: https://diabetactic-api-gateway-37949d6f182f.herokuapp.com
- Diabetify Project: See parent CLAUDE.md for project guidelines
