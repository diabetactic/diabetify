# Diabetactic Architecture Documentation

See the detailed architecture documentation in subdirectories:

- **[API Reference](./api-reference/)** - API documentation and data models
- **[Agent Reference](./agent-reference/)** - AI agent development guides
- **[Development](./development/)** - Development guides (testing, i18n, etc.)

For the main architecture overview, see the consolidated documentation in this folder.

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
   - **Target**: Individual microservice endpoints
   - **Status**: ✅ Approved (limited scope)

## Service Architecture

### Core Services

#### Authentication Layer
- **UnifiedAuthService**: Coordinates all authentication flows
- **TidepoolAuthService**: Handles Tidepool OAuth2/PKCE
- **LocalAuthService**: Manages local backend authentication

#### Data Layer
- **DatabaseService**: Dexie/IndexedDB management
- **ReadingsService**: Glucose readings with caching
- **AppointmentService**: Tele-appointments
- **ProfileService**: User profile management

#### Integration Layer
- **ApiGatewayService**: Centralized backend communication
- **ExternalServicesManagerService**: Service health monitoring
- **TidepoolSyncService**: Tidepool data synchronization

## Data Flow

```
User Action
  ↓
Component
  ↓
Service (Business Logic)
  ↓
ApiGatewayService → Backend Microservices
  ↓              ↓
DatabaseService  TidepoolAuthService → Tidepool API
  ↓
IndexedDB
```

## Offline-First Strategy

1. **Read**: Check IndexedDB cache first
2. **Network**: Fetch from API if cache miss or stale
3. **Update**: Store response in cache
4. **Sync**: Background sync when online

## Testing Architecture

- **Unit Tests**: Jasmine/Karma for services and components
- **E2E Tests**: Playwright for user flows
- **Integration Tests**: Test service interactions
- **Mobile Tests**: Capacitor device testing

See [Testing Guide](./testing/TESTING_GUIDE.md) for details.

## Security

- OAuth2/PKCE for Tidepool
- JWT tokens for backend services
- Token refresh handling
- Secure storage with Capacitor Preferences

## Performance

- IndexedDB caching
- Request debouncing
- Lazy loading routes
- Image optimization
- Bundle size optimization (target: <2MB initial)
