# Mobile-Backend Integration Architecture

**Document Version**: 1.0
**Last Updated**: 2025-10-10
**Status**: Integration Specification for Diabetify Mobile App

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Authentication & Security](#authentication--security)
4. [Angular Service Architecture](#angular-service-architecture)
5. [HTTP Interceptors](#http-interceptors)
6. [Offline-First Strategy](#offline-first-strategy)
7. [Real-Time Integration](#real-time-integration)
8. [Error Handling Matrix](#error-handling-matrix)
9. [Caching Strategy](#caching-strategy)
10. [State Management](#state-management)
11. [TypeScript Models](#typescript-models)
12. [Backend Limitations & Migration Path](#backend-limitations--migration-path)

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Ionic/Angular)                │
├─────────────────────────────────────────────────────────────┤
│  BLE Layer          │ Capacitor Bluetooth LE Plugin         │
├─────────────────────────────────────────────────────────────┤
│  Presentation       │ Ionic Components + Material Design    │
├─────────────────────────────────────────────────────────────┤
│  State Management   │ Angular Services + RxJS               │
├─────────────────────────────────────────────────────────────┤
│  Business Logic     │ Domain Services + Validators          │
├─────────────────────────────────────────────────────────────┤
│  Data Access        │ API Services + Sync Queue             │
├─────────────────────────────────────────────────────────────┤
│  Network Layer      │ HTTP Interceptors (Auth/Error/Retry)  │
├─────────────────────────────────────────────────────────────┤
│  Storage Layer      │ IndexedDB (Dexie) + SecureStorage    │
└─────────────────────────────────────────────────────────────┘
                             ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                   │
├─────────────────────────────────────────────────────────────┤
│  - JWT Validation                                            │
│  - CORS Handling (⚠️ Currently wildcard)                    │
│  - Request Routing (synchronous proxy)                       │
│  - Rate Limiting (⚠️ Currently missing)                     │
└─────────────────────────────────────────────────────────────┘
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│LOGIN SERVICE │    │ APPOINTMENTS │    │ GLUCOSERVER  │
│              │    │   SERVICE    │    │   SERVICE    │
├──────────────┤    ├──────────────┤    ├──────────────┤
│FastAPI 0.109 │    │FastAPI 0.109 │    │FastAPI 0.109 │
│PostgreSQL    │    │PostgreSQL    │    │PostgreSQL    │
│⚠️ SHA-256    │    │⚠️ No Auth    │    │⚠️ No Paging │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Key Technologies

**Mobile App Stack:**

- **Framework**: Ionic 8 + Angular 18
- **Platform**: Capacitor 6.1.0
- **Language**: TypeScript 5.4
- **Storage**: Dexie (IndexedDB) + Capacitor Preferences + SecureStorage
- **HTTP**: Angular HttpClient with custom interceptors
- **BLE**: @capacitor-community/bluetooth-le

**Backend Stack:**

- **Framework**: FastAPI 0.109.0 - 0.114.0
- **ORM**: SQLAlchemy 2.0.25
- **Database**: PostgreSQL
- **Auth**: OAuth2 Password Flow + JWT (HS256, 30min expiry)

---

## Data Flow Diagrams

### 1. Authentication Flow

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  Mobile App │                  │ API Gateway │                  │Login Service│
└──────┬──────┘                  └──────┬──────┘                  └──────┬──────┘
       │                                 │                                │
       │ 1. POST /token                  │                                │
       │    {username, password}         │                                │
       ├────────────────────────────────>│                                │
       │                                 │                                │
       │                                 │ 2. Forward credentials         │
       │                                 ├───────────────────────────────>│
       │                                 │                                │
       │                                 │                                │ 3. Validate
       │                                 │                                │    (SHA-256)
       │                                 │                                │
       │                                 │ 4. JWT Token                   │
       │                                 │    {access_token, token_type}  │
       │                                 │<───────────────────────────────┤
       │                                 │                                │
       │ 5. Return JWT                   │                                │
       │<────────────────────────────────┤                                │
       │                                 │                                │
       │ 6. Store in SecureStorage       │                                │
       │    (NOT localStorage - XSS risk)│                                │
       │                                 │                                │
       │                                 │                                │
       │ 7. GET /users/me                │                                │
       │    Authorization: Bearer <JWT>  │                                │
       ├────────────────────────────────>│                                │
       │                                 │                                │
       │                                 │ 8. Validate JWT                │
       │                                 │    Forward with token          │
       │                                 ├───────────────────────────────>│
       │                                 │                                │
       │                                 │ 9. User data                   │
       │                                 │<───────────────────────────────┤
       │                                 │                                │
       │ 10. User profile                │                                │
       │<────────────────────────────────┤                                │
       │                                 │                                │
       │ 11. Store profile locally       │                                │
       │     (IndexedDB)                 │                                │
       │                                 │                                │

⚠️  CRITICAL LIMITATIONS:
   - Token expires in 30 minutes
   - NO refresh token mechanism
   - User must re-login after expiration
   - Mobile app must handle 401 gracefully
```

### 2. Glucose Reading Flow (BLE → Backend)

```
┌──────────┐         ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│BLE Device│         │  Mobile App │         │ API Gateway │         │ Glucoserver │
└────┬─────┘         └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
     │                      │                        │                        │
     │ 1. Connect via BLE   │                        │                        │
     │<────────────────────>│                        │                        │
     │                      │                        │                        │
     │ 2. Read glucose char │                        │                        │
     │      (UUID: 00002a18)│                        │                        │
     ├─────────────────────>│                        │                        │
     │                      │                        │                        │
     │ 3. SFLOAT16 data     │                        │                        │
     │<─────────────────────┤                        │                        │
     │                      │                        │                        │
     │                      │ 4. Parse SFLOAT16      │                        │
     │                      │    (getSfloat16())     │                        │
     │                      │                        │                        │
     │                      │ 5. Create GlucoseReading                        │
     │                      │    object with metadata│                        │
     │                      │                        │                        │
     │                      │ 6. Save to IndexedDB   │                        │
     │                      │    (offline-first)     │                        │
     │                      │    local_id: UUID      │                        │
     │                      │    synced: false       │                        │
     │                      │                        │                        │
     │                      │ 7. POST /readings/     │                        │
     │                      │    Authorization: Bearer <JWT>                  │
     │                      ├───────────────────────>│                        │
     │                      │                        │                        │
     │                      │                        │ 8. Validate JWT        │
     │                      │                        │    Forward request     │
     │                      │                        ├───────────────────────>│
     │                      │                        │                        │
     │                      │                        │                        │ 9. Validate
     │                      │                        │                        │    Store in DB
     │                      │                        │                        │    ⚠️ No user_id!
     │                      │                        │                        │
     │                      │                        │ 10. Reading with ID    │
     │                      │                        │<───────────────────────┤
     │                      │                        │                        │
     │                      │ 11. Return created     │                        │
     │                      │     reading            │                        │
     │                      │<───────────────────────┤                        │
     │                      │                        │                        │
     │                      │ 12. Update IndexedDB   │                        │
     │                      │     synced: true       │                        │
     │                      │     backend_id: <id>   │                        │
     │                      │                        │                        │
     │                      │ 13. Update UI          │                        │
     │                      │     (NgZone.run())     │                        │
     │                      │                        │                        │

OFFLINE SCENARIO:
   - Steps 1-6 complete as normal
   - Step 7 fails (no network)
   - Reading remains in IndexedDB with synced: false
   - Sync queue service retries when network available
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 60s
```

### 3. Glucose Reading Sync Flow (Backend → Mobile)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Mobile App │         │ API Gateway │         │ Glucoserver │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                        │                        │
       │ 1. GET /readings/      │                        │
       │    ⚠️ NO PAGINATION    │                        │
       │    Authorization: Bearer <JWT>                  │
       ├───────────────────────>│                        │
       │                        │                        │
       │                        │ 2. Forward request     │
       │                        ├───────────────────────>│
       │                        │                        │
       │                        │                        │ 3. SELECT * FROM
       │                        │                        │    glucose_reading
       │                        │                        │    ⚠️ RETURNS ALL!
       │                        │                        │
       │                        │ 4. Array of ALL        │
       │                        │    readings (could be  │
       │                        │    thousands)          │
       │                        │<───────────────────────┤
       │                        │                        │
       │ 5. Large JSON response │                        │
       │    (potentially MBs)   │                        │
       │<───────────────────────┤                        │
       │                        │                        │
       │ 6. Filter locally      │                        │
       │    - By timestamp      │                        │
       │    - By user (missing) │                        │
       │    - Client-side paging│                        │
       │                        │                        │
       │ 7. Merge with local DB │                        │
       │    - Match by backend_id                        │
       │    - Update if changed │                        │
       │    - Add new readings  │                        │
       │                        │                        │
       │ 8. Resolve conflicts   │                        │
       │    (backend wins for   │                        │
       │     synced data)       │                        │
       │                        │                        │

⚠️  PERFORMANCE CRITICAL:
   - Backend returns ALL readings (no pagination)
   - Mobile must handle large payloads
   - Implement aggressive caching (5min TTL)
   - Consider incremental sync with timestamp filtering
   - URGENT: Backend needs pagination support

RECOMMENDED CLIENT-SIDE WORKAROUND:
   - Add ?since=<timestamp> query param
   - API gateway doesn't support, but client can filter
   - Store last_sync_timestamp locally
   - Only process readings after last_sync
```

### 4. Appointment Scheduling Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Mobile App │         │ API Gateway │         │Appointments │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                        │                        │
       │ 1. POST /appointments/ │                        │
       │    Authorization: Bearer <JWT>                  │
       │    {patient_name, date, notes}                  │
       ├───────────────────────>│                        │
       │                        │                        │
       │                        │ 2. Forward (⚠️ No JWT  │
       │                        │    validation!)        │
       │                        ├───────────────────────>│
       │                        │                        │
       │                        │                        │ 3. Calculate queue
       │                        │                        │    position
       │                        │                        │    ⚠️ BUG: capacity
       │                        │                        │    check broken
       │                        │                        │
       │                        │ 4. Created appointment │
       │                        │    {id, queue_position}│
       │                        │<───────────────────────┤
       │                        │                        │
       │ 5. Return appointment  │                        │
       │<───────────────────────┤                        │
       │                        │                        │
       │ 6. Save to local DB    │                        │
       │                        │                        │
       │ 7. Poll for position   │                        │
       │    updates (every 30s) │                        │
       │    GET /appointments/queue-position/{id}        │
       ├───────────────────────────────────────────────> │
       │                        │                        │
       │                        │ Current position       │
       │<─────────────────────────────────────────────── │
       │                        │                        │

⚠️  ISSUES TO HANDLE:
   - No real-time position updates (polling required)
   - Queue capacity bug may allow overbooking
   - No authentication on appointments endpoints
   - Client-side validation needed for dates
```

---

## Authentication & Security

### JWT Token Management

**Token Structure:**

```json
{
  "sub": "user@example.com",
  "exp": 1234567890
}
```

**Security Best Practices:**

1. **Secure Token Storage** ✅

   ```typescript
   // ❌ NEVER use localStorage (XSS vulnerable)
   localStorage.setItem('token', jwt);

   // ✅ USE Capacitor SecureStorage
   import { SecureStoragePlugin } from '@capacitor-community/secure-storage';

   await SecureStoragePlugin.set({
     key: 'auth_token',
     value: jwt,
   });
   ```

2. **Token Lifecycle Management**
   - **Expiration**: 30 minutes (non-configurable from mobile)
   - **No Refresh Token**: User must re-authenticate
   - **401 Handling**: Detect expired tokens, prompt re-login
   - **Preemptive Refresh**: Warn user at 25 minutes

3. **Biometric Authentication** (Recommended)

   ```typescript
   import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

   // Store JWT in SecureStorage
   // Lock app with biometric
   // Unlock reveals JWT for API calls
   ```

4. **Token Injection via Interceptor**

   ```typescript
   @Injectable()
   export class AuthInterceptor implements HttpInterceptor {
     intercept(req: HttpRequest<any>, next: HttpHandler) {
       const token = await this.tokenService.getToken();

       if (token && !this.isLoginRequest(req)) {
         req = req.clone({
           setHeaders: {
             Authorization: `Bearer ${token}`,
           },
         });
       }

       return next.handle(req);
     }
   }
   ```

### Security Threat Mitigation

| Threat                           | Backend Status   | Mobile Mitigation                              |
| -------------------------------- | ---------------- | ---------------------------------------------- |
| **Weak Password Hash** (SHA-256) | ❌ CRITICAL      | Warn users, encourage long passphrases         |
| **CORS Wildcard**                | ❌ Present       | None (backend issue)                           |
| **No Refresh Token**             | ❌ Missing       | Implement session warning, graceful re-login   |
| **XSS**                          | N/A              | Never use localStorage, sanitize user input    |
| **Man-in-the-Middle**            | ⚠️ HTTPS only    | Enforce HTTPS, certificate pinning             |
| **Credential Stuffing**          | ❌ No rate limit | Implement retry delays, CAPTCHA on 3rd failure |
| **Token Theft**                  | ⚠️ HTTP body     | SecureStorage, biometric lock                  |

### HIPAA Compliance Considerations

1. **Data Encryption**
   - ✅ HTTPS in transit
   - ✅ SecureStorage for JWT
   - ⚠️ IndexedDB not encrypted by default (use encryption layer)

2. **Access Logging**
   - ❌ Backend doesn't log access
   - ✅ Mobile can log locally with timestamps

3. **Data Retention**
   - Define clear retention policy
   - Implement data deletion on logout
   - Periodic cleanup of old readings

4. **User Consent**
   - Implement consent screens
   - Track consent versions
   - Allow data export (GDPR/HIPAA right)

---

## Angular Service Architecture

### Directory Structure

```
src/app/core/
├── services/
│   ├── auth/
│   │   ├── auth.service.ts                 # Authentication orchestration
│   │   ├── token.service.ts                # JWT storage via SecureStorage
│   │   ├── auth-guard.service.ts           # Route protection
│   │   └── session-manager.service.ts      # Session timeout handling
│   │
│   ├── api/
│   │   ├── base-api.service.ts             # Base HTTP service with environment URLs
│   │   ├── glucose-api.service.ts          # Glucoserver integration
│   │   ├── appointment-api.service.ts      # Appointments integration
│   │   ├── user-api.service.ts             # User management
│   │   └── api-config.service.ts           # Dynamic API configuration
│   │
│   ├── sync/
│   │   ├── sync-orchestrator.service.ts    # Master sync coordinator
│   │   ├── sync-queue.service.ts           # Operation queue with retry
│   │   ├── conflict-resolver.service.ts    # Merge strategies
│   │   └── network-monitor.service.ts      # Online/offline detection
│   │
│   ├── storage/
│   │   ├── database.service.ts             # Dexie wrapper
│   │   ├── preferences.service.ts          # Capacitor Preferences wrapper
│   │   ├── secure-storage.service.ts       # Capacitor SecureStorage wrapper
│   │   └── encryption.service.ts           # Data encryption utilities
│   │
│   ├── ble/
│   │   ├── ble-connection.service.ts       # BLE device management
│   │   ├── glucose-parser.service.ts       # SFLOAT16 parsing (existing)
│   │   └── ble-sync-bridge.service.ts      # BLE → Backend sync
│   │
│   └── domain/
│       ├── glucose-readings.service.ts     # Business logic for readings
│       ├── appointments.service.ts         # Business logic for appointments
│       └── user-profile.service.ts         # Business logic for profile
│
├── interceptors/
│   ├── auth.interceptor.ts                 # JWT injection
│   ├── error.interceptor.ts                # Global error handling
│   ├── retry.interceptor.ts                # Exponential backoff retry
│   ├── cache.interceptor.ts                # HTTP caching
│   ├── logging.interceptor.ts              # Request/response logging
│   └── offline.interceptor.ts              # Queue requests when offline
│
├── guards/
│   ├── auth.guard.ts                       # Route authentication
│   └── unsaved-changes.guard.ts            # Prevent data loss
│
└── models/
    ├── user.model.ts
    ├── glucose-reading.model.ts
    ├── appointment.model.ts
    ├── sync-operation.model.ts
    ├── api-response.model.ts
    └── error.model.ts
```

### Key Service Implementations

#### 1. TokenService (Secure JWT Management)

```typescript
@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly EXPIRY_KEY = 'token_expiry';

  constructor(
    private secureStorage: SecureStorageService,
    private platform: Platform
  ) {}

  async setToken(token: string): Promise<void> {
    // Parse expiry from JWT
    const decoded = this.decodeJWT(token);
    const expiry = decoded.exp * 1000; // Convert to ms

    await this.secureStorage.set(this.TOKEN_KEY, token);
    await this.secureStorage.set(this.EXPIRY_KEY, expiry.toString());
  }

  async getToken(): Promise<string | null> {
    const token = await this.secureStorage.get(this.TOKEN_KEY);

    if (!token) return null;

    // Check expiry
    if (await this.isExpired()) {
      await this.clearToken();
      return null;
    }

    return token;
  }

  async isExpired(): Promise<boolean> {
    const expiry = await this.secureStorage.get(this.EXPIRY_KEY);
    if (!expiry) return true;

    return Date.now() >= parseInt(expiry);
  }

  async clearToken(): Promise<void> {
    await this.secureStorage.remove(this.TOKEN_KEY);
    await this.secureStorage.remove(this.EXPIRY_KEY);
  }

  // Check if token expires in next N minutes
  async expiresInMinutes(minutes: number): Promise<boolean> {
    const expiry = await this.secureStorage.get(this.EXPIRY_KEY);
    if (!expiry) return true;

    const expiryTime = parseInt(expiry);
    const threshold = Date.now() + minutes * 60 * 1000;

    return expiryTime <= threshold;
  }

  private decodeJWT(token: string): any {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  }
}
```

#### 2. SyncQueueService (Offline Operations)

```typescript
interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'glucose_reading' | 'appointment';
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  private queue$ = new BehaviorSubject<SyncOperation[]>([]);
  private processing = false;

  constructor(
    private db: DatabaseService,
    private glucoseApi: GlucoseApiService,
    private appointmentApi: AppointmentApiService,
    private network: NetworkMonitorService
  ) {
    // Load queue from IndexedDB on init
    this.loadQueue();

    // Process queue when network available
    this.network.online$.subscribe(online => {
      if (online) this.processQueue();
    });
  }

  async enqueue(
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries' | 'status'>
  ): Promise<void> {
    const syncOp: SyncOperation = {
      ...operation,
      id: UUID.v4(),
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    const queue = this.queue$.value;
    queue.push(syncOp);
    this.queue$.next(queue);

    await this.db.syncQueue.put(syncOp);

    // Try processing immediately if online
    if (this.network.isOnline()) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    const queue = this.queue$.value.filter(op => op.status === 'pending');

    for (const operation of queue) {
      try {
        await this.executeOperation(operation);

        // Mark completed
        operation.status = 'completed';
        await this.db.syncQueue.put(operation);

        // Remove from queue
        this.removeFromQueue(operation.id);
      } catch (error) {
        operation.retries++;

        if (operation.retries >= 5) {
          operation.status = 'failed';
          console.error('Operation failed after 5 retries:', operation);
        }

        await this.db.syncQueue.put(operation);

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.min(1000 * Math.pow(2, operation.retries), 16000);
        await this.delay(delay);
      }
    }

    this.processing = false;
  }

  private async executeOperation(op: SyncOperation): Promise<void> {
    switch (op.entity) {
      case 'glucose_reading':
        if (op.type === 'CREATE') {
          const result = await this.glucoseApi.createReading(op.data).toPromise();
          // Update local record with backend ID
          await this.db.glucoseReadings.update(op.data.local_id, {
            backend_id: result.id,
            synced: true,
          });
        }
        break;

      case 'appointment':
        if (op.type === 'CREATE') {
          await this.appointmentApi.createAppointment(op.data).toPromise();
        }
        break;
    }
  }

  private removeFromQueue(id: string): void {
    const queue = this.queue$.value.filter(op => op.id !== id);
    this.queue$.next(queue);
  }

  private async loadQueue(): Promise<void> {
    const queue = await this.db.syncQueue.toArray();
    this.queue$.next(queue);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### 3. ConflictResolverService (Data Merging)

```typescript
type ConflictStrategy = 'backend_wins' | 'local_wins' | 'last_write_wins' | 'merge';

interface ConflictResolution {
  strategy: ConflictStrategy;
  resolved: any;
  conflicts: string[];
}

@Injectable({ providedIn: 'root' })
export class ConflictResolverService {
  resolveGlucoseReading(
    local: GlucoseReading,
    backend: GlucoseReading,
    strategy: ConflictStrategy = 'backend_wins'
  ): ConflictResolution {
    const conflicts: string[] = [];

    // Glucose readings rarely conflict (different timestamps)
    // But handle edge cases

    if (local.value !== backend.value) {
      conflicts.push(`value: local=${local.value}, backend=${backend.value}`);
    }

    if (local.notes !== backend.notes) {
      conflicts.push(`notes: local="${local.notes}", backend="${backend.notes}"`);
    }

    switch (strategy) {
      case 'backend_wins':
        return { strategy, resolved: backend, conflicts };

      case 'local_wins':
        return { strategy, resolved: local, conflicts };

      case 'last_write_wins':
        const localTime = new Date(local.timestamp).getTime();
        const backendTime = new Date(backend.timestamp).getTime();
        return {
          strategy,
          resolved: localTime > backendTime ? local : backend,
          conflicts,
        };

      case 'merge':
        // Merge strategy: take backend value, local notes
        return {
          strategy,
          resolved: {
            ...backend,
            notes: local.notes || backend.notes,
          },
          conflicts,
        };

      default:
        return { strategy: 'backend_wins', resolved: backend, conflicts };
    }
  }

  resolveAppointment(local: Appointment, backend: Appointment): ConflictResolution {
    const conflicts: string[] = [];

    // Check for conflicts
    if (local.appointment_date !== backend.appointment_date) {
      conflicts.push('appointment_date');
    }

    if (local.status !== backend.status) {
      conflicts.push('status');
    }

    if (local.notes !== backend.notes) {
      conflicts.push('notes');
    }

    // For appointments, backend always wins (server is source of truth for scheduling)
    return {
      strategy: 'backend_wins',
      resolved: backend,
      conflicts,
    };
  }
}
```

---

## HTTP Interceptors

### 1. AuthInterceptor (JWT Injection)

```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private tokenService: TokenService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip for login endpoint
    if (req.url.includes('/token')) {
      return next.handle(req);
    }

    return from(this.tokenService.getToken()).pipe(
      switchMap(token => {
        if (token) {
          req = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`,
            },
          });
        }

        return next.handle(req);
      })
    );
  }
}
```

### 2. ErrorInterceptor (Global Error Handling)

```typescript
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private toastController: ToastController,
    private router: Router,
    private tokenService: TokenService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        return this.handleError(error);
      })
    );
  }

  private async handleError(error: HttpErrorResponse): Promise<never> {
    let message: string;

    switch (error.status) {
      case 401:
        // Unauthorized - token expired or invalid
        await this.tokenService.clearToken();
        this.router.navigate(['/login']);
        message = 'Your session has expired. Please log in again.';
        break;

      case 403:
        // Forbidden
        message = 'You do not have permission to perform this action.';
        break;

      case 400:
        // Bad request - validation error
        message = error.error?.detail || 'Invalid request. Please check your input.';
        break;

      case 404:
        // Not found
        message = 'The requested resource was not found.';
        break;

      case 429:
        // Rate limited
        message = 'Too many requests. Please wait and try again.';
        break;

      case 500:
      case 502:
      case 503:
        // Server error
        message = 'Server error. Please try again later.';
        break;

      case 0:
        // Network error
        message = 'Network error. Please check your connection.';
        break;

      default:
        message = 'An unexpected error occurred.';
    }

    await this.showToast(message, 'danger');

    throw error;
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 4000,
      position: 'top',
    });
    await toast.present();
  }
}
```

### 3. RetryInterceptor (Exponential Backoff)

```typescript
@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // ms

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only retry GET requests (idempotent)
    if (req.method !== 'GET') {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, index) => {
            // Don't retry client errors (4xx)
            if (error.status >= 400 && error.status < 500) {
              return throwError(() => error);
            }

            // Max retries reached
            if (index >= this.MAX_RETRIES) {
              return throwError(() => error);
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = this.RETRY_DELAY * Math.pow(2, index);

            console.log(
              `Retrying request (attempt ${index + 1}/${this.MAX_RETRIES}) after ${delay}ms`
            );

            return timer(delay);
          })
        )
      )
    );
  }
}
```

### 4. CacheInterceptor (HTTP Caching)

```typescript
interface CacheEntry {
  url: string;
  response: HttpResponse<any>;
  timestamp: number;
}

