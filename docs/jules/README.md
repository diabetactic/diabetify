# Remediation Plan Summary & Priorities

This directory contains a full analysis of the open pull requests and technical issues identified in the repository. Each issue and PR has a detailed markdown file with a remediation plan.

## 1. Recommended Sequence of Work

The following is the recommended order for addressing the open items. The priorities are based on a "worst-first" approach, focusing on fixing functional bugs and unblocking CI/CD before tackling technical debt and performance optimizations.

| Priority | Item                            | Type    | Severity | Status      | Details                     |
| :------: | ------------------------------- | ------- | :------: | ----------- | --------------------------- |
| **1**    | **Fix E2E Validation Tests**    | Issue   | **High** | 🔴 **To Do**  | [./issue-2.md](./issue-2.md)  |
| **2**    | **Land PR #103**                | PR      | **High** | 🟡 **Blocked** | [./pr-103.md](./pr-103.md)    |
| **3**    | **Fix Bundle Size**             | Issue   | **High** | 🔴 **To Do**  | [./issue-1.md](./issue-1.md)  |
| **4**    | **Update Visual Baselines**     | Issue   | **Medium** | 🔴 **To Do**  | [./issue-3.md](./issue-3.md)  |
| **5**    | **Address Skipped Tests**       | Issue   | **Medium** | 🔴 **To Do**  | [./issue-4.md](./issue-4.md)  |
| **6**    | **Add Profile Unit Tests**      | Issue   | **Medium** | 🔴 **To Do**  | [./issue-5.md](./issue-5.md)  |
| **7**    | **Fix CSS Import Order**        | Issue   | **Low**  | 🔴 **To Do**  | [./issue-7.md](./issue-7.md)  |
| **8**    | **Refactor Large SCSS Files**   | Issue   | **Low**  | 🔴 **To Do**  | [./issue-6.md](./issue-6.md)  |
| **9**    | **Remove `hammerjs`**           | Issue   | **Low**  | 🔴 **To Do**  | [./issue-8.md](./issue-8.md)  |
| **10**   | **Improve Type Coverage**       | Issue   | **Low**  | 🔴 **To Do**  | [./issue-9.md](./issue-9.md)  |

---

## 2. Justification for Priorities

### Tier 1: Unblock CI and Fix Bugs (Priority 1-3)

1.  **Fix E2E Validation Tests (Issue #2)**: This is the highest priority. Functional tests are failing, which indicates a potential user-facing bug and blocks all other PRs from being safely merged. The CI pipeline must be green before anything else.
2.  **Land PR #103**: Once the E2E tests are fixed, this PR should be merged quickly. Its 71% E2E test suite optimization will immediately accelerate all future CI runs, providing a massive benefit to developer workflow. The remediation plan for this PR is contingent on fixing the E2E tests.
3.  **Fix Bundle Size (Issue #1)**: This is the second high-severity issue. An 83% budget overrun directly impacts user experience and is considered a significant production issue. This should be addressed as soon as the CI pipeline is stable.

### Tier 2: Stabilize Testing and Address Tech Debt (Priority 4-6)

4.  **Update Visual Baselines (Issue #3)**: With the functional tests fixed, the next step is to get the visual tests passing. This completes the work of making the CI pipeline reliably green.
5.  **Address Skipped Tests (Issue #4)**: A large number of skipped tests represents a significant blind spot. Re-enabling these tests is crucial for ensuring long-term code quality and preventing regressions.
6.  **Add Profile Unit Tests (Issue #5)**: Adding unit tests to uncovered areas of the codebase is an important technical debt item that will improve maintainability.

### Tier 3: Code Quality and Optimization (Priority 7-10)

These are "low-priority" issues that do not impact functionality but are important for long-term code health. They can be worked on opportunistically or during dedicated refactoring sprints.

7.  **Fix CSS Import Order (Issue #7)**: A quick and easy fix that cleans up build warnings.
8.  **Refactor Large SCSS Files (Issue #6)**: Improves CSS architecture and maintainability.
9.  **Remove `hammerjs` (Issue #8)**: A good optimization that will slightly reduce bundle size and improve build performance.
10. **Improve Type Coverage (Issue #9)**: A valuable but non-urgent task to further enhance code quality.

---

## 3. Pull Request Status

| PR # | Title                              | Status                                      | Remediation Plan               |
| :--- | :--------------------------------- | :------------------------------------------ | :----------------------------- |
| 103  | Optimize Playwright test suite     | 🟡 **Blocked** (by failing E2E tests)         | [./pr-103.md](./pr-103.md)     |

## 4. Issue Status

| ID | Title                         | Severity   | Status     | Remediation Plan               |
| :- | :---------------------------- | :--------- | :--------- | :----------------------------- |
| 1  | Bundle Size Exceeded          | **High**   | 🔴 **To Do** | [./issue-1.md](./issue-1.md)   |
| 2  | E2E Form Validation Failing   | **High**   | 🔴 **To Do** | [./issue-2.md](./issue-2.md)   |
| 3  | Visual Regression Failing     | **Medium** | 🔴 **To Do** | [./issue-3.md](./issue-3.md)   |
| 4  | 61 Skipped Tests              | **Medium** | 🔴 **To Do** | [./issue-4.md](./issue-4.md)   |
| 5  | 0% Unit Test Coverage         | **Medium** | 🔴 **To Do** | [./issue-5.md](./issue-5.md)   |
| 6  | Large SCSS Files              | **Low**    | 🔴 **To Do** | [./issue-6.md](./issue-6.md)   |
| 7  | CSS Import Order              | **Low**    | 🔴 **To Do** | [./issue-7.md](./issue-7.md)   |
| 8  | CommonJS Dependency (hammerjs)| **Low**    | 🔴 **To Do** | [./issue-8.md](./issue-8.md)   |
| 9  | Improve Type Coverage         | **Low**    | 🔴 **To Do** | [./issue-9.md](./issue-9.md)   |
