# Docker-Based Test Environment Architecture

**Project**: Diabetify Mobile App
**Date**: 2025-12-06
**Status**: DESIGN PROPOSAL
**Author**: System Architecture Designer

---

## Executive Summary

This document proposes a comprehensive Docker-based test environment for the Diabetify mobile app to support deterministic, isolated, and fast-running integration tests. The design addresses the current gap between local development (Docker) and CI/CD testing (Heroku) by providing a local test backend that mirrors production behavior.

**Key Benefits**:

- **Deterministic test data** with one-command reset capability
- **Isolated test databases** per test run (parallel execution support)
- **Fast startup** (target: <30s for full stack)
- **CI/CD optimized** with layer caching and health checks
- **Developer-friendly** with seed data and test control APIs

---

## Current Architecture Analysis

### Existing Docker Setup (container-managing/)

```
Services (4):
├── API Gateway (port 8004:8000)
├── Glucoserver (port 8002:8000)
├── Login Service (port 8003:8000)
└── Appointments (port 8005:8000)

Databases (3):
├── glucoserver_db (PostgreSQL)
├── users_db (PostgreSQL)
└── appointments_db (PostgreSQL)

Networks:
└── my-network (bridge)
```

**Current Limitations for Testing**:

1. ❌ No database seeding mechanism
2. ❌ Persistent volumes cause state pollution between test runs
3. ❌ No test control endpoints for data reset
4. ❌ No parallel execution support (fixed port binding)
5. ❌ Health checks only on databases (not services)
6. ❌ No test-specific configuration profile

### Existing Migration Infrastructure

**All services use Alembic for migrations**:

| Service        | Migrations      | Seed Data                 |
| -------------- | --------------- | ------------------------- |
| `login`        | ✅ 2 migrations | ✅ 3 test users + 1 admin |
| `glucoserver`  | ✅ 2 migrations | ❌ None                   |
| `appointments` | ✅ 4 migrations | ✅ Queue config (size=5)  |

**Test Data Currently Available** (from login seed):

```python
# User 1000: "Nacho Scocco" - password: "tuvieja" (active)
# User 1001: "Pipa Benedetto" - password: "tumadre" (blocked)
# User 1002: "Miguel Borja" - password: "tuvieja" (active, Tidepool linked)
# Admin: "admin" - password: "admin"
```

### Test Control APIs (Backoffice)

**Already implemented** at `api-gateway-backoffice:8006`:

- `DELETE /appointments` - Clear entire appointment queue
- `POST /appointments/queue/open` - Open queue (clears pending)
- `POST /appointments/queue/close` - Close queue
- `PUT /appointments/accept/{queue_placement}` - Accept appointment
- `PUT /appointments/deny/{queue_placement}` - Deny appointment
- `GET /appointments/pending` - Get pending appointments

**Missing**:

- ❌ User deletion endpoint
- ❌ Glucose readings reset endpoint
- ❌ Database reset endpoint (all tables)
- ❌ Health check endpoint with dependency status

---

## Proposed Architecture

### Design Principles

1. **Zero-State Tests**: Every test run starts with a clean database
2. **Fail-Fast Health Checks**: Services don't start until dependencies are ready
3. **Deterministic Seeding**: Same seed data every time
4. **Test Isolation**: Each test suite can run in parallel with unique DB
5. **Fast Feedback**: <30s startup time, <5s reset time
6. **Vendor Neutrality**: Works with any test framework (Jest, Playwright, Maestro)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Orchestrator                        │
│              (Testcontainers or docker-compose)              │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──> docker-compose.test.yml (test profile)
             │
┌────────────▼─────────────────────────────────────────────────┐
│                      Test Environment                         │
├──────────────────────────────────────────────────────────────┤
│  Services (with test health checks)                          │
│  ├── API Gateway (8004)          [depends: all services]     │
│  ├── Glucoserver (8002)          [depends: glucoserver_db]   │
│  ├── Login Service (8003)        [depends: users_db]         │
│  ├── Appointments (8005)         [depends: appointments_db]  │
│  └── Backoffice API (8006)       [depends: login, appts]     │
├──────────────────────────────────────────────────────────────┤
│  Databases (ephemeral, pre-seeded)                           │
│  ├── glucoserver_db_test         [volume: tmpfs or none]     │
│  ├── users_db_test               [volume: tmpfs or none]     │
│  └── appointments_db_test        [volume: tmpfs or none]     │
├──────────────────────────────────────────────────────────────┤
│  Utilities                                                    │
│  └── test-seeder (init container) [runs once: seed all DBs]  │
└──────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Test Client (Playwright/Jest)              │
│  - Waits for /health endpoint (200 OK)                       │
│  - Calls /test/reset before each test suite                  │
│  - Executes tests against localhost:8004                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Design

### 1. docker-compose.test.yml

**Key Changes from Production**:

- Ephemeral databases (tmpfs volumes or no volumes)
- Test-specific environment variables
- Comprehensive health checks on all services
- Pre-seeding via init containers
- Random port binding support for parallel execution