@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle(req);
    }

    // Check if cacheable URL
    if (!this.isCacheable(req.url)) {
      return next.handle(req);
    }

    // Check cache
    const cached = this.cache.get(req.url);
    if (cached && !this.isExpired(cached)) {
      console.log(`Cache HIT: ${req.url}`);
      return of(cached.response.clone());
    }

    // Cache miss - fetch and cache
    console.log(`Cache MISS: ${req.url}`);
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          this.cache.set(req.url, {
            url: req.url,
            response: event.clone(),
            timestamp: Date.now(),
          });
        }
      })
    );
  }

  private isCacheable(url: string): boolean {
    // Cache glucose readings and appointments
    return url.includes('/readings/') || url.includes('/appointments/');
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.CACHE_TTL;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

### 5. OfflineInterceptor (Queue When Offline)

```typescript
@Injectable()
export class OfflineInterceptor implements HttpInterceptor {
  constructor(
    private network: NetworkMonitorService,
    private syncQueue: SyncQueueService,
    private toastController: ToastController
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Allow request if online
    if (this.network.isOnline()) {
      return next.handle(req);
    }

    // Handle GET requests - return error (no cached data strategy here)
    if (req.method === 'GET') {
      this.showOfflineToast();
      return throwError(() => new Error('No network connection'));
    }

    // Queue mutations (POST/PUT/DELETE)
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      this.queueOperation(req);
      this.showQueuedToast();

      // Return synthetic success response
      return of(
        new HttpResponse({
          status: 202, // Accepted
          body: { queued: true, message: 'Operation queued for sync' },
        })
      );
    }

    return next.handle(req);
  }

  private queueOperation(req: HttpRequest<any>): void {
    let type: 'CREATE' | 'UPDATE' | 'DELETE';

    switch (req.method) {
      case 'POST':
        type = 'CREATE';
        break;
      case 'PUT':
        type = 'UPDATE';
        break;
      case 'DELETE':
        type = 'DELETE';
        break;
      default:
        return;
    }

    let entity: 'glucose_reading' | 'appointment';
    if (req.url.includes('/readings/')) {
      entity = 'glucose_reading';
    } else if (req.url.includes('/appointments/')) {
      entity = 'appointment';
    } else {
      return; // Unknown entity
    }

    this.syncQueue.enqueue({
      type,
      entity,
      data: req.body,
    });
  }

  private async showOfflineToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'You are offline. Some features may be unavailable.',
      color: 'warning',
      duration: 3000,
      position: 'top',
      icon: 'cloud-offline-outline',
    });
    await toast.present();
  }

  private async showQueuedToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Saved locally. Will sync when online.',
      color: 'primary',
      duration: 2000,
      position: 'bottom',
      icon: 'checkmark-circle-outline',
    });
    await toast.present();
  }
}
```

---

## Offline-First Strategy

### Local Database Schema (Dexie/IndexedDB)

```typescript
import Dexie, { Table } from 'dexie';

export interface GlucoseReading {
  local_id: string; // UUID for local tracking
  backend_id?: number; // ID from backend (after sync)
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  timestamp: Date;
  device_id: string;
  notes?: string;
  synced: boolean; // Sync status
  user_id?: number; // For future multi-user support
  sequence_number?: number; // BLE device sequence
  sample_type?: string; // capillary, venous, etc.
  sample_location?: string; // finger, earlobe, etc.
}

export interface Appointment {
  local_id: string;
  backend_id?: number;
  patient_name: string;
  appointment_date: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  queue_position?: number;
  notes?: string;
  synced: boolean;
}

export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'glucose_reading' | 'appointment';
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  avatar?: string;
  preferences?: any;
  last_sync?: Date;
}

export class AppDatabase extends Dexie {
  glucoseReadings!: Table<GlucoseReading, string>;
  appointments!: Table<Appointment, string>;
  syncQueue!: Table<SyncOperation, string>;
  userProfile!: Table<UserProfile, number>;

  constructor() {
    super('DiabetifyDB');

    this.version(1).stores({
      glucoseReadings: 'local_id, backend_id, timestamp, synced, device_id',
      appointments: 'local_id, backend_id, appointment_date, synced',
      syncQueue: 'id, status, timestamp, entity',
      userProfile: 'id, email',
    });
  }
}

export const db = new AppDatabase();
```

### Sync Strategies

#### 1. Initial Sync (First Launch)

```
1. User logs in
2. Fetch user profile from backend
3. Fetch all glucose readings (⚠️ large payload)
4. Fetch all appointments
5. Store in IndexedDB
6. Mark all as synced: true
7. Store last_sync timestamp
```

#### 2. Incremental Sync (Subsequent Syncs)

```
1. Check last_sync timestamp
2. Fetch readings created after last_sync (⚠️ backend doesn't support, client filters)
3. Merge with local database
4. Resolve conflicts (backend wins for synced data)
5. Process sync queue (push local changes)
6. Update last_sync timestamp
```

#### 3. Conflict Resolution Strategy

| Scenario                                                | Strategy                    | Rationale                               |
| ------------------------------------------------------- | --------------------------- | --------------------------------------- |
| Reading exists in backend and local (both synced)       | Backend wins                | Server is source of truth               |
| Reading exists in backend but not local                 | Add to local                | New data from other device/web          |
| Reading exists in local but not backend (synced: false) | Push to backend             | Local offline creation                  |
| Same reading modified on both sides                     | Last write wins (timestamp) | Rare, prefer most recent                |
| Appointment modified on both sides                      | Backend wins                | Scheduling must be server-authoritative |

### Offline Queue Processing

**Trigger Conditions:**

1. Network becomes available (online event)
2. App comes to foreground
3. User manually triggers sync

**Processing Logic:**

```
FOR EACH operation in queue WHERE status = 'pending':
  SET status = 'processing'

  TRY:
    Execute API call
    Update local record (backend_id, synced: true)
    SET status = 'completed'
    Remove from queue
  CATCH error:
    INCREMENT retries
    IF retries >= 5:
      SET status = 'failed'
      Log error for manual review
    ELSE:
      Wait exponentially (1s, 2s, 4s, 8s, 16s)
      SET status = 'pending'
```

---

## Real-Time Integration

### Current Backend Capabilities

❌ **WebSocket**: Not implemented
❌ **Server-Sent Events (SSE)**: Not implemented
❌ **Push Notifications**: Not implemented

### Mobile App Options

#### Option 1: Short Polling (MVP Approach) ✅

**Implementation:**

```typescript
@Injectable({ providedIn: 'root' })
export class GlucosePollingService {
  private polling$ = new Subject<void>();
  private readonly POLL_INTERVAL = 30000; // 30 seconds

  constructor(
    private glucoseApi: GlucoseApiService,
    private db: DatabaseService,
    private network: NetworkMonitorService
  ) {}

  startPolling(): void {
    // Only poll when online
    this.network.online$
      .pipe(
        filter(online => online),
        switchMap(() =>
          interval(this.POLL_INTERVAL).pipe(
            startWith(0) // Poll immediately
          )
        ),
        switchMap(() => this.fetchNewReadings()),
        takeUntil(this.polling$)
      )
      .subscribe({
        next: readings => {
          console.log(`Polled ${readings.length} new readings`);
          this.updateLocalDatabase(readings);
        },
        error: error => {
          console.error('Polling error:', error);
        },
      });
  }

  stopPolling(): void {
    this.polling$.next();
  }

  private async fetchNewReadings(): Promise<GlucoseReading[]> {
    const lastSync = await this.db.userProfile.get(1).then(p => p?.last_sync);
    const allReadings = await this.glucoseApi.getAllReadings().toPromise();

    // Client-side filtering (backend doesn't support)
    if (lastSync) {
      return allReadings.filter(r => new Date(r.timestamp) > lastSync);
    }

    return allReadings;
  }

  private async updateLocalDatabase(readings: GlucoseReading[]): Promise<void> {
    for (const reading of readings) {
      await this.db.glucoseReadings.put({
        local_id: UUID.v4(),
        backend_id: reading.id,
        ...reading,
        synced: true,
      });
    }

    // Update last sync timestamp
    await this.db.userProfile.update(1, { last_sync: new Date() });
  }
}
```

**Pros:**

- Simple to implement
- Works with current backend
- No backend changes required

**Cons:**

- Inefficient (polls even when no new data)
- Battery drain
- Increased data usage
- 30-second latency

#### Option 2: Adaptive Polling (Better UX) ✅

```typescript
@Injectable({ providedIn: 'root' })
export class AdaptivePollingService {
  private baseInterval = 30000; // 30s
  private maxInterval = 300000; // 5 minutes
  private currentInterval = this.baseInterval;

  startPolling(): void {
    this.poll();
  }

  private async poll(): Promise<void> {
    const newData = await this.fetchNewReadings();

    if (newData.length > 0) {
      // Data found - reset to fast polling
      this.currentInterval = this.baseInterval;
    } else {
      // No data - slow down exponentially
      this.currentInterval = Math.min(this.currentInterval * 1.5, this.maxInterval);
    }

    // Schedule next poll
    setTimeout(() => this.poll(), this.currentInterval);
  }
}
```

#### Option 3: Background Fetch (iOS/Android) ⭐

```typescript
import { BackgroundFetch } from '@transistorsoft/capacitor-background-fetch';

@Injectable({ providedIn: 'root' })
export class BackgroundSyncService {
  async configure(): Promise<void> {
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // minutes
        stopOnTerminate: false,
        startOnBoot: true,
      },
      async taskId => {
        console.log('[BackgroundFetch] Event received:', taskId);

        // Sync glucose readings
        await this.syncGlucoseReadings();

        // Process sync queue
        await this.syncQueue.processQueue();

        BackgroundFetch.finish(taskId);
      }
    );
  }

  private async syncGlucoseReadings(): Promise<void> {
    try {
      const readings = await this.glucoseApi.getAllReadings().toPromise();
      await this.updateLocalDatabase(readings);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
}
```

### Future: WebSocket Integration (Backend Enhancement Required)

**Recommended Backend Implementation:**

```python
# glucoserver - Add WebSocket endpoint
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    async def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_reading(self, user_id: int, reading: dict):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(reading)

manager = ConnectionManager()

@app.websocket("/ws/readings/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        await manager.disconnect(user_id)

# Emit event when new reading created
@app.post("/readings/")
async def create_reading(reading: GlucoseReadingCreate):
    # ... save to DB ...
    await manager.send_reading(reading.user_id, reading.dict())
    return reading
```

**Mobile WebSocket Client:**

```typescript
@Injectable({ providedIn: 'root' })
export class GlucoseWebSocketService {
  private socket: WebSocket | null = null;

  readings$ = new Subject<GlucoseReading>();

  connect(userId: number, token: string): void {
    const wsUrl = `wss://api.diabetify.com/ws/readings/${userId}?token=${token}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = event => {
      const reading = JSON.parse(event.data);
      this.readings$.next(reading);

      // Save to local DB
      this.db.glucoseReadings.put({
        local_id: UUID.v4(),
        backend_id: reading.id,
        ...reading,
        synced: true,
      });
    };

    this.socket.onerror = error => {
      console.error('WebSocket error:', error);
      // Fallback to polling
    };

    this.socket.onclose = () => {
      console.log('WebSocket closed');
      // Attempt reconnect with exponential backoff
    };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
