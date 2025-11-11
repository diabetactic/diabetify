# ExtServices Investigation: Other Repositories

**Investigation Date:** 2025-11-07
**Investigator:** Claude Code Agent
**Purpose:** Document remaining extServices repositories and their relationship to mobile app

---

## Executive Summary

Three remaining repositories investigated:
1. **container-managing** - Docker orchestration for local development
2. **api-gateway-backoffice** - Admin/doctor backend API gateway
3. **backoffice-web** - Admin/doctor web frontend (React SPA)

**Critical Finding:** **NONE of these repositories are dependencies for the mobile app.** They are exclusively for admin/doctor use and local development orchestration.

---

## 1. container-managing

### Purpose
Docker orchestration repository that manages all backend services via docker-compose for local development.

### Key Role
Development environment orchestrator - NOT a runtime dependency for mobile app.

### Services Managed

| Service | Port | Database | Purpose |
|---------|------|----------|---------|
| glucoserver | 8002 | glucoserver_db | Glucose readings service |
| login_service | 8003 | users_db | Authentication service |
| api-gateway | 8004/8000 | - | Mobile app gateway |
| api-gateway-backoffice | 8006 | - | Admin gateway |
| appointments | 8005 | appointments_db | Appointments service |

### Databases
- **glucoserver_db** - PostgreSQL for glucose readings
- **users_db** - PostgreSQL for users/admins
- **appointments_db** - PostgreSQL for appointments

### Monitoring Tools

#### Dozzle (Web UI)
- Port: 9999
- URL: http://localhost:9999
- Purpose: Real-time log viewing in browser

#### LazyDocker (Terminal TUI)
- Command: `make tui` or `docker compose run --rm lazydocker`
- Purpose: Interactive container management

### Testing Infrastructure

#### Integration Tests
- Location: `/tests/tests/`
- Framework: pytest
- Files:
  - `test_smoke.py` - Basic health checks
  - `test_gateway_appointments.py` - Appointment flow tests
  - `test_gateway_glucose.py` - Glucose API tests
  - `test_direct_services.py` - Direct service tests
  - `test_queue_consistency.py` - Queue behavior tests
- Command: `make test`

#### Postman Tests
- Location: `/tests/postman/`
- Collection: `diabetactic-app-facade.postman_collection.json`
- Runner: Newman (Postman CLI)
- Command: `make postman`

#### Unit Tests
- Per-service unit test containers
- Command: `make unit`
- Services tested:
  - glucoserver-unit-tests
  - appointments-unit-tests
  - login-unit-tests
  - api-gateway-unit-tests
  - api-gateway-backoffice-unit-tests

### Environment Variables (.env.example)

```bash
# JWT signing secret for api-gateway and backoffice-gateway
SECRET_KEY=change_me_development_secret

# Outbound email account (used by login_service for password recovery)
NOREPLY_ACCOUNT=noreply@example.com
NOREPLY_PASSWORD=change_me_password

# Backoffice front-end URL for recovery links
BACKOFFICE_FRONT_URL=https://example-backoffice-frontend.local
```

### Makefile Commands

| Command | Purpose |
|---------|---------|
| `make up` | Start all services (foreground) |
| `make build` | Build and start containers (background) |
| `make run` | Start already-built containers |
| `make down` | Stop all containers |
| `make delete` | Remove images and volumes |
| `make migrate` | Run database migrations |
| `make createmigrations` | Generate migrations |
| `make test` | Run integration tests |
| `make postman` | Run Postman tests |
| `make unit` | Run all unit tests |
| `make logs` | Start Dozzle UI |
| `make tui` | Start LazyDocker TUI |

### Mobile App Dependency
**NO** - Only for local development setup. Mobile app does not depend on this repository.

### Relevant to Mobile
**FALSE** - Development orchestration only.

---

## 2. api-gateway-backoffice

### Purpose
Admin/Doctor backend API gateway - **separate from mobile API gateway**.

### Technical Details
- **Type:** FastAPI Python backend
- **Port:** 8006 (local), Dynamic (Heroku)
- **Deployment:** Heroku
- **Heroku App:** dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com
- **Procfile:** `web: uvicorn app.main:app --host=0.0.0.0 --port=${PORT}`

### Authentication

| Property | Value |
|----------|-------|
| Type | JWT with OAuth2 |
| Algorithm | HS256 |
| Token Expiration | 30 minutes |
| User Type | **Admin only** (not patients) |
| Password Recovery | Email-based with 5-minute tokens |
| Library | python-jose |
| Password Hashing | passlib (bcrypt) |
| Token Validation | OAuth2PasswordBearer |

