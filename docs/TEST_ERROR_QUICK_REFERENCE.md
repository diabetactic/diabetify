# Test Error Quick Reference

**Quick Fix Guide for "Cannot Read Properties" Errors**

---

## 🎯 The Big 4 Fixes (90-120 tests)

### 1. API Gateway Cache Keys → 28 tests ✅
**File:** `src/app/core/services/api-gateway.service.ts`

**Lines 102, 134:**
```typescript
// BEFORE (causes 28 failures)
key: (params: any) => `readings_${params.limit}_${params.offset}`

// AFTER
key: (params: any) => `readings_${params?.limit ?? 'all'}_${params?.offset ?? 0}`
```

**Also fix line 102:**
```typescript
// BEFORE
key: (params: any) => `glucose_${params.userId}_${params.startDate}_${params.endDate}`

// AFTER
key: (params: any) => `glucose_${params?.userId ?? 'user'}_${params?.startDate ?? ''}_${params?.endDate ?? ''}`
```

---

### 2. DOM Utility Null Guards → 8-11 tests ✅
**File:** `src/app/tests/helpers/dom-utils.ts`

**Line 47 - getElementText:**
```typescript
// BEFORE
export function getElementText(element: DebugElement | HTMLElement): string {
  if (element instanceof DebugElement) {
    return element.nativeElement.textContent?.trim() || '';
  }
  return element.textContent?.trim() || '';
}

// AFTER
export function getElementText(element: DebugElement | HTMLElement | null): string {
  if (!element) return '';
  if (element instanceof DebugElement) {
    return element.nativeElement?.textContent?.trim() || '';
  }
  return element?.textContent?.trim() || '';
}
```

**Line 266 - isVisible:**
```typescript
// BEFORE
export function isVisible(element: DebugElement | HTMLElement): boolean {
  const el = element instanceof DebugElement ? element.nativeElement : element;
  const rect = el.getBoundingClientRect();
  // ...
}

// AFTER
export function isVisible(element: DebugElement | HTMLElement | null): boolean {
  if (!element) return false;
  const el = element instanceof DebugElement ? element.nativeElement : element;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  // ...
}
```

---

### 3. Dashboard DOM Tests → 40-50 tests ✅
**File:** `src/app/tests/integration/components/dashboard-dom.spec.ts`

**Pattern to apply throughout file:**
```typescript
// BEFORE (causes null element errors)
component.readings = mockReadings;
const button = fixture.nativeElement.querySelector('.add-reading-btn');
button.click(); // ❌ TypeError: Cannot read properties of null

// AFTER
component.readings = mockReadings;
fixture.detectChanges(); // ← Add this
await fixture.whenStable(); // ← Add this for async
const button = fixture.nativeElement.querySelector('.add-reading-btn');
if (button) { // ← Add null check
  button.click();
} else {
  fail('Button not found'); // ← Better error message
}
```

**Specific lines to fix:**
- Line 271: Add reading button
- Line 299: Quick entry form
- Line 358: Appointments list
- Line 375: Video call button
- Line 385: Appointment click
- Line 424: Sync button
- Line 527: Retry button
- Line 565: Stat card animation
- Line 667: Debounced interactions

---

### 4. NavController Mock → 4 tests ✅
**File:** `AdvancedPage` test setup (find with grep)

**Before:**
```typescript
providers: [NavController]
```

**After:**
```typescript
import { Subject } from 'rxjs';

providers: [
  NavController,
  {
    provide: Router,
    useValue: {
      events: new Subject(),
      url: '/',
      navigate: jasmine.createSpy('navigate'),
      navigateByUrl: jasmine.createSpy('navigateByUrl')
    }
  }
]
```

---

## 📊 Expected Results

### Before
- Failed: 167 tests
- Success: 343 tests
- Success rate: 67%
- Coverage: 48.57%

### After (Phases 1-4)
- Failed: 65-75 tests
- Success: 435-445 tests
- Success rate: 85-87%
- Coverage: 52-55%

---

## ⚡ Quick Implementation Order

**Phase 1 (30 min) - Files: 2**
1. `api-gateway.service.ts` - Add `?.` to cache keys
2. `dom-utils.ts` - Add null guards to helpers
3. **Run tests** → Expect ~40 more passing

**Phase 2 (15 min) - Files: 1**
4. AdvancedPage setup - Add Router mock
5. **Run tests** → Expect 4 more passing

**Phase 3 (1-2 hours) - Files: 1**
6. `dashboard-dom.spec.ts` - Fix DOM queries systematically
7. **Run tests** → Expect 40-50 more passing

**Phase 4 (30 min) - Files: 1**
8. `external-services-manager.service.spec.ts` line 497 - Add mock config
9. **Run tests** → Expect 1-2 more passing

---

## 🔍 Error Signatures

| Error | Location | Cause | Fix |
|-------|----------|-------|-----|
| `reading 'limit'` | api-gateway.service.ts:134 | Missing params | `params?.limit` |
| `reading 'userId'` | api-gateway.service.ts:102 | Missing params | `params?.userId` |
| `reading 'click'` | dashboard-dom.spec.ts | Null element | Add detectChanges() |
| `reading 'textContent'` | dom-utils.ts:47 | Null element | Add null guard |
| `reading 'getBoundingClientRect'` | dom-utils.ts:266 | Null element | Add null guard |
| `reading 'subscribe'` | NavController | Missing Router | Add Router mock |
| `reading 'services'` | external-services-manager.spec.ts:497 | Missing config | Initialize mock |

---

## 🎯 Test Command

```bash
# Run all tests
npm run test:ci

# Quick check specific suites
karma start karma-auth-only.conf.js

# With coverage
npm run test:coverage
```

---

**See full analysis:** `/docs/TEST_ERROR_ANALYSIS.md`