```

---

## Error Handling Matrix

| Error Scenario          | HTTP Status   | Detection                        | Retry Strategy                   | User Feedback                                    | Fallback Behavior                     |
| ----------------------- | ------------- | -------------------------------- | -------------------------------- | ------------------------------------------------ | ------------------------------------- |
| **Network Failure**     | - (0)         | `HttpErrorResponse.status === 0` | Exponential backoff (1s, 2s, 4s) | Toast: "Connection lost"                         | Queue operations, use cached data     |
| **Auth Expired**        | 401           | `error.status === 401`           | No retry                         | Toast: "Session expired. Please log in."         | Clear tokens, redirect to login       |
| **Forbidden**           | 403           | `error.status === 403`           | No retry                         | Toast: "Permission denied"                       | Return to previous screen             |
| **Validation Error**    | 400           | `error.status === 400`           | No retry                         | Toast: Show `error.detail` message               | Keep form data, highlight errors      |
| **Not Found**           | 404           | `error.status === 404`           | No retry                         | Toast: "Resource not found"                      | Return to list view                   |
| **Rate Limited**        | 429           | `error.status === 429`           | Wait `Retry-After` header        | Toast: "Too many requests. Please wait."         | Delay next request                    |
| **Server Error**        | 500, 502, 503 | `error.status >= 500`            | Retry 3x with backoff            | Toast: "Server error. Retrying..."               | After 3 failures, show error page     |
| **Request Timeout**     | 408           | `error.status === 408`           | Retry 2x                         | Toast: "Request timed out. Retrying..."          | After retries, queue operation        |
| **Parse/SFLOAT Error**  | -             | `try/catch` in parser            | No retry                         | Toast: "Invalid data from device"                | Log error, skip reading               |
| **Database Error**      | -             | Dexie exception                  | No retry                         | Toast: "Storage error. Please restart app."      | Attempt repair on next launch         |
| **BLE Connection Lost** | -             | BLE disconnect callback          | Auto-reconnect 3x                | Toast: "Bluetooth disconnected. Reconnecting..." | Manual reconnect button               |
| **Sync Conflict**       | -             | Conflict resolver                | No retry                         | Modal: "Data conflict detected"                  | Show merge UI, let user decide        |
| **Queue Full**          | -             | Queue size check                 | No retry                         | Toast: "Sync queue full. Clear old items."       | Auto-remove failed operations >7 days |

### Error Logging Strategy

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorLoggingService {
  async logError(error: Error | HttpErrorResponse, context: string): Promise<void> {
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      message: error.message,
      stack: error instanceof Error ? error.stack : undefined,
      status: error instanceof HttpErrorResponse ? error.status : undefined,
      url: error instanceof HttpErrorResponse ? error.url : undefined,
      user_id: await this.getUserId(),
      app_version: environment.version,
      platform: this.platform.platforms().join(', '),
    };

    // Log to console
    console.error('[Error]', errorLog);

    // Store in IndexedDB for later upload
    await this.db.errorLogs.add(errorLog);

    // TODO: Send to analytics service (Firebase Crashlytics, Sentry, etc.)
    // if (this.network.isOnline()) {
    //   await this.analyticsService.logError(errorLog);
    // }
  }

  private async getUserId(): Promise<number | null> {
    const profile = await this.db.userProfile.get(1);
    return profile?.id || null;
  }
}
```

