# Comprehensive E2E Maestro Test Design: Appointment Resolution

## Executive Summary

This document provides a detailed design for a comprehensive E2E test that verifies the complete appointment resolution workflow. The test creates fresh data dynamically, uses backend API verification, and follows the full state machine from NONE to resolution display.

## Test Objectives

1. **Data Independence**: Create fresh appointments rather than relying on existing data
2. **Backend Verification**: Verify data persistence using API scripts, not just UI assertions
3. **Complete Flow Coverage**: Test entire state machine: NONE → PENDING → ACCEPTED → CREATED → Resolution
4. **Unique Data**: Use unique timestamps/values to prevent false positives
5. **Deterministic**: Clear state before each run to ensure repeatability

## State Machine Overview

```
┌──────┐
│ NONE │ ──[Request]──> ┌─────────┐
└──────┘                 │ PENDING │
                         └─────────┘
                              │
                    [Backoffice Accept]
                              │
                              ▼
                         ┌──────────┐
                         │ ACCEPTED │ ──[Create Form/API]──> ┌─────────┐
                         └──────────┘                         │ CREATED │
                                                              └─────────┘
                                                                   │
                                                      [Backoffice Add Resolution]
                                                                   │
                                                                   ▼
                                                              ┌────────────┐
                                                              │ Resolution │
                                                              │  Display   │
                                                              └────────────┘
```

---

## Part 1: Script Modifications

### 1.1 New Script: `verify-resolution.js`

**Purpose**: Verify that a resolution exists for a specific appointment with expected values.

**Location**: `/home/julito/TPP/diabetactic/diabetify/maestro/scripts/verify-resolution.js`

**Key Features**:

- Fetches resolution data from backoffice API
- Verifies specific field values (basal_type, dose, ratio, sensitivity)
- Exports resolution data to Maestro output for further validation
- Handles 404 gracefully (resolution not found)

**Environment Variables**:

```javascript
BACKOFFICE_API_URL: string; // Backoffice URL (default: heroku)
APPOINTMENT_ID: string; // The appointment ID to check
ADMIN_USERNAME: string; // Admin username (default: admin)
ADMIN_PASSWORD: string; // Admin password (default: admin)

// Optional: Expected values for strict verification
EXPECTED_BASAL_TYPE: string; // e.g., "Lantus"
EXPECTED_BASAL_DOSE: string; // e.g., "22"
EXPECTED_RATIO: string; // e.g., "12"
EXPECTED_SENSITIVITY: string; // e.g., "45"
```

**Output Variables** (exported to Maestro):

```javascript
output.verified = true/false
output.resolutionExists = true/false
output.resolution = { ... }  // Full resolution object
output.appointmentId = number
```

**Implementation**:

```javascript
// verify-resolution.js (GraalJS compatible)
var BACKOFFICE_URL =
  typeof BACKOFFICE_API_URL !== 'undefined'
    ? BACKOFFICE_API_URL
    : 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com';

var CMD_APPOINTMENT_ID = typeof APPOINTMENT_ID !== 'undefined' ? APPOINTMENT_ID : null;
var CMD_ADMIN_USER = typeof ADMIN_USERNAME !== 'undefined' ? ADMIN_USERNAME : 'admin';
var CMD_ADMIN_PASS = typeof ADMIN_PASSWORD !== 'undefined' ? ADMIN_PASSWORD : 'admin';

// Optional strict verification values
var EXPECTED_BASAL_TYPE = typeof EXPECTED_BASAL_TYPE !== 'undefined' ? EXPECTED_BASAL_TYPE : null;
var EXPECTED_BASAL_DOSE = typeof EXPECTED_BASAL_DOSE !== 'undefined' ? EXPECTED_BASAL_DOSE : null;
var EXPECTED_RATIO = typeof EXPECTED_RATIO !== 'undefined' ? EXPECTED_RATIO : null;
var EXPECTED_SENSITIVITY =
  typeof EXPECTED_SENSITIVITY !== 'undefined' ? EXPECTED_SENSITIVITY : null;

function request(method, path, body, token) {
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (path === '/token') headers['Content-Type'] = 'application/x-www-form-urlencoded';

  var fullUrl = BACKOFFICE_URL + path;
  var options = { method: method, headers: headers };
  if (method !== 'GET' && method !== 'DELETE' && body) options.body = body;

  var response = http.request(fullUrl, options);

  return {
    status: response.status,
    body: response.body && response.body.length > 0 ? JSON.parse(response.body) : null,
  };
}

function main() {
  console.log('=== Verify Resolution Script ===');
  console.log('Appointment ID: ' + CMD_APPOINTMENT_ID);

  if (!CMD_APPOINTMENT_ID) {
    throw new Error('APPOINTMENT_ID is required');
  }

  // 1. Authenticate
  var tokenData = request(
    'POST',
    '/token',
    'username=' + CMD_ADMIN_USER + '&password=' + CMD_ADMIN_PASS
  );
  var token = tokenData.body.access_token;
  console.log('Admin token obtained');

  // 2. Get resolution
  var result = request('GET', '/appointments/' + CMD_APPOINTMENT_ID + '/resolution', '', token);

  if (result.status === 404 || !result.body) {
    console.log('ERROR: Resolution NOT found for appointment ' + CMD_APPOINTMENT_ID);
    output.verified = false;
    output.resolutionExists = false;
    throw new Error('Resolution does not exist for appointment ' + CMD_APPOINTMENT_ID);
  }

  var resolution = result.body;
  console.log('Resolution found:');
  console.log('  Basal Type: ' + resolution.change_basal_type);
  console.log('  Basal Dose: ' + resolution.change_basal_dose);
  console.log('  Basal Time: ' + resolution.change_basal_time);
  console.log('  Fast Type: ' + resolution.change_fast_type);
  console.log('  Ratio: ' + resolution.change_ratio);
  console.log('  Sensitivity: ' + resolution.change_sensitivity);

  // 3. Strict verification (if expected values provided)
  var strictVerification = true;

  if (EXPECTED_BASAL_TYPE && resolution.change_basal_type !== EXPECTED_BASAL_TYPE) {
    console.log(
      'ERROR: Expected basal type "' +
        EXPECTED_BASAL_TYPE +
        '", got "' +
        resolution.change_basal_type +
        '"'
    );
    strictVerification = false;
  }

  if (
    EXPECTED_BASAL_DOSE &&
    parseFloat(resolution.change_basal_dose) !== parseFloat(EXPECTED_BASAL_DOSE)
  ) {
    console.log(
      'ERROR: Expected basal dose ' + EXPECTED_BASAL_DOSE + ', got ' + resolution.change_basal_dose
    );
    strictVerification = false;
  }

  if (EXPECTED_RATIO && parseFloat(resolution.change_ratio) !== parseFloat(EXPECTED_RATIO)) {
    console.log('ERROR: Expected ratio ' + EXPECTED_RATIO + ', got ' + resolution.change_ratio);
    strictVerification = false;
  }

  if (
    EXPECTED_SENSITIVITY &&
    parseFloat(resolution.change_sensitivity) !== parseFloat(EXPECTED_SENSITIVITY)
  ) {
    console.log(
      'ERROR: Expected sensitivity ' +
        EXPECTED_SENSITIVITY +
        ', got ' +
        resolution.change_sensitivity
    );
    strictVerification = false;
  }

  if (!strictVerification) {
    throw new Error('Resolution values do not match expected values');
  }

  // Export to Maestro
  output.verified = true;
  output.resolutionExists = true;
  output.resolution = resolution;
  output.appointmentId = CMD_APPOINTMENT_ID;

  console.log('=== VERIFICATION PASSED: Resolution exists with correct values ===');
}

main();
```

### 1.2 Enhancement: `resolution-api.js`

**Current State**: The existing script supports `create`, `ensure`, and `get` actions.

**Recommended Enhancement**: Add unique timestamp support for deterministic testing.

**New Feature**: Add `UNIQUE_SUFFIX` env variable to append timestamps to resolution data:

```javascript
// Add after existing env vars (around line 35)
var UNIQUE_SUFFIX = typeof UNIQUE_SUFFIX !== 'undefined' ? UNIQUE_SUFFIX : '';

// Modify basal type to include suffix (around line 87)
var resolutionData = JSON.stringify({
  appointment_id: parseInt(CMD_APPOINTMENT_ID, 10),
  change_basal_type: UNIQUE_SUFFIX ? RES_BASAL_TYPE + '-' + UNIQUE_SUFFIX : RES_BASAL_TYPE,
  change_basal_dose: RES_BASAL_DOSE,
  change_basal_time: RES_BASAL_TIME,
  change_fast_type: UNIQUE_SUFFIX ? RES_FAST_TYPE + '-' + UNIQUE_SUFFIX : RES_FAST_TYPE,
  change_ratio: RES_RATIO,
  change_sensitivity: RES_SENSITIVITY,
  emergency_care: RES_EMERGENCY,
  needed_physical_appointment: RES_PHYSICAL,
});
```

**Benefits**:

- Each test run creates uniquely identifiable data
- Prevents false positives from stale data
- Makes debugging easier with timestamps in field values

---

## Part 2: Test YAML Structure

### 2.1 Test File: `03-complete-resolution-flow.yaml`

**Location**: `/home/julito/TPP/diabetactic/diabetify/maestro/tests/resolution/03-complete-resolution-flow.yaml`

**Test Phases**:

