# Playwright E2E Test Coverage Report

Generated: 2025-12-18

## Summary

| Category                | Tests (per viewport) | Total (desktop + mobile) | Status                       |
| ----------------------- | -------------------- | ------------------------ | ---------------------------- |
| **Actually Run (Mock)** | 33                   | 66                       | PASS                         |
| **Skipped - Heroku**    | 56                   | 112                      | Need `E2E_HEROKU_TESTS=true` |
| **Skipped - Docker**    | 15                   | 30                       | Need `E2E_DOCKER_TESTS=true` |
| **Skipped - Internal**  | ~120                 | ~240                     | `test.skip()` inside tests   |
| **Total Listed**        | 224                  | 448                      | -                            |

### Why So Many Internal Skips?

Several test files have `test.skip()` calls inside them:

- `keyboard-navigation.spec.ts`: 18 skips (incomplete/WIP tests)
- `readings-filtering.spec.ts`: 12 skips (conditional on test data)
- Various other files: conditional skips based on environment

## How to Run Each Mode

```bash
# Mock backend (default) - runs against ng serve with mock data
pnpm exec playwright test

# Docker backend - requires local Docker containers
E2E_DOCKER_TESTS=true pnpm exec playwright test

# Heroku backend - requires Heroku credentials
E2E_HEROKU_TESTS=true pnpm exec playwright test
```

---

## Mock Backend Tests (33 actually run, 153 listed)

These tests run against `ng serve` with mock/demo data. No external dependencies.

**Note:** Many listed tests have internal `test.skip()` and don't actually run.

| File                              | Tests | Description                                                                       |
| --------------------------------- | ----- | --------------------------------------------------------------------------------- |
| bolus-calculator.spec.ts          | 34    | Insulin calculator: navigation, calculations, validation, food picker, edge cases |
| visual-regression.spec.ts         | 15    | Responsive breakpoints, dark mode, page load performance                          |
| keyboard-navigation.spec.ts       | 15    | Tab navigation, Enter/Space activation, focus management, modal escape            |
| comprehensive-screenshots.spec.ts | 13    | All screens capture: dashboard, readings, appointments, profile, settings         |
| accessibility-audit.spec.ts       | 13    | WCAG compliance, color contrast, touch targets, labels                            |
| screen-navigation.spec.ts         | 12    | Navigate all 12 app screens (welcome, login, tabs, settings, details)             |
| readings-filtering.spec.ts        | 12    | Filter by status/date, search, combine filters, clear filters                     |
| reading-boundaries.spec.ts        | 11    | Glucose value validation (20-600 mg/dL), error recovery                           |
| offline-first.spec.ts             | 9     | Save offline, sync online, network detection, data integrity                      |
| logout.spec.ts                    | 7     | Session cleanup, protected routes, re-login flow                                  |
| appointment-state-machine.spec.ts | 7     | States: NONE, PENDING, ACCEPTED, CREATED, DENIED, BLOCKED                         |
| sync-proof-comprehensive.spec.ts  | 5     | Readings/appointments/profile sync proof with screenshots                         |
| error-handling.spec.ts            | 5     | Invalid login, form validation, empty states                                      |
| appointment-form.spec.ts          | 5     | Form completion flow through all states                                           |
| trends-page.spec.ts               | 4     | Trends page navigation, title, coming soon state                                  |
| profile-edit.spec.ts              | 4     | Display, edit, persistence after refresh                                          |
| settings-persistence.spec.ts      | 3     | Theme/language persistence across sessions                                        |
| appointment-full-flow.spec.ts     | 3     | Complete flow: request → accept → create, denied flow                             |
| test-tidepool-info.spec.ts        | 1     | Tidepool integration info button                                                  |
| settings-theme.spec.ts            | 1     | Theme toggle updates body classes                                                 |
| e2e-flow.spec.ts                  | 1     | Full user journey: login → dashboard → add reading → profile                      |

---

## Docker Backend Tests (15 tests)

Require `E2E_DOCKER_TESTS=true` and local Docker backend running.

