# Integration Tests Guide

## 🎯 Overview

This guide explains how to run the backend integration tests for Diabetify. These tests verify the Angular app works correctly with all external services running locally.

## 📋 Prerequisites

1. **Docker** installed and running
2. **Node.js** and npm installed
3. **All dependencies** installed (`npm install`)

## 🚀 Quick Start

### 1. Start Backend Services

```bash
# Navigate to container-managing directory
cd extServices/container-managing

# Start all services (api-gateway, login, appointments, glucoserver)
make build

# Or use npm script from project root
npm run backend:start
```

**Wait ~30-60 seconds** for all services to initialize and health checks to pass.

### 2. Verify Services Are Running

```bash
# Option 1: Quick health check with npm
npm run backend:health

# Option 2: Check individual services
curl http://localhost:8004/health  # api-gateway
curl http://localhost:8002/health  # glucoserver
curl http://localhost:8003/health  # login
curl http://localhost:8005/health  # appointments

# Option 3: View logs in browser
npm run backend:logs
# Then open http://localhost:9999 (Dozzle web UI)
```

### 3. Run Integration Tests

```bash
# Run all backend integration tests (watch mode)
npm run test:backend-integration

# Run in headless mode (for CI)
npm run test:backend-integration:headless

# Run specific test suite
npm test -- --include='**/auth-backend.spec.ts'
npm test -- --include='**/appointments-backend.spec.ts'
npm test -- --include='**/health-check.spec.ts'
```

## 📁 Test Files Structure

```
src/app/tests/
├── helpers/
│   └── backend-services.helper.ts    # Shared test utilities
└── integration/backend/
    ├── auth-backend.spec.ts          # Authentication tests (19 tests)
    ├── appointments-backend.spec.ts  # Appointments CRUD (8 tests)
    └── health-check.spec.ts          # Service health (8 tests)
```

## 🧪 Test Suites

### 1. Health Check Tests (8 tests)

**File:** `health-check.spec.ts`

Tests that all backend services are running and accessible:
- ✅ API Gateway health (port 8004)
- ✅ Glucoserver health (port 8002)
- ✅ Login service health (port 8003)
- ✅ Appointments health (port 8005)
- ✅ Overall system health (parallel)
- ✅ Docker compose verification
- ✅ Port accessibility
- ✅ 5-second timeout handling

**Run:** `npm test -- --include='**/health-check.spec.ts'`

### 2. Authentication Tests (19 tests)

**File:** `auth-backend.spec.ts`

Tests authentication flows with real backend:
- ✅ Service health checks
- ✅ User login (legacy & demo credentials)
- ✅ User data retrieval (by DNI, by ID)
- ✅ Authentication flow end-to-end
- ✅ Error handling (invalid credentials, blocked users)
- ✅ Security validation
- ✅ CORS headers

**Test Credentials:**
- DNI: `1000`
- Password: `tuvieja` (legacy) or `demo123` (demo)

**Run:** `npm test -- --include='**/auth-backend.spec.ts'`

### 3. Appointments Tests (8 tests)

**File:** `appointments-backend.spec.ts`

Tests appointment management:
- ✅ Create appointments via API
- ✅ Fetch user appointments
- ✅ Clinical form JSONB data
- ✅ Status transitions (pending/accepted/rejected)
- ✅ Edge cases (empty results, invalid dates)
- ✅ Performance (< 5s creation, < 3s fetch)

**Run:** `npm test -- --include='**/appointments-backend.spec.ts'`

## 🔧 NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run backend:start` | Start all backend services |
| `npm run backend:stop` | Stop all backend services |
| `npm run backend:logs` | View logs in Dozzle UI |
| `npm run backend:test` | Run backend Python tests |
| `npm run backend:health` | Quick health check |
| `npm run test:backend-integration` | Run Angular integration tests (watch) |
| `npm run test:backend-integration:headless` | Run Angular integration tests (CI) |

## 🛠️ Helper Utilities

### Backend Services Helper

**File:** `src/app/tests/helpers/backend-services.helper.ts`

Provides reusable utilities for all integration tests:

```typescript
import {
  TEST_USER,
  waitForBackendServices,
  loginTestUser,
  getAuthHeaders,
  authenticatedGet,
  authenticatedPost
} from '../helpers/backend-services.helper';

// Wait for services before tests
await waitForBackendServices();

// Login and get token
const token = await loginTestUser();

// Make authenticated requests
const data = await authenticatedGet('/appointments/me', token);
const created = await authenticatedPost('/appointments/enqueue', appointmentData, token);
```

**Key Functions:**
- `waitForBackendServices()` - Wait for all services with retry logic
- `loginTestUser()` - Login and return JWT token
- `getAuthHeaders()` - Get Angular HttpHeaders with Bearer token
- `authenticatedGet/Post/Put/Delete()` - Authenticated HTTP requests
- `checkServiceHealth()` - Individual service health check

