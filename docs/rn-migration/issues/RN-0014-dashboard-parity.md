# [RN] Dashboard parity: stats + simple trends computed from local SQLite (offline-safe)

**Type:** Feature / UI + Domain  
**Priority:** P1 (after readings UI exists)  
**Suggested labels:** `rn-migration`, `dashboard`, `offline-first`, `agent-ready`  
**Suggested owner:** Jules

## Context

Dashboard parity requires:

- show stats computed from readings
- show simple trend visualization
- work fully offline from local DB

We should start with simple visualizations first; postpone Skia/Victory complexity until after parity.

## Goal

Implement dashboard screen that:

- fetches readings from local DB (last N days)
- computes stats locally (avg, in-range %, count, low/high counts)
- renders a simple trend (even if basic line using SVG or a minimal chart)

## Scope

1. Domain stats functions

- `src/domain/glucose/stats.ts`:
  - `computeStats(readings, rangeMin, rangeMax)`
  - `groupByDay(readings)` (optional)

2. Dashboard route

- `app/(tabs)/index.tsx` (or `dashboard.tsx`)

3. UI components

- `StatsCard`, `TrendPreview` components

## Non-goals

- High-performance interactive charts.
- ML/predictions.

## Deliverables

- Dashboard screen and components
- Unit tests for stat calculations

## Acceptance criteria

- [ ] Dashboard renders offline using only local DB.
- [ ] Stats are correct for a known fixture dataset.
- [ ] No network calls occur to render the dashboard (unless explicitly “refresh”).

## Agent packet

**Rules**

- Use i18n keys for labels.
- Use theme tokens for colors.
