# Remediation Plan: Issue #3 - Visual Regression Tests Failing

## 1. Summary

**Severity**: **Medium**

The E2E test suite reports that a significant number of visual regression tests are failing. This means that the screenshots captured during the test run do not match the "golden" baseline images stored in the repository. While this can indicate an unintended UI change (a bug), it is more often caused by legitimate UI updates or environmental differences.

## 2. Root Cause Analysis

The most common reasons for visual regression failures are:
- **Legitimate UI Changes**: A developer intentionally updated a component's appearance (e.g., changed styling, text, or layout), and the baseline screenshots were not updated accordingly.
- **Environment Discrepancies**: Tests are run in an environment (OS, browser version, font rendering) that differs from the one where the baseline images were generated. This is common in CI/CD vs. local developer machines.
- **Dynamic Content**: The UI contains dynamic content (e.g., dates, times, randomly generated data) that was not properly mocked or hidden for the screenshot capture.
- **Rendering Flakiness**: Animations, transitions, or slow-loading assets (like images or fonts) can cause screenshots to be taken before the page is in a stable, fully rendered state.

## 3. Remediation Steps

### Step 1: Analyze the Failed Screenshots

First, review the visual diffs produced by Playwright to understand the nature of the changes.

**Actions**:
1.  **Locate the Test Report**: After running the E2E tests (`pnpm run test:e2e`), Playwright generates an HTML report. Open it to see the image comparisons.
    ```bash
    pnpm exec playwright show-report
    ```
2.  **Review the Diffs**: For each failed test, compare the "Actual", "Expected", and "Diff" images.
    -   Are the changes intentional style updates?
    -   Is it just a tiny pixel difference, suggesting anti-aliasing or font rendering issues?
    -   Is dynamic content (like a date) causing the failure?
    -   Is an animation caught mid-transition?

### Step 2: Stabilize the Tests (If Necessary)

If the failures are due to dynamic content or rendering flakiness, stabilize the tests before updating baselines.

**File to Edit**: The relevant `*.spec.ts` files in `playwright/tests/`.

**Actions**:
-   **Mask Dynamic Content**: Use CSS or scripts to hide or set a fixed value for dynamic elements before taking a screenshot.
    ```typescript
    // Example: Masking an element with a specific data-testid
    await page.evaluate(() => {
      const dynamicElement = document.querySelector('[data-testid="dynamic-date"]');
      if (dynamicElement) {
        dynamicElement.style.visibility = 'hidden';
      }
    });
    await expect(page).toHaveScreenshot();
    ```
-   **Wait for Stability**: Ensure the page is fully loaded and animations are complete. Add explicit waits for key elements to be visible and stable.
    ```typescript
    await expect(page.locator('.my-component')).toBeVisible();
    await page.waitForTimeout(500); // Use timeouts sparingly, prefer explicit waits
    await expect(page).toHaveScreenshot();
    ```

### Step 3: Update the Baseline Images

Once the tests are stable and the visual changes are confirmed to be intentional and correct, update the baseline images.

**Actions**:
1.  **Run the Update Command**: The project should have a dedicated script to update snapshots. Based on the documentation, this is likely:
    ```bash
    pnpm test:visual:mock:update
    ```
    This command will run the visual tests and automatically replace the old baseline images with the newly captured ones.
2.  **Verify the Command**: If the above command doesn't exist, you can use the Playwright CLI directly:
    ```bash
    pnpm exec playwright test --grep "@visual" --update-snapshots
    ```

### Step 4: Commit and Push the New Baselines

The updated baseline images are considered part of the project's source code and must be committed to version control.

**Actions**:
1.  **Create a new branch**:
    ```bash
    git checkout -b chore/update-visual-baselines
    ```
2.  **Review the changed files**: Use `git status` to see the list of modified PNG files in the `*-snapshots` directories.
3.  **Commit the changes**:
    ```bash
    git add playwright/tests/
    git commit -m "chore(visual-regression): update baseline screenshots"
    ```
4.  **Create a Pull Request**: Push the branch and create a PR. The PR description should explain *why* the baselines were updated (e.g., "Reflects new button styling from ticket XYZ").

## 4. Recommended Priority

**Medium**. While failing visual tests can block PRs, they are often not indicative of a critical bug. This should be addressed after the high-priority functional E2E test failures are fixed. Keeping the visual baselines up-to-date is important for maintaining UI consistency.
