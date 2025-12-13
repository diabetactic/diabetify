# [RN] NativeWind baseline + theme tokens + persisted theme setting (light/dark/system)

**Type:** Feature / Foundation  
**Priority:** P0  
**Suggested labels:** `rn-migration`, `ui`, `nativewind`, `theme`, `agent-ready`  
**Suggested owner:** Jules (UI wiring) + Codex (settings persistence)

## Context

Current app supports light/dark themes and uses Tailwind + DaisyUI with Ionic CSS variables defined in `src/global.css`.

For RN parity, we need:

- light/dark/system theme selection
- consistent color tokens that map to the current design language (primary, success, warning, danger, background, text)
- agent-friendly styling approach (NativeWind)

## Goal

Setup NativeWind for RN and provide a stable token system that agents can use without inventing colors.

## Scope

1. Configure NativeWind (tailwind config + babel/metro integration as required).
2. Define tokens:
   - `colors.primary`, `colors.success`, `colors.warning`, `colors.danger`
   - `colors.bg`, `colors.card`, `colors.text`
3. Implement theme state:
   - value: `light|dark|system`
   - persisted in SQLite `settings` table OR small key/value store (choose one and document)
4. Provide `useTheme()` hook and `ThemeProvider` that:
   - applies theme class for NativeWind
   - respects “system” changes

## Non-goals

- Full UI component library.
- Screen-by-screen restyling (later issues).

## Deliverables

- `diabetify-rn/tailwind.config.js` (or `.cjs`) with theme tokens
- `diabetify-rn/global.css` if required by NativeWind setup
- `diabetify-rn/src/ui/theme/*`:
  - `ThemeProvider.tsx`
  - `useTheme.ts`

## Acceptance criteria

- [ ] A sample screen can toggle theme and persists across app restart.
- [ ] NativeWind classes work in RN components.
- [ ] Token names are documented and reused (no “random hex in components”).

## Implementation notes

- Use current app’s primary colors from `src/global.css` as the initial baseline.
- Prefer one “brand primary” and ensure contrast in dark mode.

## Agent packet

**Rules**

- No hardcoded colors in components unless via tokens.
- Theme selection must persist.