### API Routes

#### Authentication (`/`)
- `POST /token` - Admin login (OAuth2PasswordRequestForm)
- `POST /recover` - Password recovery via email

#### Admin Management (`/admin`)
- `GET /admin/me` - Get admin profile
- `PUT /admin/mail/change` - Update admin email
- `PUT /admin/password` - Change admin password
- `POST /admin/` - Create new admin account

#### User Management (`/users`)
- `GET /users/` - List all patients (admin-only)
- `GET /users/user/{id}` - Get specific patient details
- `POST /users/` - Create new patient account

#### Appointments (`/appointments`)
- `GET /appointments/pending` - List pending appointments
- `GET /appointments/accepted` - List accepted appointments
- `GET /appointments/created` - List created appointments
- `PUT /appointments/{action}/{id}` - Update appointment status
- `POST /appointments/queue/size` - Configure queue size
- `DELETE /appointments` - Clear appointment queue

#### Glucose (`/glucose`)
- `GET /glucose/readings` - All glucose measurements
- `GET /glucose/user/{id}` - User-specific measurements
- `POST /glucose/reading` - Create measurement
- `DELETE /glucose/reading/{id}` - Delete measurement

### Service Proxies (Environment Variables)

| Variable | Value | Purpose |
|----------|-------|---------|
| USERS_BASE_URL | http://login_service:8000 | User authentication |
| APPOINTMENTS_BASE_URL | http://appointments:8000 | Appointments service |
| GLUCOSERVER_BASE_URL | http://glucoserver:8000 | Glucose readings |
| SECRET_KEY | (from env) | JWT signing key |

### Shared Auth Code

| Component | Library/Method |
|-----------|---------------|
| JWT Library | python-jose |
| Password Hashing | passlib (bcrypt) |
| Token Validation | OAuth2PasswordBearer |
| Secret Key | **YES - shared with api-gateway** |

### Key Differences from Mobile API Gateway

1. **Admin Authentication** - Uses admin accounts, not patient accounts
2. **Admin Endpoints** - `/admin/*` routes not available to mobile
3. **User Management** - Can create/view all patients (admin privilege)
4. **Queue Management** - Can configure appointment queue size
5. **Separate Deployment** - Heroku (different from mobile gateway)

### Dependencies (requirements.txt)

```
fastapi==0.114.0
uvicorn==0.30.6
python-jose==3.3.0
passlib==1.7.4
pydantic==2.9.0
pydantic[email]
requests==2.32.3
python-multipart==0.0.5
```

### Mobile App Dependency
**NO** - Admin/doctor interface only. Mobile app uses `api-gateway` (port 8004).

### Relevant to Mobile
**FALSE** - Separate admin backend.

---

## 3. backoffice-web

### Purpose
Admin/Doctor web frontend - React SPA for clinic management interface.

### Technical Details
- **Type:** React 18 + TypeScript + Vite
- **Framework:** React Admin 5 + Material-UI 6
- **State Management:** TanStack Query (React Query)
- **Deployment:** Heroku with static file serving
- **API Endpoint:** https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com

### Deployment Configuration

```json
// static.json
{
  "root": "dist",
  "clean_urls": true,
  "routes": {
    "/**": "index.html"
  }
}
```

**Build Process:**
- `npm run build` - Creates production build in `dist/`
- `npm start` - Serves static files with `serve -s dist`
- Heroku: `"heroku-postbuild": "npm run build"`

### Authentication System

| Property | Implementation |
|----------|---------------|
| Provider | React Admin authProvider |
| Token Storage | localStorage |
| Session Expiration | 30 minutes |
| Auto Check | Every 30 seconds |
| Recovery Flow | Email-based password recovery |

**Session Management:**
```typescript
// utils/sessionHandler.tsx
- isSessionExpired() - Check token expiration
- handleSessionExpire() - Clear session and redirect

// constants/index.ts
SESSION_CONFIG.EXPIRATION_TIME = 30 minutes
```

### Features

#### 1. Patient Management (`/users`)

**Files:**
- `usersList.tsx` - Patient list with search/filter
- `usersDataProvider.tsx` - API integration
- `ClinicalHistoryModal.tsx` - Patient history viewer
- `MeasurementsModal.tsx` - Glucose readings viewer

**Capabilities:**
- View all patients
- Search/filter patient list
- View patient details
- Access clinical history
- View glucose measurements

#### 2. Appointment Management (`/appointments`)

