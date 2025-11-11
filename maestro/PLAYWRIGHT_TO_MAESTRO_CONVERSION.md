# Playwright to Maestro Test Conversion Guide

**Purpose:** Quick reference for converting Playwright test scenarios to Maestro flows

---

## Test Scenario Conversion Matrix

### 1. Load Dashboard and Navigate Between Tabs

#### Playwright Code
```typescript
await page.goto('/tabs/dashboard');
await expect(page).toHaveURL(/\/tabs\/dashboard$/);
const title = page.locator('ion-title');
await expect(title).toContainText(/dashboard/i);

await page.getByRole('tab', { name: /readings/i }).click();
await expect(page).toHaveURL(/\/tabs\/readings$/);

await page.getByRole('tab', { name: /profile/i }).click();
await expect(page).toHaveURL(/\/tabs\/profile$/);

await page.getByRole('tab', { name: /appointments/i }).click();
await expect(page).toHaveURL(/\/tabs\/appointments$/);
```

#### Maestro Flow Equivalent
```yaml
appId: com.diabetactic.app
---
- tapOn: "Dashboard"  # or navigate to dashboard tab
- assertVisible: "Dashboard"

- tapOn: "Readings"
- assertVisible: "Readings"

- tapOn: "Profile"
- assertVisible: "Profile"

- tapOn: "Appointments"
- assertVisible: "Appointments"
```

**Key Differences:**
- URL assertions become page content assertions
- Navigation relies on UI element visibility
- Use accessible text matching

---

### 2. Add Glucose Reading

#### Playwright Code
```typescript
await dashboard.addQuickReading(95, 'Fasting');
const lastReading = await dashboard.getStatValue('last-reading');
expect(lastReading).toContain('95');
```

#### Maestro Flow Equivalent
```yaml
- tapOn: "Add Reading"
- tapOn: "Glucose Input"
- inputText: "95"
- tapOn: "Notes Input"
- inputText: "Fasting"
- tapOn: "Save"
- assertVisible: "95"  # In stats or list
```

---

### 3. Fill Onboarding Form

#### Playwright Code
```typescript
await page.fill('[name="email"]', 'test@diabetactic.com');
await page.fill('[name="password"]', 'Test123!@#');
await page.fill('[name="firstName"]', 'John');
await page.selectOption('#diabetes-type', 'type1');
await page.getByRole('button', { name: 'Create Account' }).click();
```

#### Maestro Flow Equivalent
```yaml
- tapOn: "Email Input"
- inputText: "test@diabetactic.com"
- tapOn: "Password Input"
- inputText: "Test123!@#"
- tapOn: "First Name Input"
- inputText: "John"
- tapOn: "Diabetes Type Dropdown"
- tapOn: "Type 1"
- tapOn: "Create Account"
```

**Note:** Maestro doesn't have native dropdown selection - use sequential taps

---

### 4. Verify Real-Time Updates

#### Playwright Code
```typescript
const initialValue = await dashboard.getStatValue('last-reading');
await dashboard.addQuickReading(120, 'Test');
await expect(page.locator('[data-stat="last-reading"]')).toContainText('120');
```

#### Maestro Flow Equivalent
```yaml
- runScript: |
    initialValue = getValue('lastReading');
- tapOn: "Add Reading"
- inputText: "120"
- tapOn: "Save"
- assertVisible: "120"  # In last reading stat
```

---

### 5. Conditional Logic - Video Call if Available

#### Playwright Code
```typescript
const videoButton = page.locator('.video-call-button');
const isVideoAvailable = await videoButton.isVisible();

if (isVideoAvailable) {
  await page.getByRole('button', { name: /prepare for call/i }).click();
  // ... complete checklist
}
```

#### Maestro Flow Equivalent
```yaml
- tapOn: "Appointment Card"
- tapOn: "Join Video" # This will fail silently if not available
  optional: true
- runFlow: complete-video-checklist.yaml
  optional: true
```

**Or with conditional:**
```yaml
- runScript: |
    isVideoAvailable = isVisible('Join Video');
- conditional:
    - if: ${isVideoAvailable}
      then:
        - runFlow: complete-video-checklist.yaml
```

---

### 6. Appointment Form with Date Selection

