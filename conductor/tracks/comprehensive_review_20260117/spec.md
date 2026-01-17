# Specification: Comprehensive Review & UI Polish

## Overview
This track addresses the visibility of the Barcode Scanner and performs a deep architectural review of recent changes to ensure robustness and test coverage.

## Goals
1.  **UI Polish:** Make the Barcode Scanner feature in `FoodPicker` prominent and intuitive.
2.  **Deep Analysis:** Review changes in Auth, Appointments, Profile, and Dashboard for architectural integrity and test coverage.
3.  **Verification:** Ensure no regressions and adequate coverage for new logic (especially offline auth and error handling).

## Detailed Tasks

### 1. Barcode Scanner Visibility
- [ ] Inspect `FoodPickerComponent` template.
- [ ] Move the barcode scanner trigger out of the input icon slot or make it a distinct, labeled button.
- [ ] Ensure it's obvious to the user that scanning is an option.

### 2. Deep Codebase Analysis (Agent Delegated)
- [ ] Analyze `LocalAuthService`: verify offline logic and 403 error mapping coverage.
- [ ] Analyze `AppointmentTimelineComponent`: verify status logic (ACCEPTED, COMPLETED) coverage.
- [ ] Analyze `ProfilePage`: verify new toggle logic coverage.
- [ ] Check for potential regressions in `DashboardPage`.

### 3. Gap Filling
- [ ] Write missing tests identified by the analysis.