**Files:**
- `pendingAppointmentsList.tsx` - Pending appointments
- `acceptedAppointmentsList.tsx` - Accepted appointments
- `createdAppointmentsList.tsx` - Created appointments
- `appointmentsDataProvider.tsx` - API integration
- `appointmentsDetailPanel.tsx` - Appointment details
- `appointmentsQueueInfo.tsx` - Queue configuration

**Capabilities:**
- View pending appointments
- Accept/reject appointments
- View accepted appointments
- View created appointments
- Configure queue size
- Clear appointment queue

#### 3. Glucose Management (`/glucose`)

**Files:**
- `glucoseDataProvider.tsx` - API integration
- `readingCreate.tsx` - Manual reading entry

**Capabilities:**
- View all measurements
- Create manual measurements
- Delete measurements
- Filter by user

#### 4. Admin Features (`/admin`)

**Files:**
- `App.tsx` - Main app with session management
- `authProvider.tsx` - Authentication provider
- `CustomLogin.tsx` - Custom login page
- `PasswordRecovery.tsx` - Password recovery modal

**Capabilities:**
- Admin profile management
- Change email
- Change password
- Password recovery via email

### Configuration Files

#### api.ts (Centralized API URLs)
```typescript
export const API_CONFIG = {
  BASE_URL: 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com',
  ENDPOINTS: {
    TOKEN: '/token',
    USERS: '/users',
    APPOINTMENTS: '/appointments',
    GLUCOSE: '/glucose',
    ADMIN: '/admin',
    RECOVER: '/recover',
    ADMIN_PASSWORD: '/admin/password'
  }
}
```

#### httpClient.ts (HTTP Wrapper)
- Centralizes HTTP requests
- Handles authentication headers
- Manages error responses
- Supports form data and JSON

#### constants/index.ts (Global Constants)
```typescript
export const SESSION_CONFIG = {
  EXPIRATION_TIME: 30 * 60 * 1000 // 30 minutes
}
```

### Data Providers (React Admin)

```typescript
// combineDataProviders pattern
resources: {
  "mediciones": glucoseDataProvider,
  "consultas": appointmentsDataProvider,
  "consultas/pendientes": appointmentsDataProvider,
  "consultas/aceptadas": appointmentsDataProvider,
  "consultas/creadas": appointmentsDataProvider,
  "pacientes": usersDataProvider
}
```

### Project Structure

```
src/
├── admins/               # Admin management
├── appointments/         # Appointment features
│   ├── pendingAppointmentsList.tsx
│   ├── acceptedAppointmentsList.tsx
│   ├── createdAppointmentsList.tsx
│   ├── appointmentsDataProvider.tsx
│   ├── appointmentsDetailPanel.tsx
│   └── appointmentsQueueInfo.tsx
├── components/           # Reusable components
│   ├── CustomLogin.tsx
│   └── PasswordRecovery.tsx
├── config/              # Configuration
│   └── api.ts
├── constants/           # Global constants
│   └── index.ts
├── glucose/             # Glucose features
│   ├── glucoseDataProvider.tsx
│   └── readingCreate.tsx
├── users/               # Patient management
│   ├── usersList.tsx
│   ├── usersDataProvider.tsx
│   ├── ClinicalHistoryModal.tsx
│   └── MeasurementsModal.tsx
├── utils/               # Utilities
│   ├── httpClient.ts
│   └── sessionHandler.tsx
├── App.tsx              # Main application
├── authProvider.tsx     # Auth provider
├── Dashboard.tsx        # Dashboard page
└── Layout.tsx           # Layout component
```

### Dependencies (package.json)

```json
{
  "dependencies": {
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.0",
    "@mui/material": "^6.4.4",
    "@tanstack/react-query-devtools": "^5.64.2",
    "ra-data-simple-rest": "^5.4.0",
    "react": "^18.3.0",
    "react-admin": "^5.5.3",
    "react-dom": "^18.3.0",
    "serve": "^14.2.4",
    "vite": "^5.3.5"
  }
}
```

### Mobile App Dependency
**NO** - Separate admin interface with different UI framework.

### Relevant to Mobile
**FALSE** - Different frontend stack (React Admin vs Ionic/Angular).

### Shared with Mobile

**Backend Services (indirect):**
- login service (user authentication)
- appointments service
- glucoserver service

**But Different Gateway:**
- Backoffice: Uses `api-gateway-backoffice` (port 8006)
- Mobile: Uses `api-gateway` (port 8004)

**No Direct Code Sharing:**
- Different frameworks (React Admin vs Ionic/Angular)
- Different routing
- Different state management
- Different UI components

---

