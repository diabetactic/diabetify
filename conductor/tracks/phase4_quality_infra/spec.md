# Spec: Quality & Infrastructure

## Goal

Improve code health, testing reliability, and developer experience to ensure long-term maintainability.

## Core Initiatives

1.  **Refactoring**
    - Break down monolithic pages (`ProfilePage`, `ReadingsPage`) into smaller, testable components.
2.  **Testing Infrastructure**
    - Resolve flaky Integration Tests.
    - Stabilize Docker E2E environment (explicit cleanup, dependency management).
    - Introduce BDD/Gherkin test layer for readable specs.

3.  **Type Safety**
    - Eliminate `as any` type casts to improve compile-time safety.

## Success Metrics

- Integration tests pass 100% of the time in CI.
- Cyclomatic complexity reduced in refactored pages.
- `any` type usage reduced by >90%.