```yaml
version: '3.9'

x-healthcheck-defaults: &healthcheck-defaults
  interval: 2s
  timeout: 3s
  retries: 15
  start_period: 5s

services:
  # ========================================
  # DATABASES (Test-optimized)
  # ========================================

  glucoserver_db_test:
    container_name: glucoserver_db_test_${TEST_RUN_ID:-default}
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: glucoserver_test
      POSTGRES_INITDB_ARGS: '-c fsync=off -c synchronous_commit=off -c full_page_writes=off'
    # Ephemeral storage (faster, no cleanup needed)
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      <<: *healthcheck-defaults
      test: ['CMD-SHELL', 'pg_isready -U postgres -d glucoserver_test']
    networks:
      - test-network

  users_db_test:
    container_name: users_db_test_${TEST_RUN_ID:-default}
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: users_test
      POSTGRES_INITDB_ARGS: '-c fsync=off -c synchronous_commit=off -c full_page_writes=off'
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      <<: *healthcheck-defaults
      test: ['CMD-SHELL', 'pg_isready -U postgres -d users_test']
    networks:
      - test-network

  appointments_db_test:
    container_name: appointments_db_test_${TEST_RUN_ID:-default}
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: appointments_test
      POSTGRES_INITDB_ARGS: '-c fsync=off -c synchronous_commit=off -c full_page_writes=off'
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      <<: *healthcheck-defaults
      test: ['CMD-SHELL', 'pg_isready -U postgres -d appointments_test']
    networks:
      - test-network

  # ========================================
  # BACKEND SERVICES (with migrations + seed)
  # ========================================

  glucoserver_test:
    container_name: glucoserver_test_${TEST_RUN_ID:-default}
    build:
      context: ../glucoserver
      dockerfile: Dockerfile
      target: test # Multi-stage build with test dependencies
    command: >
      bash -c '
      while ! pg_isready -h glucoserver_db_test -p 5432 -U postgres; do sleep 1; done;
      echo "Running migrations...";
      alembic upgrade head;
      echo "Seeding test data...";
      python scripts/seed_test_data.py;
      echo "Starting server...";
      uvicorn main:app --host 0.0.0.0 --port 8000 --reload
      '
    ports:
      - '${GLUCOSERVER_PORT:-8002}:8000'
    depends_on:
      glucoserver_db_test:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:postgres@glucoserver_db_test:5432/glucoserver_test
      ENV: test
      LOG_LEVEL: WARNING
    healthcheck:
      <<: *healthcheck-defaults
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
    networks:
      - test-network

  login_service_test:
    container_name: login_service_test_${TEST_RUN_ID:-default}
    build:
      context: ../login
      dockerfile: Dockerfile
      target: test
    command: >
      bash -c '
      while ! pg_isready -h users_db_test -p 5432 -U postgres; do sleep 1; done;
      echo "Running migrations...";
      alembic upgrade head;
      echo "Starting server...";
      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
      '
    ports:
      - '${LOGIN_PORT:-8003}:8000'
    depends_on:
      users_db_test:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:postgres@users_db_test:5432/users_test
      ENV: test
      LOG_LEVEL: WARNING
      # Email disabled in test mode
      NOREPLY_ACCOUNT: test@example.com
      NOREPLY_PASSWORD: disabled
      BACKOFFICE_FRONT_URL: http://localhost:8006
    healthcheck:
      <<: *healthcheck-defaults
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
    networks:
      - test-network

  appointments_test:
    container_name: appointments_test_${TEST_RUN_ID:-default}
    build:
      context: ../appointments
      dockerfile: Dockerfile
      target: test
    command: >
      bash -c '
      while ! pg_isready -h appointments_db_test -p 5432 -U postgres; do sleep 1; done;
      echo "Running migrations...";
      alembic upgrade head;
      echo "Starting server...";
      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
      '
    ports:
      - '${APPOINTMENTS_PORT:-8005}:8000'
    depends_on:
      appointments_db_test:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:postgres@appointments_db_test:5432/appointments_test
      ENV: test
      LOG_LEVEL: WARNING
    healthcheck:
      <<: *healthcheck-defaults
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
    networks:
      - test-network

  # ========================================
  # API GATEWAYS
  # ========================================

  api_gateway_test:
    container_name: api_gateway_test_${TEST_RUN_ID:-default}
    build:
      context: ../api-gateway
      dockerfile: Dockerfile
    command: >
      bash -c '
      echo "Waiting for all backend services...";
      while ! curl -f http://login_service_test:8000/health > /dev/null 2>&1; do sleep 1; done;
      while ! curl -f http://appointments_test:8000/health > /dev/null 2>&1; do sleep 1; done;
      while ! curl -f http://glucoserver_test:8000/health > /dev/null 2>&1; do sleep 1; done;
      echo "All services ready. Starting API Gateway...";
      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
      '
    ports:
      - '${API_GATEWAY_PORT:-8004}:8000'
    depends_on:
      login_service_test:
        condition: service_healthy
      appointments_test:
        condition: service_healthy
      glucoserver_test:
        condition: service_healthy
    environment:
      USERS_BASE_URL: http://login_service_test:8000
      APPOINTMENTS_BASE_URL: http://appointments_test:8000
      GLUCOSERVER_BASE_URL: http://glucoserver_test:8000
      SECRET_KEY: test-secret-key-not-for-production
      ENV: test
      LOG_LEVEL: WARNING
    healthcheck:
      <<: *healthcheck-defaults
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
    networks:
      - test-network

  api_gateway_backoffice_test:
    container_name: api_gateway_backoffice_test_${TEST_RUN_ID:-default}
    build:
      context: ../api-gateway-backoffice
      dockerfile: Dockerfile
    command: >
      bash -c '
      echo "Waiting for all backend services...";
      while ! curl -f http://login_service_test:8000/health > /dev/null 2>&1; do sleep 1; done;
      while ! curl -f http://appointments_test:8000/health > /dev/null 2>&1; do sleep 1; done;
      while ! curl -f http://glucoserver_test:8000/health > /dev/null 2>&1; do sleep 1; done;
      echo "All services ready. Starting Backoffice API...";
      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
      '
    ports:
      - '${BACKOFFICE_PORT:-8006}:8000'
    depends_on:
      login_service_test:
        condition: service_healthy
      appointments_test:
        condition: service_healthy
      glucoserver_test:
        condition: service_healthy
    environment:
      USERS_BASE_URL: http://login_service_test:8000
      APPOINTMENTS_BASE_URL: http://appointments_test:8000
      GLUCOSERVER_BASE_URL: http://glucoserver_test:8000
      SECRET_KEY: test-secret-key-not-for-production
      ENV: test
      LOG_LEVEL: WARNING
    healthcheck:
      <<: *healthcheck-defaults
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/health']
    networks:
      - test-network

networks:
  test-network:
    driver: bridge
# No volumes defined = ephemeral data (destroyed on down)
```

---

### 2. Database Seeding Strategy