## Deployment Architecture

### Mobile App Stack
```
Mobile App (Ionic/Angular)
    ↓
api-gateway (port 8004)
    ↓
┌──────────────┬──────────────┬──────────────┐
│   login      │ appointments │  glucoserver │
│  (port 8003) │  (port 8005) │  (port 8002) │
└──────────────┴──────────────┴──────────────┘
    ↓              ↓              ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│ users_db │  │appointments│ │glucoserver│
│          │  │    _db    │  │   _db    │
└──────────┘  └──────────┘  └──────────┘
```

### Backoffice Stack
```
Backoffice Web (React Admin)
    ↓
api-gateway-backoffice (port 8006)
    ↓
┌──────────────┬──────────────┬──────────────┐
│   login      │ appointments │  glucoserver │
│  (port 8003) │  (port 8005) │  (port 8002) │
└──────────────┴──────────────┴──────────────┘
    ↓              ↓              ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│ users_db │  │appointments│ │glucoserver│
│          │  │    _db    │  │   _db    │
└──────────┘  └──────────┘  └──────────┘
```

### Local Development (container-managing)
```
Docker Compose Orchestration
    ↓
┌────────────────────────────────────────────┐
│  All Services + Databases + Monitoring     │
│  - api-gateway (8004)                      │
│  - api-gateway-backoffice (8006)           │
│  - login (8003)                            │
│  - appointments (8005)                     │
│  - glucoserver (8002)                      │
│  - All PostgreSQL databases                │
│  - Dozzle (9999)                           │
│  - LazyDocker (TUI)                        │
└────────────────────────────────────────────┘
```

---

## Shared Infrastructure

### Backend Services
Both mobile and backoffice share:
1. **login service** - User/admin authentication (users_db)
2. **appointments service** - Appointment management (appointments_db)
3. **glucoserver service** - Glucose readings (glucoserver_db)

### Authentication Mechanism
- **JWT Implementation:** python-jose library
- **Password Hashing:** passlib with bcrypt
- **Secret Key:** Shared SECRET_KEY environment variable
- **Algorithm:** HS256
- **Token Format:** OAuth2 Bearer token

### Database Separation
- **users_db** - Users and admins (shared data)
- **appointments_db** - Appointments (shared data)
- **glucoserver_db** - Glucose readings (shared data)

---

## Recommendations

### For Mobile Team

1. **Focus on api-gateway** (port 8004), NOT api-gateway-backoffice
2. **Ignore backoffice-web** completely - different tech stack
3. **Use container-managing** for local development only
4. **Maintain compatibility** with shared services:
   - login service API
   - appointments service API
   - glucoserver service API
5. **Do not break admin features** when updating shared services

### For Documentation

1. **Document Gateway Differences:**
   - api-gateway vs api-gateway-backoffice
   - Patient endpoints vs admin endpoints
   - Mobile auth vs admin auth

2. **Clarify Separation:**
   - Mobile app stack diagram
   - Backoffice stack diagram
   - Shared vs separate components

3. **Update Testing Guide:**
   - How to use container-managing for local dev
   - Integration test locations
   - Postman collection usage

### For Architecture

1. **Maintain Clear Separation:**
   - Mobile gateway vs admin gateway
   - Patient auth vs admin auth
   - Frontend separation (Ionic vs React Admin)

2. **Shared Service Compatibility:**
   - Version shared services carefully
   - Coordinate breaking changes
   - Test both gateways when updating services

3. **Environment Management:**
   - Same SECRET_KEY for both gateways
   - Different deployment targets
   - Consistent database schemas

---

## Summary

### Critical Findings

1. **No Mobile Dependencies:**
   - container-managing: Development orchestration only
   - api-gateway-backoffice: Admin backend only
   - backoffice-web: Admin frontend only

2. **Complete Separation:**
   - Different gateways (8004 vs 8006)
   - Different authentication (patient vs admin)
   - Different frontends (Ionic/Angular vs React Admin)

3. **Shared Infrastructure:**
   - Backend services (login, appointments, glucoserver)
   - JWT implementation (python-jose, bcrypt)
   - Database schemas
   - SECRET_KEY environment variable

### Mobile Team Action Items

- ✅ Can ignore backoffice repositories for mobile development
- ✅ Use container-managing for local development setup
- ✅ Focus on api-gateway (port 8004) compatibility
- ✅ Coordinate with backend team on shared service changes
- ✅ Test mobile app against container-managing environment

---

**Investigation Complete**
**Next Steps:** Proceed with mobile app development, focusing on api-gateway integration and shared service compatibility.
