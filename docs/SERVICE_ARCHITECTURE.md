# Service Architecture

**Document Version:** 1.0
**Last Updated:** November 18, 2025
**Status:** ✅ Consolidated & Verified

## Overview

This document describes the current service architecture for the Diabetactic application after the November 2025 consolidation effort. All backend communication has been unified through a single `ApiGatewayService`, eliminating duplication and simplifying the codebase.

## Table of Contents

1. [Architecture Summary](#architecture-summary)
2. [Service Layer](#service-layer)
3. [Environment Configuration](#environment-configuration)
4. [Endpoint Mapping](#endpoint-mapping)
5. [Migration Summary](#migration-summary)
6. [Verification](#verification)

---

## Architecture Summary

### Current Architecture (Consolidated)

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Components, Pages, Services)                              │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              ApiGatewayService (Single Entry Point)          │
│  • Unified request routing                                  │
│  • Authentication handling                                   │
│  • Response transformation                                   │
│  • Centralized error handling                               │
│  • Request caching                                          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Backend Mode? │
            └───────┬───────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
         ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐
    │  Mock  │ │ Local  │ │ Heroku │
    │  Data  │ │ Docker │ │  Cloud │
    └────────┘ └────────┘ └────────┘
```

**Key Benefits:**
- ✅ Single source of truth for all API calls
- ✅ Consistent error handling across the app
- ✅ Easy environment switching (mock/local/cloud)
- ✅ Reduced code duplication (~2,138 lines removed)
- ✅ Simplified testing (one service to mock)

### Previous Architecture (Before Consolidation)

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
└───────────┬───────────┬─────────────────┬───────────────────┘
            │           │                 │
            ▼           ▼                 ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  ApiGateway  │ │ ExtServices  │ │   Adapters   │
    │   Service    │ │    Client    │ │  (Various)   │
    └──────────────┘ └──────────────┘ └──────────────┘
           │                │                │
           └────────────────┴────────────────┘
                          │
                    [DUPLICATION]
                          │
                    Backend Services
```

**Problems:**
- ❌ Multiple services calling same endpoints
- ❌ Inconsistent error handling
- ❌ Difficult to maintain
- ❌ Confusing for new developers
- ❌ Unused adapter code (~1,339 lines dead code)

---

## Service Layer

### ApiGatewayService

**Location:** `src/app/core/services/api-gateway.service.ts`

**Responsibilities:**
- Unified entry point for all HTTP requests
- Request routing based on endpoint configuration
- Authentication token injection
- Response transformation and validation
- Error handling and retry logic
- Request caching (configurable per endpoint)
- Platform-specific HTTP client selection (web vs native)

**Key Methods:**

```typescript
// Generic request method
request<T>(endpoint: string, options?: ApiRequestOptions, params?: any): Observable<ApiResponse<T>>

// Specialized methods
get<T>(endpoint: string, options?: ApiRequestOptions): Observable<T>
post<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T>
put<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T>
delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<T>
```

**Usage Example:**

```typescript
// In AppointmentService
constructor(private apiGateway: ApiGatewayService) {}

getAppointments(): Observable<Appointment[]> {
  return this.apiGateway.request<BackendAppointment[]>('extservices.appointments.mine').pipe(
    map(response => {
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch appointments');
      }
      return this.mapBackendToAppointments(response.data);
    })
  );
}
```

### Supporting Services

#### MockAdapterService
**Location:** `src/app/core/services/mock-adapter.service.ts`
**Purpose:** Provides in-memory mock data when `backendMode === 'mock'`
**Use Case:** Development, testing, offline mode

#### CapacitorHttpService
**Location:** `src/app/core/services/capacitor-http.service.ts`
**Purpose:** Platform-aware HTTP client (native vs web)
**Use Case:** Automatic selection based on Capacitor platform detection

#### LocalAuthService
**Location:** `src/app/core/services/local-auth.service.ts`
**Purpose:** JWT token management, authentication state
**Use Case:** Token injection, login/logout, session persistence

---

## Environment Configuration

### Backend Modes

The application supports three backend modes:

| Mode | Description | URL | Use Case |
|------|-------------|-----|----------|
| `mock` | In-memory data | N/A | Development, offline |
| `local` | Docker backend | `http://localhost:8000` | Full-stack dev |
| `cloud` | Heroku API Gateway | `https://diabetactic-api-gateway-37949d6f182f.herokuapp.com` | Integration testing |

### Environment Files

#### Default (Mock Mode)
**File:** `src/environments/environment.ts`

```typescript
const DEV_BACKEND_MODE: BackendMode = 'mock';

export const environment = {
  production: false,
  backendMode: DEV_BACKEND_MODE,
  backendServices: {
    apiGateway: {
      baseUrl: getBaseUrl(DEV_BACKEND_MODE),  // Returns mock URL or local
      apiPath: '',
      requestTimeout: 30000,
    },
  },
  features: {
    useTidepoolMock: true,
  },
};
```

#### Heroku (Cloud Mode)
**File:** `src/environments/environment.heroku.ts`

```typescript
const DEV_BACKEND_MODE: BackendMode = 'cloud';

export const environment = {
  production: false,
  backendMode: DEV_BACKEND_MODE,
  backendServices: {
    apiGateway: {
      baseUrl: getBaseUrl(DEV_BACKEND_MODE),  // Returns Heroku URL or proxy '/api'
      apiPath: '',
      requestTimeout: 30000,
    },
  },
  features: {
    useTidepoolIntegration: true,
  },
};
```

### Environment Switching

**Via NPM Scripts:**

```bash
# Mock mode (default)
npm start

# Cloud mode (Heroku)
ENV=heroku npm start

# Local mode (Docker)
ENV=local npm start
```

**How It Works:**

1. `npm start` → calls `scripts/start-with-env.mjs`
2. Script reads `ENV` variable and sets Angular configuration
3. Angular build replaces `environment.ts` with appropriate file
4. ApiGatewayService imports from `environments/environment` (replaced file)
5. Backend calls automatically route to correct URL

**File Replacements (angular.json):**

```json
{
  "heroku": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.heroku.ts"
      }
    ]
  }
}
```

---

## Endpoint Mapping

All endpoints are centrally defined in `ApiGatewayService`:

### ExtServices Endpoints

| Endpoint Key | Method | Path | Description |
|-------------|--------|------|-------------|
| `extservices.appointments.mine` | GET | `/appointments/mine` | Get user's appointments |
| `extservices.appointments.create` | POST | `/appointments/create` | Create new appointment |
| `extservices.appointments.update` | PUT | `/appointments/update/{id}` | Update appointment |
| `extservices.appointments.cancel` | PATCH | `/appointments/{id}/cancel` | Cancel appointment |
| `extservices.appointments.share` | POST | `/appointments/{id}/share-glucose` | Share glucose data |
| `extservices.appointments.doctors.list` | GET | `/appointments/doctors` | List available doctors |
| `extservices.appointments.slots.available` | GET | `/appointments/slots` | Get available time slots |
| `extservices.glucose.mine` | GET | `/glucose/mine` | Get user's glucose readings |
| `extservices.glucose.create` | POST | `/glucose/create` | Create glucose reading |
| `extservices.appointments.resolutions` | GET | `/appointments/resolutions` | Get appointment resolutions |

### Tidepool Endpoints

| Endpoint Key | Method | Path | Description |
|-------------|--------|------|-------------|
| `tidepool.glucose.fetch` | GET | `/data/v1/users/{userId}/data` | Fetch glucose data |
| `tidepool.user.profile` | GET | `/metadata/{userId}/profile` | Get user profile |
| `tidepool.auth.login` | POST | `/auth/login` | OAuth2 login |

**Full endpoint configuration:** See `API_ENDPOINTS` map in `src/app/core/services/api-gateway.service.ts`

---

## Migration Summary

### Files Deleted (~2,138 lines)

| File | Lines | Reason |
|------|-------|--------|
| `api-gateway-adapter.service.ts` | 540 | Duplicated ApiGatewayService |
| `api-gateway-adapter.service.spec.ts` | 150 | Test for deleted service |
| `local-auth-adapter.service.ts` | 375 | Incomplete token refresh |
| `appointment-adapter.service.ts` | 424 | Dexie modifications (not needed) |
| `ext-services-client.service.ts` | 649 | Duplicated ApiGatewayService |

**Total Removed:** 2,138 lines of dead/duplicate code

### Files Refactored (3 files)

| File | Changes | Lines Modified |
|------|---------|---------------|
| `appointment.service.ts` | Removed ExtServicesClient, use ApiGateway | ~50 lines |
| `auto-test.service.ts` | Migrated 9 test methods to ApiGateway | ~100 lines |
| `integration-test.page.ts` | Removed ExtServices import | ~10 lines |

### Tests Updated (1 file)

| File | Changes |
|------|---------|
| `appointment.service.spec.ts` | Removed ExtServicesClient spy, cleaned imports |

---

## Verification

### Test Results

**Unit Tests:**
```bash
$ npm run test:ci
✅ 231/232 tests passing (1 skipped)
✅ All AppointmentService tests working
✅ No new test failures introduced
```

**Build Verification:**
```bash
$ npm run build
✅ Production build successful (12.6s)
✅ No compilation errors

$ npx ng build --configuration=heroku
✅ Heroku configuration build successful (18.7s)
✅ Environment switching verified
```

**Android Build:**
```bash
$ npm run cap:sync && cd android && ./gradlew assembleDebug
✅ APK built successfully (19 MB)
✅ Location: android/app/build/outputs/apk/debug/app-debug.apk
```

### Environment Switching Tests

| Mode | Configuration | Build | Status |
|------|--------------|-------|--------|
| Mock | `environment.ts` | Default | ✅ Verified |
| Cloud | `environment.heroku.ts` | Heroku | ✅ Verified |
| Local | `environment.ts` (manual) | Development | ⚠️ Not tested (requires Docker) |

### Codebase Health

- **Code Duplication:** Eliminated (~2,138 lines removed)
- **Service Architecture:** Unified (ApiGatewayService only)
- **Test Coverage:** 35.13% (pre-existing, not affected by changes)
- **Build Time:** ~12-18 seconds (no performance impact)

---

## Best Practices

### Adding New Backend Endpoints

1. **Define endpoint in ApiGatewayService:**
   ```typescript
   // In API_ENDPOINTS map
   [
     'myservice.myendpoint',
     {
       service: ExternalService.MYSERVICE,
       path: '/my-endpoint',
       method: 'GET',
       authenticated: true,
       timeout: 30000,
     },
   ]
   ```

2. **Use in your service:**
   ```typescript
   constructor(private apiGateway: ApiGatewayService) {}

   myMethod(): Observable<MyData> {
     return this.apiGateway.request<MyData>('myservice.myendpoint').pipe(
       map(response => {
         if (!response.success) {
           throw new Error(response.error?.message || 'Request failed');
         }
         return response.data;
       })
     );
   }
   ```

3. **Write tests:**
   ```typescript
   const apiGatewaySpy = jasmine.createSpyObj('ApiGatewayService', ['request']);
   apiGatewaySpy.request.and.returnValue(of({ success: true, data: mockData }));

   TestBed.configureTestingModule({
     providers: [
       MyService,
       { provide: ApiGatewayService, useValue: apiGatewaySpy },
     ],
   });
   ```

### Testing Different Backend Modes

```bash
# Test mock mode
npm start
# Visit http://localhost:4200

# Test cloud mode (Heroku)
ENV=heroku npm start
# Visit http://localhost:4200

# Test local mode (Docker)
# 1. Start Docker Compose: cd extServicesCompose && docker-compose up
# 2. ENV=local npm start
# 3. Visit http://localhost:4200
```

### Troubleshooting

**Problem:** "Cannot read property 'baseUrl' of undefined"
**Solution:** Verify environment file is correctly imported and getBaseUrl() returns valid URL

**Problem:** "No provider for ExtServicesClientService"
**Solution:** Service was deleted - use ApiGatewayService instead

**Problem:** "CORS error in web browser"
**Solution:** Ensure `proxy.conf.json` is configured and dev server uses proxy

**Problem:** "Environment variable not switching"
**Solution:** Clear Angular cache: `rm -rf .angular/cache && npm start`

---

## Related Documentation

- [API Gateway Implementation](./api-reference/EXTERNAL_SERVICES.md)
- [Environment Configuration](../src/environments/README.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Backend Integration](./HEALTH_CHECK_IMPLEMENTATION.md)

---

**Questions or Issues?**
Contact the development team or file an issue in the project repository.