#### Pattern: Migration + Seed Script Separation

**Design Decision**: Keep schema migrations separate from seed data

- **Migrations** (Alembic): Schema only, version-controlled, production-safe
- **Seed Scripts**: Test data only, idempotent, never run in production

#### Implementation: Seed Scripts per Service

**glucoserver/scripts/seed_test_data.py**:

```python
"""
Seed test glucose readings for integration tests.
Run after migrations: alembic upgrade head
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime, timedelta
from infrastructure.database.glucose_reading_schema import GlucoseReading

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def seed_glucose_data():
    """Seed deterministic test glucose readings."""
    session = Session()

    try:
        # Clear existing test data (idempotent)
        session.query(GlucoseReading).delete()

        # User 1000 (Nacho) - 30 days of readings
        base_time = datetime.now() - timedelta(days=30)
        readings = []

        for day in range(30):
            for hour, reading_type in [(7, 'FASTING'), (12, 'BEFORE_LUNCH'),
                                       (14, 'AFTER_LUNCH'), (19, 'BEFORE_DINNER'),
                                       (21, 'AFTER_DINNER')]:
                readings.append(GlucoseReading(
                    user_id=1000,
                    glucose_level=90 + (day % 30),  # Deterministic variance
                    reading_type=reading_type,
                    created_at=base_time + timedelta(days=day, hours=hour),
                    notes="Test reading"
                ))

        # User 1002 (Miguel) - 7 days of readings
        for day in range(7):
            readings.append(GlucoseReading(
                user_id=1002,
                glucose_level=120 + (day * 5),
                reading_type='FASTING',
                created_at=base_time + timedelta(days=day, hours=7),
                notes="Test reading"
            ))

        session.bulk_save_objects(readings)
        session.commit()
        print(f"✅ Seeded {len(readings)} glucose readings")

    except Exception as e:
        session.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_glucose_data()
```

**login/alembic/versions/f58062d81cb5_insert_initial_data.py** (already exists):

```python
# Existing seed migration - already creates:
# - User 1000: dni=1000, password=tuvieja (Nacho Scocco)
# - User 1001: dni=1001, password=tumadre (Pipa - blocked)
# - User 1002: dni=1002, password=tuvieja (Miguel - Tidepool linked)
# - Admin: username=admin, password=admin
```

**appointments/scripts/seed_test_data.py**:

```python
"""
Seed test appointments and queue state.
Run after migrations: alembic upgrade head
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime, timedelta
from app.models.appointment_model import Appointment
from app.models.queue_model import AppointmentQueue

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def seed_appointment_data():
    """Seed deterministic test appointments."""
    session = Session()

    try:
        # Clear existing test data
        session.query(AppointmentQueue).delete()
        session.query(Appointment).delete()

        # User 1000 - 2 completed appointments
        past_time = datetime.now() - timedelta(days=60)
        appointments = [
            Appointment(
                user_id=1000,
                state="CREATED",
                created_at=past_time,
                appointment_date=past_time + timedelta(days=7)
            ),
            Appointment(
                user_id=1000,
                state="CREATED",
                created_at=past_time + timedelta(days=30),
                appointment_date=past_time + timedelta(days=37)
            )
        ]

        session.bulk_save_objects(appointments)
        session.commit()
        print(f"✅ Seeded {len(appointments)} appointments")

    except Exception as e:
        session.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_appointment_data()
```

#### Seeding Execution Flow

```
1. Container starts
   ↓
2. Wait for DB health check (pg_isready)
   ↓
3. Run migrations (alembic upgrade head)
   ↓
4. Run seed script (python scripts/seed_test_data.py)
   ↓
5. Start service (uvicorn)
   ↓
6. Health check passes → Container ready
```

**Advantages**:

- ✅ Idempotent (safe to run multiple times)
- ✅ Deterministic (same data every time)
- ✅ Fast (<2s per service)
- ✅ Version-controlled with code
- ✅ Environment-aware (only runs in test mode)

---

### 3. Test Control API Endpoints

#### New Endpoints Required

**All services need**:

- `GET /health` - Health check with dependency status
- `POST /test/reset` - Reset service data to seed state
- `DELETE /test/data` - Delete all non-seed data

#### Implementation: Glucoserver Example

**glucoserver/app/routes/test_routes.py** (NEW):

```python
"""Test-only endpoints for data reset and health checks."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from infrastructure.database.glucose_reading_schema import GlucoseReading
import os

router = APIRouter(prefix="/test", tags=["test"])

# Only enable in test environment
ENABLE_TEST_ENDPOINTS = os.getenv("ENV") == "test"

@router.post("/reset")
def reset_test_data(db: Session = Depends(get_db)):
    """Reset database to seed state (test env only)."""
    if not ENABLE_TEST_ENDPOINTS:
        raise HTTPException(403, "Test endpoints disabled in production")

    try:
        # Delete all readings
        db.query(GlucoseReading).delete()
        db.commit()

        # Re-run seed script
        from scripts.seed_test_data import seed_glucose_data
        seed_glucose_data()

        return {"status": "success", "message": "Database reset to seed state"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Reset failed: {str(e)}")

@router.delete("/data")
def delete_all_data(db: Session = Depends(get_db)):
    """Delete ALL data (test env only)."""
    if not ENABLE_TEST_ENDPOINTS:
        raise HTTPException(403, "Test endpoints disabled in production")

    count = db.query(GlucoseReading).delete()
    db.commit()
    return {"status": "success", "deleted": count}

@router.get("/health")
def test_health(db: Session = Depends(get_db)):
    """Detailed health check for test orchestration."""
    try:
        # Check DB connection
        db.execute("SELECT 1")

        # Check data seeding
        reading_count = db.query(GlucoseReading).count()

        return {
            "status": "healthy",
            "database": "connected",
            "readings_count": reading_count,
            "environment": os.getenv("ENV")
        }
    except Exception as e:
        raise HTTPException(503, f"Service unhealthy: {str(e)}")
```

