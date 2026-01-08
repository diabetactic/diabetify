# Visual Audit Report: Group 9/10

This report details the findings from the visual audit of 10 E2E test snapshots.

---

## 1. docker-profile-dark-mobile-chromium.png

*   ⚠️ **Issue:** A floating action button partially obscures the "Información diabetes" label.
*   ℹ️ **Note:** The untranslated key "profile.TYPE_1", mentioned as a known issue in the task description, was not found in this snapshot.

## 2. docker-profile-main-desktop-chromium.png

*   ✅ **Screenshot OK**

## 3. docker-profile-main-mobile-chromium.png

*   ⚠️ **Issue:** A floating action button partially obscures the "Información diabetes" label.

## 4. docker-readings-list-desktop-chromium.png

*   ⚠️ **Issue:** The filename indicates a desktop view, but the snapshot is of a mobile view.
*   ⚠️ **Issue:** Two floating action buttons overlap at the bottom, and one is partially cut off.

## 5. docker-readings-list-mobile-chromium.png

*   ⚠️ **Issue:** Two floating action buttons overlap at the bottom, and one is partially cut off.

## 6. docker-settings-advanced-desktop-chromium.png

*   ⚠️ **Issue:** The filename indicates a desktop view, but the snapshot is of a mobile view.
*   ⚠️ **Issue:** The page title is partially obscured by the device notch.
*   ⚠️ **Issue:** The action buttons at the bottom of the screen are cramped and misaligned.

## 7. docker-settings-advanced-mobile-chromium.png

*   ⚠️ **Issue:** The action buttons at the bottom of the screen are cramped and misaligned.

## 8. docker-settings-dark-desktop-chromium.png

*   ⚠️ **Issue:** The filename indicates a desktop view, but the snapshot is of a mobile view.
*   ⚠️ **Issue:** The page title "Configuración" is partially obscured by the device notch.

## 9. docker-settings-dark-mobile-chromium.png

*   ✅ **Screenshot OK**

## 10. docker-settings-language-desktop-chromium.png

*   ⚠️ **Issue:** The filename indicates a desktop view, but the snapshot is of a mobile view.
*   ⚠️ **Issue:** The page title "Configuración" is partially obscured by the device notch.
*   ⚠️ **Issue:** The notification text at the bottom of the view is cut off.

---

## Snapshots Not Found

The following 4 snapshot files listed in the audit request could not be found in the `playwright/tests/docker-visual-regression.spec.ts-snapshots/` directory:

*   `readings-detail-modal-desktop-chromium.png`
*   `readings-detail-modal-mobile-chromium.png`
*   `readings-filters-desktop-chromium.png`
*   `readings-filters-mobile-chromium.png`
