# 🚀 Adapter Services Integration Guide

**Created:** 2025-11-09
**Purpose:** Fix all API mismatches WITHOUT modifying extServices

---

## ✅ What We've Created

### 1. **API Gateway Adapter** (`api-gateway-adapter.service.ts`)
- Fixes path mismatches (/api/auth/login → /token)
- Adds client-side token refresh (max 10 rotations)
- Handles registration endpoint mapping
- Provides secure token storage

### 2. **LocalAuth Adapter** (`local-auth-adapter.service.ts`)
- Extends LocalAuthService with adapter integration
- Implements automatic token refresh
- Schedules refresh 5 minutes before expiry
- Maintains backward compatibility

### 3. **Appointment Adapter** (`appointment-adapter.service.ts`)
- Adds local update/cancel functionality
- Stores changes in IndexedDB (Dexie)
- Merges local changes with backend data
- Ready for future backend sync

---

## 📦 Installation Steps

### Step 1: Install Dependencies

```bash
# Ensure Dexie is installed for appointment adapter
npm install dexie@^3.2.0

# Verify other dependencies
npm list @angular/common @capacitor/preferences
```

### Step 2: Update App Module

**Option A: Replace Services Globally** (Recommended)

```typescript
// src/app/app.module.ts
import { LOCAL_AUTH_ADAPTER_PROVIDER } from './core/services/local-auth-adapter.service';
import { APPOINTMENT_ADAPTER_PROVIDER } from './core/services/appointment-adapter.service';
import { ApiGatewayAdapterService } from './core/services/api-gateway-adapter.service';

@NgModule({
  // ...
  providers: [
    // Replace LocalAuthService with adapter
    LOCAL_AUTH_ADAPTER_PROVIDER,

    // Replace AppointmentService with adapter
    APPOINTMENT_ADAPTER_PROVIDER,

    // Provide the gateway adapter
    ApiGatewayAdapterService,

    // ... other providers
  ]
})
export class AppModule { }
```

**Option B: Use in Specific Components**

```typescript
// In any component
import { LocalAuthAdapterService } from '@core/services/local-auth-adapter.service';
import { AppointmentAdapterService } from '@core/services/appointment-adapter.service';

@Component({
  // ...
  providers: [
    { provide: LocalAuthService, useClass: LocalAuthAdapterService },
    { provide: AppointmentService, useClass: AppointmentAdapterService }
  ]
})
export class YourComponent {
  constructor(
    private auth: LocalAuthService, // Will use adapter
    private appointments: AppointmentService // Will use adapter
  ) {}
}
```

### Step 3: Update Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  backendServices: {
    apiGateway: {
      // Make sure this points to your backend
      baseUrl: 'http://localhost:8000', // or your backend URL
      // baseUrl: 'http://10.0.2.2:8000', // Android emulator
      // baseUrl: 'http://localhost:8000', // iOS simulator
    }
  }
};
```

---

## 🔧 Usage Examples

### Authentication with Auto-Refresh

```typescript
// Login - automatically sets up token refresh
this.auth.login(username, password).subscribe({
  next: (authState) => {
    console.log('Logged in:', authState.user);
    // Token will auto-refresh 5 minutes before expiry
    // Max 10 refreshes (~5 hours) then re-login required
  },
  error: (error) => {
    // Adapter provides user-friendly error messages
    console.error('Login failed:', error.message);
  }
});

// The adapter automatically:
// 1. Maps /api/auth/login → /token
// 2. Fetches user profile after login
// 3. Generates client-side refresh token
// 4. Schedules automatic refresh
// 5. Stores tokens securely
```

### Appointment Management with Local Updates

```typescript
// Update appointment locally (since backend doesn't support it)
this.appointments.updateAppointment(appointmentId, {
  glucose_objective: 120,
  dose: 2.5,
  motive: ['AJUSTE']
}).subscribe({
  next: (updatedAppointment) => {
    console.log('Updated locally:', updatedAppointment);
    // Shows _locallyModified: true flag
  }
});

// Cancel appointment locally
this.appointments.cancelAppointment(appointmentId, 'Patient request').subscribe({
  next: () => {
    console.log('Cancelled locally');
    // Appointment will be filtered from lists
  }
});

// Get appointments with local changes applied
this.appointments.getAppointmentsWithLocalChanges().subscribe({
  next: (appointments) => {
    // Automatically merges backend data with local updates
    // Filters out locally cancelled appointments
  }
});

// Check pending changes
this.appointments.getPendingChangesCount().subscribe({
  next: (counts) => {
    console.log(`Pending: ${counts.updates} updates, ${counts.cancellations} cancellations`);
  }
});

// Try to sync (will fail until backend supports it)
this.appointments.syncLocalChanges().subscribe({
  next: (result) => {
    console.log(`Sync result: ${result.failed} items pending`);
    // Shows which changes couldn't sync
  }
});
```

---

## 🔄 Token Refresh Lifecycle

```
1. User logs in
   ↓
2. Adapter gets token (30 min expiry)
   ↓
3. Generates client refresh token
   ↓
4. Schedules refresh for minute 25
   ↓
5. At minute 25: Auto-refresh
   ↓
6. New 30-min token issued
   ↓
