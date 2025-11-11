# External Services Integration Architecture

## Overview

The Diabetify application implements a comprehensive external services integration layer that provides unified access to all external APIs, with built-in health monitoring, circuit breaker patterns, intelligent caching, and workflow orchestration.

## Architecture Components

### 1. External Services Manager (`external-services-manager.service.ts`)

The central hub for managing all external service connections.

**Key Features:**
- **Health Monitoring**: Periodic health checks for all services
- **Circuit Breaker Pattern**: Prevents cascading failures
- **Network Awareness**: Monitors connectivity and adjusts behavior
- **Caching**: Response caching with configurable TTL per service
- **Offline Support**: Falls back to cached data when offline

**Services Managed:**
- Tidepool API (OAuth2, glucose data)
- Glucoserver (local backend for glucose management)
- Appointments Service (healthcare provider integration)
- Local Auth Service (user authentication)

**Health Check Configuration:**
```typescript
const SERVICE_CONFIGS = {
  TIDEPOOL: {
    healthEndpoint: '/v1/status',
    timeout: 30000,
    retryAttempts: 3,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    cacheDuration: 300000, // 5 minutes
    offlineSupport: true
  },
  // ... other services
}
```

### 2. Service Orchestrator (`service-orchestrator.service.ts`)

Coordinates complex multi-service workflows with saga pattern implementation.

**Workflow Types:**
- `FULL_SYNC`: Complete data synchronization across all services
- `AUTH_AND_SYNC`: Authentication followed by initial sync
- `APPOINTMENT_WITH_DATA`: Share glucose data with healthcare provider
- `DATA_EXPORT`: Export glucose data in various formats
- `ACCOUNT_LINK`: Link Tidepool and local accounts

**Key Features:**
- **Saga Pattern**: Compensating transactions for rollback
- **Step Orchestration**: Sequential execution with dependencies
- **Retry Logic**: Configurable retries per step
- **Progress Tracking**: Real-time workflow state updates

**Example Workflow:**
```typescript
const fullSyncWorkflow = [
  { name: 'Check Network', critical: true },
  { name: 'Verify Auth', critical: true },
  { name: 'Sync Tidepool', compensate: rollbackTidepool },
  { name: 'Sync Local', compensate: rollbackLocal },
  { name: 'Update Statistics' },
  { name: 'Clean Duplicates' }
];
```

### 3. API Gateway (`api-gateway.service.ts`)

Unified entry point for all external API calls.

**Features:**
- **Request Routing**: Maps logical endpoints to physical services
- **Authentication Handling**: Automatic token injection
- **Response Transformation**: Normalizes responses across services
- **Caching**: Per-endpoint cache configuration
- **Error Standardization**: Consistent error format

**Endpoint Configuration:**
```typescript
const API_ENDPOINTS = {
  'tidepool.glucose.fetch': {
    service: ExternalService.TIDEPOOL,
    path: '/data/v1/users/{userId}/data',
    method: 'GET',
    authenticated: true,
    cache: { duration: 300000 },
    transform: { response: (data) => data.data || [] }
  },
  // ... other endpoints
}
```

### 4. Service Monitor Component (`service-monitor/`)

Real-time visual monitoring of all external services.

**Displays:**
- Service health status with color indicators
- Response times and last check timestamps
- Circuit breaker states
- Active and completed workflows
- Service-specific actions (health check, clear cache, reset circuit breaker)

## Integration Patterns

### Circuit Breaker Pattern

Prevents repeated calls to failing services:

```
CLOSED (normal) → failures exceed threshold → OPEN (blocked)
                                                    ↓
                                          wait timeout period
                                                    ↓
                                              HALF_OPEN (testing)
                                                    ↓
                            success → CLOSED | failure → OPEN
```

**Configuration per service:**
- Failure threshold: Number of failures before opening
- Timeout: Duration to wait before attempting recovery
- State transitions logged for debugging

### Saga Pattern for Workflows

Ensures data consistency across multiple services:

1. Execute steps sequentially
2. Track completed steps
3. On failure, execute compensating transactions in reverse order
4. Maintain workflow state for monitoring

**Example:**
```typescript
try {
  await step1(); // Create appointment
  await step2(); // Share glucose data
  await step3(); // Send notification
} catch (error) {
  await compensate3(); // Cancel notification
  await compensate2(); // Revoke data sharing
  await compensate1(); // Cancel appointment
}
```

### Caching Strategy

Multi-level caching for improved performance:

1. **Response Cache**: HTTP responses cached per endpoint
2. **Data Cache**: Processed data cached in services
3. **IndexedDB**: Local database for offline support

**Cache Invalidation:**
- TTL-based expiration
- Manual invalidation via service monitor
- Automatic invalidation on data mutations

## Usage Examples

### 1. Making API Calls via Gateway

```typescript
// Simple GET request
const response = await this.apiGateway.request('glucoserver.readings.list', {
  params: { limit: 100, offset: 0 }
});

// POST with body
const reading = await this.apiGateway.request('glucoserver.readings.create', {
  body: {
    value: 120,
    unit: 'mg/dL',
    timestamp: new Date()
  }
});

// With path parameters
const appointment = await this.apiGateway.request('appointments.update', {
  body: updateData
}, { id: 'appointment123' });
```

### 2. Executing Workflows

