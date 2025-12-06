# Docker Test Environment - Quick Start Guide

**Last Updated**: 2025-12-06

This guide helps you get started with the local Docker-based test environment for Diabetify integration tests.

---

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 20+ (for running frontend tests)
- 4GB+ available RAM (for 3 PostgreSQL databases + 5 services)

**Verify installation**:

```bash
docker --version          # Should be 20.10+
docker-compose --version  # Should be 2.0+
```

---

## 5-Minute Quick Start

### 1. Start Test Environment

```bash
cd /home/julito/TPP/diabetactic/container-managing
docker-compose -f docker-compose.test.yml up -d --wait
```

Expected output:

```
✅ Container glucoserver_db_test_default      Healthy
✅ Container users_db_test_default            Healthy
✅ Container appointments_db_test_default     Healthy
✅ Container glucoserver_test_default         Healthy
✅ Container login_service_test_default       Healthy
✅ Container appointments_test_default        Healthy
✅ Container api_gateway_test_default         Healthy
✅ Container api_gateway_backoffice_test_default Healthy
```

**Startup time**: ~20-30 seconds

---

### 2. Verify Health

```bash
curl http://localhost:8006/docs
# Should return Swagger UI HTML
```

**Check all service endpoints**:

```bash
# API Gateway (main entry point)
curl http://localhost:8004/docs

# Backoffice API (test control)
curl http://localhost:8006/docs

# Individual services
curl http://localhost:8002/docs  # Glucoserver
curl http://localhost:8003/docs  # Login Service
curl http://localhost:8005/docs  # Appointments
```

---

### 3. Test Login with Seed User

```bash
# Login as test user (ID: 1000, password: tuvieja)
curl -X POST http://localhost:8004/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=1000&password=tuvieja"
```

Expected response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### 4. Run Integration Tests

**Option A: Playwright E2E Tests**:

```bash
cd /home/julito/TPP/diabetactic/diabetify
ENV=local npm run test:e2e
```

**Option B: Jest Integration Tests**:

```bash
npm run test:integration
```

**Option C: Maestro Mobile Tests** (requires Android emulator):

```bash
cd maestro
maestro test tests/ \
  --env TEST_USER_ID=1000 \
  --env TEST_USER_PASSWORD=tuvieja
```

---

### 5. Cleanup

```bash
cd /home/julito/TPP/diabetactic/container-managing
docker-compose -f docker-compose.test.yml down
```

**Note**: All data is automatically deleted (ephemeral tmpfs volumes).

---

## Available Test Data

### Test Users (from login seed migration)

| User ID | Name   | Password | Blocked | Email         | Tidepool | Notes                     |
| ------- | ------ | -------- | ------- | ------------- | -------- | ------------------------- |
| 1000    | Nacho  | tuvieja  | No      | 1@example.com | null     | Active user with readings |
| 1001    | Pipa   | tumadre  | Yes     | 2@example.com | null     | Blocked user              |
| 1002    | Miguel | tuvieja  | No      | 3@example.com | link     | Tidepool-linked user      |

**Admin User**:

- Username: `admin`
- Password: `admin`

### Test Data (will be seeded after Phase 2)

**Glucose Readings**:

- User 1000: 150 readings over 30 days (5/day)
- User 1002: 7 readings over 7 days (1/day)

**Appointments**:

- User 1000: 2 completed appointments (60 days ago, 30 days ago)
- Queue: Empty

---

## Test Control APIs (Backoffice)

### Get Admin Token

```bash
TOKEN=$(curl -X POST http://localhost:8006/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin" | jq -r '.access_token')

echo $TOKEN
```

### Clear Appointment Queue

```bash
curl -X DELETE http://localhost:8006/appointments \
  -H "Authorization: Bearer $TOKEN"
```

### Get Pending Appointments

```bash
curl http://localhost:8006/appointments/pending \
  -H "Authorization: Bearer $TOKEN"
```

### Accept/Deny Appointments

```bash
# Accept appointment at queue position 1
curl -X PUT http://localhost:8006/appointments/accept/1 \
  -H "Authorization: Bearer $TOKEN"

# Deny appointment at queue position 2
curl -X PUT http://localhost:8006/appointments/deny/2 \
  -H "Authorization: Bearer $TOKEN"
```

### Open/Close Queue

```bash
# Open queue (also clears pending)
curl -X POST http://localhost:8006/appointments/queue/open \
  -H "Authorization: Bearer $TOKEN"

# Close queue
curl -X POST http://localhost:8006/appointments/queue/close \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Use Cases

### Use Case 1: Run Tests Against Fresh Data

```bash
# Start environment
docker-compose -f docker-compose.test.yml up -d --wait

