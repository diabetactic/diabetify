# Integration Tests

This directory contains integration tests that verify multiple services working together correctly.

## Test Files

### 1. `auth-flow.integration.spec.ts` (13 tests)

Tests the complete authentication flow across LocalAuthService, ProfileService, and ApiGatewayService.

**Test Coverage:**

- **Complete Login Flow** (3 tests)
  - Login → Profile fetch → Token storage
  - Account pending state handling
  - Account disabled state handling
- **Profile Sync After Login** (2 tests)
  - Local profile creation from backend data
  - Profile preferences update
- **Token Refresh Flow** (2 tests)
  - Expired token refresh with new credentials
  - Refresh token failure and session cleanup
- **Logout Flow** (1 test)
  - Complete auth and profile data cleanup
- **Error Handling** (3 tests)
  - Network errors during login
  - Invalid credentials (401 errors)
  - Profile fetch failure after successful token
- **Concurrent Request Handling** (1 test)
  - Multiple authenticated requests with single token
- **Integration Testing** (1 test)
  - Service coordination and state management

**Key Features Tested:**

- JWT token lifecycle (obtain, store, refresh, expire)
- User profile synchronization
- Account state validation (pending, active, disabled)
- Error propagation across services
- Storage persistence (Capacitor Preferences)
- Concurrent request coordination

---

### 2. `readings-sync.integration.spec.ts` (13 tests)

Tests the complete glucose readings sync flow across ReadingsService, DatabaseService (Dexie), and ApiGatewayService.

**Test Coverage:**

- **Add Reading Flow** (2 tests)
  - Reading added to IndexedDB and sync queue
  - Status calculation (critical-low, low, normal, high, critical-high)
- **Sync Queue Processing** (4 tests)
  - Pending reading sync to backend
  - Sync failure retry with exponential backoff
  - Queue cleanup after max retries
  - Batch sync of multiple readings
- **Backend Fetch and Merge** (2 tests)
  - Fetch readings from backend and merge with local storage
  - Conflict resolution using server as source of truth
- **Update Reading Flow** (1 test)
  - Local update and sync queue management
- **Delete Reading Flow** (1 test)
  - Local deletion and queue management
- **Offline Behavior** (1 test)
  - Queue readings when offline, sync when online
- **Full Sync Flow** (1 test)
  - Bidirectional sync (push local + fetch backend)
- **Integration Testing** (1 test)
  - Service coordination and data consistency

**Key Features Tested:**

- IndexedDB CRUD operations with Dexie
- Sync queue management (create, update, delete operations)
- Backend API integration (POST /glucose/create, GET /glucose/mine)
- Retry logic with exponential backoff
- Conflict resolution (server wins)
- Offline-first architecture
- Transaction-based consistency

---

### 3. `offline-online.integration.spec.ts` (13 tests)

Tests the complete offline-first behavior across ReadingsService, DatabaseService, Network detection, and ApiGatewayService.

**Test Coverage:**

- **Offline Reading Creation** (3 tests)
  - Store readings locally when offline
  - Skip sync attempts when offline
  - Allow reading local data when offline
- **Offline-to-Online Transition** (2 tests)
  - Automatic sync when coming online
  - Partial sync failure handling
- **Intermittent Connectivity** (2 tests)
  - Network drops during sync
  - Network status change detection
- **Data Consistency During Sync** (2 tests)
  - Transaction locking prevents duplicate syncs
  - Data integrity across offline updates
- **Offline Statistics and Queries** (2 tests)
  - Calculate statistics from local data
  - Filter readings by date range
- **Long-term Offline Usage** (1 test)
  - Extended offline period with many readings
- **Bidirectional Sync After Offline Period** (1 test)
  - Full sync after extended offline usage

**Key Features Tested:**

- Capacitor Network plugin integration
- Offline queue persistence
- Automatic sync trigger on network restore
- Partial failure recovery
- Transaction-based consistency
- Long-term offline data accumulation
- Bidirectional sync (local changes + server updates)
- Network status monitoring