```yaml
# ==========================================
# Test: Complete Appointment Resolution E2E Flow
# Description: Full state machine test with resolution verification
#   1. Clears queue (NONE state)
#   2. Requests appointment (NONE → PENDING)
#   3. Accepts via backoffice API (PENDING → ACCEPTED)
#   4. Creates appointment via API (ACCEPTED → CREATED)
#   5. Adds resolution via backoffice API with UNIQUE values
#   6. Verifies resolution via API (backend verification)
#   7. Navigates to appointment detail (UI verification)
#   8. Verifies resolution displays correctly (UI + data matching)
# ==========================================

appId: io.diabetactic.app

env:
  BACKOFFICE_API_URL: https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com
  API_BASE_URL: https://diabetactic-api-gateway-37949d6f182f.herokuapp.com
  TEST_USER_ID: '1000'
  TEST_USER_PASSWORD: 'tuvieja'
  ADMIN_USERNAME: admin
  ADMIN_PASSWORD: admin

---
# ==========================================
# PHASE 0: Generate Unique Test Data
# ==========================================
# Create timestamp suffix for unique identification
- evalScript: |
    var timestamp = new Date().getTime();
    output.uniqueSuffix = 'E2E-' + timestamp;
    output.basalType = 'Lantus-' + timestamp;
    output.fastType = 'Humalog-' + timestamp;
    console.log('Test ID: ' + output.uniqueSuffix);

# ==========================================
# PHASE 1: SETUP - Clear Queue (NONE state)
# ==========================================
- runScript:
    file: ../../scripts/backoffice-api-fetch.js
    env:
      ACTION: clear

# Verify backend state is NONE after clearing
- runScript:
    file: ../../scripts/verify-backend.js
    env:
      VERIFY_ACTION: appointment_state
      EXPECTED_STATE: NONE
      USER_ID: ${env.TEST_USER_ID}
      USER_PASSWORD: ${env.TEST_USER_PASSWORD}

# ==========================================
# PHASE 2: LOGIN
# ==========================================
- runFlow: ../../flows/login.yaml

# ==========================================
# PHASE 3: NAVIGATE TO APPOINTMENTS
# ==========================================
- runFlow: ../../flows/navigate-appointments.yaml

- extendedWaitUntil:
    visible:
      text: '.*Citas.*|.*Appointments.*'
    timeout: 8000

- extendedWaitUntil:
    notVisible:
      text: '.*Cargando.*|.*Loading.*'
    timeout: 15000

# ==========================================
# PHASE 4: REQUEST APPOINTMENT (NONE → PENDING)
# ==========================================
- extendedWaitUntil:
    visible:
      text: '.*Solicitar.*Cita.*|.*Request.*Appointment.*'
    timeout: 10000

- tapOn:
    text: '.*Solicitar.*Cita.*|.*Request.*Appointment.*'

- waitForAnimationToEnd:
    timeout: 3000

# Verify UI shows PENDING
- extendedWaitUntil:
    visible:
      text: '.*Pendiente.*|.*Pending.*|.*esperando.*revisión.*|.*waiting.*reviewed.*'
    timeout: 10000

# Verify backend state is PENDING
- runScript:
    file: ../../scripts/verify-backend.js
    env:
      VERIFY_ACTION: appointment_state
      EXPECTED_STATE: PENDING
      USER_ID: ${env.TEST_USER_ID}
      USER_PASSWORD: ${env.TEST_USER_PASSWORD}

# ==========================================
# PHASE 5: ACCEPT VIA BACKOFFICE API (PENDING → ACCEPTED)
# ==========================================
- runScript:
    file: ../../scripts/backoffice-api-fetch.js
    env:
      ACTION: accept
      USER_ID: ${env.TEST_USER_ID}

# Wait for backend to process
- waitForAnimationToEnd:
    timeout: 2000

# Verify backend state is ACCEPTED
- runScript:
    file: ../../scripts/verify-backend.js
    env:
      VERIFY_ACTION: appointment_state
      EXPECTED_STATE: ACCEPTED
      USER_ID: ${env.TEST_USER_ID}
      USER_PASSWORD: ${env.TEST_USER_PASSWORD}

# Pull to refresh UI
- swipe:
    direction: DOWN
    duration: 500
- waitForAnimationToEnd:
    timeout: 5000

# Verify UI shows ACCEPTED
- extendedWaitUntil:
    visible:
      text: '.*Aceptada.*|.*Accepted.*|.*completar.*formulario.*|.*fill.*form.*|.*Nueva.*Cita.*|.*New.*Appointment.*'
    timeout: 15000

# ==========================================
# PHASE 6: CREATE APPOINTMENT VIA API (ACCEPTED → CREATED)
# ==========================================
# Use API to create appointment (more reliable than UI form)
- runScript:
    file: ../../scripts/ensure-appointment-created.js
    env:
      USER_ID: ${env.TEST_USER_ID}
      USER_PASSWORD: ${env.TEST_USER_PASSWORD}

# Now output.appointmentId contains the created appointment ID
- evalScript: |
    console.log('Created appointment ID: ' + output.appointmentId);

# Verify backend state is CREATED
- runScript:
    file: ../../scripts/verify-backend.js
    env:
      VERIFY_ACTION: appointment_state
      EXPECTED_STATE: CREATED
      USER_ID: ${env.TEST_USER_ID}
      USER_PASSWORD: ${env.TEST_USER_PASSWORD}

# ==========================================
# PHASE 7: CREATE RESOLUTION WITH UNIQUE DATA
# ==========================================
- runScript:
    file: ../../scripts/resolution-api.js
    env:
      ACTION: create
      APPOINTMENT_ID: ${output.appointmentId}
      BASAL_TYPE: ${output.basalType}
      BASAL_DOSE: '22'
      BASAL_TIME: '22:00'
      FAST_TYPE: ${output.fastType}
      RATIO: '12'
      SENSITIVITY: '45'
      EMERGENCY_CARE: 'false'
      PHYSICAL_APPOINTMENT: 'true'

# ==========================================
# PHASE 8: VERIFY RESOLUTION VIA API (Backend Verification)
# ==========================================
- runScript:
    file: ../../scripts/verify-resolution.js
    env:
      APPOINTMENT_ID: ${output.appointmentId}
      EXPECTED_BASAL_TYPE: ${output.basalType}
      EXPECTED_BASAL_DOSE: '22'
      EXPECTED_RATIO: '12'
      EXPECTED_SENSITIVITY: '45'

# This will throw if resolution doesn't exist or values don't match
# output.verified will be true if passed

# ==========================================
# PHASE 9: REFRESH APPOINTMENTS LIST
# ==========================================
# Multiple refreshes to ensure data is synced
- swipe:
    direction: DOWN
    duration: 500
- waitForAnimationToEnd:
    timeout: 5000

- extendedWaitUntil:
    notVisible:
      text: '.*Cargando.*|.*Loading.*'
    timeout: 15000

# Second refresh
- swipe:
    direction: DOWN
    duration: 500
- waitForAnimationToEnd:
    timeout: 5000

# Wait for CREATED state to appear
- extendedWaitUntil:
    visible:
      text: '.*Completada.*|.*Completed.*|.*ACTUAL.*|.*CURRENT.*'
    timeout: 10000

# ==========================================
# PHASE 10: NAVIGATE TO APPOINTMENT DETAIL
# ==========================================
# Scroll to ensure we see the ACTUAL section
- swipe:
    direction: DOWN
    duration: 300

# Tap on the completed appointment (first in ACTUAL section)
- tapOn:
    text: '.*Completada.*|.*Completed.*'

# Wait for detail page to load
- extendedWaitUntil:
    visible:
      text: '.*Detalles.*|.*Detail.*|.*Objetivo.*Glucosa.*|.*Glucose.*Objective.*'
    timeout: 10000

# ==========================================
# PHASE 11: VERIFY RESOLUTION IN UI
# ==========================================
# Scroll down to resolution section
- scroll
- waitForAnimationToEnd:
    timeout: 1000

- scroll
- waitForAnimationToEnd:
    timeout: 1000

# Wait for resolution section header
- extendedWaitUntil:
    visible:
      text: '.*Resoluci.*|.*Resolution.*|.*Indicaciones.*|.*Instructions.*'
    timeout: 15000

# ==========================================
# PHASE 12: VERIFY UNIQUE DATA IN UI
# ==========================================
# The critical part: verify our UNIQUE basal type appears
# This proves the resolution we just created is actually displayed
- assertVisible:
    text: ${output.basalType}

# Also verify other unique data
- assertVisible:
    text: ${output.fastType}

# Verify numeric values
- assertVisible:
    text: '.*22.*' # Basal dose

- assertVisible:
    text: '.*12.*' # Ratio

- assertVisible:
    text: '.*45.*' # Sensitivity

# ==========================================
# TEST COMPLETE
# ==========================================
# If we reached here:
# ✅ Backend has correct resolution data (verified by API)
# ✅ UI displays the UNIQUE resolution we created
# ✅ Full state machine tested (NONE → PENDING → ACCEPTED → CREATED → Resolution)
```

