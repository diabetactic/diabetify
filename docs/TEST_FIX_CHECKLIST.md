# Test Fix Implementation Checklist

**Quick action plan to fix 90-120 of 167 failing tests**

---

## Phase 1: Quick Wins (30 minutes) ⚡

### File 1: `src/app/core/services/api-gateway.service.ts`

- [ ] **Line 102** - Fix glucose cache key
  ```typescript
  // Find this:
  key: (params: any) => `glucose_${params.userId}_${params.startDate}_${params.endDate}`,

  // Replace with:
  key: (params: any) => `glucose_${params?.userId ?? 'user'}_${params?.startDate ?? ''}_${params?.endDate ?? ''}`,
  ```

- [ ] **Line 134** - Fix readings cache key
  ```typescript
  // Find this:
  key: (params: any) => `readings_${params.limit}_${params.offset}`,

  // Replace with:
  key: (params: any) => `readings_${params?.limit ?? 'all'}_${params?.offset ?? 0}`,
  ```

**Expected: 28-29 tests fixed** ✓

---

### File 2: `src/app/tests/helpers/dom-utils.ts`

- [ ] **Line 43-48** - Fix `getElementText()` function
  ```typescript
  // Find this:
  export function getElementText(element: DebugElement | HTMLElement): string {
    if (element instanceof DebugElement) {
      return element.nativeElement.textContent?.trim() || '';
    }
    return element.textContent?.trim() || '';
  }

  // Replace with:
  export function getElementText(element: DebugElement | HTMLElement | null): string {
    if (!element) return '';
    if (element instanceof DebugElement) {
      return element.nativeElement?.textContent?.trim() || '';
    }
    return element?.textContent?.trim() || '';
  }
  ```

- [ ] **Line 263-276** - Fix `isVisible()` function
  ```typescript
  // Find this:
  export function isVisible(element: DebugElement | HTMLElement): boolean {
    const el = element instanceof DebugElement ? element.nativeElement : element;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    // ... rest
  }

  // Replace with:
  export function isVisible(element: DebugElement | HTMLElement | null): boolean {
    if (!element) return false;
    const el = element instanceof DebugElement ? element.nativeElement : element;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    // ... rest
  }
  ```

**Expected: 8-11 tests fixed** ✓

---

### Checkpoint 1: Run Tests
```bash
npm run test:ci
```
**Expected result:** ~40 more tests passing (343 → 383)

---

## Phase 2: Ionic Mocks (15 minutes) 🔧

### File 3: Find AdvancedPage test file

- [ ] **Find the file:**
  ```bash
  find src -name "*advanced*.spec.ts" -o -name "*advanced*.page.spec.ts"
  ```

- [ ] **Locate TestBed configuration** (near line 1-50 of spec file)

- [ ] **Add Router mock to providers array:**
  ```typescript
  // Find the TestBed.configureTestingModule section
  // Add this import at top:
  import { Subject } from 'rxjs';

  // In providers array, add:
  {
    provide: Router,
    useValue: {
      events: new Subject(),
      url: '/',
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true))
    }
  }
  ```

**Expected: 4 tests fixed** ✓

---

### Checkpoint 2: Run Tests
```bash
npm run test:ci
```
**Expected result:** ~44 more tests passing (343 → 387)

---

## Phase 3: Dashboard DOM Tests (1-2 hours) 🏗️

### File 4: `src/app/tests/integration/components/dashboard-dom.spec.ts`

This requires systematic fixes. Apply this pattern to each failing test:

#### General Pattern to Apply:

```typescript
// BEFORE each test assertion:
it('should do something', async () => {
  // 1. Set up data
  component.someData = mockData;

  // 2. ADD THESE TWO LINES:
  fixture.detectChanges();
  await fixture.whenStable();

  // 3. Query elements with null check
  const element = fixture.nativeElement.querySelector('.some-selector');

  // 4. ADD NULL CHECK:
  if (!element) {
    fail('Element .some-selector not found');
    return;
  }

  // 5. Now safe to use element
  element.click();
  expect(element.textContent).toBe('...');
});
```

#### Specific Lines to Fix:

- [ ] **Line 271** - "should handle add reading button click"
  ```typescript
  // After setting up readings data:
  fixture.detectChanges();
  await fixture.whenStable();
  const addButton = fixture.nativeElement.querySelector('.add-reading-btn');
  if (!addButton) fail('Add button not found');
  ```

- [ ] **Line 299** - "should show and handle quick entry form"
  ```typescript
  fixture.detectChanges();
  await fixture.whenStable();
  const quickEntryForm = fixture.nativeElement.querySelector('.quick-entry-form');
  if (!quickEntryForm) fail('Quick entry form not found');
  ```

- [ ] **Line 358** - "should display upcoming appointments"
  ```typescript
  component.appointments = mockAppointments;
  fixture.detectChanges();
  await fixture.whenStable();
  const appointmentsList = fixture.nativeElement.querySelector('.appointments-list');
  if (!appointmentsList) fail('Appointments list not found');
  ```

- [ ] **Line 375** - "should show video call button"
  ```typescript
  fixture.detectChanges();
  await fixture.whenStable();
  const videoButton = fixture.nativeElement.querySelector('[data-testid="video-call-btn"]');
  if (!videoButton) fail('Video button not found');
  ```

- [ ] **Line 385** - "should handle appointment click navigation"
  ```typescript
  fixture.detectChanges();
  await fixture.whenStable();
  const appointmentCard = fixture.nativeElement.querySelector('.appointment-card');
  if (!appointmentCard) fail('Appointment card not found');
  ```

