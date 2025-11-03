# Quick Reference: Readings & Appointments Implementation

**Purpose**: Fast lookup for developers implementing upcoming features
**See Also**: `ARCHITECTURE_READINGS_APPOINTMENTS.md` for detailed architecture

---

## 1. Key File Locations

### Core Services

```
src/app/core/services/
├── readings.service.ts              ✅ Production-ready
├── appointment.service.ts           ✅ Production-ready
├── tidepool-sync.service.ts         ✅ Production-ready
├── tidepool-storage.service.ts      ✅ Production-ready
└── database.service.ts              ✅ Production-ready
```

### Models

```
src/app/core/models/
├── glucose-reading.model.ts         ✅ Complete (Tidepool standard)
├── tidepool-sync.model.ts           ✅ Complete
└── user-profile.model.ts            ✅ Complete
```

### Pages

```
src/app/
├── add-reading/                     ✅ 95% complete (functional)
│   ├── add-reading.page.ts
│   └── add-reading.page.html
├── dashboard/                        ⚠️ 15% complete (UI shell)
├── readings/                         ⚠️ 15% complete (UI shell)
└── profile/                          ⚠️ 15% complete (UI shell)
```

---

## 2. Common Code Snippets

### 2.1 Add Manual Reading

```typescript
// In add-reading.page.ts (already implemented)
async onSubmit(): Promise<void> {
  const formValue = this.readingForm.value;

  const reading: GlucoseReading = {
    id: '',  // Will be generated
    type: 'smbg',
    value: parseFloat(formValue.value),
    units: this.currentUnit,
    time: formValue.datetime,
    subType: 'manual',
    notes: formValue.notes ? [formValue.notes] : undefined,
    tags: formValue.mealContext ? [formValue.mealContext] : undefined,
  };

  await this.readingsService.addReading(reading);
  await this.router.navigate(['/tabs/readings']);
}
```

### 2.2 Fetch Readings for Date Range

```typescript
// Get last 30 days of readings
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const readings = await this.readingsService.getReadingsByDateRange(
  startDate,
  endDate
);

console.log(`Found ${readings.length} readings`);
```

### 2.3 Subscribe to Readings Observable

```typescript
// In dashboard.page.ts (to implement)
ngOnInit() {
  this.readingsService.readings$
    .pipe(takeUntil(this.destroy$))
    .subscribe(readings => {
      this.allReadings = readings;
      this.updateDashboardStats(readings);
    });
}
```

### 2.4 Trigger Tidepool Sync

```typescript
// Manual sync trigger
async syncWithTidepool(): Promise<void> {
  this.isLoading = true;

  try {
    await this.tidepoolSyncService.syncData({
      forceFullSync: false,  // Use incremental
      maxRetries: 3,
      batchSize: 100
    }).toPromise();

    await this.showToast('Sync complete', 'success');
  } catch (error) {
    await this.showToast('Sync failed', 'danger');
  } finally {
    this.isLoading = false;
  }
}
```

### 2.5 Share Glucose Data with Doctor

```typescript
// In appointment detail page (to implement)
async shareGlucoseWithDoctor(appointmentId: string): Promise<void> {
  const appointmentDate = new Date(this.appointment.date);
  const startDate = new Date(appointmentDate);
  startDate.setDate(startDate.getDate() - 30);  // 30 days before

  try {
    const result = await this.appointmentService.shareGlucoseData(
      appointmentId,
      { start: startDate, end: appointmentDate }
    ).toPromise();

    await this.showToast(
      `${result.recordCount} readings shared with doctor`,
      'success'
    );
  } catch (error) {
    await this.showToast('Failed to share data', 'danger');
  }
}
```

### 2.6 Calculate Statistics

```typescript
// Get statistics for readings
const stats = this.readingsService.calculateStatistics(
  readings,
  {
    low: 70,   // mg/dL
    high: 180  // mg/dL
  }
);

console.log(`Average: ${stats.average} mg/dL`);
console.log(`Time in Range: ${stats.timeInRange}%`);
console.log(`Estimated A1C: ${stats.estimatedA1C}%`);
console.log(`GMI: ${stats.gmi}%`);
```

---

## 3. Data Type Quick Reference

### GlucoseReading (Tidepool Standard)

```typescript
interface SMBGReading {
  id: string;
  type: 'smbg';
  value: number;
  units: 'mg/dL' | 'mmol/L';
  time: string;  // ISO 8601
  subType?: 'manual' | 'linked';
  notes?: string[];
  tags?: string[];
}
```

### LocalGlucoseReading (App Extended)

