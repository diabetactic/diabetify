# Remediation Plan: Issue #4 - 61 Skipped Tests in Unit/Integration Suite

## 1. Summary

**Severity**: **Medium**

The test report indicates that 61 tests are being skipped across 3 test files and various individual test cases. Skipped tests represent a gap in test coverage and can hide latent bugs or regressions. The reasons for skipping these tests are currently documented as "complex timing-based tests" and "race condition edge cases."

**Skipped Files**:
1.  `session-timeout-transactions.integration.spec.ts` (17 tests)
2.  `concurrent-sync-conflicts.integration.spec.ts` (7 tests)
3.  `token-refresh-during-operations.integration.spec.ts` (12 tests)
4.  Individual tests (25 tests)

## 2. Root Cause Analysis

Tests are typically skipped for a few common reasons:
-   **Test Flakiness**: The tests are inherently unstable and produce inconsistent results (pass/fail) between runs, often due to race conditions, timing issues, or environmental dependencies.
-   **Work-in-Progress**: The feature or test was under development and was temporarily disabled to allow other tests to pass in CI.
-   **Environmental Constraints**: The tests require a specific setup (e.g., a database, a specific OS, or mocked server state) that is difficult to configure, especially in a CI environment.
-   **Obsolescence**: The feature being tested has been deprecated or changed, and the tests were skipped instead of being updated or removed.

## 3. Remediation Steps

The goal is to re-enable as many of the skipped tests as possible to increase coverage and confidence in the application's stability.

### Step 1: Triage the Skipped Tests

First, categorize the skipped tests to determine the best course of action for each.

**Actions**:
1.  **Review Skipped Test Descriptions**: Examine the `describe` and `it` blocks of the skipped tests (using `it.skip` or `describe.skip`). Understand what functionality each test was intended to cover.
2.  **Categorize**: Group the tests by reason for being skipped. For example:
    -   **Timing-Dependent**: Tests involving `setTimeout`, `setInterval`, or complex asynchronous operations.
    -   **Concurrency/Race Conditions**: Tests for data sync conflicts.
    -   **Token Refresh**: Tests related to auth session management.
    -   **Others**: Individually skipped tests.

### Step 2: Fix and Re-enable Timing-Dependent Tests

Tests involving timing can be stabilized using modern testing utilities.

**File to Edit**: `session-timeout-transactions.integration.spec.ts`

**Actions**:
1.  **Use Fake Timers**: Vitest (and Jest) provides fake timers that allow you to control the passage of time within a test, making them deterministic.
    ```typescript
    // At the top of your test file
    vi.useFakeTimers();

    it('should log the user out after 30 minutes of inactivity', () => {
      // ... simulate user activity
      // Fast-forward time by 30 minutes
      vi.advanceTimeBy(30 * 60 * 1000);
      // ... assert that the user was logged out
    });
    ```
2.  **Replace `setTimeout` with `waitFor`**: In integration tests, instead of waiting for a fixed time, wait for a specific condition or DOM element to appear.
3.  **Unskip and Verify**: Remove the `.skip` from the `describe` or `it` block and run the tests to confirm they now pass reliably.

### Step 3: Address Concurrency and Race Condition Tests

These tests are critical for an offline-first application.

**File to Edit**: `concurrent-sync-conflicts.integration.spec.ts`

**Actions**:
1.  **Isolate Test State**: Ensure that each test runs with a completely isolated and clean state. Use `beforeEach` and `afterEach` hooks to reset databases, clear mocks, and restore timers.
2.  **Control Asynchronous Operations**: Use controlled promises or mock server responses to orchestrate the exact sequence of events needed to trigger a race condition, rather than relying on real-world timing.
3.  **Mock WebSockets/Push Events**: If the sync is triggered by external events, mock these events to fire at precise moments during the test.
4.  **Unskip and Verify**: Remove the `.skip` and run the test file multiple times to ensure it is no longer flaky.

### Step 4: Systematically Address Remaining Skips

Go through the remaining skipped tests one by one.

**Actions**:
1.  **Unskip a single test**.
2.  **Run it and see why it fails**.
3.  **Apply the appropriate fix**:
    -   Update outdated logic or selectors.
    -   Add necessary mocks.
    -   If the feature is obsolete, **delete the test**. Do not leave obsolete tests skipped.
4.  **Repeat** for all 25 individually skipped tests.

### Step 5: Document Necessary Skips

If a test absolutely cannot be fixed or is not relevant at this time (e.g., depends on a future feature), it can remain skipped. However, it **must be documented**.

**Actions**:
1.  **Add a comment**: Leave a clear comment next to the `it.skip` explaining *why* it is skipped and what is required to re-enable it.
    ```typescript
    it.skip('should do X because...', () => {
      // TODO: Unskip this test once the new API (TICKET-123) is deployed.
    });
    ```

## 4. Recommended Priority

**Medium**. While not as critical as failing tests, a large number of skipped tests indicates a blind spot in the project's quality assurance. This should be addressed after the high-priority issues. Tackling this will improve long-term maintainability and reduce the risk of regressions.
