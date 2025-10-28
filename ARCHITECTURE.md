# Diabetify Architecture Documentation

## API Gateway Pattern (Gateway-Only Policy)

### Principle
**ALL** backend API communication MUST be routed through the API Gateway service. Direct HTTP calls to microservices from the frontend are prohibited except for explicitly documented exceptions.

### Gateway Service
- **Location**: `src/app/core/services/api-gateway.service.ts`
- **Base URL**: `environment.backendServices.apiGateway.baseUrl` (default: `http://localhost:8000`)
- **Responsibilities**:
  - Centralized request routing
  - Automatic authentication token injection
  - Response transformation
  - Error standardization
  - Caching strategy
  - Retry logic with exponential backoff

### Approved Exceptions

The following services are **explicitly allowed** to make direct HTTP calls:

1. **TidepoolAuthService & TidepoolSyncService**
   - **Reason**: External OAuth provider, not part of our backend
   - **Target**: `https://api.tidepool.org`
   - **Status**: ✅ Approved

2. **ExternalServicesManagerService (Health Checks Only)**
   - **Reason**: Monitoring service health requires direct access
   - **Usage**: Health endpoint pings only (HEAD/GET `/health`)
   - **Status**: ✅ Approved

### Services Requiring Migration

The following services currently use direct HttpClient and **MUST** be migrated to use ApiGatewayService:

1. ❌ **LocalAuthService** (HIGH PRIORITY)
   - Current: Direct HTTP to auth endpoints
   - Required: Route through `auth.login`, `auth.register`, `auth.refresh` gateway endpoints
   - Impact: Critical for authentication flow

2. ❌ **GlucoserverService** (TO BE EVALUATED)
   - Current: Direct HTTP to glucoserver
   - Action: Determine if service is used, then migrate or remove
   - Impact: Medium (may be unused legacy code)

### Gateway Endpoint Registry

All backend endpoints are registered in `API_ENDPOINTS` map within `api-gateway.service.ts`:

```typescript
// Example endpoint configuration
const API_ENDPOINTS: Map<string, ApiEndpoint> = new Map([
  ['appointments.create', {
    service: ExternalService.APPOINTMENTS,
    path: '/api/appointments',
    method: 'POST',
    authenticated: true,
    timeout: 30000,
  }],
  // ... more endpoints
]);
```

### Request Flow

```
Component/Service → ApiGatewayService → Gateway (localhost:8000) → Microservice
                                ↓
                    - Add auth token
                    - Apply caching
                    - Handle retries
                    - Transform response
```

### Authentication Flow

```
1. User login → ApiGatewayService.request('auth.login')
2. Gateway returns access + refresh tokens
3. Tokens stored via UnifiedAuthService
4. ApiGatewayService auto-injects token on subsequent requests
5. AuthInterceptor handles 401 errors with automatic refresh
```

### Manual-First Glucose Sharing

The appointments glucose sharing feature follows this architecture:

1. **Data Collection**: `ReadingsService.exportManualReadingsSummary()` generates summary from IndexedDB
2. **API Call**: `AppointmentService.shareManualGlucoseData()` → ApiGatewayService
3. **Gateway Route**: `appointments.shareGlucose` → `/appointments/appointments/{id}/share-glucose`
4. **Payload Structure**:
```json
{
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-31T23:59:59.999Z",
  "manualReadingsSummary": {
    "generatedAt": "2025-01-31T12:00:00.000Z",
    "range": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    },
    "unit": "mg/dL",
    "totalReadings": 120,
    "statistics": {
      "average": 142.5,
      "minimum": 78,
      "maximum": 210
    }
  }
}
```

**Important**: Only the summary is sent, never raw reading records. This ensures privacy and reduces payload size.

### Environment Configuration

Backend services are configured in `src/environments/environment.ts`:

```typescript
backendServices: {
  apiGateway: {
    baseUrl: 'http://localhost:8000',
    apiPath: '',
    requestTimeout: 30000,
  },
  // Individual service URLs are NOT used directly
  // They exist for documentation/fallback only
}
```

### Feature Flags

- `features.useLocalBackend`: Enable/disable local backend (default: true in dev)
- `features.useTidepoolIntegration`: Enable/disable Tidepool sync (default: true)

When a feature is disabled, related UI should be hidden/disabled.

### Security Considerations

1. **No Raw Data in Logs**: API requests/responses should not log PII or raw glucose readings
2. **Request ID Tracking**: All gateway requests should include `X-Request-Id` header (TODO)
3. **Token Security**:
   - Android: Use secure storage (Android Keystore)
   - Web: Use Capacitor Preferences (development only, not production-safe)

### Testing Requirements

Services using ApiGatewayService MUST have unit tests covering:
- Correct endpoint route selection
- Request body structure
- Error handling
- Response transformation

Example test pattern:
```typescript
it('should call correct gateway endpoint for share', () => {
  spyOn(apiGateway, 'request').and.returnValue(of({ success: true, data: mockResponse }));

  service.shareManualGlucoseData('apt-123', { days: 30 });

  expect(apiGateway.request).toHaveBeenCalledWith(
    'appointments.shareGlucose',
    jasmine.objectContaining({ body: jasmine.objectContaining({ manualReadingsSummary: jasmine.any(Object) }) }),
    { id: 'apt-123' }
  );
});
```

### Migration Checklist

When migrating a service to use ApiGatewayService:

- [ ] Remove `HttpClient` injection
- [ ] Inject `ApiGatewayService` instead
- [ ] Register endpoint in `API_ENDPOINTS` map
- [ ] Replace `http.get/post/put/delete` with `apiGateway.request()`
- [ ] Update error handling to use `ApiResponse` type
- [ ] Add/update unit tests
- [ ] Verify no direct URL construction
- [ ] Update documentation

### Enforcement

To prevent accidental violations:
- **Code Review**: All PRs touching services must verify gateway usage
- **Documentation**: This file serves as the authoritative reference
- **Future**: Consider adding ESLint rule to prevent HttpClient imports outside allowed files

### Compliance Status

| Service | Status | Notes |
|---------|--------|-------|
| ApiGatewayService | ✅ Core Implementation | - |
| AppointmentService | ✅ Migrated | All endpoints via gateway |
| ReadingsService | ✅ Compliant | Local IndexedDB only |
| TidepoolAuthService | ✅ Exception Approved | External OAuth |
| TidepoolSyncService | ✅ Exception Approved | External API |
| ExternalServicesManager | ✅ Exception Approved | Health checks only |
| LocalAuthService | ❌ **Needs Migration** | HIGH PRIORITY |
| GlucoserverService | ❌ **To Be Evaluated** | Check usage first |

---

**Last Updated**: 2025-10-28
**Policy Owner**: Architecture Team
**Review Cycle**: Monthly or on major changes
