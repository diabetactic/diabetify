# Backend Integration Tests

This directory contains integration tests for backend services.

## Test Files

### appointments-backend.spec.ts

Comprehensive integration tests for the Appointments backend service.

**Test Coverage:**

- ✅ Create new appointment via API (POST /appointments/enqueue)
- ✅ Fetch user appointments (GET /appointments/me)
- ✅ Include clinical form data with JSONB field
- ✅ Handle appointment status transitions (pending/accepted/rejected)
- ✅ Return empty array for user with no appointments
- ✅ Edge cases: invalid dates, missing fields, past dates
- ✅ Performance tests for creation and fetching
- ✅ Large clinical form data handling

**Requirements:**

- Backend services must be running (appointments on port 8005, login on port 8003)
- Test user credentials configured in backend-services.helper.ts
- Authentication token obtained before tests

**Usage:**

```bash
# Run all backend integration tests
npm run test -- --include='**/backend/**/*.spec.ts'

# Run only appointments tests
npm run test -- --include='**/appointments-backend.spec.ts'
```

**Test Data Structure:**

```typescript
interface TestAppointment {
  date: string; // ISO date format
  time: string; // HH:MM format
  patientId: string; // User DNI
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  type: string; // 'consultation', 'follow-up'
  location: string; // 'Virtual', 'Clinic', 'Hospital'
  status: string; // 'pending', 'accepted', 'rejected'
  reason: string;
  notes?: string;
  clinical_form?: {
    symptoms: string[];
    glucose_avg?: number;
    [key: string]: any; // JSONB field - flexible structure
  };
}
```

**Memory Context:**

Tests use memory storage from backend-services.helper.ts:

- Namespace: "integration-tests"
- Keys: "test-user-credentials", "service-ports"

**Helper Functions:**

From `backend-services.helper.ts`:

- `waitForBackendServices()` - Wait for services to be healthy
- `loginTestUser()` - Authenticate test user
- `authenticatedPost()` - Make authenticated POST request
- `authenticatedGet()` - Make authenticated GET request
- `getAuthHeadersForFetch()` - Get auth headers with token

**Test Structure:**

1. **beforeAll**: Wait for services, authenticate user (60s timeout)
2. **beforeEach**: Configure TestBed with HttpClientTestingModule
3. **Test suites**:
   - Create Appointment
   - Fetch Appointments
   - Clinical Form Data
   - Appointment Status Transitions
   - Edge Cases and Error Handling
   - Performance
4. **afterEach**: Verify no outstanding HTTP requests
5. **afterAll**: Clear cached auth token

**Expected Behavior:**

- All API calls use JWT Bearer token authentication
- Clinical form data persists as JSONB in database
- Status transitions are tracked with timestamps
- Invalid data (bad dates, missing fields) is rejected
- Responses include appointment ID and match request data
- Performance: Creation < 5s, Fetching < 3s

**Troubleshooting:**

- If tests timeout, check backend services are running
- Verify TEST_USER credentials match backend database
- Ensure `SERVICE_PORTS.apiGateway` matches the gateway port exposed by Docker
- Review backend logs for authentication issues
- Ensure JSONB field supports nested structures
