# Plan: Synchronization & Connectivity

## Phase 1: Push Notification Finalization

- [ ] Task: Complete `PushNotificationService` implementation and verify FCM token generation.
- [ ] Task: Ensure `NotificationPreferencesComponent` UI correctly updates local state and syncs with backend.
- [ ] Task: Test push notification reception in foreground/background states.
- [ ] Task: Conductor - User Manual Verification 'Push Notification Finalization' (Protocol in workflow.md)

## Phase 2: Sync Conflict Resolution

- [ ] Task: Implement `ConflictResolutionComponent` UI for manual data merging.
- [ ] Task: Integrate conflict detection in `DatabaseService` and trigger UI when necessary.
- [ ] Task: Verify resolution strategies (Server-wins, Local-wins, Merge).
- [ ] Task: Conductor - User Manual Verification 'Sync Conflict Resolution' (Protocol in workflow.md)

## Phase 3: Backend Integration & Cleanup

- [ ] Task: Audit `ApiGatewayService` for missing endpoints from the project documentation.
- [ ] Task: Implement standardized retry logic and offline error banners.
- [ ] Task: Conductor - User Manual Verification 'Backend Integration & Cleanup' (Protocol in workflow.md)