---

## Caching Strategy

### Multi-Level Caching Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        Mobile App                          │
├────────────────────────────────────────────────────────────┤
│  Level 1: Memory Cache (Angular Services)                 │
│  - BehaviorSubject for current user profile                │
│  - RxJS cache for recent API responses (5min TTL)          │
│  - Size limit: 10 MB                                       │
├────────────────────────────────────────────────────────────┤
│  Level 2: HTTP Cache (CacheInterceptor)                   │
│  - GET /readings/ responses (5min TTL)                     │
│  - GET /appointments/ responses (5min TTL)                 │
│  - Cache-Control header respecting                         │
├────────────────────────────────────────────────────────────┤
│  Level 3: IndexedDB (Persistent Storage)                   │
│  - All glucose readings (permanent)                        │
│  - All appointments (permanent)                            │
│  - User profile (permanent)                                │
│  - Sync queue (until completed)                            │
├────────────────────────────────────────────────────────────┤
│  Level 4: Capacitor Preferences (Key-Value)                │
│  - App settings                                            │
│  - User preferences (theme, units)                         │
│  - Last sync timestamp                                     │
├────────────────────────────────────────────────────────────┤
│  Level 5: SecureStorage (Encrypted)                        │
│  - JWT token                                               │
│  - Sensitive user data                                     │
└────────────────────────────────────────────────────────────┘
```

### Cache Invalidation Rules

| Event                            | Invalidate                                         |
| -------------------------------- | -------------------------------------------------- |
| User logs out                    | All caches (IndexedDB, Preferences, SecureStorage) |
| New reading created locally      | Memory cache for readings list                     |
| Sync completed                   | HTTP cache, refresh memory cache                   |
| Appointment cancelled            | HTTP cache for appointments, memory cache          |
| User updates profile             | Memory cache for user, Preferences                 |
| Network error                    | Keep cache, mark stale                             |
| Manual refresh (pull-to-refresh) | HTTP cache only, keep IndexedDB                    |

### Cache Implementation

```typescript
@Injectable({ providedIn: 'root' })
export class GlucoseReadingsService {
  private readingsCache$ = new BehaviorSubject<GlucoseReading[]>([]);
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private api: GlucoseApiService,
    private db: DatabaseService,
    private network: NetworkMonitorService
  ) {
    // Load from IndexedDB on init
    this.loadFromIndexedDB();
  }

  getReadings(forceRefresh: boolean = false): Observable<GlucoseReading[]> {
    // Return cached if fresh
    if (!forceRefresh && this.isCacheFresh()) {
      return this.readingsCache$.asObservable();
    }

    // Refresh from backend
    return this.refreshFromBackend();
  }

  private refreshFromBackend(): Observable<GlucoseReading[]> {
    return this.api.getAllReadings().pipe(
      tap(async readings => {
        // Update IndexedDB
        await this.updateIndexedDB(readings);

        // Update memory cache
        this.readingsCache$.next(readings);
        this.cacheTimestamp = Date.now();
      }),
      catchError(async error => {
        console.error('Failed to fetch readings, using cached data:', error);

        // Fallback to IndexedDB
        const cached = await this.db.glucoseReadings.toArray();
        return of(cached);
      })
    );
  }

  private async loadFromIndexedDB(): Promise<void> {
    const readings = await this.db.glucoseReadings.orderBy('timestamp').reverse().toArray();

    this.readingsCache$.next(readings);
    this.cacheTimestamp = Date.now();
  }

  private async updateIndexedDB(readings: GlucoseReading[]): Promise<void> {
    // Bulk update with conflict resolution
    for (const reading of readings) {
      const existing = await this.db.glucoseReadings.where('backend_id').equals(reading.id).first();

      if (existing) {
        // Update existing
        await this.db.glucoseReadings.update(existing.local_id, {
          ...reading,
          backend_id: reading.id,
          synced: true,
        });
      } else {
        // Add new
        await this.db.glucoseReadings.add({
          local_id: UUID.v4(),
          backend_id: reading.id,
          ...reading,
          synced: true,
        });
      }
    }
  }

  private isCacheFresh(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  clearCache(): void {
    this.cacheTimestamp = 0;
  }
}
```

---

## State Management

### Evaluation: Services vs NgRx

| Aspect             | Angular Services + RxJS    | NgRx                                     |
| ------------------ | -------------------------- | ---------------------------------------- |
| **Complexity**     | Low - familiar patterns    | High - learning curve                    |
| **Boilerplate**    | Minimal                    | Significant (actions, reducers, effects) |
| **Type Safety**    | Good                       | Excellent                                |
| **Debugging**      | console.log, RxJS tap      | Redux DevTools (time-travel)             |
| **Testability**    | Good                       | Excellent (pure functions)               |
| **Performance**    | Good for small/medium apps | Better for large apps                    |
| **Team Size**      | 1-3 developers             | 4+ developers                            |
| **App Complexity** | Simple CRUD                | Complex state, many interactions         |

### Recommendation: Start with Services ✅

**Rationale:**

1. Diabetify is a focused app (glucose readings, appointments)
2. State is relatively simple (user, readings, appointments)
3. Small team (1-2 developers likely)
4. Faster initial development
5. Can migrate to NgRx later if needed

### State Management with Services (Recommended)

```typescript
// User State Service
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private userSubject = new BehaviorSubject<UserProfile | null>(null);
  user$ = this.userSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  setUser(user: UserProfile | null): void {
    this.userSubject.next(user);
  }

  getUser(): UserProfile | null {
    return this.userSubject.value;
  }

  updateUser(updates: Partial<UserProfile>): void {
    const current = this.userSubject.value;
    if (current) {
      this.userSubject.next({ ...current, ...updates });
    }
  }

  clearUser(): void {
    this.userSubject.next(null);
  }
}

