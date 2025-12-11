# Maestro Resolution Test - Implementation Checklist

## Overview

This checklist guides you through implementing the comprehensive E2E appointment resolution test.

## Quick Links

- **Full Design**: `maestro-resolution-test-design.md`
- **Summary**: `maestro-resolution-test-summary.md`
- **Visual Flow**: `maestro-resolution-test-flow.md`

---

## Step 1: Create `verify-resolution.js` Script

**Location**: `/home/julito/TPP/diabetactic/diabetify/maestro/scripts/verify-resolution.js`

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Implementation**: Copy the script from design doc Part 1.1

**Test**: Run standalone test

```bash
cd maestro/scripts
node - <<'EOF'
// Test script execution
var http = { request: () => ({ status: 200, body: '{"change_basal_type":"Lantus"}' }) };
var APPOINTMENT_ID = "12345";
var output = {};
// Paste script here and run main()
EOF
```

**Validation Checklist**:

- [ ] Script parses env variables correctly
- [ ] Handles 404 gracefully (throws error)
- [ ] Handles 200 with body correctly
- [ ] Exports to output.verified, output.resolution
- [ ] Strict verification works (EXPECTED\_\* vars)
- [ ] Console logs are informative

---

## Step 2: Create Test YAML File

**Location**: `/home/julito/TPP/diabetactic/diabetify/maestro/tests/resolution/03-complete-resolution-flow.yaml`

**Status**: [ ] Not Started / [ ] In Progress / [ ] Complete

**Implementation**: Copy YAML from design doc Part 2.1

**Validation Checklist**:

- [ ] All 12 phases present
- [ ] Env variables defined (BACKOFFICE_API_URL, etc.)
- [ ] Script paths correct (../../scripts/)
- [ ] Flow paths correct (../../flows/)
- [ ] Bilingual text patterns (._Citas._|._Appointments._)
- [ ] Output variables referenced correctly (${output.appointmentId})

---

## Step 3: Test Individual Phases

Test each phase in isolation before running the full flow.

### Phase 0: Generate Data

```bash
maestro test - <<'EOF'
appId: io.diabetactic.app
---
- evalScript: |
    var timestamp = new Date().getTime();
    output.uniqueSuffix = 'E2E-' + timestamp;
    output.basalType = 'Lantus-' + timestamp;
    console.log('Test ID: ' + output.uniqueSuffix);
EOF
```

**Expected**: Console shows unique timestamp
**Status**: [ ] Passed / [ ] Failed

### Phase 1: Clear Queue

```bash
cd maestro
ACTION=clear node scripts/backoffice-api-fetch.js
```

**Expected**: "Queue cleared"
**Status**: [ ] Passed / [ ] Failed

### Phase 8: Verify Resolution (with mock appointment)

```bash
# First create a test appointment and resolution manually via API
# Then run:
APPOINTMENT_ID=12345 node scripts/verify-resolution.js
```

**Expected**: "VERIFICATION PASSED" or error if not exists
**Status**: [ ] Passed / [ ] Failed

---

## Step 4: Dry Run with Maestro

Run the test in dry-run mode to check for syntax errors:

```bash
cd maestro
maestro test tests/resolution/03-complete-resolution-flow.yaml --dry-run
```

**Validation Checklist**:

- [ ] No YAML syntax errors
- [ ] All script files found
- [ ] All flow files found
- [ ] Env variables parsed correctly

**Status**: [ ] Passed / [ ] Failed

---

## Step 5: Run Test Against Emulator

### Prerequisites

- [ ] Android emulator running
- [ ] App installed (latest APK)
- [ ] Network connectivity
- [ ] Heroku APIs reachable

### First Run

```bash
cd maestro
maestro test tests/resolution/03-complete-resolution-flow.yaml
```

**Monitor Console Output**:

- [ ] Phase 0: Timestamp generated
- [ ] Phase 1: Queue cleared
- [ ] Phase 2-3: Login successful
- [ ] Phase 4: Request successful (PENDING)
- [ ] Phase 5: Accept successful (ACCEPTED)
- [ ] Phase 6: Create successful (CREATED)
- [ ] Phase 7: Resolution created
- [ ] Phase 8: Backend verification passed
- [ ] Phase 9: UI refreshed
- [ ] Phase 10: Detail page loaded
- [ ] Phase 11: Unique data visible

**Status**: [ ] Passed / [ ] Failed

---

## Step 6: Debug Failures

### Common Issues

#### Issue: Resolution not created (Phase 7 fails)

**Symptom**: "HTTP 500 at /appointments/create_resolution"
**Debug**:

```bash
# Check appointment state
curl -H "Authorization: Bearer $TOKEN" \
  https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/appointments/state

# Check appointment exists
curl -H "Authorization: Bearer $TOKEN" \
  https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/appointments/mine
```

**Fix**: Ensure appointment is in CREATED state before adding resolution
**Status**: [ ] Not Applicable / [ ] Fixed

#### Issue: Backend verification passes but UI doesn't show data (Phase 11 fails)