#### Playwright Code
```typescript
const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);
await page.fill('#appointment-date', nextWeek.toISOString().slice(0, 10));
await page.locator('[data-time="10:00"]').click();
await page.getByRole('button', { name: /confirm/i }).click();
```

#### Maestro Flow Equivalent
```yaml
- tapOn: "Schedule Appointment"
- tapOn: "Date Input"
- inputText: "${nextWeekDate}"  # Pass via environment
- tapOn: "10:00 AM"
- tapOn: "Confirm"
- assertVisible: "Appointment scheduled"
```

**Note:** Use environment variables for dynamic dates

---

### 7. Settings Toggle and Persistence

#### Playwright Code
```typescript
await page.locator('#theme-toggle').click();
await expect(page.locator('body')).toHaveClass(/dark/);

// Verify persistence
const storedProfile = JSON.parse(localStorage.getItem('profile'));
expect(storedProfile.preferences.themeMode).toBe('dark');
```

#### Maestro Flow Equivalent
```yaml
- tapOn: "Theme Toggle"
- assertVisible: "Light" # or verify dark mode active
- runFlow: verify-theme-persistence.yaml
```

**Verify Persistence Flow:**
```yaml
# maestro/helpers/verify-theme-persistence.yaml
- runScript: |
    const profile = getStorageValue('diabetactic_user_profile');
    return profile.preferences.themeMode === 'dark';
- assertVisible: "dark-theme"  # CSS class or indicator
```

---

### 8. Multi-Step Form Validation

#### Playwright Code
```typescript
await page.fill('[name="email"]', 'test@diabetactic.com');
await page.fill('[name="password"]', 'Test123!@#');
await page.fill('[name="confirmPassword"]', 'Test123!@#');
await expect(page.locator('.error-message')).toHaveCount(0);
await page.getByRole('button', { name: 'Create Account' }).click();
```

#### Maestro Flow Equivalent
```yaml
- tapOn: "Email"
- inputText: "test@diabetactic.com"
- tapOn: "Password"
- inputText: "Test123!@#"
- tapOn: "Confirm Password"
- inputText: "Test123!@#"
- assertNotVisible: "Error"
- tapOn: "Create Account"
- assertVisible: "Profile Setup"
```

---

### 9. Data Entry Loop - Multiple Readings

#### Playwright Code
```typescript
const testReadings = [
  { value: 95, notes: 'Fasting', time: '08:00' },
  { value: 145, notes: 'After breakfast', time: '10:00' },
  { value: 110, notes: 'Before lunch', time: '12:00' }
];

for (const reading of testReadings) {
  await page.getByRole('button', { name: /add reading/i }).click();
  await page.fill('#glucose-value', reading.value.toString());
  await page.fill('#reading-notes', reading.notes);
  await page.getByRole('button', { name: /save/i }).click();
}
```

#### Maestro Flow Equivalent
```yaml
# maestro/tests/add-multiple-readings.yaml
appId: com.diabetactic.app
---
- runScript: |
    const readings = [
      { value: 95, notes: 'Fasting', time: '08:00' },
      { value: 145, notes: 'After breakfast', time: '10:00' },
      { value: 110, notes: 'Before lunch', time: '12:00' }
    ];
    for (const reading of readings) {
      // Cannot directly loop in Maestro
      // Use flow composition instead
    }

# Better approach - Call helper flow
- runFlow: add-single-reading.yaml
  params:
    value: 95
    notes: "Fasting"
- runFlow: add-single-reading.yaml
  params:
    value: 145
    notes: "After breakfast"
- runFlow: add-single-reading.yaml
  params:
    value: 110
    notes: "Before lunch"
```

**Helper Flow:**
```yaml
# maestro/helpers/add-single-reading.yaml
params:
  - name: value
  - name: notes
---
- tapOn: "Add Reading"
- tapOn: "Glucose Input"
- inputText: "${value}"
- tapOn: "Notes Input"
- inputText: "${notes}"
- tapOn: "Save"
- assertVisible: "${value}"
```

---

### 10. Async Operation - Wait for Sync

#### Playwright Code
```typescript
await dashboard.syncData();
await expect(page.locator('.sync-status')).toContainText(/syncing/i);
await expect(page.locator('.sync-status')).toContainText(/synced/i, {
  timeout: 10000
});
```

