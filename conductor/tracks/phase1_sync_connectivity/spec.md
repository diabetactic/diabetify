# Spec: Synchronization & Connectivity

## Goal

Solidify the application's data layer to ensure reliable offline-first synchronization, real-time updates via push notifications, and robust backend integration.

## Core Features

1.  **Push Notification Integration**
    - Enable FCM (Firebase Cloud Messaging).
    - User preferences for notification types.
    - Reliable background/foreground handling.

2.  **Sync Conflict Resolution**
    - UI for users to resolve data conflicts.
    - Logic to handle merge strategies (Server vs. Local).

3.  **Backend API Completion**
    - Full coverage of API endpoints in `ApiGatewayService`.
    - Standardized error handling and retry logic.

## Success Metrics

- Notifications are received on physical devices within 5 seconds.
- Data conflicts trigger the resolution UI.
- No unhandled API exceptions in the logs.