**Health Endpoint Response Format** (Standardized):

```json
{
  "status": "healthy",
  "service": "glucoserver",
  "version": "1.0.0",
  "dependencies": {
    "database": "healthy",
    "migrations": "up-to-date"
  },
  "data": {
    "readings_count": 150,
    "users_seeded": 2
  },
  "environment": "test"
}
```

#### Enhanced Backoffice Endpoints

**api-gateway-backoffice/app/routes/test_routes.py** (NEW):

```python
"""Orchestrate test data reset across all services."""
from fastapi import APIRouter, Depends
import httpx
import os

router = APIRouter(prefix="/test", tags=["test"])
ENABLE_TEST_ENDPOINTS = os.getenv("ENV") == "test"

SERVICES = {
    "glucoserver": os.getenv("GLUCOSERVER_BASE_URL"),
    "appointments": os.getenv("APPOINTMENTS_BASE_URL"),
    "users": os.getenv("USERS_BASE_URL")
}

@router.post("/reset-all")
async def reset_all_services():
    """Reset all backend services to seed state."""
    if not ENABLE_TEST_ENDPOINTS:
        raise HTTPException(403, "Test endpoints disabled")

    results = {}
    async with httpx.AsyncClient() as client:
        for name, url in SERVICES.items():
            try:
                response = await client.post(f"{url}/test/reset", timeout=10.0)
                results[name] = {"status": response.status_code, "data": response.json()}
            except Exception as e:
                results[name] = {"status": "error", "message": str(e)}

    return {
        "status": "completed",
        "services": results
    }

@router.get("/health-all")
async def health_all_services():
    """Aggregated health check for all services."""
    results = {}
    async with httpx.AsyncClient() as client:
        for name, url in SERVICES.items():
            try:
                response = await client.get(f"{url}/test/health", timeout=5.0)
                results[name] = response.json()
            except Exception as e:
                results[name] = {"status": "unhealthy", "error": str(e)}

    all_healthy = all(r.get("status") == "healthy" for r in results.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": results
    }
```

---

### 4. Parallel Test Execution Support

#### Strategy: Dynamic Port Binding + Isolated Networks

**Challenge**: Running multiple test suites in parallel with isolated backends.

**Solution**: Use `TEST_RUN_ID` environment variable for isolation.

#### Pattern 1: Testcontainers (Recommended)

**diabetify/tests/setup/testcontainers-setup.ts**:

```typescript
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import path from 'path';

export class DiabetifyTestEnvironment {
  private environment: DockerComposeEnvironment | null = null;
  private testRunId: string;

  constructor() {
    // Unique ID per test run (parallel isolation)
    this.testRunId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async start() {
    const composeFilePath = path.resolve(__dirname, '../../../container-managing');

    this.environment = await new DockerComposeEnvironment(
      composeFilePath,
      'docker-compose.test.yml'
    )
      .withEnvironment({
        TEST_RUN_ID: this.testRunId,
        // Dynamic port allocation (prevents conflicts)
        API_GATEWAY_PORT: '0', // OS assigns random port
        BACKOFFICE_PORT: '0',
        GLUCOSERVER_PORT: '0',
        LOGIN_PORT: '0',
        APPOINTMENTS_PORT: '0',
      })
      .withWaitStrategy('api_gateway_test', Wait.forHealthCheck())
      .withWaitStrategy('api_gateway_backoffice_test', Wait.forHealthCheck())
      .withStartupTimeout(120_000) // 2 minutes max
      .up();

    // Get dynamically assigned ports
    const apiGatewayContainer = this.environment.getContainer('api_gateway_test');
    const apiGatewayPort = apiGatewayContainer.getMappedPort(8000);

    const backofficeContainer = this.environment.getContainer('api_gateway_backoffice_test');
    const backofficePort = backofficeContainer.getMappedPort(8000);

    return {
      apiGatewayUrl: `http://localhost:${apiGatewayPort}`,
      backofficeUrl: `http://localhost:${backofficePort}`,
      testRunId: this.testRunId,
    };
  }

  async stop() {
    if (this.environment) {
      await this.environment.down();
    }
  }

  async reset() {
    // Reset all services to seed state
    const backofficeUrl = this.environment
      ?.getContainer('api_gateway_backoffice_test')
      .getMappedPort(8000);

    await fetch(`http://localhost:${backofficeUrl}/test/reset-all`, {
      method: 'POST',
    });
  }
}
```

**Playwright Integration** (playwright.config.ts):

```typescript
import { defineConfig } from '@playwright/test';
import { DiabetifyTestEnvironment } from './tests/setup/testcontainers-setup';

let testEnv: DiabetifyTestEnvironment;

export default defineConfig({
  globalSetup: async () => {
    testEnv = new DiabetifyTestEnvironment();
    const { apiGatewayUrl, backofficeUrl } = await testEnv.start();

    // Store URLs for tests
    process.env.TEST_API_GATEWAY_URL = apiGatewayUrl;
    process.env.TEST_BACKOFFICE_URL = backofficeUrl;

    console.log(`✅ Test environment ready: ${apiGatewayUrl}`);
  },

  globalTeardown: async () => {
    await testEnv.stop();
    console.log('✅ Test environment stopped');
  },

  use: {
    baseURL: process.env.TEST_API_GATEWAY_URL,
  },

  // Parallel workers (each gets isolated environment)
  workers: process.env.CI ? 2 : 4,
});
```

#### Pattern 2: Manual docker-compose (Fallback)

**For CI/CD or when testcontainers is unavailable**:

```bash
# Start test environment (unique ID prevents conflicts)
export TEST_RUN_ID=$(date +%s)
docker-compose -f docker-compose.test.yml up -d --wait

# Wait for health check
timeout 60 bash -c 'until curl -f http://localhost:8006/test/health-all; do sleep 2; done'

# Run tests
ENV=local npm run test:e2e