| File                       | Tests | Description                                                                      |
| -------------------------- | ----- | -------------------------------------------------------------------------------- |
| docker-backend-e2e.spec.ts | 15    | Readings CRUD, appointments state machine, profile, achievements, data integrity |

---

## Heroku Backend Tests (56 tests)

Require `E2E_HEROKU_TESTS=true` and valid Heroku credentials.

| File                              | Tests | Description                                                                |
| --------------------------------- | ----- | -------------------------------------------------------------------------- |
| heroku-integration.spec.ts        | 14    | Auth tokens, API endpoints (readings/appointments/profile), error handling |
| reading-boundaries.spec.ts        | 11    | Glucose validation with real backend                                       |
| offline-first.spec.ts             | 9     | Offline/online sync with real backend                                      |
| appointment-state-machine.spec.ts | 7     | State machine with real backend                                            |
| heroku-readings-crud.spec.ts      | 5     | Create/list readings, sync after refresh, dashboard statistics             |
| heroku-profile-sync.spec.ts       | 5     | Profile load, persistence across sessions, logout/re-login                 |
| heroku-appointments-flow.spec.ts  | 5     | Load from Heroku, queue status, dashboard widget, navigation               |

---

## Detailed Test List by Category

### Mock Backend - All Tests

```
    accessibility-audit.spec.ts:112:7 › UI Quality Checks › Cards should have border-radius (no sharp corners)
    accessibility-audit.spec.ts:143:7 › UI Quality Checks › Buttons should have minimum touch target size (44x44)
    accessibility-audit.spec.ts:172:7 › UI Quality Checks › Text should not overlap background patterns
    accessibility-audit.spec.ts:190:7 › UI Quality Checks › Layout should not have horizontal overflow on mobile
    accessibility-audit.spec.ts:209:7 › Dark Mode Accessibility › Dark mode should maintain WCAG contrast standards
    accessibility-audit.spec.ts:29:9 › Accessibility Audit › Dashboard page should pass accessibility checks
    accessibility-audit.spec.ts:29:9 › Accessibility Audit › Login page should pass accessibility checks
    accessibility-audit.spec.ts:29:9 › Accessibility Audit › Profile page should pass accessibility checks
    accessibility-audit.spec.ts:29:9 › Accessibility Audit › Readings page should pass accessibility checks
    accessibility-audit.spec.ts:29:9 › Accessibility Audit › Settings page should pass accessibility checks
    accessibility-audit.spec.ts:29:9 › Accessibility Audit › Welcome page should pass accessibility checks
    accessibility-audit.spec.ts:61:7 › Accessibility Audit › Color contrast should meet WCAG AA standards
    accessibility-audit.spec.ts:84:7 › Accessibility Audit › Interactive elements should be properly labeled
    appointment-form.spec.ts:143:7 › Appointment Form Completion › state NONE: user can request appointment
    appointment-form.spec.ts:164:7 › Appointment Form Completion › state PENDING: user sees waiting message
    appointment-form.spec.ts:194:7 › Appointment Form Completion › state ACCEPTED: form filling flow (ACCEPTED → CREATED)
    appointment-form.spec.ts:404:7 › Appointment Form Completion › state DENIED: user can re-request
    appointment-form.spec.ts:454:7 › Appointment Form Completion › form validation: prevent submission with empty required fields
    appointment-full-flow.spec.ts:172:7 › Full Appointment Flow › appointment denied flow
    appointment-full-flow.spec.ts:236:7 › Full Appointment Flow › complete appointment flow: request → accept → create
    appointment-full-flow.spec.ts:529:7 › Full Appointment Flow › verify appointment detail and resolution display
    appointment-state-machine.spec.ts:126:7 › Appointment State Machine › PENDING state: should show waiting message
    appointment-state-machine.spec.ts:168:7 › Appointment State Machine › ACCEPTED state: should show form to complete appointment
    appointment-state-machine.spec.ts:211:7 › Appointment State Machine › CREATED state: should show appointment details
    appointment-state-machine.spec.ts:248:7 › Appointment State Machine › DENIED state: should show denial message and allow re-request
    appointment-state-machine.spec.ts:289:7 › Appointment State Machine › state transitions should update UI immediately
    appointment-state-machine.spec.ts:319:7 › Appointment State Machine › queue closed (BLOCKED): should show appropriate message
    appointment-state-machine.spec.ts:75:7 › Appointment State Machine › NONE state: should show "Request Appointment" button
    bolus-calculator.spec.ts:100:9 › Bolus Calculator › Basic Calculation › should calculate insulin dose with valid inputs
    bolus-calculator.spec.ts:132:9 › Bolus Calculator › Basic Calculation › should show calculation details in result
    bolus-calculator.spec.ts:164:9 › Bolus Calculator › Basic Calculation › should show warning banner in results
    bolus-calculator.spec.ts:185:9 › Bolus Calculator › Basic Calculation › should disable calculate button while calculating
    bolus-calculator.spec.ts:214:9 › Bolus Calculator › Form Validation › should show error for empty glucose field
    bolus-calculator.spec.ts:21:9 › Bolus Calculator › Navigation › should navigate to calculator from dashboard FAB button
    bolus-calculator.spec.ts:237:9 › Bolus Calculator › Form Validation › should show error for empty carbs field
    bolus-calculator.spec.ts:252:9 › Bolus Calculator › Form Validation › should show error for glucose below minimum (< 40)
    bolus-calculator.spec.ts:273:9 › Bolus Calculator › Form Validation › should show error for glucose above maximum (> 600)
    bolus-calculator.spec.ts:286:9 › Bolus Calculator › Form Validation › should show error for negative glucose value
    bolus-calculator.spec.ts:299:9 › Bolus Calculator › Form Validation › should show error for negative carbs value
    bolus-calculator.spec.ts:312:9 › Bolus Calculator › Form Validation › should show error for carbs above maximum (> 300)
    bolus-calculator.spec.ts:325:9 › Bolus Calculator › Form Validation › should accept valid boundary values
    bolus-calculator.spec.ts:356:9 › Bolus Calculator › Food Picker Integration › should open food picker modal
    bolus-calculator.spec.ts:371:9 › Bolus Calculator › Food Picker Integration › should close food picker without selecting
    bolus-calculator.spec.ts:402:9 › Bolus Calculator › Food Picker Integration › should populate carbs from food picker selection
    bolus-calculator.spec.ts:41:9 › Bolus Calculator › Navigation › should navigate to calculator from quick actions button
    bolus-calculator.spec.ts:442:9 › Bolus Calculator › Food Picker Integration › should show selected foods display
    bolus-calculator.spec.ts:480:9 › Bolus Calculator › Food Picker Integration › should clear selected foods
    bolus-calculator.spec.ts:522:9 › Bolus Calculator › Reset Calculator › should show reset button after calculation
    bolus-calculator.spec.ts:530:9 › Bolus Calculator › Reset Calculator › should clear form when reset is clicked
    bolus-calculator.spec.ts:553:9 › Bolus Calculator › Reset Calculator › should hide result card after reset
    bolus-calculator.spec.ts:569:9 › Bolus Calculator › Reset Calculator › should clear selected foods after reset
    bolus-calculator.spec.ts:57:9 › Bolus Calculator › Navigation › should show info banner explaining calculator purpose
    bolus-calculator.spec.ts:585:9 › Bolus Calculator › Reset Calculator › should allow new calculation after reset
    bolus-calculator.spec.ts:618:9 › Bolus Calculator › Edge Cases › should handle very low glucose (40 mg/dL)
    bolus-calculator.spec.ts:630:9 › Bolus Calculator › Edge Cases › should handle very high glucose (600 mg/dL)
    bolus-calculator.spec.ts:642:9 › Bolus Calculator › Edge Cases › should handle zero carbs
    bolus-calculator.spec.ts:654:9 › Bolus Calculator › Edge Cases › should handle decimal glucose values
    bolus-calculator.spec.ts:664:9 › Bolus Calculator › Edge Cases › should handle large carb values
    bolus-calculator.spec.ts:684:9 › Bolus Calculator › Accessibility › should have proper input labels
    bolus-calculator.spec.ts:694:9 › Bolus Calculator › Accessibility › should show error messages for screen readers
    bolus-calculator.spec.ts:712:9 › Bolus Calculator › Accessibility › should have proper button text or aria-labels
    bolus-calculator.spec.ts:72:9 › Bolus Calculator › Navigation › should navigate back to dashboard using back button
    comprehensive-screenshots.spec.ts:150:7 › Dashboard Screenshots › capture dashboard in all states
    comprehensive-screenshots.spec.ts:168:7 › Readings Flow - Complete Coverage › readings list - empty and with data
    comprehensive-screenshots.spec.ts:180:7 › Readings Flow - Complete Coverage › add reading flow with persistence verification
    comprehensive-screenshots.spec.ts:306:7 › Appointments Flow - Full State Machine › appointment states and transitions
    comprehensive-screenshots.spec.ts:383:7 › Profile Flow - Edit and Persistence › profile view and edit with persistence
    comprehensive-screenshots.spec.ts:448:7 › Settings - All Options › settings page complete
    comprehensive-screenshots.spec.ts:490:7 › Settings - All Options › advanced settings page
    comprehensive-screenshots.spec.ts:513:7 › Appointment Detail with Resolution › appointment detail and resolution with emergency flag
    comprehensive-screenshots.spec.ts:576:7 › Trends Page › trends and charts
    comprehensive-screenshots.spec.ts:610:7 › Bolus Calculator › bolus calculator flow
    comprehensive-screenshots.spec.ts:653:7 › Tips Page › tips and recommendations
    comprehensive-screenshots.spec.ts:676:7 › Welcome & Login Flow › welcome and login screens
    comprehensive-screenshots.spec.ts:712:7 › Backend API Verification › verify all data in backend
    e2e-flow.spec.ts:22:7 › Diabetactic E2E Flow › Full User Journey: Login -> Dashboard -> Add Reading -> Check Profile
    error-handling.spec.ts:117:7 › Error Handling › empty state displays when no data exists
    error-handling.spec.ts:14:7 › Error Handling › invalid login shows error message
    error-handling.spec.ts:151:7 › Error Handling › navigation errors are handled gracefully
    error-handling.spec.ts:33:7 › Error Handling › form validation shows errors for empty fields
    error-handling.spec.ts:73:7 › Error Handling › form validation shows errors for invalid glucose values
    keyboard-navigation.spec.ts:111:7 › Keyboard Navigation › should activate tab buttons with Enter key
    keyboard-navigation.spec.ts:132:7 › Keyboard Navigation › should activate tab buttons with Space key
    keyboard-navigation.spec.ts:156:8 › Keyboard Navigation › should show visible focus indicators on interactive elements
    keyboard-navigation.spec.ts:183:7 › Keyboard Navigation › should close modal with Escape key
    keyboard-navigation.spec.ts:221:8 › Keyboard Navigation › should navigate through form fields with Tab
    keyboard-navigation.spec.ts:271:7 › Keyboard Navigation › should submit form with Enter key when in text input
    keyboard-navigation.spec.ts:298:8 › Keyboard Navigation › should navigate through list items with arrow keys (if implemented)
    keyboard-navigation.spec.ts:343:7 › Keyboard Navigation › should activate buttons with Space key
    keyboard-navigation.spec.ts:376:8 › Keyboard Navigation › should trap focus inside modal when open
    keyboard-navigation.spec.ts:425:8 › Keyboard Navigation › should support skip navigation links (if implemented)
    keyboard-navigation.spec.ts:465:8 › Keyboard Navigation › should handle focus management when navigating between pages
    keyboard-navigation.spec.ts:486:8 › Keyboard Navigation › should allow keyboard users to access all interactive elements
    keyboard-navigation.spec.ts:49:8 › Keyboard Navigation › should navigate through tab buttons using Tab key
    keyboard-navigation.spec.ts:536:8 › Keyboard Navigation › should not trap focus when no modal is open
    keyboard-navigation.spec.ts:80:8 › Keyboard Navigation › should navigate backwards with Shift+Tab
    logout.spec.ts:102:7 › Logout Flow › cannot access protected routes after logout
    logout.spec.ts:133:7 › Logout Flow › session cleanup - verify auth state is cleared
    logout.spec.ts:162:7 › Logout Flow › can successfully re-login after logout
    logout.spec.ts:205:7 › Logout Flow › logout button is accessible and properly labeled
    logout.spec.ts:238:7 › Logout Flow › logout works from different tabs
    logout.spec.ts:264:7 › Logout Flow › multiple logouts in sequence
    logout.spec.ts:72:7 › Logout Flow › basic logout flow - login, navigate to profile, and logout
    offline-first.spec.ts:106:9 › Offline-First Functionality › Reading offline workflow › should show reading in list when offline
    offline-first.spec.ts:135:9 › Offline-First Functionality › Reading offline workflow › should sync when back online
    offline-first.spec.ts:194:9 › Offline-First Functionality › Reading offline workflow › should show unsynced indicator for offline readings
    offline-first.spec.ts:249:9 › Offline-First Functionality › Profile offline › should preserve preferences when offline
    offline-first.spec.ts:277:9 › Offline-First Functionality › Profile offline › should sync preferences when back online
    offline-first.spec.ts:305:9 › Offline-First Functionality › Network state detection › should detect offline state
    offline-first.spec.ts:332:9 › Offline-First Functionality › Network state detection › should detect online state after reconnection
    offline-first.spec.ts:370:9 › Offline-First Functionality › Data integrity › should not lose data during connection fluctuations
    offline-first.spec.ts:48:9 › Offline-First Functionality › Reading offline workflow › should save reading when offline
    profile-edit.spec.ts:117:7 › Profile Edit Flow › navigation to settings works
    profile-edit.spec.ts:37:7 › Profile Edit Flow › profile page displays user information
    profile-edit.spec.ts:51:7 › Profile Edit Flow › user can edit profile name
    profile-edit.spec.ts:84:7 › Profile Edit Flow › profile changes persist after page refresh
    reading-boundaries.spec.ts:108:9 › Glucose Reading Boundary Validation › mg/dL boundaries › should accept value 600 (maximum boundary)
    reading-boundaries.spec.ts:138:9 › Glucose Reading Boundary Validation › mg/dL boundaries › should reject value 601 (above max 600)
    reading-boundaries.spec.ts:163:9 › Glucose Reading Boundary Validation › mg/dL boundaries › should show validation error message for invalid values
    reading-boundaries.spec.ts:191:9 › Glucose Reading Boundary Validation › Form error recovery › should allow correction after validation error
    reading-boundaries.spec.ts:223:9 › Glucose Reading Boundary Validation › Form error recovery › should preserve valid fields on validation error
    reading-boundaries.spec.ts:258:9 › Glucose Reading Boundary Validation › Edge cases › should handle empty input
    reading-boundaries.spec.ts:280:9 › Glucose Reading Boundary Validation › Edge cases › should handle non-numeric input
    reading-boundaries.spec.ts:302:9 › Glucose Reading Boundary Validation › Edge cases › should handle decimal values appropriately
    reading-boundaries.spec.ts:333:9 › Glucose Reading Boundary Validation › Edge cases › should handle negative values
    reading-boundaries.spec.ts:53:9 › Glucose Reading Boundary Validation › mg/dL boundaries › should reject value 19 (below min 20)
    reading-boundaries.spec.ts:78:9 › Glucose Reading Boundary Validation › mg/dL boundaries › should accept value 20 (minimum boundary)
    readings-filtering.spec.ts:123:7 › Readings Filtering › should filter readings by date range - Last 24 hours
    readings-filtering.spec.ts:188:7 › Readings Filtering › should filter readings by date range - Last 7 days
    readings-filtering.spec.ts:229:7 › Readings Filtering › should filter readings by date range - Last 30 days
    readings-filtering.spec.ts:270:7 › Readings Filtering › should search readings by glucose value
    readings-filtering.spec.ts:301:7 › Readings Filtering › should search readings by notes
    readings-filtering.spec.ts:325:7 › Readings Filtering › should clear search when X button is clicked
    readings-filtering.spec.ts:351:7 › Readings Filtering › should combine multiple filters (status + date range)
    readings-filtering.spec.ts:36:7 › Readings Filtering › should display filter button with active filter count badge
    readings-filtering.spec.ts:404:7 › Readings Filtering › should clear all filters when "Clear" button is clicked
    readings-filtering.spec.ts:456:7 › Readings Filtering › should show empty state when no readings match filters
    readings-filtering.spec.ts:486:7 › Readings Filtering › should maintain filter state when navigating away and back
    readings-filtering.spec.ts:60:7 › Readings Filtering › should filter readings by status (normal, high, low)
    screen-navigation.spec.ts:118:7 › Screen Navigation Test - All 12 Screens › 3. Dashboard Tab
    screen-navigation.spec.ts:123:7 › Screen Navigation Test - All 12 Screens › 4. Readings Tab
    screen-navigation.spec.ts:128:7 › Screen Navigation Test - All 12 Screens › 5. Appointments Tab
    screen-navigation.spec.ts:133:7 › Screen Navigation Test - All 12 Screens › 6. Trends Tab
    screen-navigation.spec.ts:138:7 › Screen Navigation Test - All 12 Screens › 7. Profile Tab
    screen-navigation.spec.ts:143:7 › Screen Navigation Test - All 12 Screens › 8. Settings Page
    screen-navigation.spec.ts:167:7 › Screen Navigation Test - All 12 Screens › 9. Advanced Settings
    screen-navigation.spec.ts:188:7 › Screen Navigation Test - All 12 Screens › 10. Add Reading Page
    screen-navigation.spec.ts:209:7 › Screen Navigation Test - All 12 Screens › 11. Dashboard Detail
    screen-navigation.spec.ts:232:7 › Screen Navigation Test - All 12 Screens › 12. Appointment Detail
    screen-navigation.spec.ts:79:7 › Screen Navigation Test - All 12 Screens › 1. Welcome/Landing Page
    screen-navigation.spec.ts:84:7 › Screen Navigation Test - All 12 Screens › 2. Complete Onboarding - Click Get Started or Login
    settings-persistence.spec.ts:165:7 › Settings Persistence › settings page is accessible from profile
    settings-persistence.spec.ts:30:7 › Settings Persistence › theme setting persists after page refresh
    settings-persistence.spec.ts:92:7 › Settings Persistence › language setting persists after app restart
    settings-theme.spec.ts:21:7 › Profile Theme Preferences › changing the theme updates body classes and persists preference
    sync-proof-comprehensive.spec.ts:237:7 › Screenshot Capture - All Screens › capture all screens in light and dark themes
    sync-proof-comprehensive.spec.ts:314:7 › Readings Sync Flow Proof › add reading → sync → verify in backend → persist after restart
    sync-proof-comprehensive.spec.ts:538:7 › Appointments State Machine Proof › appointment state machine: NONE → PENDING → ACCEPTED → CREATED
    sync-proof-comprehensive.spec.ts:669:7 › Profile Sync Proof › profile edit → sync → persist after restart
    sync-proof-comprehensive.spec.ts:738:7 › Generate Sync Proof Documentation › generate SYNC_PROOF.md documentation
    test-tidepool-info.spec.ts:3:5 › click tidepool info button
    trends-page.spec.ts:24:7 › Trends Page - Coming Soon Placeholder › should navigate to trends page
    trends-page.spec.ts:38:7 › Trends Page - Coming Soon Placeholder › should display page title (Tendencias|Trends)
    trends-page.spec.ts:51:7 › Trends Page - Coming Soon Placeholder › should display "Coming Soon" message and icon
    trends-page.spec.ts:65:7 › Trends Page - Coming Soon Placeholder › should maintain responsiveness on mobile viewport
    visual-regression.spec.ts:107:9 › Visual Regression - Smoke Tests (No Screenshots) › Page Load Performance › page navigation does not cause console errors
    visual-regression.spec.ts:161:7 › Authenticated Pages (SKIPPED - Require Backend) › dashboard page loads
    visual-regression.spec.ts:165:7 › Authenticated Pages (SKIPPED - Require Backend) › readings page loads
    visual-regression.spec.ts:170:7 › Authenticated Pages (SKIPPED - Require Backend) › appointments page loads
    visual-regression.spec.ts:175:7 › Authenticated Pages (SKIPPED - Require Backend) › profile page loads
    visual-regression.spec.ts:20:9 › Visual Regression - Smoke Tests (No Screenshots) › Public Pages › welcome page loads correctly
    visual-regression.spec.ts:32:9 › Visual Regression - Smoke Tests (No Screenshots) › Public Pages › welcome page is accessible without login
    visual-regression.spec.ts:51:11 › Visual Regression - Smoke Tests (No Screenshots) › Responsive Breakpoints › welcome page renders at desktop (1280x800)
    visual-regression.spec.ts:51:11 › Visual Regression - Smoke Tests (No Screenshots) › Responsive Breakpoints › welcome page renders at mobile-lg (414x896)
    visual-regression.spec.ts:51:11 › Visual Regression - Smoke Tests (No Screenshots) › Responsive Breakpoints › welcome page renders at mobile-md (375x667)
    visual-regression.spec.ts:51:11 › Visual Regression - Smoke Tests (No Screenshots) › Responsive Breakpoints › welcome page renders at mobile-sm (320x568)
    visual-regression.spec.ts:51:11 › Visual Regression - Smoke Tests (No Screenshots) › Responsive Breakpoints › welcome page renders at tablet (768x1024)
    visual-regression.spec.ts:68:9 › Visual Regression - Smoke Tests (No Screenshots) › Dark Mode Support › welcome page loads with dark mode preference
    visual-regression.spec.ts:79:9 › Visual Regression - Smoke Tests (No Screenshots) › Dark Mode Support › app respects color scheme preference
    visual-regression.spec.ts:95:9 › Visual Regression - Smoke Tests (No Screenshots) › Page Load Performance › welcome page loads within reasonable time
```

