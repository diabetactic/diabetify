# Architecture: Readings, Appointments & Data Integration

**Status**: Foundation Document for Upcoming Features
**Date**: 2025-10-26
**Purpose**: Establish architectural foundation for manual readings, appointment integration, and Tidepool data sync

---

## Executive Summary

This document defines the architecture for three interconnected data flows:
1. **Manual Glucose Readings** - User-entered blood glucose data
2. **Appointment Management** - Healthcare provider scheduling with glucose data sharing
3. **Tidepool Sync** - Bidirectional synchronization of glucose readings from CGM devices

### Current Implementation Status

| Feature | Status | Completeness | Notes |
|---------|--------|--------------|-------|
| Manual Reading Form | ✅ Implemented | 95% | Fully functional with validation |
| ReadingsService | ✅ Production-ready | 100% | Complete CRUD + statistics |
| AppointmentService | ✅ Production-ready | 100% | HTTP-based backend integration |
| TidepoolSyncService | ✅ Production-ready | 100% | Full/incremental sync with pagination |
| TidepoolStorageService | ✅ Production-ready | 100% | Data transformation + deduplication |
| DatabaseService (Dexie) | ✅ Production-ready | 100% | IndexedDB with reactive queries |

---

## 1. Data Model Architecture

### 1.1 Glucose Reading Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     GLUCOSE READING SOURCES                      │
├─────────────────┬─────────────────┬────────────────────────────┤
│  Manual Entry   │  Tidepool API   │  BLE Devices (Future)      │
│  (Add-Reading)  │  (CGM/Pump)     │  (Bluetooth Meters)        │
└────────┬────────┴────────┬────────┴────────┬───────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
    ┌────────────────────────────────────────────┐
    │        TidepoolStorageService              │
    │  - Transform to standard format            │
    │  - Duplicate detection                     │
    │  - Unit conversion (mg/dL ↔ mmol/L)       │
    └──────────────────┬─────────────────────────┘
                       │
                       ▼
    ┌────────────────────────────────────────────┐
    │      DatabaseService (IndexedDB/Dexie)     │
    │  - Persistent storage                      │
    │  - Indexed queries (time, type, userId)    │
    │  - Sync queue for offline operations       │
    └──────────────────┬─────────────────────────┘
                       │
                       ▼
    ┌────────────────────────────────────────────┐
    │           ReadingsService                  │
    │  - CRUD operations                         │
    │  - Statistics calculation                  │
    │  - Reactive state (RxJS Observables)       │
    │  - Status determination                    │
    └──────────────────┬─────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  ┌─────────────┐           ┌──────────────────┐
  │ Dashboard   │           │ Readings List    │
  │ Statistics  │           │ Timeline View    │
  └─────────────┘           └──────────────────┘
```

### 1.2 Core Data Structures

#### GlucoseReading (Tidepool Standard)
```typescript
type GlucoseReading = CBGReading | SMBGReading;

