# Screen Generation Plan (UI Refinement)

Last updated: 2025-10-28

Purpose
- Define exactly which screens to (re)generate with refined UI, what design references to use, and acceptance criteria. Uses `uiResources/` as visual reference but updates flows to match the current app architecture and priorities (Spanish-first, API Gateway, Tidepool-first).

Design System & Constraints
- Spanish is default; auto-detect on first run; manual override in Settings; all copy localized.
- WCAG 2.1 AA (contrast, focus, keyboard) with child-friendly sizing (≥48×48px targets).
- Reuse existing components: `StatCard`, `ReadingItem`, `AlertBanner`, `LanguageSwitcher`, `ServiceMonitor`.
- Min Android: API 22 (5.1 Lollipop). Consider PWA fallback guidance for older devices.

References (uiResources)
- `uiResources/welcome_to_diabetify_2` (welcome/first-run visuals)
- `uiResources/dashboard` (stat cards, quick actions)
- `uiResources/readings_list_1|2|3` (list variants)
- `uiResources/add_reading_form_3|4` (form layout, input sizing)
- `uiResources/profile_page_3` (settings/profile structure)

Screens To Generate/Regenerate

1) Welcome / First-Run Connect
- Route: `/welcome`
- Reference: `uiResources/welcome_to_diabetify_2`
- Purpose: Spanish-first onboarding with primary CTA “Conectar con Tidepool” and secondary CTAs “Añadir lectura” and “Reservar cita”.
- Acceptance:
  - Spanish copy by default; device auto-detect works; manual override available.
  - Clear empty state illustrations, large targets, gentle tone.

2) Dashboard (Connected State)
- Route: `/tabs/dashboard`
- Reference: `uiResources/dashboard` (update to include appointment card)
- Purpose: Show compact stat cards (TIR, Average, GMI), success banner, and “Próxima cita” card with “Compartir últimos 30 días”.
- Acceptance:
  - Stat cards reflect computed values; gradients maintain contrast in light/dark.
  - Appointment card shows provider, date/time, countdown; share CTA triggers flow.

3) Dashboard (First-Run State)
- Route: `/tabs/dashboard` (conditional)
- Reference: `uiResources/dashboard` adapted for empty states
- Purpose: When not connected, emphasize Tidepool connect; when no readings, emphasize add-reading.
- Acceptance:
  - Spanish empty states; clear CTAs; no misleading metrics.

4) Readings List
- Route: `/tabs/readings`
- Reference: `uiResources/readings_list_*`
- Purpose: Chronological list with status indicators; filters (basic v1), inline actions.
- Acceptance:
  - Uses `ReadingItem`; supports mg/dL/mmol/L; accessible list navigation.

5) Add Reading Form
- Route: `/add-reading`
- Reference: `uiResources/add_reading_form_*`
- Purpose: Simple manual entry with value, unit, date/time, optional note and tag.
- Acceptance:
  - Big keypad, error messages in Spanish, guardrails for typical child ranges.

6) Appointments List
- Route: `/appointments`
- Reference: NEW (compose from dashboard style + list pattern)
- Purpose: Show upcoming/past with status; tap to detail.
- Acceptance:
  - List item: provider, date/time, status pill, share icon if applicable.

7) Appointment Detail + Share
- Route: `/appointments/:id`
- Reference: NEW (cards + primary CTA pattern from dashboard)
- Purpose: Detail view with “Compartir últimos 30 días” CTA and advanced date range option.
- Acceptance:
  - Default window 30 days; progress state; success toast with record count and window.

8) Tidepool Connect Screen (Auth Launcher)
- Route: `/auth/tidepool`
- Reference: NEW (welcome visual style)
- Purpose: Explain briefly what connecting does; launch PKCE flow.
- Acceptance:
  - Spanish copy, privacy reassurance, CTA to start OAuth.

9) Tips & Celebrations
- Route: inline on `/tabs/dashboard` (module)
- Reference: Extend `AlertBanner` patterns
- Purpose: “Consejo del día” and celebratory banners (streaks, weekly TIR).
- Acceptance:
  - Localized content, opt-out switch in Settings; complies with A11y.

10) Settings (Language & Gamification)
- Route: `/tabs/profile` (section)
- Reference: `uiResources/profile_page_3`
- Purpose: Language switch (Spanish default), gamification opt-out, basic account info.
- Acceptance:
  - Manual override persists; toggles accessible; clear Spanish labels.

11) Help for Parents (Lightweight)
- Route: `/help/parents`
- Reference: NEW (simple info sheet)
- Purpose: Quick guidance (emergency hints, contact doctor, appointment prep, data sharing).
- Acceptance:
  - Short, friendly Spanish copy; large targets; offline-safe.

What’s Outdated In uiResources and How To Adapt
- Add Appointment card to dashboard and create dedicated Appointments screens (not present in uiResources).
- Replace any English-only copy with Spanish-first variants.
- Ensure gradients and icons meet contrast in dark mode.

Deliverables for the Screen Generator
- For each screen above, generate: HTML structure, SCSS theme (light/dark), Spanish copy strings (keys and values), accessibility annotations (aria-labels, roles), and minimal TS view-model bindings.
- Output format: per-screen `*.page.html`, `*.page.scss`, and a JSON snippet of translation keys.