### Docker Backend - All Tests

```
    docker-backend-e2e.spec.ts:100:7 › Docker Backend - Readings @docker @docker-readings › can add new reading with known value
    docker-backend-e2e.spec.ts:131:7 › Docker Backend - Readings @docker @docker-readings › can filter readings by date
    docker-backend-e2e.spec.ts:146:7 › Docker Backend - Readings @docker @docker-readings › can delete test-tagged reading
    docker-backend-e2e.spec.ts:181:7 › Docker Backend - Appointments @docker @docker-appointments › appointments page loads with clean state
    docker-backend-e2e.spec.ts:200:7 › Docker Backend - Appointments @docker @docker-appointments › can request new appointment (NONE → PENDING)
    docker-backend-e2e.spec.ts:215:7 › Docker Backend - Appointments @docker @docker-appointments › full appointment state machine via backoffice
    docker-backend-e2e.spec.ts:266:7 › Docker Backend - Profile @docker @docker-profile › displays user profile with seeded data
    docker-backend-e2e.spec.ts:277:7 › Docker Backend - Profile @docker @docker-profile › can edit profile name
    docker-backend-e2e.spec.ts:314:7 › Docker Backend - Achievements @docker @docker-achievements › displays streak card on dashboard
    docker-backend-e2e.spec.ts:335:7 › Docker Backend - Achievements @docker @docker-achievements › displays level badge
    docker-backend-e2e.spec.ts:353:7 › Docker Backend - Achievements @docker @docker-achievements › streak increases after adding reading
    docker-backend-e2e.spec.ts:389:7 › Docker Backend - Achievements @docker @docker-achievements › total readings count increases
    docker-backend-e2e.spec.ts:429:7 › Docker Backend - Data Integrity @docker › API returns consistent data after UI operations
    docker-backend-e2e.spec.ts:446:7 › Docker Backend - Data Integrity @docker › database state is isolated from Heroku
    docker-backend-e2e.spec.ts:88:7 › Docker Backend - Readings @docker @docker-readings › displays seeded test readings
```