- [ ] **Line 424** - "should handle sync button click"
  ```typescript
  fixture.detectChanges();
  await fixture.whenStable();
  const syncButton = fixture.nativeElement.querySelector('[data-testid="sync-btn"]');
  if (!syncButton) fail('Sync button not found');
  ```

- [ ] **Line 527** - "should show retry button on error"
  ```typescript
  component.error = new Error('Test error');
  fixture.detectChanges();
  await fixture.whenStable();
  const retryButton = fixture.nativeElement.querySelector('.retry-btn');
  if (!retryButton) fail('Retry button not found');
  ```

- [ ] **Line 565** - "should animate stat card changes"
  ```typescript
  fixture.detectChanges();
  await fixture.whenStable();
  const statCard = fixture.nativeElement.querySelector('.stat-card');
  if (!statCard) fail('Stat card not found');
  expect(statCard.className).toContain('animated');
  ```

- [ ] **Line 667** - "should debounce rapid user interactions"
  ```typescript
  fixture.detectChanges();
  await fixture.whenStable();
  const interactiveButton = fixture.nativeElement.querySelector('.interactive-btn');
  if (!interactiveButton) fail('Interactive button not found');
  ```

#### Additional Checks for All Tests:

- [ ] **Add import** at top of file:
  ```typescript
  import { fakeAsync, tick, flush } from '@angular/core/testing';
  ```

- [ ] **Wrap async tests** where needed:
  ```typescript
  // Change from:
  it('should do something', () => { ... });

  // To:
  it('should do something', fakeAsync(() => {
    // ... test code ...
    fixture.detectChanges();
    tick(); // or flush() for all pending timers
  }));
  ```

**Expected: 40-50 tests fixed** ✓

---

### Checkpoint 3: Run Tests
```bash
npm run test:ci
```
**Expected result:** ~90 more tests passing (343 → 433)

---

## Phase 4: Cleanup (30 minutes) 🧹

### File 5: `src/app/core/services/external-services-manager.service.spec.ts`

- [ ] **Line 497 area** - Find test with "services" error
  ```bash
  grep -n "reading 'services'" src/app/core/services/external-services-manager.service.spec.ts
  ```

- [ ] **Find the beforeEach or test setup** before line 497

- [ ] **Add mock service configuration:**
  ```typescript
  // Look for where mockConfig or similar is defined
  // Add services property:
  const mockServiceConfig = {
    services: {
      APPOINTMENTS: { /* ... */ },
      LOCAL_AUTH: { /* ... */ },
      GLUCOSERVER: { /* ... */ }
    },
    // ... other config
  };
  ```

**Expected: 1 test fixed** ✓

---

### File 6: `src/app/tests/integration/components/stat-card-dom.spec.ts`

- [ ] **Apply same pattern as dashboard tests:**
  - Add `fixture.detectChanges()` before DOM queries
  - Add `await fixture.whenStable()` for async
  - Add null checks for all element queries
  - Use `fail()` with descriptive messages

- [ ] **Line 400 area** - Fix getBoundingClientRect error
  ```typescript
  fixture.detectChanges();
  await fixture.whenStable();
  const statCard = fixture.nativeElement.querySelector('.stat-card');
  if (!statCard) fail('Stat card not found');
  const rect = statCard.getBoundingClientRect();
  ```

**Expected: 5-8 tests fixed** ✓

---

### Final Checkpoint: Run Full Test Suite
```bash
npm run test:ci
npm run test:coverage
```

**Expected result:**
- Tests: 435-445 passing / 65-75 failing
- Success rate: 85-87%
- Coverage: 52-55%

---

## Verification Checklist

### After Each Phase:
- [ ] All changes saved
- [ ] Tests run successfully
- [ ] No new errors introduced
- [ ] Coverage not decreased

### After All Phases:
- [ ] Success rate ≥ 85%
- [ ] Coverage ≥ 50%
- [ ] No "Cannot read properties" errors in failed tests
- [ ] All modified files committed

---

## Rollback Plan

If tests get worse after a phase:

```bash
# View changes
git diff

# Undo specific file
git checkout -- src/path/to/file.ts

# Undo all changes
git reset --hard HEAD
```

---

## Files Summary

| Priority | File | Lines to Change | Tests Fixed |
|----------|------|-----------------|-------------|
| P1 | `api-gateway.service.ts` | 2 (102, 134) | 28-29 |
| P1 | `dom-utils.ts` | 2 functions | 8-11 |
| P2 | AdvancedPage spec | Providers | 4 |
| P3 | `dashboard-dom.spec.ts` | 9+ tests | 40-50 |
| P3 | `external-services-manager.spec.ts` | 1 (497 area) | 1 |
| P3 | `stat-card-dom.spec.ts` | 2-3 tests | 5-8 |

**Total:** 6 files, ~15-20 locations, 86-102 tests fixed

---

## Quick Commands

```bash
# Run specific test suite
npm test -- --include='**/api-gateway.service.spec.ts'
npm test -- --include='**/dashboard-dom.spec.ts'

# Run with coverage
npm run test:coverage

# Run all tests (CI mode)
npm run test:ci

# Find specific test file
find src -name "*advanced*.spec.ts"

# Search for error pattern
grep -r "Cannot read properties" /tmp/test-results.txt
```

---

**Start Time:** _________
**End Time:** _________
**Total Duration:** _________
**Tests Fixed:** _____ / 167

---

Generated: 2025-11-09
See also:
- Full analysis: `/docs/TEST_ERROR_ANALYSIS.md`
- Quick reference: `/docs/TEST_ERROR_QUICK_REFERENCE.md`
- Summary: `/docs/TEST_ERROR_SUMMARY.txt`
