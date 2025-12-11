# Appointment Tests Verification Checklist

**Date**: 2025-12-11
**Status**: Ready for Testing

## Pre-Test Setup

- [ ] Ensure Android emulator is running
- [ ] App is installed: `io.diabetactic.app`
- [ ] Backend is accessible (Heroku production)
- [ ] Backoffice API is accessible

## Test Execution Order

### 1. Test 01: Request Appointment

```bash
maestro test tests/appointments/01-request-appointment.yaml
```

**Expected**: NONE → PENDING transition with UI refresh
**Verifies**: Swipe-refresh shows pending status immediately

### 2. Test 02: Accept Appointment

```bash
maestro test tests/appointments/02-accept-appointment.yaml
```

**Expected**: PENDING → ACCEPTED via backoffice API + UI refresh
**Verifies**: Swipe-refresh shows accepted status immediately

### 3. Test 03: Create Appointment (Navigation)

```bash
maestro test tests/appointments/03-create-appointment.yaml
```

**Expected**: Page navigation and header verification
**Verifies**: No state changes, navigation only

### 4. Test 04: Deny Appointment

```bash
maestro test tests/appointments/04-deny-appointment.yaml
```

**Expected**: PENDING → DENIED via backoffice API + UI refresh
**Verifies**: Swipe-refresh shows denied status immediately

### 5. Test 05: Full Flow (UI)

```bash
maestro test tests/appointments/05-full-flow.yaml
```

**Expected**: Complete UI verification across navigation
**Verifies**: Pull-to-refresh functionality works

### 6. Test 06: Full Create Flow

```bash
maestro test tests/appointments/06-full-create-flow.yaml
```

**Expected**: Complete flow from NONE → CREATED with form fill
**Verifies**: Multi-stage flow with refresh after accept

## Run All Tests

```bash
cd /home/julito/TPP/diabetactic/diabetify/maestro
maestro test tests/appointments/
```

## Success Criteria

- [ ] All 6 tests pass
- [ ] No timeout errors on state transitions
- [ ] UI updates visible after each swipe-refresh
- [ ] Backend verification passes for all state changes
- [ ] No flaky test behavior

## Swipe Pattern Verification

All tests should use:

```yaml
- swipe:
    start: '50%,30%'
    end: '50%,70%'
    duration: 500
```

**NOT** direction-based swipes:

```yaml
# OLD PATTERN (removed)
- swipe:
    direction: DOWN
```

## Troubleshooting

If tests fail:

1. **Check backend state**:

   ```bash
   node scripts/verify-backend.js
   ```

2. **Clear queue manually**:

   ```bash
   ACTION=clear node scripts/backoffice-api-fetch.js
   ```

3. **Verify app is logged in**:
   - User: 1000
   - Password: tuvieja

4. **Check swarm coordination**:
   ```bash
   npx claude-flow@alpha hooks session-restore --session-id "swarm-appointments"
   ```

## Files Modified

1. `/maestro/tests/appointments/01-request-appointment.yaml` - Added swipe after PENDING
2. `/maestro/tests/appointments/02-accept-appointment.yaml` - Updated swipe pattern
3. `/maestro/tests/appointments/04-deny-appointment.yaml` - Updated swipe pattern
4. `/maestro/tests/appointments/05-full-flow.yaml` - Updated swipe pattern
5. `/maestro/tests/appointments/06-full-create-flow.yaml` - Updated swipe pattern

## Documentation

- Full summary: `/maestro/docs/appointments-tests-fixes-summary.md`
- Memory key: `hive/appointments-worker/fixes`