# Cleanup (destroys ephemeral data)
docker-compose -f docker-compose.test.yml down
```

---

### 5. Fast Startup Optimizations

**Target**: <30s from `docker-compose up` to test-ready

#### Optimization 1: Parallel Service Startup

```yaml
# Services start in parallel (not serial) when dependencies are healthy
depends_on:
  glucoserver_db_test:
    condition: service_healthy # Non-blocking parallel startup
```

#### Optimization 2: PostgreSQL Performance Tuning

```yaml
environment:
  # Disable fsync for test DBs (10x faster writes)
  POSTGRES_INITDB_ARGS: '-c fsync=off -c synchronous_commit=off -c full_page_writes=off'
```

**Impact**: Reduces DB initialization from 8s → 2s

#### Optimization 3: tmpfs Volumes (In-Memory)

```yaml
tmpfs:
  - /var/lib/postgresql/data # RAM-based storage (no disk I/O)
```

**Impact**:

- Faster writes (no disk flush)
- Automatic cleanup (no volumes to remove)
- **Trade-off**: Limited by RAM (typical test DB: 50-100MB)

#### Optimization 4: Layer Caching (CI/CD)

**Multi-stage Dockerfile** (example: glucoserver):

```dockerfile
# Stage 1: Dependencies (cached unless requirements.txt changes)
FROM python:3.11-slim AS dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Test dependencies (cached separately)
FROM dependencies AS test
COPY requirements-test.txt .
RUN pip install --no-cache-dir -r requirements-test.txt

# Stage 3: Application code (changes frequently, fast layer)
FROM test
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Impact**: CI rebuilds only changed layers (5min → 30s)

#### Optimization 5: Lazy Health Checks

```yaml
healthcheck:
  start_period: 5s # Grace period (no failures counted)
  interval: 2s # Frequent checks (fast detection)
  timeout: 3s # Fail fast
  retries: 15 # 30s max wait (2s × 15)
```

**Expected Timeline**:

```
t=0s   - docker-compose up
t=2s   - Databases healthy (pg_isready)
t=5s   - Migrations complete (alembic)
t=8s   - Seed scripts complete
t=10s  - Backend services healthy
t=15s  - API Gateway healthy
t=20s  - All health checks green
t=25s  - First test executes
```

---

### 6. CI/CD Integration

#### CircleCI Workflow (Enhanced)

**.circleci/config.yml** (add new job):

```yaml
jobs:
  test-integration:
    docker:
      - image: cimg/node:20.11
    steps:
      - checkout
      - setup_remote_docker:
          version: 20.10.24
          docker_layer_caching: true # Cache Docker layers

      - run:
          name: Start Test Environment
          command: |
            cd ../container-managing
            export TEST_RUN_ID=${CIRCLE_BUILD_NUM}
            docker-compose -f docker-compose.test.yml up -d --wait

      - run:
          name: Wait for Health Check
          command: |
            timeout 60 bash -c '
              until curl -f http://localhost:8006/test/health-all; do
                echo "Waiting for services..."
                sleep 2
              done
            '
            echo "✅ All services healthy"

      - run:
          name: Run Integration Tests
          command: |
            ENV=local npm run test:e2e

      - run:
          name: Cleanup
          when: always
          command: |
            cd ../container-managing
            docker-compose -f docker-compose.test.yml down -v

      - store_test_results:
          path: playwright-report

      - store_artifacts:
          path: playwright-report
          destination: test-results

workflows:
  version: 2
  ci:
    jobs:
      - test-integration:
          filters:
            branches:
              only: master
```

**Advantages**:

- ✅ No external dependencies (Heroku)
- ✅ Deterministic test data
- ✅ Faster feedback (local execution)
- ✅ Cost-effective (no cloud API calls)

#### GitHub Actions (Alternative)

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start Test Environment
        run: |
          cd container-managing
          docker-compose -f docker-compose.test.yml up -d --wait

      - name: Run Tests
        run: |
          npm ci
          ENV=local npm run test:e2e

      - name: Cleanup
        if: always()
        run: |
          cd container-managing
          docker-compose -f docker-compose.test.yml down -v
```

---

## Data Reset Patterns

### Pattern 1: Full Reset (Between Test Suites)

```typescript
// Playwright beforeAll hook
import { test } from '@playwright/test';