```typescript
interface LocalGlucoseReading extends GlucoseReading {
  localId?: string;
  synced: boolean;
  status?: 'low' | 'normal' | 'high' | 'critical-low' | 'critical-high';
  userId?: string;
  localStoredAt?: string;
  isLocalOnly?: boolean;
}
```

### Appointment

```typescript
interface Appointment {
  id?: string;
  patientId: string;
  doctorId: string;
  date: string;              // YYYY-MM-DD
  startTime: string;         // HH:MM
  endTime: string;           // HH:MM
  status: AppointmentStatus;
  urgency: AppointmentUrgency;
  reason: string;
  glucoseDataShared?: boolean;  // ← Integration point
}
```

---

## 4. Observable Patterns

### Service Observables Available

```typescript
// ReadingsService
this.readingsService.readings$               // All readings (sorted by time desc)
this.readingsService.pendingSyncCount$       // Count of unsynced readings

// TidepoolSyncService
this.tidepoolSyncService.syncStatus$         // Real-time sync status

// AppointmentService
this.appointmentService.appointments$        // All appointments
this.appointmentService.upcomingAppointment$ // Next confirmed appointment

// ProfileService
this.profileService.profile$                 // User profile with preferences
```

### Subscription Pattern

```typescript
export class MyPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.readingsService.readings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(readings => {
        // Handle updates
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 5. Common UI Patterns

### 5.1 Loading State

```typescript
isLoading = false;

async loadData() {
  this.isLoading = true;
  try {
    const data = await this.readingsService.getAllReadings(50);
    this.readings = data.readings;
  } finally {
    this.isLoading = false;
  }
}
```

### 5.2 Toast Notifications

```typescript
async showToast(message: string, color: 'success' | 'danger' | 'warning') {
  const toast = await this.toastController.create({
    message,
    duration: 2000,
    position: 'bottom',
    color,
  });
  await toast.present();
}
```

### 5.3 Pull-to-Refresh

```html
<ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
  <ion-refresher-content></ion-refresher-content>
</ion-refresher>
```

```typescript
async doRefresh(event: any) {
  try {
    await this.tidepoolSyncService.syncData().toPromise();
  } finally {
    event.target.complete();
  }
}
```

---

## 6. Validation Rules

### Glucose Values

- **mg/dL**: Min 20, Max 600
- **mmol/L**: Min 1.1, Max 33.3
- **Conversion**: `mg/dL = mmol/L × 18.0182`

### Status Ranges (always in mg/dL)

- Critical Low: < 54
- Low: 54-69
- Normal: 70-180
- High: 181-250
- Critical High: > 250

### Form Validation

```typescript
// Dynamic validators based on unit
if (unit === 'mmol/L') {
  valueControl.setValidators([
    Validators.required,
    Validators.min(1.1),
    Validators.max(33.3)
  ]);
} else {
  valueControl.setValidators([
    Validators.required,
    Validators.min(20),
    Validators.max(600)
  ]);
}
```

---

## 7. Database Queries (Dexie)

### Get All Readings (Sorted)

```typescript
const readings = await db.readings
  .orderBy('time')
  .reverse()
  .toArray();
```

### Date Range Query

```typescript
const readings = await db.readings
  .where('time')
  .between(startDate, endDate, true, true)
  .toArray();
```

### Unsynced Readings

```typescript
const unsynced = await db.readings
  .where('synced')
  .equals(0)
  .toArray();
```

### Paginated Query

```typescript
const readings = await db.readings
  .orderBy('time')
  .reverse()
  .offset(offset)
  .limit(limit)
  .toArray();
```

---

## 8. Environment Configuration

### Current Settings

```typescript
// src/environments/environment.ts
tidepool: {
  baseUrl: 'https://api.tidepool.org',
  clientId: 'TODO_REPLACE_WITH_ACTUAL_ID',  // ← ACTION REQUIRED
  redirectUri: 'diabetify://oauth/callback',
  scopes: 'data:read data:write profile:read',
  requestTimeout: 30000,
  maxRetries: 3
}

backendServices: {
  appointments: {
    baseUrl: 'https://api.diabetify.com',   // ← ACTION REQUIRED
    apiPath: '/v1/appointments',
    timeout: 30000
  }
}
```

---

## 9. Error Handling Patterns

### Try-Catch with Toast

```typescript
async saveReading() {
  try {
    await this.readingsService.addReading(reading);
    await this.showToast('Reading saved', 'success');
  } catch (error) {
    console.error('Save failed:', error);
    await this.showToast(
      error.message || 'Failed to save reading',
      'danger'
    );
  }
}
```

### Observable Error Handling

```typescript
this.tidepoolSyncService.syncData()
  .pipe(
    catchError(error => {
      this.showToast('Sync failed', 'danger');
      return of(null);
    })
  )
  .subscribe(result => {
    if (result) {
      this.showToast('Sync complete', 'success');
    }
  });