# Run tests
cd ../diabetify
ENV=local npm run test:e2e

# Cleanup
cd ../container-managing
docker-compose -f docker-compose.test.yml down
```

---

### Use Case 2: Debug Failing Test

```bash
# Start environment
docker-compose -f docker-compose.test.yml up -d --wait

# View logs
docker-compose -f docker-compose.test.yml logs -f glucoserver_test

# Or view all logs
docker-compose -f docker-compose.test.yml logs -f

# Run single test
cd ../diabetify
ENV=local npx playwright test heroku-integration.spec.ts --headed

# Keep environment running for debugging
# (Ctrl+C to stop following logs, environment still runs)

# Cleanup when done
cd ../container-managing
docker-compose -f docker-compose.test.yml down
```

---

### Use Case 3: Parallel Test Execution (Advanced)

```bash
# Terminal 1: Test Suite A
export TEST_RUN_ID=suite_a
docker-compose -f docker-compose.test.yml up -d --wait
ENV=local API_GATEWAY_PORT=8004 npm run test:e2e -- tests/suite-a/

# Terminal 2: Test Suite B (parallel)
export TEST_RUN_ID=suite_b
docker-compose -f docker-compose.test.yml -p suite_b up -d --wait
ENV=local API_GATEWAY_PORT=8014 npm run test:e2e -- tests/suite-b/

# Cleanup both
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml -p suite_b down
```

**Note**: This requires dynamic port allocation (Phase 4 feature).

---

### Use Case 4: Reset Data During Test Development

**Option A: Restart Container** (full reset, slower):

```bash
docker-compose -f docker-compose.test.yml restart glucoserver_test
# Migrations + seed run again (~10s)
```

**Option B: API Reset** (faster, Phase 2 feature):

```bash
curl -X POST http://localhost:8006/test/reset-all
# Resets all services to seed state (~2s)
```

---

## Troubleshooting

### Problem: "Port already in use"

**Symptoms**:

```
Error: bind: address already in use
```

**Solution**:

```bash
# Check what's using the port
lsof -i :8004

# Option 1: Stop conflicting service
docker-compose -f docker-compose.yml down  # Stop production env

# Option 2: Use different ports
GLUCOSERVER_PORT=8012 \
LOGIN_PORT=8013 \
API_GATEWAY_PORT=8014 \
BACKOFFICE_PORT=8016 \
APPOINTMENTS_PORT=8015 \
docker-compose -f docker-compose.test.yml up -d --wait
```

---

### Problem: "Services not starting"

**Symptoms**: Containers in "restarting" state

**Diagnosis**:

```bash
# Check container status
docker-compose -f docker-compose.test.yml ps

# View logs
docker-compose -f docker-compose.test.yml logs glucoserver_test
```

**Common Causes**:

1. Database not ready → Check `pg_isready` in logs
2. Migration failure → Look for Alembic errors
3. Port conflict → Use unique `TEST_RUN_ID`

**Solution**:

```bash
# Full cleanup and restart
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d --wait --force-recreate
```

---

### Problem: "Tests fail with 'User 1000 not found'"

**Symptoms**: Seed data not loaded

**Diagnosis**:

```bash
# Check if seed migration ran
docker exec login_service_test alembic current

# Check user count
docker exec -it users_db_test psql -U postgres -d users_test \
  -c "SELECT COUNT(*) FROM users;"
```

**Solution**:

```bash
# Re-run migration (includes seed)
docker exec login_service_test alembic upgrade head

# Verify users exist
docker exec -it users_db_test psql -U postgres -d users_test \
  -c "SELECT id, name, blocked FROM users;"
```

---

### Problem: "Slow startup (>60s)"

**Diagnosis**:

```bash
# Check resource usage
docker stats

# Check startup logs
docker-compose -f docker-compose.test.yml logs --tail=50
```

**Possible Causes**:

1. Insufficient RAM → Close other apps, increase Docker memory limit
2. Slow disk I/O → tmpfs should solve this (verify in docker-compose.test.yml)
3. Network issues → Check Docker network with `docker network ls`

**Solution**:

```bash
# Increase health check timeout
# Edit docker-compose.test.yml:
healthcheck:
  retries: 30  # Increased from 15
  timeout: 5s   # Increased from 3s