```typescript
// Full synchronization
const result = await this.orchestrator.executeFullSync();
if (result.success) {
  console.log('Sync completed:', result.data);
} else {
  console.error('Sync failed:', result.error);
}

// Monitor workflow progress
const workflowId = result.workflow.id;
this.orchestrator.getActiveWorkflow(workflowId).subscribe(state => {
  console.log('Progress:', state.steps.filter(s => s.status === 'completed').length);
});
```

### 3. Health Monitoring

```typescript
// Check all services
await this.externalServices.performHealthCheck();

// Check specific service
const health = await this.externalServices.checkService(ExternalService.TIDEPOOL);

// Subscribe to service state
this.externalServices.state.subscribe(state => {
  if (state.overallHealth === HealthStatus.UNHEALTHY) {
    // Show error banner
  }
});
```

### 4. Circuit Breaker Management

```typescript
// Get circuit breaker state
const cbState = this.externalServices.getCircuitBreakerState(ExternalService.GLUCOSERVER);

// Manually reset circuit breaker
if (cbState?.state === 'OPEN') {
  this.externalServices.resetCircuitBreaker(ExternalService.GLUCOSERVER);
}
```

## Error Handling

### Error Types

```typescript
enum AuthErrorCode {
  NETWORK_ERROR,      // No network connectivity
  INVALID_CREDENTIALS,// Wrong username/password
  TOKEN_EXPIRED,      // Access token expired
  REFRESH_FAILED,     // Refresh token invalid
  CSRF_VIOLATION,     // State mismatch
  SERVER_ERROR,       // 5xx responses
}
```

### Error Recovery Strategies

1. **Network Errors**: Queue for retry when online
2. **Auth Errors**: Trigger re-authentication flow
3. **Rate Limiting**: Respect Retry-After header
4. **Server Errors**: Exponential backoff retry

## Security Considerations

### Token Management
- Access tokens stored in memory only
- Refresh tokens encrypted in secure storage
- Automatic token refresh before expiry
- Token rotation on refresh

### Request Security
- HTTPS only for all external calls
- PKCE for OAuth2 flows
- CSRF protection via state parameter
- Request signing for sensitive operations

## Performance Optimizations

### Request Deduplication
- Identical concurrent requests share single observable
- Prevents redundant API calls

### Batch Operations
- Bulk endpoints for multiple operations
- Pagination for large datasets
- Incremental sync for updates

### Resource Management
- Connection pooling
- Request timeout limits
- Memory-efficient caching

## Configuration

### Environment Variables

```typescript
export const environment = {
  tidepool: {
    baseUrl: 'https://api.tidepool.org',
    clientId: 'diabetactic-mobile-dev',
    requestTimeout: 30000,
    maxRetries: 3
  },
  glucoserver: {
    baseUrl: 'http://localhost:8001',
    apiPath: '/api/v1'
  },
  // ... other services
};
```

### Feature Flags

```typescript
features: {
  offlineMode: true,
  useLocalBackend: true,
  useTidepoolIntegration: true,
  enableHealthMonitoring: true
}
```

## Testing

### Unit Testing Services

```typescript
describe('ExternalServicesManager', () => {
  it('should mark service unhealthy after threshold failures', () => {
    // Simulate failures
    // Assert circuit breaker opens
  });
});
```

### Integration Testing

```typescript
describe('Service Orchestrator', () => {
  it('should compensate on workflow failure', () => {
    // Execute workflow with failing step
    // Assert compensating transactions executed
  });
});
```

### E2E Testing

```typescript
describe('Full Sync Workflow', () => {
  it('should sync data from all services', () => {
    // Trigger full sync
    // Assert data synchronized
    // Verify no duplicates
  });
});
```

## Monitoring and Debugging

### Logging

All service interactions are logged with:
- Request/response details (sensitive data masked)
- Response times
- Error details
- Circuit breaker state changes

### Metrics

Track key metrics:
- Service availability percentage
- Average response times
- Cache hit rates
- Workflow success rates

### Debug Mode

Enable verbose logging:
```typescript
this.externalServices.enableDebugLogging = true;
```

## Deployment Considerations

### Health Check Endpoints
Ensure all services expose health endpoints:
- `/health` or `/status`
- Return 200 OK when healthy
- Include version info

### Timeout Configuration
Adjust timeouts based on network conditions:
- Mobile networks: Higher timeouts
- WiFi: Standard timeouts
- Background sync: Extended timeouts

### Retry Policies
Configure based on service criticality:
- Critical services: More retries
- Optional services: Fail fast
- Rate-limited services: Respect limits

## Future Enhancements

### Planned Features
1. **GraphQL Gateway**: Unified GraphQL endpoint
2. **WebSocket Support**: Real-time updates
3. **Service Mesh**: Advanced traffic management
4. **Distributed Tracing**: End-to-end request tracking
5. **A/B Testing**: Traffic splitting for experiments

### Scalability Improvements
1. **Connection Pooling**: Reuse HTTP connections
2. **Request Batching**: Combine multiple requests
3. **Edge Caching**: CDN integration
4. **Load Balancing**: Multiple service instances

## Conclusion

The external services integration layer provides a robust, scalable, and maintainable approach to managing external API dependencies. With built-in resilience patterns, comprehensive monitoring, and intelligent orchestration, the system ensures reliable operation even in challenging network conditions.