// Glucose Readings State Service
@Injectable({ providedIn: 'root' })
export class GlucoseStateService {
  private readingsSubject = new BehaviorSubject<GlucoseReading[]>([]);
  readings$ = this.readingsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  // Derived state
  latestReading$ = this.readings$.pipe(map(readings => readings[0] || null));

  averageGlucose$ = this.readings$.pipe(
    map(readings => {
      if (readings.length === 0) return 0;
      const sum = readings.reduce((acc, r) => acc + r.value, 0);
      return sum / readings.length;
    })
  );

  setReadings(readings: GlucoseReading[]): void {
    this.readingsSubject.next(readings);
  }

  addReading(reading: GlucoseReading): void {
    const current = this.readingsSubject.value;
    this.readingsSubject.next([reading, ...current]);
  }

  updateReading(localId: string, updates: Partial<GlucoseReading>): void {
    const current = this.readingsSubject.value;
    const updated = current.map(r => (r.local_id === localId ? { ...r, ...updates } : r));
    this.readingsSubject.next(updated);
  }

  deleteReading(localId: string): void {
    const current = this.readingsSubject.value;
    const filtered = current.filter(r => r.local_id !== localId);
    this.readingsSubject.next(filtered);
  }

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  setError(error: string | null): void {
    this.errorSubject.next(error);
  }
}
```

### Facade Pattern for Complex Operations

```typescript
// Orchestrates multiple services
@Injectable({ providedIn: 'root' })
export class GlucoseFacadeService {
  // Expose state streams
  readings$ = this.glucoseState.readings$;
  loading$ = this.glucoseState.loading$;
  error$ = this.glucoseState.error$;