---

## Part 3: Verification Strategy

### 3.1 Multi-Layer Verification

The test uses **three layers** of verification to ensure correctness:

#### Layer 1: Backend API Verification

- **When**: Immediately after each state transition
- **How**: `verify-backend.js` and `verify-resolution.js` scripts
- **What**: Verifies data actually exists in database
- **Why**: Catches backend failures before UI checks

#### Layer 2: UI State Verification

- **When**: After backend verification and refresh
- **How**: `extendedWaitUntil` and `assertVisible` YAML commands
- **What**: Verifies UI reflects backend state
- **Why**: Ensures frontend correctly fetches and displays data

#### Layer 3: Data Matching Verification

- **When**: Final step in appointment detail view
- **How**: Assert unique timestamp-based values appear in UI
- **What**: Verifies the displayed resolution matches the one we created
- **Why**: Prevents false positives from stale/cached data

### 3.2 Verification Flow Diagram

```
┌─────────────────────┐
│ Create Resolution   │
│ with Unique Data    │
│ (timestamp-based)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Layer 1:            │
│ Backend API Check   │
│ - Resolution exists?│
│ - Values correct?   │
└──────────┬──────────┘
           │ PASS
           ▼
┌─────────────────────┐
│ Layer 2:            │
│ UI State Check      │
│ - Refresh list      │
│ - Navigate to detail│
└──────────┬──────────┘
           │ PASS
           ▼
┌─────────────────────┐
│ Layer 3:            │
│ Data Matching       │
│ - Unique basal type │
│ - Unique fast type  │
│ - Correct doses     │
└──────────┬──────────┘
           │ PASS
           ▼
┌─────────────────────┐
│ TEST PASSED         │
│ Resolution verified │
│ end-to-end          │
└─────────────────────┘
```