test.beforeAll(async () => {
  const response = await fetch('http://localhost:8006/test/reset-all', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to reset test data');
  }

  console.log('✅ Test data reset to seed state');
});
```

### Pattern 2: Selective Reset (Between Tests)

```typescript
// Reset only appointments queue
test.beforeEach(async () => {
  await fetch('http://localhost:8006/appointments', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
});
```

### Pattern 3: Snapshot Restore (Advanced)

**For complex scenarios requiring multiple states**:

```bash
# Save DB snapshot after seeding
docker exec glucoserver_db_test pg_dump -U postgres > /tmp/seed_snapshot.sql

# Restore to seed state (faster than re-seeding)
docker exec -i glucoserver_db_test psql -U postgres < /tmp/seed_snapshot.sql
```

**Trade-off**: Faster reset (1s vs 5s) but more complex orchestration.

---

## API Endpoints Reference

### Test Control Endpoints (ENV=test only)

| Endpoint           | Method | Service      | Purpose               |
| ------------------ | ------ | ------------ | --------------------- |
| `/test/reset`      | POST   | All services | Reset to seed state   |
| `/test/reset-all`  | POST   | Backoffice   | Reset all services    |
| `/test/health`     | GET    | All services | Detailed health check |
| `/test/health-all` | GET    | Backoffice   | Aggregated health     |
| `/test/data`       | DELETE | All services | Delete all data       |

### Existing Backoffice Endpoints (for tests)

| Endpoint                    | Method | Purpose                 |
| --------------------------- | ------ | ----------------------- |
| `/appointments`             | DELETE | Clear appointment queue |
| `/appointments/queue/open`  | POST   | Open queue + clear      |
| `/appointments/queue/close` | POST   | Close queue             |
| `/appointments/accept/{id}` | PUT    | Accept appointment      |
| `/appointments/deny/{id}`   | PUT    | Deny appointment        |
| `/appointments/pending`     | GET    | Get pending queue       |

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Deliverable**: Basic test environment with manual reset

1. ✅ Create `docker-compose.test.yml`
   - Ephemeral databases (tmpfs)
   - Test-specific environment variables
   - Health checks on all services

2. ✅ Add seed scripts to all services
   - `glucoserver/scripts/seed_test_data.py`
   - `appointments/scripts/seed_test_data.py`
   - Update Docker commands to run seeds

3. ✅ Add health endpoints to all services
   - `/health` with dependency status
   - Database connection checks
   - Migration status validation

**Validation**:

```bash
docker-compose -f docker-compose.test.yml up -d
curl http://localhost:8006/test/health-all  # Should return all healthy
```

### Phase 2: Test Control APIs (Week 2)

**Deliverable**: Test reset and control endpoints

4. ✅ Implement test routes in all services
   - `POST /test/reset` (individual service)
   - `DELETE /test/data`
   - `GET /test/health`

5. ✅ Implement backoffice orchestration
   - `POST /test/reset-all` (all services)
   - `GET /test/health-all`

6. ✅ Add environment guards
   - Only enable test endpoints when `ENV=test`
   - Return 403 in production

**Validation**:

```bash
curl -X POST http://localhost:8006/test/reset-all
# Should reset all services
curl http://localhost:8002/test/health
# Should return glucoserver health status
```

### Phase 3: Playwright Integration (Week 3)

**Deliverable**: E2E tests running against local Docker

7. ✅ Update Playwright configuration
   - Add `ENV=local` test profile
   - Point `baseURL` to `localhost:8004`
   - Add global setup/teardown hooks

8. ✅ Add test helpers
   - `resetAllServices()` utility
   - `waitForHealthy()` utility
   - Fixture for authenticated admin

9. ✅ Migrate existing Heroku tests
   - Update `heroku-integration.spec.ts` → `local-integration.spec.ts`
   - Use local endpoints
   - Use test control APIs for setup/teardown

**Validation**:

```bash
docker-compose -f docker-compose.test.yml up -d
npm run test:e2e  # Should run against local Docker
```

### Phase 4: Testcontainers (Week 4)

**Deliverable**: Parallel test execution with isolated environments

10. ✅ Install testcontainers

    ```bash
    npm install --save-dev testcontainers @testcontainers/compose
    ```

11. ✅ Create testcontainers setup
    - `tests/setup/testcontainers-setup.ts`
    - Dynamic port allocation
    - Unique `TEST_RUN_ID` per run

12. ✅ Update Playwright config
    - Use testcontainers in `globalSetup`
    - Pass dynamic URLs to tests
    - Enable parallel workers

**Validation**:

```bash
npm run test:e2e  # Should auto-start Docker + run tests
# Parallel execution:
npm run test:e2e -- --workers=4
```

### Phase 5: CI/CD Integration (Week 5)

**Deliverable**: CircleCI running tests against Docker

13. ✅ Add CircleCI job
    - `test-integration` job with Docker executor
    - Enable Docker layer caching
    - Use `docker-compose.test.yml`

14. ✅ Optimize build times
    - Multi-stage Dockerfiles
    - Cache `requirements.txt` layers
    - Pre-build base images

15. ✅ Add reporting
    - Store Playwright HTML report
    - Publish test results to CircleCI UI
    - Screenshot/video artifacts on failure

**Validation**:

- Push to master → CI runs integration tests
- Tests complete in <5 minutes
- Test results visible in CircleCI UI

### Phase 6: Documentation & Handoff (Week 6)

**Deliverable**: Documentation and developer training

16. ✅ Write developer documentation
    - Quick start guide
    - Troubleshooting common issues
    - API endpoint reference

17. ✅ Create runbooks
    - "How to add new seed data"
    - "How to debug test failures"
    - "How to run tests locally"

18. ✅ Team training session
    - Demo test environment
    - Walk through test reset flow
    - Q&A and feedback

---

## Estimated Effort

| Phase                     | Effort       | Dependencies           |
| ------------------------- | ------------ | ---------------------- |
| 1. Foundation             | 8 hours      | None                   |
| 2. Test Control APIs      | 12 hours     | Phase 1                |
| 3. Playwright Integration | 8 hours      | Phase 2                |
| 4. Testcontainers         | 12 hours     | Phase 3                |
| 5. CI/CD Integration      | 8 hours      | Phase 4                |
| 6. Documentation          | 4 hours      | All phases             |
| **Total**                 | **52 hours** | ~6 weeks (1 developer) |

**Critical Path**: Phase 1 → Phase 2 → Phase 3
**Parallel Work**: Phases 4-5 can overlap with Phase 3

---

## Risk Assessment

### Technical Risks

| Risk                             | Probability | Impact | Mitigation                                        |
| -------------------------------- | ----------- | ------ | ------------------------------------------------- |
| Docker startup timeout in CI     | Medium      | High   | Increase timeout to 3min, add progress logging    |
| tmpfs memory exhaustion          | Low         | Medium | Monitor memory usage, fallback to regular volumes |
| Testcontainers flakiness         | Medium      | Medium | Add retry logic, use stable version (1.50.x)      |
| Port conflicts in parallel tests | Low         | High   | Use dynamic port allocation (port: "0")           |
| Migration failures on startup    | Low         | High   | Add migration rollback script, validate in CI     |
| Health check false positives     | Medium      | Medium | Add dependency checks, validate data seeding      |

### Operational Risks

| Risk                             | Probability | Impact | Mitigation                                        |
| -------------------------------- | ----------- | ------ | ------------------------------------------------- |
| Team unfamiliarity with Docker   | High        | Low    | Provide training, comprehensive docs              |
| Seed data drift from production  | Medium      | Medium | Regular audits, sync with backoffice team         |
| Test environment state pollution | Low         | High   | Enforce `beforeEach` reset, use ephemeral volumes |
| CI cost increase (Docker layers) | Low         | Low    | Use layer caching, monitor build minutes          |

---

## Success Metrics

### Performance Metrics

- **Startup Time**: <30s from `docker-compose up` to test-ready
- **Reset Time**: <5s for `POST /test/reset-all`
- **Test Execution**: Same speed as Heroku tests (no regression)
- **CI Build Time**: <5min for full integration test suite

### Reliability Metrics

- **Test Flakiness**: <1% failure rate (from state pollution)
- **Health Check Accuracy**: 100% correlation with service readiness
- **Data Determinism**: 100% reproducible test scenarios

### Developer Experience

- **Onboarding Time**: <15min from clone to running tests
- **Feedback Loop**: <2min from code change to test result
- **Debugging Ease**: Logs accessible via `docker-compose logs`

---

## Technology Evaluation

### Testcontainers vs Manual docker-compose

| Criteria               | Testcontainers                        | Manual docker-compose         |
| ---------------------- | ------------------------------------- | ----------------------------- |
| **Setup Complexity**   | Medium (requires Node.js integration) | Low (shell scripts)           |
| **Parallel Execution** | ✅ Excellent (automatic isolation)    | ⚠️ Manual (env vars)          |
| **Port Management**    | ✅ Automatic dynamic allocation       | ❌ Manual configuration       |
| **CI/CD Integration**  | ✅ Built-in support                   | ⚠️ Requires custom scripts    |
| **Debugging**          | ⚠️ Harder (programmatic API)          | ✅ Easy (docker-compose logs) |
| **Stability**          | ⚠️ Beta for Node.js                   | ✅ Production-ready           |
| **Learning Curve**     | High                                  | Low                           |

**Recommendation**:

- **Local development**: Manual docker-compose (easier debugging)
- **CI/CD**: Testcontainers (better isolation, automatic cleanup)
- **Hybrid approach**: Support both patterns

### tmpfs vs Regular Volumes

| Criteria              | tmpfs (In-Memory)           | Regular Volumes     |
| --------------------- | --------------------------- | ------------------- |
| **Startup Speed**     | ✅ Faster (no disk I/O)     | ⚠️ Slower           |
| **Write Performance** | ✅ 10x faster               | Standard            |
| **Automatic Cleanup** | ✅ On container stop        | ❌ Manual removal   |
| **Memory Usage**      | ⚠️ Consumes RAM (~100MB/DB) | ✅ Uses disk        |
| **Data Persistence**  | ❌ Lost on restart          | ✅ Persists         |
| **CI/CD Suitability** | ✅ Excellent (ephemeral)    | ⚠️ Requires cleanup |

**Recommendation**: Use tmpfs for test DBs (benefits outweigh memory cost)

---

## Alternative Approaches Considered

### Approach 1: Shared Test Database (REJECTED)

**Pattern**: Single test DB with transaction rollback per test

**Pros**:

- Faster (no container startup)
- Lower resource usage

**Cons**:

- ❌ State pollution between tests
- ❌ No parallel execution support
- ❌ Flaky tests from race conditions
- ❌ Hard to debug failures

**Verdict**: Not suitable for Diabetify (parallel Maestro tests required)

---

### Approach 2: In-Memory SQLite (REJECTED)

**Pattern**: Use SQLite for tests instead of PostgreSQL

**Pros**:

- Fastest startup (<1s)
- No Docker required

**Cons**:

- ❌ PostgreSQL-specific features not supported (ENUM types)
- ❌ Different SQL dialect (query compatibility issues)
- ❌ Doesn't match production environment
- ❌ Alembic migrations incompatible

**Verdict**: Too risky (production uses PostgreSQL)

---

### Approach 3: Database Snapshots (CONSIDERED)

**Pattern**: Save DB state after seeding, restore via `pg_dump`/`pg_restore`

**Pros**:

- ✅ Faster reset (1s vs 5s)
- ✅ Complex multi-state scenarios

**Cons**:

- ⚠️ More complex orchestration
- ⚠️ Requires volume persistence (conflicts with tmpfs)
- ⚠️ Snapshot management overhead

**Verdict**: Defer to Phase 7 (optimization) if reset time becomes bottleneck

---

## Appendices

### Appendix A: Health Check Endpoint Specification

**Standard Response Format** (all services):

```typescript
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  dependencies: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      latency_ms?: number;
      error?: string;
    };
  };
  data?: {
    [key: string]: any; // Service-specific metrics
  };
  environment: 'test' | 'development' | 'production';
}
```

**Example** (Glucoserver):

```json
{
  "status": "healthy",
  "service": "glucoserver",
  "version": "1.0.0",
  "timestamp": "2025-12-06T10:30:00Z",
  "dependencies": {
    "database": {
      "status": "healthy",
      "latency_ms": 5
    },
    "migrations": {
      "status": "healthy",
      "current_revision": "c06ed3dd86c0"
    }
  },
  "data": {
    "readings_count": 150,
    "users_with_data": 2
  },
  "environment": "test"
}
```

---

### Appendix B: Seed Data Specification

**Test Users** (from login seed):

```
┌────────┬─────────────┬──────────┬─────────┬──────────┬──────────────┐
│ User ID│ Name        │ Password │ Blocked │ Tidepool │ Hospital ID  │
├────────┼─────────────┼──────────┼─────────┼──────────┼──────────────┤
│ 1000   │ Nacho       │ tuvieja  │ false   │ null     │ 1            │
│ 1001   │ Pipa        │ tumadre  │ true    │ null     │ 2            │
│ 1002   │ Miguel      │ tuvieja  │ false   │ link     │ 3            │
└────────┴─────────────┴──────────┴─────────┴──────────┴──────────────┘

