# Maestro Test Status and Mode Compatibility

Last Updated: 2025-11-24

## Test Categories and Mode Compatibility

### Legend
- ✅ Test should run in this mode
- ⚠️ Test needs modification for this mode
- ❌ Test not applicable for this mode
- 🔧 Test needs fixing before running

## Test Status Matrix

| Test File | Mock | Local | Heroku | Setup | Cleanup | Status | Notes |
|-----------|------|-------|--------|-------|---------|--------|-------|
| **Authentication Tests** |
| auth/01-login-flow.yaml | ✅ | ✅ | ✅ | Clear | Logout | ✅ WORKING | Base login test |
| auth/01-login-flow.mock.yaml | ✅ | ❌ | ❌ | Clear | Logout | ✅ WORKING | Mock-specific credentials |
| auth/01-login-flow.heroku.yaml | ❌ | ❌ | ✅ | Clear | Logout | ✅ WORKING | Heroku-specific |
| auth/02-wrong-credentials.yaml | ⚠️ | ⚠️ | ✅ | Clear | None | 🔧 NEEDS FIX | Split into multiple tests |
| auth/03-network-error.yaml | ⚠️ | ✅ | ✅ | Clear | None | 🔧 NEEDS FIX | Can't simulate real network error |
| **Dashboard Tests** |
| 02-dashboard-navigation.yaml | ✅ | ✅ | ✅ | Login | Logout | ✅ WORKING | Tab navigation |
| dashboard/02-verify-stats-calculations.yaml | ✅ | ⚠️ | ⚠️ | Clear | Delete | 🔧 NEEDS FIX | Needs clean state |
| **Theme & Language Tests** |
| 03-theme-toggle.yaml | ✅ | ✅ | ✅ | Login | None | ✅ WORKING | Visual verification |
| 03-theme-toggle-simple.yaml | ✅ | ✅ | ✅ | Login | None | ✅ WORKING | Simplified version |
| 04-language-switch.yaml | ✅ | ✅ | ✅ | Login | None | ✅ WORKING | Full language test |
| 04-language-switch-simple.yaml | ✅ | ✅ | ✅ | Login | None | ✅ WORKING | Simplified version |
| **Readings Tests** |
| readings/02-add-reading.yaml | ✅ | ✅ | ✅ | Login | Delete | ✅ FIXED | Path fixed |
| readings/02-add-reading.mock.yaml | ✅ | ❌ | ❌ | Login | Delete | ✅ FIXED | Mock-specific |
| readings/02-add-reading.heroku.yaml | ❌ | ❌ | ✅ | Login | Delete | ✅ FIXED | Heroku-specific |
| readings/03-calculate-average.yaml | ✅ | ⚠️ | ⚠️ | Clear | Delete | 🔧 NEEDS FIX | Assumes clean state |
| readings/03-verify-stats.yaml | ✅ | ⚠️ | ⚠️ | Clear | Delete | ✅ FIXED | Path fixed |
| readings/04-filter-readings.yaml | ⚠️ | ⚠️ | ⚠️ | Login | None | 🔧 NEEDS REVIEW | Feature may not exist |
| readings/05-add-reading-validation.yaml | ✅ | ✅ | ✅ | Login | None | ✅ FIXED | Path fixed |
| readings/06-edit-delete-reading.yaml | ✅ | ✅ | ✅ | Login | Delete | 🔧 NEEDS FIX | Too complex, split needed |
| readings/07-bulk-operations.yaml | ✅ | ✅ | ✅ | Clear | Delete | 🔧 NEEDS FIX | Needs cleanup |
| **Appointments Tests** |
| appointments/01-create-appointment.yaml | ✅ | ⚠️ | ✅ | Login | Delete | 🔧 NEEDS FIX | Complex form |
| appointments/01-view-appointments.heroku.yaml | ❌ | ❌ | ✅ | Login | None | ✅ FIXED | Heroku only |
| appointments/02-create-appointment.heroku.yaml | ❌ | ❌ | ✅ | Login | Delete | ⚠️ NEEDS REVIEW | Heroku only |
| appointments/04-segment-switch.yaml | ✅ | ✅ | ✅ | Login | None | ✅ FIXED | UI navigation |
| appointments/05-create-validation.yaml | ✅ | ✅ | ✅ | Login | None | ⚠️ NEEDS REVIEW | Form validation |
| appointments/06-edit-delete-appointment.yaml | ✅ | ✅ | ✅ | Login | Delete | ✅ FIXED | CRUD operations |
| **Profile Tests** |
| profile/04-settings-persist.yaml | ✅ | ✅ | ✅ | Login | Reset | ✅ FIXED | Settings persistence |
| profile/05-avatar-upload.yaml | ⚠️ | ⚠️ | ✅ | Login | Reset | ✅ FIXED | Needs camera permission |
| profile/06-profile-edit.yaml | ✅ | ✅ | ✅ | Login | Reset | ✅ FIXED | Profile editing |
| **Integration Tests** |
| integration/01-complete-workflow.yaml | ✅ | ✅ | ✅ | Clear | Logout | ✅ FIXED | Full workflow |
| integration/01-complete-workflow.mock.yaml | ✅ | ❌ | ❌ | Clear | Logout | ✅ FIXED | Mock-specific |
| integration/01-complete-workflow.heroku.yaml | ❌ | ❌ | ✅ | Clear | Logout | ✅ FIXED | Heroku-specific |
| integration/01-full-user-journey.yaml | ✅ | ✅ | ✅ | Clear | Logout | ✅ FIXED | E2E journey |
| integration/02-offline-sync.yaml | ⚠️ | ⚠️ | ⚠️ | Login | None | 🔧 REMOVE | Can't test offline properly |
| integration/02-reading-to-dashboard.yaml | ✅ | ✅ | ✅ | Login | Delete | ✅ FIXED | Cross-feature test |
| **Smoke & Quick Tests** |
| smoke-test.yaml | ✅ | ✅ | ✅ | Clear | None | ✅ WORKING | Quick validation |
| smoke-test-simple.yaml | ✅ | ✅ | ✅ | Clear | None | ⚠️ NEEDS REVIEW | Simplified smoke |
| quick-verify.yaml | ✅ | ✅ | ✅ | None | None | ⚠️ NEEDS REVIEW | App launch check |
| debug-simple.yaml | ✅ | ✅ | ✅ | None | None | ⚠️ DEBUG ONLY | Development helper |
| simple-login-test.yaml | ✅ | ✅ | ✅ | Clear | None | ⚠️ NEEDS REVIEW | Basic login |
| simple-login-manual.yaml | ✅ | ✅ | ✅ | Manual | None | ⚠️ MANUAL | Requires user input |
| devices.yaml | ⚠️ | ⚠️ | ⚠️ | Login | None | ⚠️ UNKNOWN | Feature unclear |