**Symptom**: "Element not found: Lantus-1702345678901"
**Debug**:

```bash
# Check if resolution exists in backend
APPOINTMENT_ID=12345 node scripts/verify-resolution.js

# Check UI logs
adb logcat | grep -i resolution
```

**Fix**: Check frontend fetch logic, ensure refresh triggers API call
**Status**: [ ] Not Applicable / [ ] Fixed

#### Issue: State transitions fail

**Symptom**: "Expected state ACCEPTED, got PENDING"
**Debug**:

```bash
# Check backoffice API
ACTION=accept USER_ID=1000 node scripts/backoffice-api-fetch.js

# Verify state
USER_ID=1000 USER_PASSWORD=tuvieja node scripts/verify-backend.js \
  VERIFY_ACTION=appointment_state EXPECTED_STATE=ACCEPTED
```

**Fix**: Wait longer before verification, increase timeout
**Status**: [ ] Not Applicable / [ ] Fixed

---

## Step 7: Run Multiple Times (Regression)

Run the test 3 times consecutively to ensure determinism:

```bash
for i in 1 2 3; do
  echo "=== RUN $i ==="
  maestro test tests/resolution/03-complete-resolution-flow.yaml
  if [ $? -ne 0 ]; then
    echo "FAILED on run $i"
    break
  fi
  sleep 5  # Wait between runs
done
```

**Validation**:

- [ ] Run 1: Passed
- [ ] Run 2: Passed
- [ ] Run 3: Passed

**Status**: [ ] All Passed / [ ] Some Failed

---

## Step 8: Update Documentation

### Update `maestro/README.md`

Add section:

```markdown
### Resolution Tests

- `01-verify-resolution.yaml` - Basic UI check
- `02-create-and-verify-resolution.yaml` - Create + verify
- **`03-complete-resolution-flow.yaml`** - Full E2E with backend verification

The complete flow test creates fresh data, verifies via API, and ensures unique timestamp-based
resolution data appears in the UI.
```

**Status**: [ ] Complete

### Update `maestro/MAESTRO-TESTS-SUMMARY.md`

Add to test matrix:

```markdown
| Test                             | Creates Data | Backend Verify | Unique Data | Duration | Coverage                        |
| -------------------------------- | ------------ | -------------- | ----------- | -------- | ------------------------------- |
| 03-complete-resolution-flow.yaml | ✅           | ✅             | ✅          | ~48s     | Full state machine + resolution |
```

**Status**: [ ] Complete

---

## Step 9: Add to CI Pipeline (Optional)

If using CircleCI or GitHub Actions:

```yaml
# .circleci/config.yml
- run:
    name: Maestro Resolution E2E Test
    command: |
      maestro test maestro/tests/resolution/03-complete-resolution-flow.yaml
```

**Status**: [ ] Not Applicable / [ ] Complete

---

## Step 10: Final Validation

Run the test one final time and verify all outputs:

```bash
maestro test tests/resolution/03-complete-resolution-flow.yaml \
  --format junit --output test-results.xml
```

**Final Checklist**:

- [ ] Test passes consistently
- [ ] Console output is clear and informative
- [ ] Unique data appears in UI every time
- [ ] Backend verification catches failures early
- [ ] Test completes in ~45-60 seconds
- [ ] No false positives from stale data
- [ ] Documentation updated
- [ ] Team informed of new test

---

## Completion Summary

**Overall Status**: [ ] Complete / [ ] In Progress / [ ] Blocked

**Notes**:

```
[Add any notes, gotchas, or lessons learned here]
```

**Next Steps**:

- [ ] Share test design with team
- [ ] Get code review for scripts
- [ ] Add test to regular regression suite
- [ ] Monitor for flakiness in CI
- [ ] Consider adding more resolution test scenarios

---

## Files Created

| File                                           | Status | Location                  |
| ---------------------------------------------- | ------ | ------------------------- |
| verify-resolution.js                           | [ ]    | maestro/scripts/          |
| 03-complete-resolution-flow.yaml               | [ ]    | maestro/tests/resolution/ |
| maestro-resolution-test-design.md              | [x]    | docs/                     |
| maestro-resolution-test-summary.md             | [x]    | docs/                     |
| maestro-resolution-test-flow.md                | [x]    | docs/                     |
| maestro-resolution-implementation-checklist.md | [x]    | docs/                     |

---

## Support

If you encounter issues:

1. Check the **Full Design Doc** for detailed explanations
2. Review the **Visual Flow Diagram** for test structure
3. Run phases individually to isolate failures
4. Check backend API logs (Heroku)
5. Review Maestro console output for errors

## Success Criteria

The test is considered successful when:

- ✅ Runs consistently (3+ times without failures)
- ✅ Creates fresh data every run (unique timestamps)
- ✅ Verifies backend before UI (fail fast)
- ✅ Catches regressions in resolution feature
- ✅ Completes in reasonable time (~45-60s)
- ✅ Provides clear failure messages

Good luck with the implementation!