```

---

## Environment Variables Reference

### Port Configuration

Default ports (can be overridden):

```bash
export API_GATEWAY_PORT=8004      # Main API Gateway
export BACKOFFICE_PORT=8006       # Test control API
export GLUCOSERVER_PORT=8002      # Glucose readings service
export LOGIN_PORT=8003            # User auth service
export APPOINTMENTS_PORT=8005     # Appointments service
```

Example with custom ports:

```bash
API_GATEWAY_PORT=9004 \
BACKOFFICE_PORT=9006 \
docker-compose -f docker-compose.test.yml up -d --wait
```

---

### Test Run Isolation

For parallel test runs:

```bash
export TEST_RUN_ID=my_unique_test_run
docker-compose -f docker-compose.test.yml up -d --wait
```

This creates containers with unique names:

- `glucoserver_test_my_unique_test_run`
- `users_db_test_my_unique_test_run`
- etc.

---

## Next Steps

1. **Phase 1** (Current): Basic environment with manual reset
   - ✅ docker-compose.test.yml created
   - ⏳ Seed scripts (to be implemented)
   - ⏳ Health endpoints (to be implemented)

2. **Phase 2**: Test control APIs
   - Add `POST /test/reset` to all services
   - Add `POST /test/reset-all` to backoffice
   - Add `GET /test/health-all` endpoint

3. **Phase 3**: Playwright integration
   - Update playwright.config.ts for local backend
   - Add global setup/teardown hooks
   - Migrate tests from Heroku to local

4. **Phase 4**: Testcontainers
   - Install @testcontainers/compose
   - Auto-start Docker from tests
   - Dynamic port allocation

5. **Phase 5**: CI/CD integration
   - Add CircleCI job
   - Docker layer caching
   - Test result reporting

---

## Useful Commands

### View All Service URLs

```bash
echo "API Gateway:    http://localhost:8004/docs"
echo "Backoffice API: http://localhost:8006/docs"
echo "Glucoserver:    http://localhost:8002/docs"
echo "Login Service:  http://localhost:8003/docs"
echo "Appointments:   http://localhost:8005/docs"
```

### Check Service Health

```bash
# All services
for port in 8002 8003 8004 8005 8006; do
  echo -n "Port $port: "
  curl -sf http://localhost:$port/docs > /dev/null && echo "✅ OK" || echo "❌ FAIL"
done
```

### View Container Resource Usage

```bash
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Execute SQL Query

```bash
# Users database
docker exec -it users_db_test psql -U postgres -d users_test -c "SELECT * FROM users;"

# Glucose readings
docker exec -it glucoserver_db_test psql -U postgres -d glucoserver_test -c "SELECT * FROM glucose_readings LIMIT 5;"

# Appointments
docker exec -it appointments_db_test psql -U postgres -d appointments_test -c "SELECT * FROM appointments;"
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Docker Test Network                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐     ┌──────────────┐                  │
│  │ API Gateway  │     │ Backoffice   │                  │
│  │   :8004      │     │ API :8006    │                  │
│  └──────┬───────┘     └──────┬───────┘                  │
│         │                    │                           │
│         └────────┬───────────┘                           │
│                  │                                       │
│     ┌────────────┼────────────┐                         │
│     │            │            │                         │
│     ▼            ▼            ▼                         │
│  ┌──────┐   ┌──────┐   ┌──────────┐                    │
│  │Gluco │   │Login │   │Appoint-  │                    │
│  │:8002 │   │:8003 │   │ments:8005│                    │
│  └───┬──┘   └───┬──┘   └────┬─────┘                    │
│      │          │            │                          │
│      ▼          ▼            ▼                          │
│  ┌──────┐   ┌──────┐   ┌──────────┐                    │
│  │  DB  │   │  DB  │   │   DB     │  (tmpfs volumes)   │
│  │ :5432│   │ :5432│   │  :5432   │                    │
│  └──────┘   └──────┘   └──────────┘                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Test Client     │
              │  (Playwright/    │
              │   Maestro)       │
              └──────────────────┘
```

---

## Related Documentation

- **Architecture Design**: `/home/julito/TPP/diabetactic/diabetify/docs/architecture/docker-test-environment.md`
- **Project README**: `/home/julito/TPP/diabetactic/diabetify/CLAUDE.md`
- **Production Docker Setup**: `/home/julito/TPP/diabetactic/container-managing/docker-compose.yml`
- **Maestro Test Scripts**: `/home/julito/TPP/diabetactic/diabetify/maestro/`

---

## Support

**Questions?** Open an issue or contact the backend team.

**Improvements?** Submit a PR with enhancements to docker-compose.test.yml.
