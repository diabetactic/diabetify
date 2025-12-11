# Maestro Resolution Test - Visual Flow Diagram

## Complete Test Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 0: Generate Unique Test Data               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ JavaScript: timestamp = new Date().getTime()                   │ │
│  │ Output: basalType = "Lantus-1702345678901"                    │ │
│  │         fastType = "Humalog-1702345678901"                    │ │
│  │         uniqueSuffix = "E2E-1702345678901"                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: Clear Queue (NONE State)                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Script: backoffice-api-fetch.js (ACTION=clear)                │ │
│  │ API: DELETE /appointments                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Verify: verify-backend.js (EXPECTED_STATE=NONE)               │ │
│  │ API: GET /appointments/state                                   │ │
│  │ Result: state = "NONE" ✓                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 2-3: Login & Navigate                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Flow: login.yaml                                               │ │
│  │ - clearState, launch app, fill credentials, submit            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Flow: navigate-appointments.yaml                               │ │
│  │ - Tap "Citas|Appointments" tab                                │ │
│  │ - Wait for page load                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 4: Request Appointment (NONE → PENDING)          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ UI: Tap "Solicitar Cita|Request Appointment" button           │ │
│  │ Result: UI shows "Pendiente|Pending"                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Verify: verify-backend.js (EXPECTED_STATE=PENDING)            │ │
│  │ API: GET /appointments/state                                   │ │
│  │ Result: state = "PENDING" ✓                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│            PHASE 5: Accept Appointment (PENDING → ACCEPTED)         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Script: backoffice-api-fetch.js (ACTION=accept, USER_ID=1000) │ │
│  │ API: PUT /appointments/accept/{queue_placement}                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Verify: verify-backend.js (EXPECTED_STATE=ACCEPTED)           │ │
│  │ API: GET /appointments/state                                   │ │
│  │ Result: state = "ACCEPTED" ✓                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ UI: Pull to refresh (swipe down)                              │ │
│  │ Result: UI shows "Aceptada|Accepted"                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│           PHASE 6: Create Appointment (ACCEPTED → CREATED)          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Script: ensure-appointment-created.js                          │ │
│  │ - Checks state (if ACCEPTED, creates via API)                 │ │
│  │ API: POST /appointments/create                                 │ │
│  │ Body: { glucose_objective: 120, dose: 10, ratio: 10, ... }   │ │
│  │ Output: appointmentId = 12345                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Verify: verify-backend.js (EXPECTED_STATE=CREATED)            │ │
│  │ API: GET /appointments/state                                   │ │
│  │ Result: state = "CREATED" ✓                                   │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 7: Add Resolution with Unique Data               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Script: resolution-api.js (ACTION=create)                      │ │
│  │ Input:                                                         │ │
│  │   APPOINTMENT_ID: ${output.appointmentId}                     │ │
│  │   BASAL_TYPE: "Lantus-1702345678901"  ← UNIQUE!               │ │
│  │   BASAL_DOSE: "22"                                            │ │
│  │   FAST_TYPE: "Humalog-1702345678901"  ← UNIQUE!               │ │
│  │   RATIO: "12"                                                 │ │
│  │   SENSITIVITY: "45"                                           │ │
│  │ API: POST /appointments/create_resolution                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│           PHASE 8: Verify Resolution (Backend API Check)            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Script: verify-resolution.js                                   │ │
│  │ Input:                                                         │ │
│  │   APPOINTMENT_ID: 12345                                       │ │
│  │   EXPECTED_BASAL_TYPE: "Lantus-1702345678901"                 │ │
│  │   EXPECTED_BASAL_DOSE: "22"                                   │ │
│  │   EXPECTED_RATIO: "12"                                        │ │
│  │   EXPECTED_SENSITIVITY: "45"                                  │ │
│  │ API: GET /appointments/12345/resolution                        │ │
│  │ Verification:                                                  │ │
│  │   ✓ Resolution exists (not 404)                              │ │
│  │   ✓ basal_type matches "Lantus-1702345678901"                │ │
│  │   ✓ basal_dose matches 22                                    │ │
│  │   ✓ ratio matches 12                                         │ │
│  │   ✓ sensitivity matches 45                                   │ │
│  │ Output: verified=true, resolution={...}                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│              PHASE 9: Refresh Appointments List (UI Sync)           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ UI: Pull to refresh #1 (swipe down)                           │ │
│  │ - Wait for loading to complete                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ UI: Pull to refresh #2 (ensure fresh data)                    │ │
│  │ - Wait for loading to complete                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Verify: UI shows "Completada|Completed" state                 │ │
│  │ Result: CREATED state visible in ACTUAL section ✓             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│           PHASE 10: Navigate to Appointment Detail                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ UI: Scroll to ACTUAL section                                  │ │
│  │ UI: Tap on "Completada|Completed" appointment card            │ │
│  │ Result: Detail page loads with appointment data               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│          PHASE 11: Verify Resolution in UI (Data Matching)          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ UI: Scroll down to resolution section                         │ │
│  │ Verify: "Resolución|Resolution" header visible                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                   ↓                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ CRITICAL VERIFICATION: Unique data appears in UI               │ │
│  │   ✓ "Lantus-1702345678901" visible                           │ │
│  │   ✓ "Humalog-1702345678901" visible                          │ │
│  │   ✓ "22" visible (basal dose)                                │ │
│  │   ✓ "12" visible (ratio)                                     │ │
│  │   ✓ "45" visible (sensitivity)                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         TEST PASSED ✅                              │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ✓ Full state machine verified (NONE → ... → Resolution)      │ │
│  │ ✓ Backend data verified via API (Layer 1)                    │ │
│  │ ✓ UI state verified (Layer 2)                                │ │
│  │ ✓ Unique data matched in UI (Layer 3)                        │ │
│  │ ✓ No false positives from stale data                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Three-Layer Verification Strategy

