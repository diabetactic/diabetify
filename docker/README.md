# Diabetactic Docker Infrastructure

This directory contains Docker infrastructure for local backend development and E2E testing.

## Contents

### Local Backend Testing (`docker-compose.local.yml`)

Full-stack local development environment that replicates Heroku.

- **API Gateway** (port 8000) - Main entry point for frontend
- **API Gateway Backoffice** (port 8001) - Admin operations
- **Login Service** - User authentication and management
- **Glucoserver** - Glucose readings data
- **Appointments** - Medical appointments
- **Test Utils** - Helper container for user management
- **PostgreSQL Databases** - Separate databases for each service

See below for complete documentation.

### E2E Testing (`docker-compose.e2e.yml`)

Playwright E2E tests in isolated containers:

- **Dockerfile.e2e** - Multi-stage Docker image for building the app and running Playwright tests
- **nginx.conf** - Nginx configuration optimized for Angular SPA with proper routing
- **.dockerignore** - Excludes unnecessary files from Docker build context

For E2E testing documentation, run:

```bash
npm run test:e2e:docker
```

---

# Local Backend Testing Environment

This Docker-based setup replicates the Heroku production environment locally for development and testing.

## Overview

This environment runs all 5 Diabetactic backend services locally:

1. **API Gateway** (port 8000) - Main entry point for frontend
2. **API Gateway Backoffice** (port 8001) - Admin operations
3. **Login Service** - User authentication and management
4. **Glucoserver** - Glucose readings data
5. **Appointments** - Medical appointments
6. **Test Utils** - Helper container for user management

All services use PostgreSQL databases with separate containers for data isolation.

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Backend repositories at `/home/julito/TPP/diabetactic/`
- Port 8000 available (API Gateway)

### Start Services

```bash
cd /home/julito/TPP/diabetactic/diabetify/docker
./start.sh
```

This will:

- Build all Docker images (first run takes 2-3 minutes)
- Start PostgreSQL databases
- Start all backend services
- Wait for health checks to pass
- Display service URLs

### Stop Services

```bash
./stop.sh
```

### Reset Database

**WARNING: This deletes all data!**

```bash
./reset-db.sh
```

## User Management

### Create Test User

```bash
# Basic user (auto-generated email)
./create-user.sh <dni> <password>

# Example
./create-user.sh 1000 tuvieja

# Full user details
./create-user.sh <dni> <password> <name> <surname> <email>

# Example
./create-user.sh 1001 password123 John Doe john@example.com
```

### Delete User

```bash
./delete-user.sh <dni>

# Example
./delete-user.sh 1000
```

Note: This actually blocks the user (backend has no delete endpoint).

### Get User Info

```bash
./get-user.sh <dni>

# Example
./get-user.sh 1000
```

### List All Users

```bash
./list-users.sh
```

## Service URLs

- **API Gateway**: http://localhost:8000
- **API Gateway Docs**: http://localhost:8000/docs
- **Backoffice API**: http://localhost:8001
- **Backoffice Docs**: http://localhost:8001/docs

## Viewing Logs

```bash
# All services
./logs.sh

# Specific service
./logs.sh api-gateway
./logs.sh login_service
./logs.sh glucoserver
./logs.sh appointments
```

## Frontend Integration

Update your app to use the local backend:

```bash
# In diabetify root directory
ENV=local npm start
```

This sets `DEV_BACKEND_MODE` to 'local' in `src/environments/environment.ts`.

### Environment Configuration

The app automatically detects the platform and uses the correct URL:

- **Web (via proxy)**: `http://localhost:8000`
- **Android Native**: `http://10.0.2.2:8000` (Android emulator host address)
- **iOS Native**: `http://localhost:8000`

No additional configuration needed!

## Docker Compose Services

