# Diabetify Context Brief for LLM Collaboration

**Last updated:** 2025-10-28 (US timezone)

This brief captures the project state, goals, and architecture so another assistant can generate plans or recommendations without re-scanning the whole repo.

## 1. Product Snapshot
- Ionic 8 + Angular 18/20 hybrid mobile app that centralizes diabetes glucose management with Tidepool integration.
- Capacitor 6 for native bridges, Dexie-backed IndexedDB for offline data, RxJS observables for reactive flows.
- Spanish-first experience: app defaults to Spanish, auto-detects device locale on first run, and allows manual override in Settings; all primary flows fully localized (ES/EN).
- Target users: children 5–14 with T1D and their guardians, with friendly, accessible UI.

## 2. Current Delivery Status
| Area | Status (Oct 2025) | Notes |
| --- | --- | --- |
| Backend services & integrations | 85-100% | Tidepool OAuth2/PKCE, sync, storage, appointment + glucoserver services are production-ready.
| Mobile data services | 95-100% | `ReadingsService`, `AppointmentService`, `TidepoolSyncService`, `DatabaseService` all complete. Manual readings flow fully functional.
| Mobile UI | ~15% complete | Dashboard/readings/profile pages are shells pending design polish; shared components (stat cards, alerts) are production-ready. `uiResources/` provides good visual references but requires updates (appointments, Spanish-first copy).
| Tele-appointment UX | API + services ready | Booking widgets, share flows, and detail UI pending (see roadmap below).
| BLE device support | 0% implemented | Specifications documented; no code yet.
| Localization | Complete for EN/ES | Automatic language detection, switcher component, locale-aware formatting.
| Accessibility & design system | Guidelines defined | WCAG 2.1 AA targets documented; shared components track contrast and focus states.
| Code quality | 9/10 | See `CLEANUP_SUMMARY.md`; linting, formatting, repo hygiene addressed; automated tests still 0%.

## 3. Core Architecture Overview
- **Auth & Sync Pipeline** (`TidepoolAuthService`, `TidepoolSyncService`, `TidepoolStorageService`, `ReadingsService`): OAuth2 PKCE login → token storage → incremental/full sync → transformation and dedupe → IndexedDB persistence → reactive views (Spanish copy by default).
- **External Services Layer** (`external-services-manager`, `service-orchestrator`, `api-gateway`): Health monitoring, circuit breaker handling, saga workflows (`FULL_SYNC`, `AUTH_AND_SYNC`, `APPOINTMENT_WITH_DATA`, `DATA_EXPORT`).
- **Environment Config**: Tidepool base/scopes + local backend URLs under `src/environments`, feature flags for offline mode, Tidepool integration, local backend usage.
- **Data Schema**: IndexedDB tables for readings and sync queues with duplicate detection on Tidepool IDs and `(time,value,type,userId)` fallback.

## 4. Tele-Appointment & Data Sharing Flow
1. Patient books appointment via `AppointmentService.createAppointment()` (configurable backend at `environment.backendServices.appointments`).
2. Optional `shareGlucoseData` flag triggers workflow that POSTs `/appointments/:id/share-glucose` with default window = 30 days prior to appointment.
3. Backend queries local `ReadingsService.getReadingsByDateRange()` (manual + Tidepool + future BLE) and transmits summary to provider dashboard.
4. Dashboard card should show doctor info, countdown, “Share Latest Readings” CTA (pending UI implementation) and surface share confirmation with record counts.
5. Future roadmap includes share toggles, history, and revocation controls plus reminders 24h before visits.

**Admin/Backoffice:** `extServices/backoffice-web` (React Admin) manages patient lists, appointment queues (`/appointments/pending|accepted|created`), and glucose logs—forms the clinician portal that consumes shared data. Mobile must use the API Gateway for all integrations.

## 5. Engagement, UI, and Gamification Cues
- Recent UI pass (`docs/logs/UI_ENHANCEMENTS_SUMMARY.md`) aligns dashboard stat cards, appointment card, and alert banners with gradient treatments, celebratory messaging (“You’re doing an amazing job…”), and subtle shadows for motivational feedback.
- Shared components (`src/app/shared/components/README.md`) expose configurable gradients, emoji status indicators, and dismissible success banners—these are the building blocks for streaks or achievement-style messaging when gamification features are planned.
- No dedicated gamification system yet (no streak storage, rewards, or challenges); any future plan should build on these UX primitives and data from `ReadingsService`. Tips module: Spanish-first, age-appropriate daily/weekly tips surfaced on the dashboard.

## 6. Accessibility & Inclusive Design
- `amplifier/docs/design/knowledge-base/accessibility.md` mandates WCAG 2.1 AA: contrast ratios (4.5:1 text, 3:1 large text), focus outlines ≥2px, keyboard operability, alt text for icons, touch targets ≥44px.
- Design tokens support dark/light modes (stat cards, alerts, appointment card). Accessibility-focused testing should verify color contrast across gradients and iconography.
- Localization system (`TRANSLATION_SUMMARY.md`, `TRANSLATION_GUIDE.md`) ensures Spanish is default with device auto-detect, manual override in Settings, and locale-adjusted dates/numbers/glucose units; remaining hardcoded strings are mostly low-priority page copy.

## 7. Recent Work & Known Gaps
- 2025-10-27 cleanup (Zen MCP review) removed Windows metadata, standardized naming (`tab1*` → semantic), regrouped logs, and improved `.gitignore`.
- Outstanding technical debt:
  - Automated test coverage (currently 0%).
  - Standalone Angular modules still include legacy NgModule wrappers (non-blocking).
  - BLE device ingestion is entirely future work.
  - Dashboard/readings/profile UIs need full implementation beyond shells.
- Roadmap focus (from `ARCHITECTURE_READINGS_APPOINTMENTS.md`): appointment widgets, quick share flows, booking UI, share history/revocation, upload of manual readings back to Tidepool, offline queue UX, BLE integration (out of scope for this project).

## 8. Key Source Files for Deeper Dives
- Product overview & commands: `README.md`
- Assistant-facing architecture brief: `CLAUDE.md`
- Tele-appointment + readings architecture: `ARCHITECTURE_READINGS_APPOINTMENTS.md`
- Implementation cheat sheet: `QUICK_REFERENCE_READINGS.md`
- External service orchestration: `EXTERNAL_SERVICES_INTEGRATION.md`
- Localization documentation: `TRANSLATION_SUMMARY.md`, `TRANSLATION_GUIDE.md`
- Accessibility baseline: `amplifier/docs/design/knowledge-base/accessibility.md`
- Recent state-of-the-union: `CLEANUP_SUMMARY.md`, `docs/logs/SESSION_SUMMARY.md`, `docs/logs/UI_ENHANCEMENTS_SUMMARY.md`
- Screen generation blueprint: `docs/SCREEN_GENERATION_PLAN.md`

## 9. Platform Targets
- Android minimum: API 22 (Android 5.1 Lollipop). For devices below this, consider a PWA fallback with reduced animations and careful memory usage.

Use this brief as seed context, and expand with the referenced files if the LLM needs implementation-level detail.
