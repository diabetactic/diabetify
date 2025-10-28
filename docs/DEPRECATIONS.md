# Documentation Deprecations & Cleanups

Last updated: 2025-10-28

Purpose
- Reduce confusion by removing or consolidating placeholder/outdated markdown that doesn’t represent the current Diabetify app or its near-term scope.

Removed (Deleted)
- `extServices/api-gateway/README.md` — empty placeholder, superseded by `EXTERNAL_SERVICES_INTEGRATION.md` and app `ApiGatewayService` docs.
- `extServices/api-gateway-backoffice/README.md` — empty placeholder; not used.
- `extServices/appointments/README.md` — empty placeholder; clinician/admin flows are tracked in `extServices/backoffice-web/README.md` and app architecture docs.
- `extServices/login/README.md` — empty placeholder; auth is documented in `CLAUDE.md` and implemented via `TidepoolAuthService`.

Kept (Relevant to current scope)
- Root product/architecture docs: `README.md`, `CLAUDE.md`, `ARCHITECTURE_READINGS_APPOINTMENTS.md`, `QUICK_REFERENCE_READINGS.md`, `EXTERNAL_SERVICES_INTEGRATION.md`.
- Localization: `TRANSLATION_GUIDE.md`, `TRANSLATION_SUMMARY.md`, `TRANSLATION_MAPPING.md`.
- Recent work: `CLEANUP_SUMMARY.md`, `docs/logs/SESSION_SUMMARY.md`, `docs/logs/UI_ENHANCEMENTS_SUMMARY.md`.
- Tidepool reference: `tidepoolapiref/` (useful for API semantics and data types).
- Backoffice overview: `extServices/backoffice-web/README.md`.

Notes
- Large meta-doc sets under `amplifier/` and `zen-mcp-server/` are not part of the app’s UX feature scope. We are leaving them in place for tooling provenance, but they should not be included in product briefs sent to LLMs for Diabetify. Use `docs/LLM_PROJECT_CONTEXT.md` + `docs/SCREEN_GENERATION_PLAN.md` instead.