```
┌───────────────────────────────────────────────────────────────────┐
│ LAYER 1: Backend API Verification                                │
│ ================================================================= │
│ When:  Immediately after state transitions                       │
│ How:   Direct API calls via scripts                              │
│ Tests: - verify-backend.js (state checks)                        │
│        - verify-resolution.js (resolution data)                  │
│                                                                   │
│ Example:                                                          │
│   GET /appointments/state → "CREATED"                            │
│   GET /appointments/12345/resolution → { basal_type: "Lantus-..." }│
│                                                                   │
│ Why:   Catch backend failures before UI checks                   │
│ Fail:  Throw error, stop test immediately                        │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│ LAYER 2: UI State Verification                                   │
│ ================================================================= │
│ When:  After backend verification passes                         │
│ How:   UI assertions via YAML (extendedWaitUntil, assertVisible) │
│ Tests: - State labels ("Completada|Completed")                   │
│        - Section headers ("Resolución|Resolution")                │
│        - Navigation flow                                          │
│                                                                   │
│ Example:                                                          │
│   extendedWaitUntil:                                             │
│     visible:                                                      │
│       text: '.*Completada.*|.*Completed.*'                       │
│                                                                   │
│ Why:   Ensure UI correctly reflects backend state                │
│ Fail:  UI out of sync with backend → frontend bug                │
└───────────────────────────────────────────────────────────────────┘
                              ↓
┌───────────────────────────────────────────────────────────────────┐
│ LAYER 3: Data Matching Verification                              │
│ ================================================================= │
│ When:  Final step in detail view                                 │
│ How:   Assert UNIQUE timestamp-based values appear               │
│ Tests: - Unique basal type with timestamp                        │
│        - Unique fast type with timestamp                         │
│        - Specific numeric values                                 │
│                                                                   │
│ Example:                                                          │
│   assertVisible:                                                  │
│     text: ${output.basalType}  # "Lantus-1702345678901"         │
│                                                                   │
│ Why:   Prove the displayed data is from THIS test run            │
│        (not stale/cached data)                                    │
│ Fail:  UI shows wrong resolution → cache/sync bug                │
└───────────────────────────────────────────────────────────────────┘
```

## Failure Detection Flow

```
                      ┌─────────────────┐
                      │ Execute Phase   │
                      └────────┬────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Backend Verification│
                    │  (API Script)       │
                    └──────────┬──────────┘
                               │
                  ┌────────────▼─────────────┐
                  │ Data exists in backend?  │
                  └───┬──────────────────┬───┘
                      │ NO               │ YES
                      ▼                  ▼
            ┌─────────────────┐  ┌──────────────────┐
            │ FAIL FAST       │  │ Continue to UI   │
            │ Backend Issue   │  │ Verification     │
            │ ❌ Stop Test    │  └────────┬─────────┘
            └─────────────────┘           │
                                          │
                               ┌──────────▼──────────┐
                               │ UI State Check      │
                               │ (YAML assertions)   │
                               └──────────┬──────────┘
                                          │
                               ┌──────────▼──────────┐
                               │ UI reflects state?  │
                               └───┬─────────────┬───┘
                                   │ NO          │ YES
                                   ▼             ▼
                         ┌──────────────┐  ┌────────────────┐
                         │ FAIL         │  │ Continue to    │
                         │ Frontend Bug │  │ Data Matching  │
                         │ ❌ Stop Test │  └───────┬────────┘
                         └──────────────┘          │
                                                   │
                                        ┌──────────▼──────────┐
                                        │ Unique Data Check   │
                                        │ (Timestamp values)  │
                                        └──────────┬──────────┘
                                                   │
                                        ┌──────────▼──────────┐
                                        │ Correct data shown? │
                                        └───┬─────────────┬───┘
                                            │ NO          │ YES
                                            ▼             ▼
                                  ┌──────────────┐  ┌──────────┐
                                  │ FAIL         │  │ PASS ✅  │
                                  │ Cache/Sync   │  │ All Good │
                                  │ ❌ Stop Test │  └──────────┘
                                  └──────────────┘
```