interface SMBGReading {
  id: string;                    // Tidepool ID or generated local ID
  type: 'smbg';                  // Self-Monitored Blood Glucose
  value: number;                 // Glucose concentration
  units: 'mg/dL' | 'mmol/L';     // Unit of measurement
  time: string;                  // ISO 8601 UTC timestamp
  subType?: 'manual' | 'linked'; // Entry method
  notes?: string[];              // User annotations
  tags?: string[];               // Meal context, etc.
  deviceId?: string;             // Source device
}
```

#### LocalGlucoseReading (App-Extended)
```typescript
interface LocalGlucoseReading extends GlucoseReading {
  localId?: string;              // Local database key
  synced: boolean;               // Sync status with Tidepool
  status?: GlucoseStatus;        // Derived: low/normal/high/critical
  userId?: string;               // Owner identifier
  localStoredAt?: string;        // Local storage timestamp
  isLocalOnly?: boolean;         // Not yet uploaded to Tidepool
}
```

#### Appointment (Backend Integration)
```typescript
interface Appointment {
  id?: string;
  patientId: string;
  doctorId: string;
  date: string;                  // YYYY-MM-DD
  startTime: string;             // HH:MM
  endTime: string;               // HH:MM
  status: AppointmentStatus;     // pending/confirmed/cancelled/completed
  urgency: AppointmentUrgency;   // routine/urgent/emergency
  reason: string;
  notes?: string;
  videoCallUrl?: string;
  glucoseDataShared?: boolean;   // Key integration point
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 2. Manual Reading Form Architecture

### 2.1 Current Implementation (`add-reading.page.ts`)

**Location**: `src/app/add-reading/`

**Key Features**:
- ✅ Reactive form with real-time validation
- ✅ Dynamic validators based on glucose unit (mg/dL vs mmol/L)
- ✅ Real-time glucose status preview (critical-low → critical-high)
- ✅ Meal context selection (before-breakfast, after-lunch, etc.)
- ✅ Notes field with character counter (500 char limit)
- ✅ DateTime picker (Ionic native component)
- ✅ Unit-aware input (respects user preference from profile)

**Form Fields**:
```typescript
{
  value: number,          // Required, range: 20-600 mg/dL or 1.1-33.3 mmol/L
  datetime: string,       // Required, ISO 8601, max: now
  mealContext: string,    // Optional, enum: 9 meal contexts
  notes: string          // Optional, max 500 chars
}
```

**Validation Rules**:
- mg/dL: Min 20, Max 600
- mmol/L: Min 1.1, Max 33.3
- DateTime: Cannot be in future
- Real-time status calculation on value change

**Status Ranges** (always calculated in mg/dL):
- Critical Low: < 54 mg/dL (⚠️)
- Low: 54-69 mg/dL (⬇️)
- Normal: 70-180 mg/dL (✅)
- High: 181-250 mg/dL (⬆️)
- Critical High: > 250 mg/dL (⚠️)

### 2.2 Save Flow

```
User fills form → Validation → Create GlucoseReading object
                                        ↓
                              ReadingsService.addReading()
                                        ↓
                    Transform to LocalGlucoseReading + calculate status
                                        ↓
                              Save to IndexedDB (Dexie)
                                        ↓
                    Add to sync queue (for Tidepool upload)
                                        ↓
                              Navigate to /tabs/readings
                                        ↓
                    readings$ observable auto-updates UI
```

---

## 3. Tidepool Sync Architecture

### 3.1 TidepoolSyncService Capabilities

**Full Sync** (First-time or reset):
- Fetches last 30 days of data (configurable)
- Automatic pagination (100 records per request)
- Stores last sync timestamp in Capacitor Preferences
- Deduplicates via TidepoolStorageService

**Incremental Sync** (Subsequent syncs):
- Fetches only data since last sync timestamp
- Maintains sync history (last 10 entries)
- Network-aware (checks connectivity before sync)
- Exponential backoff retry on failures

**Real-time Status Tracking**:
```typescript
interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: string | null;
  itemsSynced: number;
  itemsFailed: number;
  errors: SyncError[];
  progress: number;  // 0-100
}

// Observable for reactive UI updates
syncStatus$: Observable<SyncStatus>
```

### 3.2 Tidepool API Integration

**Endpoint**: `GET /data/:userId`

**Query Parameters**:
```typescript
{
  type: 'smbg,cbg',           // Glucose reading types
  startDate: '2025-01-01',    // ISO 8601 date
  endDate: '2025-10-26',      // ISO 8601 date
  limit: 100,                 // Pagination batch size
  offset: 0                   // Pagination offset
}
```

**Response Handling**:
1. TidepoolSyncService fetches paginated data
2. TidepoolStorageService transforms each record:
   - Normalizes Tidepool format → LocalGlucoseReading
   - Detects duplicates (by id, time, value, type)
   - Converts units if needed
   - Calculates glucose status
3. DatabaseService stores in IndexedDB
4. readings$ observable notifies UI

### 3.3 Duplicate Detection Strategy

**Primary Key**: Tidepool `id` field
**Fallback Keys**: `(time, value, type, userId)`

```typescript
// TidepoolStorageService.storeReadings()
1. Check if reading.id exists in database
2. If exists → Skip (already synced)
3. If not exists → Check (time, value, type) tuple
4. If tuple match → Skip (duplicate from different source)
5. Otherwise → Add to database
```

---

## 4. Appointment-Glucose Integration

### 4.1 Appointment Service Architecture

**Backend URL**: Configurable via `environment.backendServices.appointments`

**Key Endpoints**:
- `GET /appointments` - List with filters (status, date range)
- `POST /appointments` - Create appointment request
- `PUT /appointments/:id` - Update appointment
- `PUT /appointments/:id/cancel` - Cancel with reason
- `POST /appointments/:id/share-glucose` - Share glucose data

**Reactive State**:
```typescript
appointments$: Observable<Appointment[]>
upcomingAppointment$: Observable<Appointment | null>
```

### 4.2 Glucose Data Sharing Flow

**Use Case**: Patient shares glucose readings with doctor before/during appointment

```
┌─────────────────────────────────────────────────┐
│ 1. User books appointment                      │
│    createAppointment({                          │
│      doctorId, date, time,                      │
│      shareGlucoseData: true                     │
│    })                                           │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 2. Backend creates appointment                 │
│    appointment.glucoseDataShared = true         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 3. AppointmentService.shareGlucoseData()       │
│    POST /appointments/:id/share-glucose         │
│    {                                            │
│      startDate: appointment.date - 30 days,     │
│      endDate: appointment.date                  │
│    }                                            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│ 4. Backend queries ReadingsService              │
│    getReadingsByDateRange(start, end)           │
│    - Fetches all readings in window             │
│    - Includes manual + Tidepool + BLE           │
│    - Transmits to doctor's dashboard            │
└─────────────────────────────────────────────────┘
```

**Shareable Data Window**: Default 30 days before appointment

### 4.3 Dashboard Integration Points

**Upcoming Appointment Card** (`dashboard/tab1.page.ts`):
- Display next confirmed appointment
- Show doctor name, specialty, date/time
- "Share Latest Readings" button
  - Triggers `shareGlucoseData()` with date range
  - Shows confirmation toast with record count

**Appointment Detail Page** (Future):
- Full appointment info
- Glucose data sharing toggle
- Date range selector for sharing
- Real-time sync status during share

---

## 5. Implementation Roadmap

### Phase 1: Current State Validation ✅
- [x] Manual reading form fully functional
- [x] ReadingsService complete with statistics
- [x] TidepoolSyncService operational
- [x] AppointmentService HTTP integration ready
- [x] DatabaseService with Dexie reactive queries

### Phase 2: UI/UX Enhancements (Upcoming)
#### 2.1 Add-Reading Form Improvements
- [ ] **Quick Entry Mode**: Single-screen value entry with preset meal contexts
- [ ] **Photo Attachment**: Capture meter display photo for reference
- [ ] **Insulin Correlation**: Optional insulin dose entry (requires new model)
- [ ] **Activity Tags**: Exercise, stress, illness flags
- [ ] **Trend Predictions**: Show estimated next reading based on history

#### 2.2 Readings List Enhancements
- [ ] **Inline Editing**: Tap reading to edit without navigation
- [ ] **Bulk Actions**: Multi-select for delete/export
- [ ] **Advanced Filters**: Status, source (manual/Tidepool/BLE), tags
- [ ] **Export Options**: PDF, CSV, share with doctor
- [ ] **Meal Context Icons**: Visual indicators for breakfast/lunch/dinner

### Phase 3: Appointment-Glucose Integration
#### 3.1 Dashboard Integration
- [ ] **Appointment Widget**: Show upcoming appointment with countdown
- [ ] **Pre-Appointment Reminder**: "Appointment in 24h - Share readings?"
- [ ] **One-Tap Share**: Quick share last 30 days of readings
- [ ] **Share Confirmation**: Show count + date range before sending

#### 3.2 Appointment Management
- [ ] **Create Appointment UI**: Book appointment with doctor selection
- [ ] **Glucose Share Toggle**: Opt-in during booking flow
- [ ] **Share History**: View past shared data (date, record count, doctor)
- [ ] **Revoke Access**: Option to un-share data post-appointment

#### 3.3 Backend Coordination
- [ ] **API Endpoint**: `POST /appointments/:id/share-glucose`
- [ ] **Request Format**:
  ```typescript
  {
    startDate: string,  // ISO 8601
    endDate: string,    // ISO 8601
    includeManual: boolean,
    includeTidepool: boolean,
    includeBLE: boolean
  }
  ```
- [ ] **Response**:
  ```typescript
  {
    shared: boolean,
    recordCount: number,
    sharedAt: string
  }
  ```

### Phase 4: Tidepool Bidirectional Sync
#### 4.1 Upload Manual Readings to Tidepool
- [ ] **Sync Queue Processing**: Upload unsynced readings from IndexedDB
- [ ] **Rate Limiting**: Respect Tidepool API limits
- [ ] **Conflict Resolution**: Handle duplicate detection on server
- [ ] **Retry Logic**: Exponential backoff for failed uploads

#### 4.2 Offline Support
- [ ] **Queue Management**: Track pending uploads (create/update/delete)
- [ ] **Network Aware**: Pause sync when offline
- [ ] **Auto-Resume**: Resume queue processing on connectivity restore
- [ ] **User Notification**: Show pending upload count in UI

### Phase 5: BLE Device Integration (Future)
- [ ] **Device Scanning**: Discover BLE glucose meters
- [ ] **Pairing Flow**: Connect and save device configuration
- [ ] **Auto-Import**: Automatically fetch readings from paired device
- [ ] **Device Management**: List paired devices, view last sync

---

## 6. Data Flow Diagrams

### 6.1 Manual Reading → Tidepool Upload

```
┌──────────────────┐
│ User enters      │
│ reading manually │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ Add-Reading Form        │
│ - Validates input       │
│ - Calculates status     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ ReadingsService.addReading()    │
│ - Creates LocalGlucoseReading   │
│ - Sets synced: false            │
│ - Sets isLocalOnly: true        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ DatabaseService.readings.add()  │
│ - Stores in IndexedDB           │
│ - Adds to syncQueue table       │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ TidepoolSyncService (Upload)     │
│ - Processes syncQueue            │
│ - POST to Tidepool API           │
│ - Receives Tidepool ID           │
└────────┬─────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Update local reading               │
│ - Set synced: true                 │
│ - Set id: tidepoolId               │
│ - Set isLocalOnly: false           │
│ - Remove from syncQueue            │
└────────────────────────────────────┘
```

### 6.2 Appointment → Glucose Sharing

```
┌──────────────────────────┐
│ User books appointment   │
│ (shareGlucoseData: true) │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ AppointmentService.createAppointment │
│ POST /appointments                   │
└────────┬─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Backend creates appointment             │
│ appointment.glucoseDataShared = pending │
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ AppointmentService.shareGlucoseData()    │
│ POST /appointments/:id/share-glucose     │
│ { startDate, endDate }                   │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Backend queries readings                 │
│ ReadingsService.getReadingsByDateRange() │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Backend transmits to doctor portal   │
│ Returns { shared: true, count: 450 } │
└────────┬─────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ UI shows success toast         │
│ "450 readings shared with      │
│  Dr. Smith for appointment"    │
└────────────────────────────────┘
```

---

## 7. Database Schema (IndexedDB via Dexie)

### 7.1 Readings Table
```typescript
db.readings
  .where('time').between(start, end)  // Range queries
  .where('synced').equals(0)          // Unsynced readings
  .where('userId').equals(id)         // User filter
```

**Indexes**:
- `id` (primary key)
- `time` (for date range queries)
- `type` (cbg vs smbg filter)
- `userId` (multi-user support)
- `synced` (offline queue)
- `localStoredAt` (local modification tracking)

### 7.2 SyncQueue Table
```typescript
interface SyncQueueItem {
  id?: number;                    // Auto-increment
  operation: 'create' | 'update' | 'delete';
  readingId: string;              // Reference to reading
  reading: LocalGlucoseReading;   // Full reading data
  retryCount: number;             // Exponential backoff
  lastAttempt?: string;           // ISO timestamp
  createdAt: string;              // ISO timestamp
}
```

**Purpose**: Offline-first architecture for Tidepool uploads

---

## 8. Testing Strategy

### 8.1 Manual Reading Form
- [x] Unit tests: Form validation logic (ranges, required fields)
- [x] Unit tests: Status calculation (all 5 ranges)
- [ ] E2E tests: Form submission flow
- [ ] E2E tests: Unit preference handling (mg/dL ↔ mmol/L)

### 8.2 ReadingsService
- [ ] Unit tests: CRUD operations with Dexie
- [ ] Unit tests: Statistics calculations (A1C, GMI, TIR)
- [ ] Unit tests: Status determination
- [ ] Integration tests: Sync queue management

### 8.3 TidepoolSyncService
- [ ] Unit tests: Pagination logic
- [ ] Unit tests: Retry with exponential backoff
- [ ] Integration tests: Full sync vs incremental sync
- [ ] Integration tests: Network failure handling

### 8.4 AppointmentService
- [ ] Unit tests: HTTP request building
- [ ] Unit tests: Appointment filtering
- [ ] Integration tests: Backend API communication
- [ ] Integration tests: Glucose data sharing

---

## 9. Configuration & Environment

### 9.1 Environment Variables

```typescript
// src/environments/environment.ts
export const environment = {
  tidepool: {
    baseUrl: 'https://api.tidepool.org',
    clientId: 'TODO_REPLACE_WITH_ACTUAL_ID',
    redirectUri: 'diabetify://oauth/callback',
    scopes: 'data:read data:write profile:read',
    requestTimeout: 30000,
    maxRetries: 3
  },
  backendServices: {
    appointments: {
      baseUrl: 'https://api.diabetify.com',  // TODO: Replace
      apiPath: '/v1/appointments',
      timeout: 30000
    }
  }
};
```

### 9.2 Feature Flags (Future)

```typescript
interface FeatureFlags {
  manualReadings: boolean;        // Default: true
  tidepoolSync: boolean;          // Default: true
  appointmentIntegration: boolean; // Default: true
  bleDevices: boolean;            // Default: false (not implemented)
  glucoseSharing: boolean;        // Default: true
  bidirectionalSync: boolean;     // Default: false (Phase 4)
}
```

---

## 10. Security & Privacy

### 10.1 Data Privacy
- **Local Storage**: All readings encrypted at rest (Capacitor SecureStorage for tokens)
- **Transmission**: HTTPS only for all API calls
- **Sharing Consent**: Explicit user confirmation before sharing with doctors
- **Data Retention**: Configurable auto-deletion of old readings

### 10.2 Access Control
- **User Isolation**: All readings scoped by userId
- **Appointment Access**: Doctors can only access shared data within date range
- **Revocation**: User can revoke shared data access post-appointment
- **Audit Log**: Track all glucose data sharing events

---

## 11. Performance Considerations

### 11.1 IndexedDB Optimization
- **Indexed Queries**: All queries use Dexie indexes (time, type, userId)
- **Pagination**: Large result sets paginated (default 50 records)
- **Lazy Loading**: Readings list uses virtual scrolling (Ionic)

### 11.2 Sync Optimization
- **Batch Size**: 100 records per Tidepool API request
- **Incremental Sync**: Only fetch data since last sync timestamp
- **Background Sync**: Use Capacitor BackgroundTask for periodic sync
- **Network Awareness**: Pause sync on poor connectivity

### 11.3 UI Responsiveness
- **Reactive Observables**: All data streams use RxJS for automatic UI updates
- **Optimistic Updates**: Show UI changes immediately, sync in background
- **Loading States**: Skeleton screens during data fetch
- **Error Boundaries**: Graceful degradation on service failures

---

## 12. Next Steps

### Immediate Actions
1. ✅ **Validate Manual Reading Form** - Ensure all edge cases handled
2. ✅ **Test Tidepool Sync** - Verify full + incremental sync with real account
3. [ ] **Design Appointment UI** - Wireframes for booking + glucose sharing
4. [ ] **Implement Dashboard Widget** - Upcoming appointment card
5. [ ] **Backend API Spec** - Document glucose sharing endpoint contract

### Short-term (Next Sprint)
1. [ ] Add inline editing to readings list
2. [ ] Implement appointment booking UI
3. [ ] Create glucose sharing confirmation dialog
4. [ ] Add share history view

### Long-term (Next Quarter)
1. [ ] Bidirectional Tidepool sync (upload manual readings)
2. [ ] BLE device integration
3. [ ] Advanced analytics dashboard
4. [ ] Multi-user support (family accounts)

---

## Appendix A: API Reference

### ReadingsService API
```typescript
class ReadingsService {
  // Observables
  readings$: Observable<LocalGlucoseReading[]>
  pendingSyncCount$: Observable<number>

  // CRUD
  addReading(reading: GlucoseReading, userId?: string): Promise<LocalGlucoseReading>
  updateReading(id: string, updates: Partial<LocalGlucoseReading>): Promise<LocalGlucoseReading>
  deleteReading(id: string): Promise<void>
  getReadingById(id: string): Promise<LocalGlucoseReading>

  // Queries
  getAllReadings(limit?: number, offset?: number): Promise<PaginatedReadings>
  getReadingsByDateRange(start: Date, end: Date, type?: GlucoseType): Promise<LocalGlucoseReading[]>

  // Statistics
  calculateStatistics(readings: LocalGlucoseReading[], targetRange: GlucoseTargetRange): GlucoseStatistics

  // Sync
  getUnsyncedReadings(): Promise<LocalGlucoseReading[]>
  markAsSynced(id: string): Promise<void>
}
```

### AppointmentService API
```typescript
class AppointmentService {
  // Observables
  appointments$: Observable<Appointment[]>
  upcomingAppointment$: Observable<Appointment | null>

  // CRUD
  getAppointments(status?: AppointmentStatus, startDate?: Date, endDate?: Date): Observable<Appointment[]>
  getAppointment(id: string): Observable<Appointment>
  createAppointment(request: CreateAppointmentRequest): Observable<Appointment>
  updateAppointment(id: string, updates: Partial<Appointment>): Observable<Appointment>
  cancelAppointment(id: string, reason?: string): Observable<Appointment>

  // Glucose Sharing
  shareGlucoseData(appointmentId: string, dateRange?: {start: Date, end: Date}): Observable<{shared: boolean, recordCount: number}>

  // Doctors
  getDoctors(specialty?: string): Observable<Doctor[]>
  getAvailableSlots(doctorId: string, date: Date, days?: number): Observable<TimeSlot[]>
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-26
**Next Review**: After Phase 2 implementation