| Service                | Container Name                     | Port     | Purpose                 |
| ---------------------- | ---------------------------------- | -------- | ----------------------- |
| api-gateway            | diabetactic_api_gateway            | 8000     | Main API entry point    |
| api-gateway-backoffice | diabetactic_api_gateway_backoffice | 8001     | Admin operations        |
| login_service          | diabetactic_login_service          | Internal | User auth               |
| glucoserver            | diabetactic_glucoserver            | Internal | Glucose data            |
| appointments           | diabetactic_appointments           | Internal | Appointments            |
| users_db               | diabetactic_users_db               | Internal | User database           |
| glucoserver_db         | diabetactic_glucoserver_db         | Internal | Glucose database        |
| appointments_db        | diabetactic_appointments_db        | Internal | Appointments database   |
| test-utils             | diabetactic_test_utils             | -        | User management scripts |

## Database Volumes

Data is persisted in Docker volumes:

- `postgres_data_users` - User accounts
- `postgres_data_glucoserver` - Glucose readings
- `postgres_data_appointments` - Appointments

To completely remove all data:

```bash
docker compose -f docker-compose.local.yml down -v
```

## Troubleshooting

### Services won't start

```bash
# Check logs
./logs.sh

# Check if ports are in use
lsof -i :8000
lsof -i :8001

# Restart everything
./stop.sh
./start.sh
```

### Database connection errors

```bash
# Reset databases
./reset-db.sh
```

### User creation fails

```bash
# Check login service logs
./logs.sh login_service

# Verify test-utils container is running
docker ps | grep test_utils
```

### API Gateway returns 502/503

The gateway depends on all backend services. Check if they're healthy:

```bash
docker compose -f docker-compose.local.yml ps
```

All services should show "running" status.

## Advanced Usage

### Execute commands in test-utils container

```bash
docker exec -it diabetactic_test_utils bash
# Now you can run user_manager.py directly
python3 user_manager.py list
```

### Update hospital account status

```bash
docker exec diabetactic_test_utils python3 user_manager.py update-status <dni> <status>

# Example
docker exec diabetactic_test_utils python3 user_manager.py update-status 1000 accepted
```

### Access PostgreSQL databases directly

```bash
# Users database
docker exec -it diabetactic_users_db psql -U postgres -d users

# Glucose database
docker exec -it diabetactic_glucoserver_db psql -U postgres -d glucoserver

# Appointments database
docker exec -it diabetactic_appointments_db psql -U postgres -d appointments
```

## Development Workflow

1. **Start local backend**:

   ```bash
   cd docker
   ./start.sh
   ```

2. **Create test user**:

   ```bash
   ./create-user.sh 1000 tuvieja
   ```

3. **Start frontend with local backend**:

   ```bash
   cd /home/julito/TPP/diabetactic/diabetify
   ENV=local npm start
   ```

4. **Test the app**:
   - Web: http://localhost:8100
   - Login with DNI: 1000, Password: tuvieja

5. **View backend logs**:

   ```bash
   cd docker
   ./logs.sh api-gateway
   ```

6. **Stop when done**:
   ```bash
   ./stop.sh
   ```

## Comparison with Heroku

| Aspect          | Heroku (Cloud)                  | Local Docker   |
| --------------- | ------------------------------- | -------------- |
| URL             | dt-api-gateway-\*.herokuapp.com | localhost:8000 |
| Setup           | None                            | `./start.sh`   |
| Speed           | Network latency                 | Local (fast)   |
| Data            | Persistent                      | Resettable     |
| Cost            | Paid                            | Free           |
| Internet        | Required                        | Not required   |
| User Management | Web interface                   | CLI scripts    |

## Appointment Testing

### Appointment State Machine

```
┌─────────────────────────────────────────────────┐
│          Appointment State Machine              │
├─────────────────────────────────────────────────┤
│                                                 │
│   NONE ──[request]──> PENDING                   │
│                          │                      │
│              ┌───────────┼───────────┐          │
│              │           │           │          │
│        [deny]▼     [accept]▼    [close]▼        │
│           DENIED      ACCEPTED    BLOCKED       │
│              │           │                      │
│        [request]   [create]▼                    │
│              │        CREATED                   │
│              ▼           │                      │
│           NONE ◄─────────┘                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Quick Appointment Commands

```bash
# Clear queue and start fresh
./test-appointment-flow.sh clear