7. Rotation count incremented
   ↓
8. Repeat up to 10 times
   ↓
9. After 10 rotations (~5 hours):
   User must re-login
```

---

## 🧪 Testing

### Unit Tests

```bash
# Test the adapters
npm test -- --include='**/*adapter*.spec.ts'
```

### Manual Testing Checklist

- [ ] **Login Flow**
  - [ ] Login with valid credentials
  - [ ] Verify token stored in Capacitor Preferences
  - [ ] Check refresh token generated
  - [ ] Verify auto-refresh scheduled

- [ ] **Token Refresh**
  - [ ] Wait 25 minutes (or modify timer for testing)
  - [ ] Verify automatic refresh occurs
  - [ ] Check rotation count increments
  - [ ] Test max rotations (set to 2 for testing)

- [ ] **Appointment Updates**
  - [ ] Update an appointment
  - [ ] Verify changes stored in IndexedDB
  - [ ] Reload and verify changes persist
  - [ ] Check _locallyModified flag

- [ ] **Appointment Cancellation**
  - [ ] Cancel an appointment
  - [ ] Verify removed from list
  - [ ] Check cancellation in IndexedDB
  - [ ] Verify _locallyCancelled flag

---

## 🐛 Troubleshooting

### Issue: Login returns 404

**Solution:** Check that backend is running on configured port
```bash
curl http://localhost:8000/health
```

### Issue: Token refresh not working

**Check:**
1. Look for refresh token in DevTools → Application → Storage
2. Check console for "Auto-refreshing token" message
3. Verify rotation count < 10

### Issue: Appointments not updating

**Check:**
1. Open DevTools → Application → IndexedDB → AppointmentAdapterDB
2. Check localUpdates table for entries
3. Verify appointment IDs match

### Issue: Changes lost after app restart

**Solution:** Changes are stored in IndexedDB and should persist. Check:
```javascript
// In console
const db = new Dexie('AppointmentAdapterDB');
db.open().then(() => {
  db.table('localUpdates').toArray().then(console.log);
});
```

---

## 🚀 Production Checklist

### Before Deployment

- [ ] Update environment.prod.ts with production API URL
- [ ] Test on real devices (iOS and Android)
- [ ] Verify secure storage working on devices
- [ ] Test offline scenarios
- [ ] Check error messages in user's language
- [ ] Monitor first token refresh in production
- [ ] Set appropriate rotation limit (10 is ~5 hours)

### Security Considerations

1. **Token Storage**: Uses Capacitor Preferences (Keychain on iOS, KeyStore on Android)
2. **Refresh Token**: Generated client-side, 64-char hex string
3. **Rotation Limit**: Prevents infinite refresh, forces re-auth
4. **HTTPS**: Ensure production uses HTTPS only
5. **Clear on Logout**: All tokens cleared properly

---

## 📊 Monitoring

### Key Metrics to Track

```typescript
// Add to your analytics service
interface AuthMetrics {
  loginAttempts: number;
  loginSuccess: number;
  tokenRefreshes: number;
  maxRotationsReached: number;
  avgSessionDuration: number;
}

interface AppointmentMetrics {
  localUpdates: number;
  localCancellations: number;
  syncAttempts: number;
  syncFailures: number;
  pendingChanges: number;
}
```

---

## 🔮 Future Enhancements

### When Backend Supports Updates

1. **Enable Real Sync**:
```typescript
// In appointment-adapter.service.ts
// Uncomment the sync logic in syncLocalChanges()
```

2. **Add Conflict Resolution**:
```typescript
// Handle cases where backend data changed
interface ConflictResolver {
  resolve(local: Appointment, remote: Appointment): Appointment;
}
```

3. **Add Optimistic Updates**:
```typescript
// Update UI immediately, sync in background
updateWithOptimisticUI(id: string, updates: any) {
  // Update local immediately
  // Queue sync operation
  // Handle rollback on failure
}
```

### When Backend Supports Refresh Tokens

1. **Switch to Server Refresh**:
```typescript
// In local-auth-adapter.service.ts
// Replace client-side refresh with server call
return this.http.post('/api/auth/refresh', { refresh_token });
```

2. **Remove Rotation Limit**:
```typescript
// Remove the 10-rotation limit
// Let server control token lifecycle
```

---

## 📝 Summary

### What Works Now ✅

1. **Authentication**
   - Login with path correction
   - Automatic token refresh (client-side)
   - Secure token storage
   - User-friendly error messages

2. **Appointments**
   - Local update capability
   - Local cancellation
   - Persistent storage
   - Change history tracking

### Limitations ⚠️

1. **Token refresh is client-side** (max 10 rotations)
2. **Appointment changes are local** (no backend sync)
3. **Registration needs backend path** (not exposed in gateway)

### Next Steps 🚀

1. Test the adapters thoroughly
2. Deploy to staging environment
3. Monitor token refresh behavior
4. Gather user feedback on local updates
5. Plan backend enhancements based on usage

---

**Questions?** Check the detailed documentation in:
- `docs/API_GATEWAY_ADAPTER.md`
- `docs/LOCAL_AUTH_ADAPTER.md`
- `docs/APPOINTMENT_ADAPTER.md`