#### Maestro Flow Equivalent
```yaml
- tapOn: "Sync Button"
- assertVisible: "Syncing..."
- assertVisible: "Synced"  # Will wait up to default timeout
  timeout: 10000
```

---

## Assertion Mapping Quick Reference

| Playwright | Maestro | Notes |
|-----------|---------|-------|
| `expect(page).toHaveURL(/pattern/)` | Check page content/title | URL assertions not available |
| `expect(element).toBeVisible()` | `assertVisible: "text"` | Direct assertion |
| `expect(element).toContainText('text')` | `assertVisible: "text"` | Same effect |
| `expect(element).toHaveCount(n)` | Loop through or conditional | Less direct in Maestro |
| `expect(element).toHaveClass(/class/)` | `assertVisible` with visual check | CSS classes not directly accessible |
| `expect(element).toHaveValue('value')` | Implicit after inputText | Value set by action |
| `expect(element).not.toBeVisible()` | `assertNotVisible: "text"` | Negation available |

---

## Test Data Setup Patterns

### Playwright Profile Seeding
```typescript
await page.addInitScript(() => {
  localStorage.setItem('profile', JSON.stringify(profile));
  localStorage.setItem('schema_version', '1');
});
```

### Maestro Equivalent - Environment Variables
```yaml
# maestro/config/app-config.yaml
launchArguments:
  - name: TEST_MODE
    value: "true"
  - name: PROFILE_DATA
    value: '{"user":"test-user",...}'
```

**Or use app initialization flow:**
```yaml
# maestro/helpers/setup-test-profile.yaml
- runScript: |
    setStorage('profile', ${PROFILE_DATA});
    setStorage('schema_version', '1');
```

---

## Common Challenges & Solutions

### Challenge: File Downloads
**Playwright:** Handles natively with `waitForEvent('download')`  
**Maestro:** Not supported  
**Solution:** 
- Skip export tests in Maestro
- Or test export button visibility only
- Manual verification in CI pipeline

### Challenge: Network Mocking
**Playwright:** `page.route()` for request interception  
**Maestro:** Limited support  
**Solution:**
- Use server-side mocking (Mock adapter)
- Test error UI with real API failures
- Skip specific error injection tests

### Challenge: Console Errors
**Playwright:** Monitor with `page.on('console')`  
**Maestro:** No console access  
**Solution:** Skip console error tests in mobile
- Keep in Playwright for web testing
- Use app logging if available

### Challenge: Keyboard Navigation
**Playwright:** Full keyboard simulation with `keyboard.press()`  
**Maestro:** Basic support  
**Solution:**
- Test tab navigation selectively
- Verify focused element states
- Use accessibility identifiers

### Challenge: Performance Metrics
**Playwright:** `performance.memory`, long tasks  
**Maestro:** Very limited  
**Solution:**
- Skip performance tests in mobile Maestro
- Use manual performance monitoring
- Implement app-side performance logging

---

## Maestro Flow Template

```yaml
# maestro/tests/[scenario-name].yaml
# Purpose: [Describe what this flow tests]
# Equivalent Playwright: [Link to test file]

appId: com.diabetactic.app

---

# Setup
- launchApp

# Flow Name: [Step Description]
- tapOn: "Element Text"
- assertVisible: "Expected Content"

# Assertions
- assertNotVisible: "Error Message"

# Cleanup (if needed)
- pressBack
```

---

## Conversion Checklist

- [ ] Identify Playwright assertions
- [ ] Convert URL assertions to content assertions
- [ ] Replace selectors with visible text
- [ ] Convert loops to flow composition
- [ ] Add environment variables for dynamic data
- [ ] Create helper flows for common operations
- [ ] Test setup and teardown
- [ ] Verify conditional logic branches
- [ ] Add timeouts where needed
- [ ] Document test purpose and edge cases

---

## References

- **Maestro Documentation:** https://maestro.mobile.dev/
- **Playwright Tests:** `playwright/tests/`
- **Maestro Tests (to create):** `maestro/tests/`
- **Helper Flows:** `maestro/helpers/`
- **Claude-Flow Memory:** `mobile-testing` namespace

