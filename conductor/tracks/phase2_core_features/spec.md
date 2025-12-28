# Spec: Core Feature Expansion

## Goal

Deliver high-value functional features that enhance the daily management of diabetes for users.

## Core Features

1.  **Food Database & Barcode Scanning**
    - Integrate barcode scanning via Capacitor plugin.
    - Fetch nutrition data from OpenFoodFacts API.
    - UI for manual food entry and lookup results.

2.  **Bolus Calculator Safety**
    - **Guardrails:** Max bolus limits, Insulin on Board (IOB) checks.
    - **UI:** Display warnings for unsafe inputs before calculation.

3.  **Visualization Enhancements**
    - **Timeline:** Visualize appointment states over time.
    - **Charts:** Interactive trend charts with zoom/pan gestures.

4.  **Home Screen Widgets**
    - Native Android widget displaying the last glucose reading.

## Success Metrics

- Successful barcode scan returns correct product data.
- Bolus calculator prevents submission of excessive dosages.
- Charts respond smoothly to touch gestures.
- Android widget updates within 15 minutes of new reading.