## Scripts Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Test YAML (Maestro)                           │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐
    │ backoffice- │  │ ensure-     │  │ resolution-     │
    │ api-fetch   │  │ appointment │  │ api.js          │
    │ .js         │  │ -created.js │  │                 │
    └──────┬──────┘  └──────┬──────┘  └────────┬────────┘
           │                │                   │
           │ Clear/Accept   │ Create Apt        │ Create Resolution
           ▼                ▼                   ▼
    ┌──────────────────────────────────────────────────────┐
    │           Diabetactic Backend API                    │
    │  - User API (appointments, state)                    │
    │  - Backoffice API (queue, resolution)                │
    └──────────────────────┬───────────────────────────────┘
                           │
                           │ Data Persisted
                           ▼
    ┌──────────────────────────────────────────────────────┐
    │              Verification Scripts                    │
    │  - verify-backend.js (state checks)                  │
    │  - verify-resolution.js (resolution data)            │
    └──────────────────────┬───────────────────────────────┘
                           │
                           │ Verified Data Returned
                           ▼
    ┌──────────────────────────────────────────────────────┐
    │              Maestro Output Variables                │
    │  output.appointmentId = 12345                        │
    │  output.basalType = "Lantus-1702345678901"          │
    │  output.verified = true                              │
    │  output.resolution = { ... }                         │
    └──────────────────────┬───────────────────────────────┘
                           │
                           │ Used in UI Assertions
                           ▼
    ┌──────────────────────────────────────────────────────┐
    │         UI Verification (YAML assertions)            │
    │  assertVisible:                                      │
    │    text: ${output.basalType}                        │
    └──────────────────────────────────────────────────────┘
```

## Timeline View (Approximate Duration)

```
00:00 ━━━━━━━━━━━━━━━━━━━━━ PHASE 0: Generate Data (instant)
00:01 ━━━━━━━━━━━━━━━━━━━━━ PHASE 1: Clear Queue (2s)
00:03 ━━━━━━━━━━━━━━━━━━━━━ PHASE 2-3: Login + Navigate (8s)
00:11 ━━━━━━━━━━━━━━━━━━━━━ PHASE 4: Request Apt (5s)
00:16 ━━━━━━━━━━━━━━━━━━━━━ PHASE 5: Accept Apt (5s)
00:21 ━━━━━━━━━━━━━━━━━━━━━ PHASE 6: Create Apt (3s)
00:24 ━━━━━━━━━━━━━━━━━━━━━ PHASE 7: Add Resolution (2s)
00:26 ━━━━━━━━━━━━━━━━━━━━━ PHASE 8: Verify API (2s)
00:28 ━━━━━━━━━━━━━━━━━━━━━ PHASE 9: Refresh UI (10s)
00:38 ━━━━━━━━━━━━━━━━━━━━━ PHASE 10: Navigate Detail (5s)
00:43 ━━━━━━━━━━━━━━━━━━━━━ PHASE 11: Verify UI (5s)
00:48 ━━━━━━━━━━━━━━━━━━━━━ TEST COMPLETE ✅

Total Duration: ~48 seconds
```

## Key Success Factors

1. **Unique Data** - Timestamp-based identifiers prevent false positives
2. **Backend-First** - API verification before UI checks (fail fast)
3. **Three Layers** - Multiple verification points increase confidence
4. **Fresh Data** - No dependency on existing backend state
5. **Clear Failures** - Each phase has specific error messages

## Related Documentation

- Full Design: `/home/julito/TPP/diabetactic/diabetify/docs/maestro-resolution-test-design.md`
- Quick Reference: `/home/julito/TPP/diabetactic/diabetify/docs/maestro-resolution-test-summary.md`