```

---

## 10. Testing Utilities

### Mock Reading Generator

```typescript
function createMockReading(
  value: number,
  daysAgo: number = 0
): LocalGlucoseReading {
  const time = new Date();
  time.setDate(time.getDate() - daysAgo);

  return {
    id: `reading_${Date.now()}`,
    localId: `local_${Date.now()}`,
    type: 'smbg',
    value,
    units: 'mg/dL',
    time: time.toISOString(),
    subType: 'manual',
    synced: false,
    isLocalOnly: true,
    userId: 'test-user',
    localStoredAt: new Date().toISOString(),
  };
}
```

### Mock Service

```typescript
const mockReadingsService = jasmine.createSpyObj('ReadingsService', [
  'addReading',
  'getAllReadings',
  'getReadingsByDateRange',
  'calculateStatistics'
]);

mockReadingsService.readings$ = of([
  createMockReading(120, 0),
  createMockReading(95, 1),
]);
```

---

## 11. Next Implementation Steps

### Priority 1: Dashboard Integration

**File**: `src/app/dashboard/tab1.page.ts`

```typescript
// 1. Subscribe to readings
this.readingsService.readings$.subscribe(readings => {
  this.recentReadings = readings.slice(0, 5);  // Last 5
  this.stats = this.readingsService.calculateStatistics(readings, {
    low: 70,
    high: 180
  });
});

// 2. Subscribe to upcoming appointment
this.appointmentService.upcomingAppointment$.subscribe(apt => {
  this.upcomingAppointment = apt;
});

// 3. Add quick actions
async shareReadingsForAppointment() {
  const result = await this.appointmentService.shareGlucoseData(
    this.upcomingAppointment.id,
    { start: thirtyDaysAgo, end: appointmentDate }
  ).toPromise();

  await this.showToast(`${result.recordCount} readings shared`, 'success');
}
```

### Priority 2: Readings List Enhancement

**File**: `src/app/readings/tab1.page.ts`

```typescript
// 1. Add inline edit
onReadingClick(reading: LocalGlucoseReading) {
  this.router.navigate(['/add-reading'], {
    queryParams: { id: reading.id, mode: 'edit' }
  });
}

// 2. Add bulk delete
selectedReadings: Set<string> = new Set();

async deleteSelected() {
  for (const id of this.selectedReadings) {
    await this.readingsService.deleteReading(id);
  }
  this.selectedReadings.clear();
  await this.showToast('Readings deleted', 'success');
}
```

### Priority 3: Appointment Booking UI

**New File**: `src/app/appointment-booking/`

```typescript
// 1. Create booking form
bookingForm = this.fb.group({
  doctorId: ['', Validators.required],
  date: ['', Validators.required],
  timeSlot: ['', Validators.required],
  reason: ['', Validators.required],
  shareGlucoseData: [true]  // Default to sharing
});

// 2. Submit appointment
async onSubmit() {
  const appointment = await this.appointmentService.createAppointment({
    doctorId: this.bookingForm.value.doctorId,
    date: this.bookingForm.value.date,
    startTime: this.bookingForm.value.timeSlot.start,
    endTime: this.bookingForm.value.timeSlot.end,
    urgency: 'routine',
    reason: this.bookingForm.value.reason,
    shareGlucoseData: this.bookingForm.value.shareGlucoseData
  }).toPromise();

  await this.router.navigate(['/appointments', appointment.id]);
}
```

---

## 12. Performance Tips

### Pagination for Large Datasets

```typescript
// Don't load all readings at once
const { readings, hasMore } = await this.readingsService.getAllReadings(50, 0);

// Use virtual scroll in template
<ion-virtual-scroll [items]="readings" approxItemHeight="80px">
  <app-reading-item *virtualItem="let reading" [reading]="reading">
  </app-reading-item>
</ion-virtual-scroll>
```

### Debounce Search

```typescript
searchControl = new FormControl();

ngOnInit() {
  this.searchControl.valueChanges
    .pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    )
    .subscribe(term => this.filterReadings(term));
}
```

### Optimize Statistics Calculation

```typescript
// Cache stats, recalculate only when readings change
private cachedStats: GlucoseStatistics | null = null;

get statistics(): GlucoseStatistics {
  if (!this.cachedStats || this.readingsChanged) {
    this.cachedStats = this.readingsService.calculateStatistics(
      this.allReadings,
      this.targetRange
    );
    this.readingsChanged = false;
  }
  return this.cachedStats;
}
```

---

**Last Updated**: 2025-10-26
**Version**: 1.0