### 3.3 Unique Data Strategy

**Problem**: How do we know the UI is showing the _new_ resolution and not stale cached data?

**Solution**: Generate unique identifiers using timestamps:

```javascript
// In test setup
var timestamp = new Date().getTime();
output.basalType = 'Lantus-1702345678901'; // Unique!
output.fastType = 'Humalog-1702345678901'; // Unique!
```

**Benefits**:

1. Each test run creates identifiable data
2. Can't accidentally pass on stale data
3. Easy to debug (timestamp in logs)
4. No test pollution between runs

### 3.4 Error Handling Strategy

Each phase includes specific error handling:

| Phase          | Verification                                   | Failure Action                       |
| -------------- | ---------------------------------------------- | ------------------------------------ |
| Clear Queue    | Backend state = NONE                           | Throw error, stop test               |
| Request        | Backend state = PENDING                        | Throw error, stop test               |
| Accept         | Backend state = ACCEPTED                       | Throw error, stop test               |
| Create         | Backend state = CREATED + appointmentId exists | Throw error, stop test               |
| Add Resolution | Backend resolution exists (via API)            | Throw error, stop test               |
| UI Display     | Unique values visible in UI                    | Throw error, show expected vs actual |

---

## Part 4: Implementation Checklist

### 4.1 Scripts to Create

- [x] `verify-resolution.js` - Verify resolution exists with expected values
- [ ] Optional: Enhance `resolution-api.js` with UNIQUE_SUFFIX support

### 4.2 Test Files to Create

- [ ] `maestro/tests/resolution/03-complete-resolution-flow.yaml` - Main E2E test

### 4.3 Documentation Updates

- [ ] Update `maestro/README.md` with resolution test info
- [ ] Update `maestro/MAESTRO-TESTS-SUMMARY.md` with new test coverage

---

## Part 5: Expected Test Output

### 5.1 Console Output (Success Case)

```
=== Test: Complete Appointment Resolution E2E Flow ===
Test ID: E2E-1702345678901
Basal Type: Lantus-1702345678901
Fast Type: Humalog-1702345678901

[PHASE 1] Clearing queue...
Queue cleared
Verifying appointment state is NONE...
VERIFICATION PASSED: Appointment state is NONE

[PHASE 2] Logging in...
Login successful

[PHASE 3] Navigating to appointments...
Appointments page loaded

[PHASE 4] Requesting appointment...
Request button tapped
UI shows PENDING state
Verifying appointment state is PENDING...
VERIFICATION PASSED: Appointment state is PENDING

[PHASE 5] Accepting via backoffice API...
Backoffice token obtained
Accept successful for user 1000
Verifying appointment state is ACCEPTED...
VERIFICATION PASSED: Appointment state is ACCEPTED
UI refreshed
UI shows ACCEPTED state

[PHASE 6] Creating appointment via API...
Appointment created via API. ID: 12345
Verifying appointment state is CREATED...
VERIFICATION PASSED: Appointment state is CREATED

[PHASE 7] Creating resolution with unique data...
Resolution created. Status: 200
Resolution ID: 12345

[PHASE 8] Verifying resolution via API...
=== Verify Resolution Script ===
Appointment ID: 12345
Admin token obtained
Resolution found:
  Basal Type: Lantus-1702345678901
  Basal Dose: 22
  Basal Time: 22:00
  Fast Type: Humalog-1702345678901
  Ratio: 12
  Sensitivity: 45
=== VERIFICATION PASSED: Resolution exists with correct values ===

[PHASE 9] Refreshing appointments list...
Pull to refresh (1/2)
Pull to refresh (2/2)
UI shows CREATED state

[PHASE 10] Navigating to appointment detail...
Tapped on completed appointment
Detail page loaded

[PHASE 11] Scrolling to resolution section...
Resolution section visible

[PHASE 12] Verifying unique data in UI...
✓ Found: Lantus-1702345678901
✓ Found: Humalog-1702345678901
✓ Found: 22
✓ Found: 12
✓ Found: 45

=== TEST PASSED ===
✓ Full state machine verified (NONE → PENDING → ACCEPTED → CREATED → Resolution)
✓ Backend data verified via API
✓ UI correctly displays unique resolution data
```

