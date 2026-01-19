# Visual Regression Baseline Checklist

Generated: 2026-01-19

## Screenshots Captured

### Main App Pages (Authenticated)

| Page         | Light                           | Dark                           | High Contrast                           |
| ------------ | ------------------------------- | ------------------------------ | --------------------------------------- |
| Dashboard    | dashboard-light-baseline.png    | dashboard-dark-baseline.png    | dashboard-high-contrast-baseline.png    |
| Readings     | readings-light-baseline.png     | readings-dark-baseline.png     | readings-high-contrast-baseline.png     |
| Appointments | appointments-light-baseline.png | appointments-dark-baseline.png | appointments-high-contrast-baseline.png |
| Profile      | profile-light-baseline.png      | profile-dark-baseline.png      | profile-high-contrast-baseline.png      |

### Secondary Pages (Authenticated)

| Page             | Light                               | Dark                               | High Contrast                               |
| ---------------- | ----------------------------------- | ---------------------------------- | ------------------------------------------- |
| Add Reading      | add-reading-light-baseline.png      | add-reading-dark-baseline.png      | add-reading-high-contrast-baseline.png      |
| Tips             | tips-light-baseline.png             | tips-dark-baseline.png             | tips-high-contrast-baseline.png             |
| Achievements     | achievements-light-baseline.png     | achievements-dark-baseline.png     | achievements-high-contrast-baseline.png     |
| Bolus Calculator | bolus-calculator-light-baseline.png | bolus-calculator-dark-baseline.png | bolus-calculator-high-contrast-baseline.png |

### Auth Pages (Unauthenticated)

| Page            | Light                              | Dark                              | High Contrast                              |
| --------------- | ---------------------------------- | --------------------------------- | ------------------------------------------ |
| Welcome         | welcome-light-baseline.png         | welcome-dark-baseline.png         | welcome-high-contrast-baseline.png         |
| Login           | login-light-baseline.png           | login-dark-baseline.png           | login-high-contrast-baseline.png           |
| Forgot Password | forgot-password-light-baseline.png | forgot-password-dark-baseline.png | forgot-password-high-contrast-baseline.png |

### Settings Modal

| Page     | Light | Dark                       | High Contrast |
| -------- | ----- | -------------------------- | ------------- |
| Settings | N/A   | settings-dark-baseline.png | N/A           |

## Notes

- **Total screenshots**: 37
- **Trends page**: Route `/trends` does not exist - screenshots show blank page
- **Reset Password**: Not captured (requires email token flow)
- **Settings modal**: Only dark mode captured during testing

## How to Use for Verification

After each CSS task:

1. Run the same screenshot capture sequence
2. Compare new screenshots against these baselines
3. Differences should be:
   - Zero (for refactoring tasks)
   - Intentional improvements (for enhancement tasks)

## Verification Command

```bash
# After changes, run same capture script and compare
# Visual diff tools: ImageMagick compare, pixelmatch, etc.
```