# Accept user's pending appointment
./test-appointment-flow.sh accept 1000

# Deny user's pending appointment
./test-appointment-flow.sh deny 1000

# Open/close appointment queue
./test-appointment-flow.sh open
./test-appointment-flow.sh close

# Check queue status
./test-appointment-flow.sh status 1000

# Run full flow demo with state visualization
./test-appointment-flow.sh full 1000
```

### Testing Appointment Flow

1. **Clear existing state**: `./test-appointment-flow.sh clear`
2. **In mobile app**: Request appointment (NONE → PENDING)
3. **Accept via script**: `./test-appointment-flow.sh accept 1000`
4. **In mobile app**: Create appointment (ACCEPTED → CREATED)

## E2E Testing Integration

### Playwright Docker Tests

Dedicated Docker tests in `playwright/tests/docker-backend-e2e.spec.ts`:

```bash
# Run Docker-specific Playwright tests
E2E_DOCKER_TESTS=true \
E2E_API_URL=http://localhost:8000 \
E2E_BACKOFFICE_URL=http://localhost:8001 \
npm run test:e2e -- --grep "@docker"
```

### Maestro Integration

The `maestro/scripts/backoffice-api.js` auto-detects Docker backend:

```bash
# Auto-detects localhost:8001 if Docker is running
ACTION=accept USER_ID=1000 node maestro/scripts/backoffice-api.js

# Force specific backend
BACKOFFICE_API_URL=http://localhost:8001 ACTION=clear node maestro/scripts/backoffice-api.js
```

For resolution-api.js (runs in Maestro GraalJS), pass URL via environment:

```yaml
# In Maestro flow
- runScript:
    file: ../../scripts/resolution-api.js
    env:
      ACTION: ensure
      APPOINTMENT_ID: '100'
      BACKOFFICE_API_URL: 'http://10.0.2.2:8001' # Android emulator
```

**Note**: Android emulator uses `10.0.2.2` to reach host machine's localhost.

### Full E2E Test Runner

```bash
# Run Playwright tests against Docker backend
./run-e2e-docker.sh playwright

# Run Maestro mobile tests
./run-e2e-docker.sh maestro

# Full suite (both)
./run-e2e-docker.sh all
```

## File Structure

```
docker/
├── docker-compose.local.yml     # Main compose file for local backend
├── docker-compose.e2e.yml       # E2E testing compose file
├── Dockerfile.test-utils        # Test utilities container
├── Dockerfile.e2e               # E2E testing Dockerfile
├── start.sh                     # Start all services
├── stop.sh                      # Stop all services
├── reset-db.sh                  # Reset databases
├── create-user.sh               # Create test user
├── delete-user.sh               # Delete test user
├── list-users.sh                # List all users
├── get-user.sh                  # Get user info
├── logs.sh                      # View service logs
├── run-e2e-docker.sh            # E2E test orchestrator
├── seed-test-data.sh            # Seed test data
├── cleanup-test-data.sh         # Cleanup test data
├── test-appointment-flow.sh     # Appointment testing helper
├── test-utils/
│   └── user_manager.py          # User management library
└── README.md                    # This file
```

## Notes

- This setup does NOT replace Heroku - it's for local testing only
- Heroku support is maintained in `environment.ts` (cloud mode)
- Database schema is auto-created by FastAPI/SQLAlchemy on first run
- Hot reload is enabled - backend code changes reflect immediately
- Frontend code changes also hot-reload with `npm start`

## Support

For issues or questions:

1. Check logs: `./logs.sh`
2. Reset environment: `./reset-db.sh`
3. Verify Docker is running: `docker info`
4. Check port availability: `lsof -i :8000`

---

**Last Updated**: 2025-12-07