## 🔍 Service Configuration

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 8004 | http://localhost:8004 |
| Glucoserver | 8002 | http://localhost:8002 |
| Login | 8003 | http://localhost:8003 |
| Appointments | 8005 | http://localhost:8005 |
| Dozzle (Logs) | 9999 | http://localhost:9999 |

### Environment Configuration

**File:** `src/environments/environment.test.ts`

```typescript
apiGateway: 'http://localhost:8004',  // Points to api-gateway
features: {
  useLocalBackend: true,               // Use real services
  useTidepoolMock: true,              // Mock Tidepool API
  TEST: true                          // Test mode
}
```

### Backend .env Configuration

**File:** `extServices/container-managing/.env`

Created from `.env.example` with:
- `SECRET_KEY` - JWT signing key (generated)
- `NOREPLY_ACCOUNT` - Test email
- `NOREPLY_PASSWORD` - Test email password
- `BACKOFFICE_FRONT_URL` - Frontend URL

## 🐛 Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker ps

# Check for port conflicts
lsof -i :8004  # api-gateway
lsof -i :8002  # glucoserver
lsof -i :8003  # login
lsof -i :8005  # appointments

# View service logs
cd extServices/container-managing
docker compose logs -f
```

### Health checks fail

```bash
# Wait longer for services to initialize (60+ seconds)
npm run backend:health

# Check individual service status
curl -v http://localhost:8004/health

# View logs
npm run backend:logs
```

### Tests fail with connection errors

1. Verify services are running: `npm run backend:health`
2. Check environment config: `src/environments/environment.test.ts`
3. Verify .env file exists: `extServices/container-managing/.env`
4. Check network connectivity: `curl http://localhost:8004/health`

### TypeScript compilation errors

```bash
# Compile test files
npx tsc --noEmit --project tsconfig.spec.json

# Fix common issues
npm install
```

## 📊 Test Execution Flow

```
1. waitForBackendServices()
   ↓
2. Check health endpoints (retry 30x with 1s delay)
   ↓
3. loginTestUser()
   ↓
4. POST /users/grantaccess (DNI=1000)
   ↓
5. Receive user object (NOT JWT token - services are public)
   ↓
6. Run test cases with authenticated requests
   ↓
7. Verify responses and data integrity
```

## 🔐 Security Notes

⚠️ **Current State:** All backend endpoints are **PUBLIC** (no authentication required)

- Login service returns user objects, NOT JWT tokens
- No Bearer token validation on any endpoint
- No rate limiting
- Suitable for testing/development only
- Production deployment requires authentication middleware

## 📝 Test Data

### Test User

```typescript
{
  dni: '1000',
  password: 'tuvieja',  // or 'demo123'
  email: 'test@test.com'
}
```

This user is pre-seeded in the database and used by all tests.

### Sample Appointment

```typescript
{
  date: new Date().toISOString(),
  time: '10:00',
  patientId: '1000',
  status: 'pending',
  clinical_form: {
    symptoms: ['headache', 'fatigue'],
    glucose_avg: 180,
    medications: ['Metformin 500mg'],
    allergies: ['none']
  }
}
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start Backend Services
        run: |
          cd extServices/container-managing
          make build
          sleep 60

      - name: Health Check
        run: npm run backend:health

      - name: Run Integration Tests
        run: npm run test:backend-integration:headless

      - name: Stop Services
        run: npm run backend:stop
```

## 📈 Performance Expectations

- **Service startup**: 30-60 seconds
- **Health check**: < 5 seconds per service
- **Login request**: < 2 seconds
- **Appointment creation**: < 5 seconds
- **Appointment fetch**: < 3 seconds
- **Full test suite**: 2-5 minutes

## 🎯 Next Steps

1. **Run health checks first**: `npm run test -- --include='**/health-check.spec.ts'`
2. **Test authentication**: `npm run test -- --include='**/auth-backend.spec.ts'`
3. **Test appointments**: `npm run test -- --include='**/appointments-backend.spec.ts'`
4. **Run all tests**: `npm run test:backend-integration`

## 📚 Related Documentation

- **Backend Analysis**: `/docs/EXTSERVICES_COMPLETE_ANALYSIS.md`
- **API Reference**: `/docs/LOGIN_SERVICE_QUICK_REFERENCE.md`
- **Demo Credentials**: `/docs/DEMO_CREDENTIALS.md`
- **Testing Guide**: `/docs/TESTING_GUIDE.md`

---

**Last Updated**: 2025-11-10
**Test Coverage**: 35 integration tests across 3 suites
**Services**: 4 backend services + 3 databases