Admin:
  Username: admin
  Password: admin
```

**Glucose Readings** (to be seeded):

```
User 1000:
  - 30 days of readings
  - 5 readings/day (fasting, before/after lunch, before/after dinner)
  - Glucose range: 90-120 mg/dL
  - Total: 150 readings

User 1002:
  - 7 days of readings
  - 1 reading/day (fasting)
  - Glucose range: 120-150 mg/dL
  - Total: 7 readings
```

**Appointments** (to be seeded):

```
User 1000:
  - 2 completed appointments (CREATED state)
  - Dates: 60 days ago, 30 days ago
  - Queue: Empty (no pending)
```

---

### Appendix C: Troubleshooting Guide

#### Problem: "Services not starting"

**Symptoms**: Containers exit immediately or restart loop

**Diagnosis**:

```bash
docker-compose -f docker-compose.test.yml ps
docker-compose -f docker-compose.test.yml logs [service_name]
```

**Common Causes**:

1. Database not ready → Check `pg_isready` health check
2. Migration failure → Check Alembic logs for SQL errors
3. Port conflict → Use `TEST_RUN_ID` for unique names
4. Missing environment variable → Validate `.env` file

**Solution**:

```bash
# Full cleanup and restart
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d --force-recreate
```

---

#### Problem: "Health checks timing out"

**Symptoms**: Containers remain in "starting" state for >60s

**Diagnosis**:

```bash
docker inspect [container_name] | jq '.[0].State.Health'
```

**Common Causes**:

1. Slow migrations → Optimize Alembic scripts
2. Network issues → Check `docker network ls`
3. Resource exhaustion → Check `docker stats`

**Solution**:

```yaml
# Increase health check timeout in docker-compose.test.yml
healthcheck:
  start_period: 10s # Increased from 5s
  timeout: 5s # Increased from 3s
  retries: 20 # Increased from 15