  constructor(
    private glucoseState: GlucoseStateService,
    private glucoseApi: GlucoseApiService,
    private db: DatabaseService,
    private syncQueue: SyncQueueService,
    private network: NetworkMonitorService
  ) {}

  async loadReadings(forceRefresh: boolean = false): Promise<void> {
    this.glucoseState.setLoading(true);
    this.glucoseState.setError(null);

    try {
      // Load from IndexedDB first
      const localReadings = await this.db.glucoseReadings.orderBy('timestamp').reverse().toArray();

      this.glucoseState.setReadings(localReadings);

      // Fetch from backend if online
      if (this.network.isOnline() || forceRefresh) {
        const backendReadings = await this.glucoseApi.getAllReadings().toPromise();
        await this.mergeReadings(backendReadings);
      }
    } catch (error) {
      console.error('Failed to load readings:', error);
      this.glucoseState.setError('Failed to load readings. Using cached data.');
    } finally {
      this.glucoseState.setLoading(false);
    }
  }

  async createReading(reading: Omit<GlucoseReading, 'local_id' | 'synced'>): Promise<void> {
    const localReading: GlucoseReading = {
      ...reading,
      local_id: UUID.v4(),
      synced: false,
    };

    // Save to IndexedDB immediately
    await this.db.glucoseReadings.add(localReading);

    // Update state
    this.glucoseState.addReading(localReading);

    // Queue for sync
    if (this.network.isOnline()) {
      try {
        const created = await this.glucoseApi.createReading(reading).toPromise();

        // Update with backend ID
        await this.db.glucoseReadings.update(localReading.local_id, {
          backend_id: created.id,
          synced: true,
        });

        this.glucoseState.updateReading(localReading.local_id, {
          backend_id: created.id,
          synced: true,
        });
      } catch (error) {
        // Queue for later
        await this.syncQueue.enqueue({
          type: 'CREATE',
          entity: 'glucose_reading',
          data: reading,
        });
      }
    } else {
      // Offline - queue immediately
      await this.syncQueue.enqueue({
        type: 'CREATE',
        entity: 'glucose_reading',
        data: reading,
      });
    }
  }

