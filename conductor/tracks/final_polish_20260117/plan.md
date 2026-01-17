# Implementation Plan: Final UI Polish & Functional Enhancements

## Phase 1: Critical UI Regressions & Offline Handling
- [x] Task: Restore Dashboard Stat Card Icons f6832d1
    - [x] Write tests verifying `Activity` and `Target` icons are correctly rendered in `StatCardComponent`.
    - [x] Fix registration and rendering of icons in `DashboardPage`.
- [x] Task: Implement "You are Offline" State for Appointments 796c04d
    - [x] Write integration tests for `AppointmentsPage` in offline mode.
    - [x] Suppress "Server Error" alert when `Network.getStatus().connected` is false.
    - [x] Display a user-friendly offline banner.
- [x] Task: Fix Empty Info Popups
    - [x] Identify source of empty content in `InfoButtonComponent` or related tooltips.
    - [x] Write unit tests for content population.
    - [x] Fix the logic to ensure translations/text are passed correctly to the popup.
- [x] Task: Investigate Ghost Navigation (Appointments -> Profile)
    - [x] Audit `ionViewWillEnter` and route guards for unexpected redirects.
    - [x] Implement logging to track navigation triggers.
- [ ] Task: Conductor - User Manual Verification 'Critical UI Regressions' (Protocol in workflow.md)

## Phase 2: Tips Screen Refactor
- [x] Task: Relocate Tips Entry Point cf3d305
    - [x] Update `ProfilePage` template to move the "Tips" button under "Ver Logros".
    - [x] Match the styling (size, color, icon placement) of the "Ver Logros" button.
- [ ] Task: Reskin Tips Screen UI
    - [ ] Analyze `AchievementsPage` styling (Tailwind classes, card structure).
    - [ ] Apply the same "Achievements" look and feel to `TipsPage`.
    - [ ] Verify responsiveness and typography.
- [ ] Task: Conductor - User Manual Verification 'Tips Screen Refactor' (Protocol in workflow.md)

## Phase 3: Profile Functional Gaps
- [ ] Task: Make Diabetes Info Editable
    - [ ] Create edit form/modal for Diabetes Information.
    - [ ] Implement persistence in `ProfileService`.
    - [ ] Update UI to display actual data instead of skeletons.
- [ ] Task: Make Emergency Contact Editable
    - [ ] Create input fields for Emergency Contact name and phone.
    - [ ] Implement persistence and validation.
- [ ] Task: Refactor Edit Age Popup UI
    - [ ] Update `AlertController` configuration for "Edit Age".
    - [ ] Apply custom CSS for tall, squared buttons and fix input margins.
- [ ] Task: Conductor - User Manual Verification 'Profile Functional Gaps' (Protocol in workflow.md)

## Phase 4: Settings & Layout Polish
- [ ] Task: Reorder Settings Sections
    - [ ] Move "Apariencia" above "Configuración de glucosa" in `SettingsPage`.
- [ ] Task: Add Missing Icons to Settings & Profile
    - [ ] Add icon to "Apariencia" section header.
    - [ ] Fix misalignment/missing icons in Profile "General" section (based on screenshot).
- [ ] Task: Conductor - User Manual Verification 'Settings & Layout Polish' (Protocol in workflow.md)

## Phase 5: Dark Mode Audit & Fixes
- [ ] Task: Global Dark Mode Audit
    - [ ] Review all pages and modals in Dark Mode.
- [ ] Task: Implement Dark Mode Fixes
    - [ ] Fix contrast issues identified in the audit.
    - [ ] Ensure consistency between Light and Dark mode component layouts.
- [ ] Task: Conductor - User Manual Verification 'Dark Mode Audit' (Protocol in workflow.md)

## Phase 6: Final Verification
- [ ] Task: Run full regression test suite (Unit, Integration, E2E).
- [ ] Task: Execute static quality suite (Lint, Typecheck).
- [ ] Task: Capture final verification screenshots.
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