### Heroku Backend - All Tests

```
    heroku-appointments-flow.spec.ts:116:7 › Heroku Appointments Flow › appointment data persists across page refresh
    heroku-appointments-flow.spec.ts:165:7 › Heroku Appointments Flow › appointments show in dashboard widget
    heroku-appointments-flow.spec.ts:196:7 › Heroku Appointments Flow › navigation between dashboard and appointments works
    heroku-appointments-flow.spec.ts:57:7 › Heroku Appointments Flow › appointments page loads from Heroku
    heroku-appointments-flow.spec.ts:85:7 › Heroku Appointments Flow › appointments display queue status
    heroku-integration.spec.ts:101:9 › Heroku Integration Tests › Authenticated API Endpoints › Get appointments data with valid token
    heroku-integration.spec.ts:123:9 › Heroku Integration Tests › Authenticated API Endpoints › Get user profile with valid token
    heroku-integration.spec.ts:139:9 › Heroku Integration Tests › Authenticated API Endpoints › Get appointment queue state with valid token
    heroku-integration.spec.ts:154:9 › Heroku Integration Tests › Authenticated API Endpoints › Reject request without auth token with 401
    heroku-integration.spec.ts:162:9 › Heroku Integration Tests › Authenticated API Endpoints › Reject request with invalid auth token with 401
    heroku-integration.spec.ts:16:9 › Heroku Integration Tests › Authentication and Login › Login with valid credentials returns auth token
    heroku-integration.spec.ts:201:9 › Heroku Integration Tests › End-to-End UI Flow with Heroku Backend › Dashboard loads real data after login with Heroku backend
    heroku-integration.spec.ts:242:9 › Heroku Integration Tests › End-to-End UI Flow with Heroku Backend › Readings page fetches real data from Heroku
    heroku-integration.spec.ts:282:9 › Heroku Integration Tests › End-to-End UI Flow with Heroku Backend › Appointments page loads with real Heroku data
    heroku-integration.spec.ts:325:9 › Heroku Integration Tests › End-to-End UI Flow with Heroku Backend › User profile displays data from Heroku
    heroku-integration.spec.ts:370:9 › Heroku Integration Tests › Error Handling and Edge Cases › Invalid endpoints return 404
    heroku-integration.spec.ts:378:9 › Heroku Integration Tests › Error Handling and Edge Cases › API Gateway handles timeout gracefully
    heroku-integration.spec.ts:38:9 › Heroku Integration Tests › Authentication and Login › Login with invalid credentials returns 401
    heroku-integration.spec.ts:79:9 › Heroku Integration Tests › Authenticated API Endpoints › Get readings data with valid token
    heroku-profile-sync.spec.ts:110:7 › Heroku Profile Sync › profile data persists across sessions
    heroku-profile-sync.spec.ts:177:7 › Heroku Profile Sync › logout works and requires re-login
    heroku-profile-sync.spec.ts:221:7 › Heroku Profile Sync › settings accessible from profile
    heroku-profile-sync.spec.ts:57:7 › Heroku Profile Sync › profile loads data from Heroku
    heroku-profile-sync.spec.ts:82:7 › Heroku Profile Sync › profile displays correct username
    heroku-readings-crud.spec.ts:171:7 › Heroku Readings CRUD › list readings from Heroku backend
    heroku-readings-crud.spec.ts:220:7 › Heroku Readings CRUD › readings sync with Heroku after refresh
    heroku-readings-crud.spec.ts:252:7 › Heroku Readings CRUD › readings display with correct format
    heroku-readings-crud.spec.ts:289:7 › Heroku Readings CRUD › dashboard shows readings statistics from Heroku
    heroku-readings-crud.spec.ts:95:7 › Heroku Readings CRUD › create reading with Heroku backend
```