  private async mergeReadings(backendReadings: GlucoseReading[]): Promise<void> {
    // Merge backend data with local IndexedDB
    for (const reading of backendReadings) {
      const existing = await this.db.glucoseReadings.where('backend_id').equals(reading.id).first();

      if (existing) {
        // Update existing
        await this.db.glucoseReadings.update(existing.local_id, {
          ...reading,
          backend_id: reading.id,
          synced: true,
        });
      } else {
        // Add new
        await this.db.glucoseReadings.add({
          local_id: UUID.v4(),
          backend_id: reading.id,
          ...reading,
          synced: true,
        });
      }
    }

    // Reload state from IndexedDB
    const allReadings = await this.db.glucoseReadings.orderBy('timestamp').reverse().toArray();

    this.glucoseState.setReadings(allReadings);
  }
}
```

---

## TypeScript Models

### Complete Type Definitions

```typescript
// ============================================================================
// USER MODELS (Login Service)
// ============================================================================

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface LoginRequest {
  username: string; // Actually email
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  is_superuser?: boolean;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  password?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface UserProfile extends User {
  avatar?: string;
  age?: number;
  preferences?: UserPreferences;
  last_sync?: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  glucose_unit: 'mg/dL' | 'mmol/L';
  notifications_enabled: boolean;
  biometric_auth_enabled: boolean;
}

// ============================================================================
// GLUCOSE MODELS (Glucoserver Service + BLE)
// ============================================================================

export interface GlucoseReading {
  // Local tracking
  local_id: string; // UUID for offline tracking
  backend_id?: number; // ID from backend after sync
  synced: boolean; // Sync status

  // Core data
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  timestamp: Date;
  device_id: string;
  notes?: string;

  // User association (missing from backend!)
  user_id?: number;

  // BLE-specific fields (missing from backend!)
  sequence_number?: number;
  sample_type?: GlucoseSampleType;
  sample_location?: GlucoseSampleLocation;

  // Context (future enhancement)
  meal_context?: 'fasting' | 'before_meal' | 'after_meal';
  exercise_context?: boolean;
  medication_context?: boolean;
}

export type GlucoseSampleType =
  | 'capillary_whole_blood'
  | 'capillary_plasma'
  | 'venous_whole_blood'
  | 'venous_plasma'
  | 'arterial_whole_blood'
  | 'arterial_plasma'
  | 'undetermined_whole_blood'
  | 'undetermined_plasma'
  | 'interstitial_fluid'
  | 'control_solution';

export type GlucoseSampleLocation =
  | 'finger'
  | 'alternate_site_test'
  | 'earlobe'
  | 'control_solution'
  | 'not_available';

export interface GlucoseReadingCreate {
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  timestamp: Date;
  device_id: string;
  notes?: string;
}

export interface GlucoseStatistics {
  average: number;
  min: number;
  max: number;
  std_dev: number;
  count: number;
  period: '7d' | '30d' | '90d' | 'all';
}

// ============================================================================
// APPOINTMENT MODELS (Appointments Service)
// ============================================================================

export interface Appointment {
  // Local tracking
  local_id: string;
  backend_id?: number;
  synced: boolean;

  // Core data
  patient_name: string;
  appointment_date: Date;
  status: AppointmentStatus;
  queue_position?: number;
  notes?: string;

  // Missing from backend (should exist)
  user_id?: number;
  practitioner_id?: number;
  appointment_type?: string;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface AppointmentCreate {
  patient_name: string;
  appointment_date: Date;
  notes?: string;
}

export interface AppointmentUpdate {
  appointment_date?: Date;
  status?: AppointmentStatus;
  notes?: string;
}

export interface QueuePosition {
  appointment_id: number;
  queue_position: number;
  estimated_wait_time?: number; // minutes
}

// ============================================================================
// SYNC MODELS
// ============================================================================

export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'glucose_reading' | 'appointment' | 'user';
  data: any;
  timestamp: number;
  retries: number;
  status: SyncStatus;
  error_message?: string;
}

export type SyncStatus = 'pending' | 'processing' | 'failed' | 'completed';

export interface SyncResult {
  success: boolean;
  operations_processed: number;
  operations_failed: number;
  errors: SyncError[];
}

export interface SyncError {
  operation_id: string;
  entity: string;
  error_message: string;
  timestamp: number;
}

// ============================================================================
// API RESPONSE MODELS
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: Date;
}