### 5.2 Failure Scenarios

#### Scenario 1: Resolution Not Created

```
[PHASE 8] Verifying resolution via API...
ERROR: Resolution NOT found for appointment 12345
VERIFICATION FAILED: Resolution does not exist
Test aborted ❌
```

#### Scenario 2: Wrong Resolution Values

```
[PHASE 8] Verifying resolution via API...
Resolution found:
  Basal Type: Lantus-1702345678901
  Basal Dose: 22
  Ratio: 10  ← WRONG (expected 12)
ERROR: Expected ratio 12, got 10
VERIFICATION FAILED: Resolution values do not match
Test aborted ❌
```

#### Scenario 3: UI Doesn't Display Resolution

```
[PHASE 12] Verifying unique data in UI...
ERROR: Element not found: Lantus-1702345678901
Timeout waiting for text to appear
Test failed ❌
```

---

## Part 6: Key Design Decisions

### 6.1 Why API Creation Instead of UI Form?

**Decision**: Use `ensure-appointment-created.js` API script instead of filling UI form.

**Rationale**:

- UI form has input field state issues (as noted in existing tests)
- API creation is more reliable and faster
- Still tests UI display (detail view)
- Focus test on resolution verification, not form filling

### 6.2 Why Unique Timestamps?

**Decision**: Append timestamps to basal_type and fast_type fields.

**Rationale**:

- Prevents false positives from cached/stale data
- Makes debugging easier (can identify exact test run)
- No test pollution between runs
- Proves UI is showing the _new_ data we just created

### 6.3 Why Multiple Refresh Pulls?

**Decision**: Pull-to-refresh twice in Phase 9.

**Rationale**:

- Ionic's hydration can be slow
- First pull might start before backend is ready
- Second pull ensures fresh data
- Better to over-verify than under-verify

### 6.4 Why Three-Layer Verification?

**Decision**: Verify via API first, then UI state, then data matching.

**Rationale**:

- Early failure detection (fail fast at backend)
- Separates backend issues from frontend issues
- Data matching proves end-to-end correctness
- Builds confidence incrementally

---

## Part 7: Integration with Existing Tests

### 7.1 Test Suite Structure

```
maestro/tests/resolution/
├── 01-verify-resolution.yaml           # EXISTING: Basic UI check
├── 02-create-and-verify-resolution.yaml # EXISTING: Create + verify
└── 03-complete-resolution-flow.yaml    # NEW: Full E2E with backend verification
```

### 7.2 Test Comparison

| Test                                 | Creates Data? | Backend Verification? | Unique Data? | Coverage         |
| ------------------------------------ | ------------- | --------------------- | ------------ | ---------------- |
| 01-verify-resolution.yaml            | ❌            | ❌                    | ❌           | UI display only  |
| 02-create-and-verify-resolution.yaml | ✅            | ⚠️ Partial            | ❌           | Create + UI      |
| **03-complete-resolution-flow.yaml** | ✅            | ✅ Full               | ✅           | **Complete E2E** |

### 7.3 When to Use Each Test

- **Test 01**: Quick smoke test (appointment detail page loads)
- **Test 02**: Basic create flow (if appointment already in CREATED state)
- **Test 03**: Full regression (complete state machine + verification)

---

## Conclusion

This design provides a **bulletproof** E2E test for appointment resolution that:

1. ✅ Creates fresh data every run (no dependency on existing data)
2. ✅ Verifies backend persistence via API (not just UI)
3. ✅ Uses unique timestamps to prevent false positives
4. ✅ Tests complete state machine (NONE → PENDING → ACCEPTED → CREATED → Resolution)
5. ✅ Provides clear failure messages for debugging
6. ✅ Follows existing Maestro patterns and script conventions

The test is **deterministic**, **maintainable**, and provides **high confidence** in the resolution feature's correctness.
