# Specification: Final UI Polish & Functional Enhancements

## 1. Overview
This track addresses a collection of UI/UX regressions, styling inconsistencies (specifically Dark Mode and Tips screen), and functional gaps (Diabetes Info/Emergency Contact) identified during the final manual review. It also aims to improve offline error messaging.

## 2. Functional Requirements

### 2.1 Dashboard & Appointments
- **Dashboard Icons:** Restore the missing icons for "Time in Range" (Target icon) and "Average Glucose" (Activity/Chart icon) cards. Ensure they persist across reloads.
- **Offline Error Handling:** In the `AppointmentsPage` (and globally if possible), suppress generic "Server Error" messages when the app is offline. Instead, display a "You are offline" banner or state.
- **Ghost Navigation:** Investigate and fix the issue where the app randomly navigates from Appointments to Profile.

### 2.2 Tips & Advice
- **Entry Point:** Move the "Tips" entry point to be a button located immediately under "Ver Logros" in the Profile page. It should match the "Ver Logros" button style exactly.
- **Screen Styling:** Refactor the `TipsPage` to match the visual style of the `AchievementsPage` (Cards, Layout, Typography, Colors).
- **Info Popups:** Fix the empty popups triggered by "Info" tips (e.g., in Objective or other sections). Ensure they display content.

### 2.3 Profile & Settings
- **Diabetes Info & Emergency Contact:**
    - Transform these from static/skeleton placeholders into fully functional, editable sections.
    - **UI:** Click to edit or specific "Edit" button.
    - **Persistence:** Save changes to `ProfileService` / Local Storage.
- **Edit Age Popup:** Refactor the UI for the "Edit Age" alert/modal.
    - **Buttons:** Make them tall and squared (modern look).
    - **Input:** Remove unnecessary left spacing/padding.
- **Settings Layout:**
    - Reorder: Move "Apariencia" section *above* "Configuración de glucosa".
    - Icon: Add a missing icon for the "Apariencia" section header.
- **Profile General Section:** Fix text misalignment or missing icon visibility in the "General" section (based on screenshot feedback).

### 2.4 Dark Mode Review
- **Audit:** Conduct a app-wide review of Dark Mode.
- **Fixes:**
    - Prioritize consistency with Light Mode layouts.
    - Fix any glaring contrast issues (e.g., invisible text on dark backgrounds, unreadable inputs).
    - ensure Modals and Popups are correctly themed.

## 3. Non-Functional Requirements
- **Performance:** Changes should not introduce render lag.
- **Persistence:** User edits (Diabetes Info, etc.) must persist after app restart.

## 4. Out of Scope
- Major backend architectural changes (unless required for data persistence).
