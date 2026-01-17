# Specification: UI/UX Polish & Feature Review

## Overview

This track addresses recent UI/UX feedback, feature verification (Tips, Barcode, Biometrics), and clean-up of legacy code.

## Goals

1.  **Timeline UI:** Optimize for mobile (horizontal layout?), rename "Created" to "Resolved" where appropriate or clarify state mapping.
2.  **Profile UI:** Fix "Cerrar Sesión" button alignment/width.
3.  **Advanced Settings:** Polish UI (remove unused items, improve styling).
4.  **Sync Conflicts:** Investigate the "Sync Conflicts" button usage/need. Remove if unused or fix if broken.
5.  **Info Tooltips:** Add help/info buttons in key areas.
6.  **Tips Feature:** Verify status of the Tips page/feature.
7.  **Login Error:** Investigate "not authorized" message behavior.
8.  **Dependencies:** Audit Barcode and Biometrics packages usage.

## Detailed Tasks

### 1. Appointments Timeline

- [ ] Investigate "horizontal on mobile" feasibility.
- [ ] Rename/Map state "CREATED" to "RESOLVED" (or "COMPLETED") in UI if that's the user intent.

### 2. Profile

- [ ] Review "Cerrar Sesión" button styles. Ensure centering and appropriate width.

### 3. Advanced Settings

- [ ] Review `AdvancedPage` styling. Ensure consistent Ionic/Tailwind usage.

### 4. Sync Conflicts

- [ ] Locate "Sync Conflicts" button.
- [ ] Determine if conflict resolution logic exists and works.
- [ ] Decision: Fix or Remove.

### 5. Info Tooltips

- [ ] Identify key areas for info icons (e.g., Dashboard stats, Settings).
- [ ] Implement a reusable `InfoButton` or use existing pattern.

### 6. Feature Audit

- [ ] **Tips:** Check `src/app/tips` existence and routing.
- [ ] **Barcode:** Check usage of `@capacitor-mlkit/barcode-scanning`.
- [ ] **Biometrics:** Check usage of `@capgo/capacitor-native-biometric`.

### 7. Login Error

- [ ] Investigate `401` / `403` error handling in `LoginPage`.

## Acceptance Criteria

- Timeline looks good on mobile.
- Profile logout button is centered/styled.
- Advanced Settings looks polished.
- Unused features (if any) are documented or removed.
- Tips page is accessible or status clarified.
- Dependencies are justified.
