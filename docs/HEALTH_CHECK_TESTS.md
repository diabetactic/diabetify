# Backend Services Health Check Tests

## Overview

The health check test suite (`src/app/tests/integration/backend/health-check.spec.ts`) verifies that all backend services are running and accessible before running other integration tests.

## Services Monitored

| Service | Port | Health Endpoint | Description |
|---------|------|----------------|-------------|
| api-gateway | 8004 | http://localhost:8004/health | Main entry point |
| glucoserver | 8002 | http://localhost:8002/health | Glucose readings management |
| login | 8003 | http://localhost:8003/health | Authentication service |
| appointments | 8005 | http://localhost:8005/health | Appointment management |

## Running the Tests

### Quick Run

```bash
# Run only health checks
npm test -- --include='**/health-check.spec.ts'
```

### Before Integration Tests

```bash
# Start backend services
cd extServices
docker-compose up -d

# Wait for services to start (30-60 seconds)
sleep 30

# Run health checks
cd ..
npm test -- --include='**/health-check.spec.ts'
```

### CI/CD Pipeline

```bash
# Complete workflow
npm run test:integration:health
```

## Test Cases

### ✅ Individual Service Health

Tests each service independently:
- Verifies HTTP 200 response
- 5-second timeout per service
- Logs response details

### ✅ Overall System Health

Parallel health checks:
- All services checked concurrently
- Total time must be < 5 seconds
- Reports unhealthy services

### ✅ Docker Compose Verification

Optional check:
- Verifies docker-compose services are running
- Skips if services unavailable
- Helpful for local development

### ✅ Port Accessibility

Network connectivity:
- Verifies each port is accessible
- Identifies network issues
- Useful for debugging

### ✅ Health Endpoint Validation

Response validation:
- Checks response format
- Logs health endpoint data
- Validates JSON responses

## Test Output Example

```
=== Service Health Summary ===
✓ api-gateway: HEALTHY (245ms)
✓ glucoserver: HEALTHY (198ms)
✓ login: HEALTHY (223ms)
✓ appointments: HEALTHY (267ms)
Total time: 267ms
==============================

=== Port Accessibility ===
✓ api-gateway (port 8004): ACCESSIBLE
✓ glucoserver (port 8002): ACCESSIBLE
✓ login (port 8003): ACCESSIBLE
✓ appointments (port 8005): ACCESSIBLE
==========================
```

## Troubleshooting

### Services Not Running

```bash
# Check docker-compose status
cd extServices
docker-compose ps

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Port Conflicts

```bash
# Check if ports are in use
lsof -i :8004
lsof -i :8002
lsof -i :8003
lsof -i :8005

# Kill conflicting processes
kill -9 <PID>
```

### Timeout Issues

If health checks timeout:
1. Increase `HEALTH_CHECK_TIMEOUT` in the test file
2. Check service logs for startup issues
3. Verify network connectivity

### Service-Specific Issues

```bash
# Check individual service
curl http://localhost:8004/health

# Check all services
for port in 8002 8003 8004 8005; do
  echo "Port $port:"
  curl -s http://localhost:$port/health || echo "FAILED"
  echo
done
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Start backend services
        run: |
          cd extServices
          docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Health check
        run: npm test -- --include='**/health-check.spec.ts'

      - name: Integration tests
        run: npm run test:integration

      - name: Stop services
        if: always()
        run: |
          cd extServices
          docker-compose down
```

## Configuration

### Environment Variables

```typescript
// Update service ports in the test file if needed
const services = [
  {
    name: 'api-gateway',
    url: process.env.API_GATEWAY_URL || 'http://localhost:8004/health',
    port: parseInt(process.env.API_GATEWAY_PORT || '8004')
  },
  // ... other services
];
```

### Timeout Configuration

```typescript
// Adjust timeout for slower environments
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds (default)
// CI environment might need: 10000 (10 seconds)
```

## Best Practices

1. **Run Before Integration Tests**: Always run health checks before other integration tests
2. **Fast Fail**: If health checks fail, skip remaining integration tests
3. **Detailed Logging**: Enable verbose logging for debugging
4. **Parallel Checks**: Use concurrent health checks for faster execution
5. **Graceful Degradation**: Skip docker-compose check if not available

## Memory Context

Service ports are stored in claude-flow memory:
- **Namespace**: `integration-tests`
- **Key**: `service-ports`
- **Value**: `{ api-gateway: 8004, glucoserver: 8002, login: 8003, appointments: 8005 }`

## Next Steps

After health checks pass:
1. Run service-specific integration tests
2. Run end-to-end workflow tests
3. Run performance tests

## Related Documentation

- [Integration Testing Guide](./TESTING_GUIDE.md)
- [Backend Services Documentation](./EXTSERVICES_COMPLETE_ANALYSIS.md)
- [API Gateway Adapter](./API_GATEWAY_ADAPTER.md)