---

## Test Architecture

### Service Integration Points

```
┌─────────────────────┐
│  LocalAuthService   │──────┐
└─────────────────────┘      │
                              │
┌─────────────────────┐      │    ┌──────────────────┐
│  ProfileService     │──────┼───▶│ ApiGatewayService│
└─────────────────────┘      │    └──────────────────┘
                              │            │
┌─────────────────────┐      │            │
│  ReadingsService    │──────┘            │
└─────────────────────┘                   │
         │                                 │
         │                                 ▼
         ▼                        ┌─────────────────┐
┌─────────────────────┐           │ CapacitorHttp   │
│  DatabaseService    │           │   (HTTP Layer)  │
│     (Dexie)         │           └─────────────────┘
└─────────────────────┘                   │
         │                                 │
         ▼                                 ▼
┌─────────────────────┐           ┌─────────────────┐
│    IndexedDB        │           │  Backend API    │
│  (Offline Storage)  │           │  (Heroku)       │
└─────────────────────┘           └─────────────────┘
```

### Test Patterns

#### 1. Mock HTTP Layer

All tests mock `CapacitorHttpService` to avoid real network calls:

```typescript
mockCapacitorHttp = jasmine.createSpyObj('CapacitorHttpService', [
  'get',
  'post',
  'put',
  'delete',
  'patch',
]);
```

#### 2. Real Service Instances

Tests use real service classes (not mocks) to verify actual coordination:

```typescript
TestBed.configureTestingModule({
  providers: [
    ReadingsService, // Real service
    ApiGatewayService, // Real service
    { provide: CapacitorHttpService, useValue: mockCapacitorHttp }, // Mocked HTTP
  ],
});
```

#### 3. IndexedDB Testing

Tests use `fake-indexeddb` for realistic database operations:

```typescript
import 'fake-indexeddb/auto';
import { db } from '../../core/services/database.service';

beforeEach(async () => {
  await db.readings.clear();
  await db.syncQueue.clear();
});
```

#### 4. Capacitor Plugin Mocks

Network status is controlled via jest mocks:

```typescript
import { Network } from '@capacitor/network';

const simulateOffline = () => {
  (Network.getStatus as jest.Mock).mockResolvedValue({ connected: false });
};

const simulateOnline = () => {
  (Network.getStatus as jest.Mock).mockResolvedValue({ connected: true });
};
```

---

## Running Tests

```bash
# Run all integration tests
npm test -- --testPathPattern="integration"

# Run specific test file
npm test -- auth-flow.integration.spec.ts

# Run with coverage
npm test -- --testPathPattern="integration" --coverage

# Run in watch mode
npm test -- --testPathPattern="integration" --watch

# Run with verbose output
npm test -- --testPathPattern="integration" --verbose
```

---

## Test Results

**Status:** ✅ All 13 tests passing

```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        4.919 s
```

---

## Key Testing Principles

1. **Real Service Coordination**: Tests use actual service instances to verify integration
2. **Mocked HTTP Layer**: Backend calls are mocked to avoid external dependencies
3. **IndexedDB Persistence**: Uses fake-indexeddb for realistic offline storage
4. **Network Simulation**: Capacitor Network plugin mocked for offline/online scenarios
5. **Transaction Safety**: Tests verify Dexie transaction-based consistency
6. **Error Propagation**: Validates errors flow correctly between services
7. **State Management**: Verifies BehaviorSubject streams update correctly
8. **Async Coordination**: Tests Promise-based async flows across services

---

## Future Enhancements

- [ ] Add appointment sync integration tests
- [ ] Add profile backend update integration tests
- [ ] Add token expiration auto-refresh tests
- [ ] Add concurrent multi-tab sync tests
- [ ] Add IndexedDB quota management tests
- [ ] Add service worker sync tests
- [ ] Add conflict resolution stress tests
- [ ] Add real backend integration tests (E2E)