## Summary by Status

### ✅ WORKING (5 tests)
- smoke-test.yaml
- 02-dashboard-navigation.yaml
- 03-theme-toggle-simple.yaml
- 04-language-switch-simple.yaml
- auth/01-login-flow.mock.yaml

### ✅ FIXED (22 tests)
All tests with path references have been fixed.

### 🔧 NEEDS FIX (7 tests)
1. auth/02-wrong-credentials.yaml - Split into multiple
2. auth/03-network-error.yaml - Can't simulate properly
3. dashboard/02-verify-stats-calculations.yaml - Clean state needed
4. readings/03-calculate-average.yaml - Clean state needed
5. readings/06-edit-delete-reading.yaml - Too complex
6. readings/07-bulk-operations.yaml - Needs cleanup
7. appointments/01-create-appointment.yaml - Simplify form

### ⚠️ NEEDS REVIEW (7 tests)
Tests that may work but need verification.

## Test Execution by Mode

### Mock Mode Tests (28 tests)
Run with: `./scripts/test-maestro-mock.sh`
- All universal tests
- All *.mock.yaml variants
- Theme/language tests
- Basic CRUD tests

### Local Mode Tests (20 tests)
Run with: `./scripts/test-maestro-local.sh`
- Universal tests (except mock-specific)
- Backend integration tests
- Network error tests

### Heroku Mode Tests (25 tests)
Run with: `./scripts/test-maestro-heroku.sh`
- All *.heroku.yaml variants
- Backend-specific tests
- Full integration tests

## Recommended Test Sets

### Quick Smoke (5 tests, ~2 min)
```bash
./scripts/test-maestro-working.sh
```

### Daily Regression (15 tests, ~10 min)
- All working tests
- Fixed path tests
- Theme/language tests

### Full Suite (41 tests, ~30 min)
```bash
./scripts/test-maestro-all.sh
```

## Next Steps

1. **Immediate**: Run working tests to establish baseline
2. **Priority 1**: Fix the 7 broken tests
3. **Priority 2**: Review and verify uncertain tests
4. **Priority 3**: Add missing test scenarios (registration, alerts, etc.)