export interface ApiError {
  detail: string;
  status_code: number;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

// ============================================================================
// BLE MODELS
// ============================================================================

export interface BleDevice {
  device_id: string;
  name: string;
  manufacturer?: string;
  rssi?: number; // Signal strength
  connected: boolean;
  battery_level?: number;
}

export interface BleCharacteristic {
  service_uuid: string;
  characteristic_uuid: string;
  properties: string[];
  descriptors: BleDescriptor[];
}

export interface BleDescriptor {
  uuid: string;
  value?: DataView;
}

export interface BleConnectionState {
  device: BleDevice | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error?: string;
}

// ============================================================================
// ERROR MODELS
// ============================================================================

export interface AppError {
  id: string;
  timestamp: Date;
  context: string;
  message: string;
  stack?: string;
  http_status?: number;
  http_url?: string;
  user_id?: number;
  app_version: string;
  platform: string;
}

// ============================================================================
// NETWORK MODELS
// ============================================================================

export interface NetworkStatus {
  online: boolean;
  connection_type: 'wifi' | 'cellular' | 'none' | 'unknown';
  effective_type?: '4g' | '3g' | '2g' | 'slow-2g';
}

// ============================================================================
// CACHE MODELS
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

export interface CacheMetadata {
  size: number; // bytes
  entries: number;
  oldest_entry: Date;
  newest_entry: Date;
}
```

---

## Backend Limitations & Migration Path

### Critical Issues Summary

| Priority        | Issue                                         | Impact                           | Mobile Workaround                         | Backend Fix Required           |
| --------------- | --------------------------------------------- | -------------------------------- | ----------------------------------------- | ------------------------------ |
| **P0 - URGENT** | SHA-256 password hashing                      | Security vulnerability           | Warn users, suggest long passwords        | Migrate to bcrypt/Argon2       |
| **P0 - URGENT** | No pagination in glucoserver                  | Large payloads, poor performance | Client-side filtering, aggressive caching | Add pagination                 |
| **P1 - HIGH**   | No refresh tokens                             | Poor UX (re-login every 30min)   | Session warnings, biometric quick-login   | Implement refresh token flow   |
| **P1 - HIGH**   | No authentication on appointments/glucoserver | Security risk                    | Client validates JWT before requests      | Add JWT middleware             |
| **P1 - HIGH**   | Queue capacity bug                            | Overbooking                      | Client-side validation                    | Fix capacity logic             |
| **P2 - MEDIUM** | CORS wildcard                                 | Security risk                    | None                                      | Restrict to specific origins   |
| **P2 - MEDIUM** | Synchronous I/O                               | Performance bottleneck           | Queue retries, longer timeouts            | Migrate to async (httpx)       |
| **P2 - MEDIUM** | No user scoping in glucoserver                | Privacy violation                | Add user_id locally (don't sync)          | Add user_id FK, filter by user |
| **P3 - LOW**    | No rate limiting                              | DoS vulnerability                | Client-side throttling                    | Add rate limiting middleware   |
| **P3 - LOW**    | No WebSocket support                          | No real-time updates             | Polling (30s intervals)                   | Implement WebSocket endpoints  |

### Immediate Mobile Workarounds (v1.0)

**Implement Now:**

1. **Pagination Workaround**

   ```typescript
   // Client-side pagination for GET /readings/
   getReadings(page: number = 1, pageSize: number = 50): Observable<GlucoseReading[]> {
     return this.api.getAllReadings().pipe(
       map(readings => {
         const start = (page - 1) * pageSize;
         const end = start + pageSize;
         return readings.slice(start, end);
       })
     );
   }
   ```

2. **Session Management**

   ```typescript
   // Warn user at 25 minutes
   startSessionMonitor(): void {
     interval(60000).subscribe(async () => {
       const expiresIn5Min = await this.token.expiresInMinutes(5);
       if (expiresIn5Min) {
         this.showSessionWarning();
       }
     });
   }
   ```

3. **Client-Side Validation**

   ```typescript
   // Validate appointments before submission
   validateAppointment(appointment: AppointmentCreate): ValidationResult {
     // Check date is in future
     // Check queue capacity (estimate based on known appointments)
     // Validate required fields
   }
   ```

4. **Aggressive Caching**
   ```typescript
   // Cache readings for 5 minutes
   // Only fetch new readings incrementally
   // Use IndexedDB as primary source
   ```

### Backend Improvements Roadmap

#### Phase 1: Security Fixes (Week 1-2) 🔴 CRITICAL

```python
# 1. Upgrade password hashing
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Migration script for existing users
async def migrate_passwords():
    users = db.query(User).all()
    for user in users:
        # User must reset password (can't decrypt SHA-256)
        user.password_reset_required = True
    db.commit()
```

```python
# 2. Restrict CORS
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.diabetify.com",
        "capacitor://localhost",  # Capacitor apps
        "ionic://localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

```python
# 3. Add JWT auth to all services
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    # Validate JWT
    # Return user or raise 401
    pass

# Apply to all endpoints
@router.get("/readings/")
async def get_readings(current_user: User = Depends(get_current_user)):
    # Filter by user_id
    return db.query(GlucoseReading).filter_by(user_id=current_user.id).all()
```

#### Phase 2: Performance Improvements (Week 3-4) 🟡 HIGH

```python
# 1. Add pagination
from fastapi import Query

@router.get("/readings/")
async def get_readings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    since: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    query = db.query(GlucoseReading).filter_by(user_id=current_user.id)

    if since:
        query = query.filter(GlucoseReading.timestamp > since)

    total = query.count()
    readings = query.order_by(GlucoseReading.timestamp.desc()).offset(skip).limit(limit).all()

    return {
        "items": readings,
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit,
        "has_next": skip + limit < total
    }
```

```python
# 2. Migrate to async I/O
import httpx
from fastapi import FastAPI

app = FastAPI()

@app.on_event("startup")
async def startup():
    app.state.http_client = httpx.AsyncClient()

@app.on_event("shutdown")
async def shutdown():
    await app.state.http_client.aclose()

# Use in endpoints
@router.post("/readings/")
async def create_reading(reading: GlucoseReadingCreate):
    async with app.state.http_client as client:
        response = await client.post("http://glucoserver/readings/", json=reading.dict())
    return response.json()
```

```python
# 3. Add database indexes
from sqlalchemy import Index

class GlucoseReading(Base):
    __tablename__ = "glucose_readings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    value = Column(Float, nullable=False)

    __table_args__ = (
        Index('ix_glucose_user_timestamp', 'user_id', 'timestamp'),
    )
```

#### Phase 3: Feature Enhancements (Week 5-6) 🟢 MEDIUM

```python
# 1. Refresh token implementation
from datetime import timedelta

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)

    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    refresh_token = create_refresh_token(
        data={"sub": user.email},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/token/refresh")
async def refresh_access_token(refresh_token: str):
    # Validate refresh token
    # Issue new access token
    pass
```

```python
# 2. WebSocket support for real-time updates
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    async def broadcast_reading(self, user_id: int, reading: dict):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(reading)

manager = ConnectionManager()

@app.websocket("/ws/readings")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await get_user_from_token(token)
    await manager.connect(user.id, websocket)

    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        manager.disconnect(user.id)
```

```python
# 3. Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@router.post("/token")
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    # Login logic
    pass
```

#### Phase 4: Architecture Redesign (Month 2+) 🔵 LONG-TERM

- Event-driven architecture with message queues (RabbitMQ/Kafka)
- CQRS pattern for glucose readings (separate read/write models)
- Distributed tracing (Jaeger/OpenTelemetry)
- Circuit breakers for resilience (Hystrix-like)
- API Gateway enhancements (rate limiting, caching, authentication)
- Comprehensive monitoring (Prometheus + Grafana)
- Automated backup and disaster recovery

---

## Summary & Next Steps

### Integration Architecture Complete ✅

This document provides a complete blueprint for integrating the Diabetify mobile app with the backend microservices architecture, including:

- **5-layer mobile architecture** from BLE to storage
- **4 data flow diagrams** covering authentication, glucose readings (BLE→Backend, Backend→Mobile), and appointments
- **Comprehensive security strategy** with JWT management, biometric auth, and threat mitigation
- **Complete Angular service architecture** with 30+ service files organized by domain
- **5 HTTP interceptors** for auth, errors, retry, caching, and offline queueing
- **Offline-first strategy** with IndexedDB schema, sync queue, and conflict resolution
- **Real-time integration options** (polling, adaptive polling, background fetch, future WebSocket)
- **Error handling matrix** with 12 error scenarios and recovery strategies
- **Multi-level caching** (memory, HTTP, IndexedDB, preferences, secure storage)
- **State management recommendation** (Services + RxJS for MVP, NgRx path for future)
- **30+ TypeScript models** covering all backend entities
- **Backend migration roadmap** in 4 phases (security → performance → features → architecture)

### Mobile Development Checklist

**Phase 1: Foundation (Week 1-2)**

- [ ] Set up Angular service architecture (core/services structure)
- [ ] Implement TokenService with SecureStorage
- [ ] Create AuthInterceptor for JWT injection
- [ ] Implement ErrorInterceptor for global error handling
- [ ] Set up Dexie with database schema
- [ ] Create base API services (auth, glucose, appointments)

**Phase 2: Core Features (Week 3-4)**

- [ ] Implement SyncQueueService with retry logic
- [ ] Create ConflictResolverService
- [ ] Build GlucoseFacadeService
- [ ] Implement offline-first glucose reading flow
- [ ] Add client-side pagination for readings
- [ ] Create session warning system (25min alert)

**Phase 3: BLE Integration (Week 5-6)**

- [ ] Integrate existing BLE code with new architecture
- [ ] Implement BLE→Backend sync bridge
- [ ] Add glucose reading parser service
- [ ] Create real-time UI updates (NgZone.run())
- [ ] Add device connection management

**Phase 4: Polish & Testing (Week 7-8)**

- [ ] Implement all HTTP interceptors (retry, cache, offline)
- [ ] Add comprehensive error logging
- [ ] Build adaptive polling service
- [ ] Create conflict resolution UI
- [ ] Add biometric authentication
- [ ] Performance testing and optimization
- [ ] Security audit

### Backend Priority Fixes

**URGENT (This Week)**

- [ ] Fix SHA-256 password hashing vulnerability
- [ ] Add pagination to GET /readings/ endpoint
- [ ] Add JWT authentication to appointments and glucoserver services
- [ ] Fix queue capacity bug in appointments service

**HIGH PRIORITY (Next 2 Weeks)**

- [ ] Implement refresh token flow
- [ ] Restrict CORS to specific origins
- [ ] Add user_id foreign key to glucose readings
- [ ] Add database indexes for performance

**Documentation References**

- Backend Analysis: `.taskmaster/docs/backend-services-analysis.md`
- API Reference: `.taskmaster/docs/backend-api-reference.md`
- This Integration Guide: `.taskmaster/docs/mobile-backend-integration.md`

---

**Version**: 1.0
**Last Updated**: 2025-10-10
**Author**: Diabetify Development Team
**Status**: Ready for Implementation