```

---

#### Problem: "Tests failing with 'Connection refused'"

**Symptoms**: Tests can't connect to `localhost:8004`

**Diagnosis**:

```bash
curl http://localhost:8004/health
# If fails, check port mapping:
docker port api_gateway_test 8000
```

**Common Causes**:

1. Services not started → Run `docker-compose up -d` first
2. Wrong port in test config → Verify `baseURL` in Playwright config
3. Network isolation → Ensure tests run on host (not in container)

**Solution**:

```bash
# Verify port mapping
docker-compose -f docker-compose.test.yml ps
# Should show: 0.0.0.0:8004->8000/tcp
```

---

#### Problem: "Seed data missing or incorrect"

**Symptoms**: Tests fail with "User not found" or "No readings available"

**Diagnosis**:

```bash
# Check seed script logs
docker-compose -f docker-compose.test.yml logs glucoserver_test | grep -i seed

# Verify data via psql
docker exec -it glucoserver_db_test psql -U postgres -d glucoserver_test
SELECT COUNT(*) FROM glucose_readings;
```

**Common Causes**:

1. Seed script not run → Check Docker CMD includes `python scripts/seed_test_data.py`
2. Seed script failed → Check logs for Python exceptions
3. Data reset by other test → Use `beforeEach` hooks to reset

**Solution**:

```bash
# Manual re-seed
docker exec glucoserver_test python scripts/seed_test_data.py

# Or reset via API
curl -X POST http://localhost:8006/test/reset-all
```

---

### Appendix D: Environment Variables Reference

**docker-compose.test.yml Variables**:

| Variable            | Default   | Purpose                                        |
| ------------------- | --------- | ---------------------------------------------- |
| `TEST_RUN_ID`       | `default` | Unique ID for container isolation              |
| `API_GATEWAY_PORT`  | `8004`    | Host port for API Gateway (use `0` for random) |
| `BACKOFFICE_PORT`   | `8006`    | Host port for Backoffice API                   |
| `GLUCOSERVER_PORT`  | `8002`    | Host port for Glucoserver                      |
| `LOGIN_PORT`        | `8003`    | Host port for Login Service                    |
| `APPOINTMENTS_PORT` | `8005`    | Host port for Appointments                     |

**Service Environment Variables**:

All services:

- `ENV=test` - Enables test endpoints, disables production features
- `LOG_LEVEL=WARNING` - Reduces log noise in tests
- `DATABASE_URL=postgresql://...` - Test database connection

Login service:

- `NOREPLY_ACCOUNT=test@example.com` - Disabled in test mode
- `NOREPLY_PASSWORD=disabled` - No email sending

---

## References

### Industry Best Practices

- [Docker: Pre-seeding database](https://docs.docker.com/guides/pre-seeding/)
- [Testcontainers Node.js Documentation](https://node.testcontainers.org/)
- [Testcontainers Playwright Module](https://testcontainers.com/modules/playwright/)
- [Parallel Test Execution with Testcontainers](https://prgrmmng.com/parallel-test-execution-with-testcontainers)

### PostgreSQL & Docker

- [Step-by-Step: Setting Up Postgres with Docker and Seeding](https://blog.justinramel.com/step-by-step-setting-up-a-postgres-database-with-docker-and-seeding-test-data)
- [Seed Postgres database with Docker Compose](https://karask.com/seed-postgres-database-with-docker-compose)
- [Docker Compose Postgres Database Seed](https://onexlab-io.medium.com/docker-compose-postgres-database-seed-108297cac09a)

### Parallel Testing Patterns

- [How to Run Jest With Multiple Test Databases](https://blog.mikevosseller.com/2021/11/25/how-to-run-jest-with-multiple-test-databases.html)
- [Using Docker to Manage Test Databases](https://www.tonic.ai/blog/using-docker-to-manage-your-test-database)
- [How to use pytest with Docker for isolated testing](https://woteq.com/how-to-use-pytest-with-docker-for-isolated-testing-environments/)

### Related Documentation

- `/home/julito/TPP/diabetactic/diabetify/CLAUDE.md` - Project overview
- `/home/julito/TPP/diabetactic/diabetify/maestro/scripts/backoffice-api.js` - Existing test control script
- `/home/julito/TPP/diabetactic/container-managing/docker-compose.yml` - Production setup

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-12-06
**Next Review**: After Phase 1 implementation
**Reviewers**: Backend Team, QA Team, DevOps Team

**Changelog**:

- 2025-12-06: Initial architecture design proposal
