# Maestro Resolution Test - Quick Reference

## What This Test Does

Comprehensive E2E test that verifies appointment resolution from creation to UI display with full backend verification.

## State Machine Coverage

```
NONE → PENDING → ACCEPTED → CREATED → Resolution Display
  ↓       ↓          ↓          ↓            ↓
 API     API        API        API      API + UI
```

## Key Features

### 1. Fresh Data Creation

- Clears queue before each run
- Creates new appointment dynamically
- No dependency on existing data

### 2. Unique Identifiers

```javascript
// Generated per test run
basalType: 'Lantus-1702345678901'; // timestamp-based
fastType: 'Humalog-1702345678901';
```

### 3. Three-Layer Verification

| Layer         | Method             | Purpose                   |
| ------------- | ------------------ | ------------------------- |
| 1. Backend    | API scripts        | Data persisted correctly  |
| 2. UI State   | YAML assertions    | UI reflects backend state |
| 3. Data Match | Unique value check | Correct data displayed    |

## Quick Implementation Guide

### Step 1: Create Script

```bash
# Location: maestro/scripts/verify-resolution.js
# See: docs/maestro-resolution-test-design.md Part 1.1
```

### Step 2: Create Test

```bash
# Location: maestro/tests/resolution/03-complete-resolution-flow.yaml
# See: docs/maestro-resolution-test-design.md Part 2.1
```

### Step 3: Run Test

```bash
cd maestro
maestro test tests/resolution/03-complete-resolution-flow.yaml
```

## Scripts Overview

### New Script: `verify-resolution.js`

**Purpose**: Verify resolution exists with expected values via backoffice API

**Input**:

- `APPOINTMENT_ID` - Required
- `EXPECTED_BASAL_TYPE` - Optional (for strict verification)
- `EXPECTED_BASAL_DOSE` - Optional
- `EXPECTED_RATIO` - Optional
- `EXPECTED_SENSITIVITY` - Optional

**Output**:

- `output.verified` - true/false
- `output.resolutionExists` - true/false
- `output.resolution` - Full resolution object

**Failure**: Throws error if resolution doesn't exist or values don't match

### Enhanced Script: `resolution-api.js`

**Optional Enhancement**: Add `UNIQUE_SUFFIX` env variable to append timestamps:

```javascript
BASAL_TYPE: "Lantus"
UNIQUE_SUFFIX: "E2E-1702345678901"
→ Result: "Lantus-E2E-1702345678901"
```

## Test Phases (11 Total)

| Phase | Action                    | Verification                                       |
| ----- | ------------------------- | -------------------------------------------------- |
| 0     | Generate unique timestamp | output.basalType created                           |
| 1     | Clear queue               | Backend state = NONE                               |
| 2     | Login                     | UI loaded                                          |
| 3     | Navigate to appointments  | Page visible                                       |
| 4     | Request appointment       | Backend state = PENDING, UI shows pending          |
| 5     | Accept via API            | Backend state = ACCEPTED, UI shows accepted        |
| 6     | Create via API            | Backend state = CREATED, appointmentId returned    |
| 7     | Add resolution            | Resolution created with unique data                |
| 8     | Verify via API            | Resolution exists with correct values              |
| 9     | Refresh list              | UI updates to show CREATED state                   |
| 10    | Navigate to detail        | Detail page loads                                  |
| 11    | Verify in UI              | Unique values visible (timestamp-based basal/fast) |

## Expected Results

### Success Output

```
✅ Test ID: E2E-1702345678901
✅ Backend verification passed (resolution exists)
✅ UI verification passed (unique data displayed)
✅ Full state machine tested
```

### Failure Scenarios

1. **Resolution Not Created**

   ```
   ERROR: Resolution NOT found for appointment 12345
   → Check backoffice API logs
   ```

2. **Wrong Values**

   ```
   ERROR: Expected ratio 12, got 10
   → Check resolution-api.js parameters
   ```

3. **UI Doesn't Display**
   ```
   ERROR: Element not found: Lantus-1702345678901
   → Check UI refresh logic or frontend fetch
   ```

## Debugging Tips

### Check Backend State

```bash
# Verify appointment exists
curl -H "Authorization: Bearer $TOKEN" \
  https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/appointments/mine

# Verify resolution exists
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com/appointments/12345/resolution
```

### Check Test Output

```bash
maestro test tests/resolution/03-complete-resolution-flow.yaml --debug-output
```

### Inspect Unique Values

```
Look for console logs:
"Test ID: E2E-1702345678901"
"Basal Type: Lantus-1702345678901"
```

## Why This Design Works

### Problem: False Positives

**Before**: Test passes because it finds _any_ resolution (could be stale data)
**After**: Test only passes if unique timestamp-based values appear

### Problem: Backend vs Frontend Issues

**Before**: Can't tell if backend saved data or frontend displayed it
**After**: Backend verification (API) happens _before_ UI verification

### Problem: Flaky Tests

**Before**: Depends on existing data state
**After**: Creates fresh data every run

## Comparison with Existing Tests

| Test File                            | Data Creation | Backend Verify | Unique Data | Use Case            |
| ------------------------------------ | ------------- | -------------- | ----------- | ------------------- |
| 01-verify-resolution.yaml            | ❌            | ❌             | ❌          | Quick smoke test    |
| 02-create-and-verify-resolution.yaml | ✅            | ⚠️ Partial     | ❌          | Basic create flow   |
| **03-complete-resolution-flow.yaml** | ✅            | ✅ Full        | ✅          | **Full regression** |

## Files to Create

```
maestro/
├── scripts/
│   └── verify-resolution.js          # NEW (Part 1.1)
└── tests/
    └── resolution/
        └── 03-complete-resolution-flow.yaml  # NEW (Part 2.1)

docs/
└── maestro-resolution-test-design.md  # CREATED (full design doc)
```

## Next Steps

1. **Create `verify-resolution.js` script** (see design doc Part 1.1)
2. **Create test YAML** (see design doc Part 2.1)
3. **Optional**: Enhance `resolution-api.js` with UNIQUE_SUFFIX
4. **Run test** and verify all phases pass
5. **Update documentation** (maestro/README.md, MAESTRO-TESTS-SUMMARY.md)

## Full Design Documentation

For complete implementation details, see:
`/home/julito/TPP/diabetactic/diabetify/docs/maestro-resolution-test-design.md`

Includes:

- Complete script implementation
- Full YAML test structure
- Verification strategy details
- Error handling patterns
- Design decision rationale
- Integration guidelines
