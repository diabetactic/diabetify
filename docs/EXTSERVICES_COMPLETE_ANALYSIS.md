# ExtServices: Complete Analysis & Architecture

**Analysis Date:** 2025-11-07
**Analyst:** Claude Code Investigation Agent
**Project:** Diabetify Mobile Health App

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Repository Overview](#repository-overview)
3. [Mobile App Dependencies](#mobile-app-dependencies)
4. [Architecture Diagrams](#architecture-diagrams)
5. [Shared Components](#shared-components)
6. [Authentication Flows](#authentication-flows)
7. [Deployment Strategy](#deployment-strategy)
8. [Development Workflow](#development-workflow)
9. [Integration Points](#integration-points)
10. [Recommendations](#recommendations)

---

## Executive Summary

### What is extServices?

ExtServices is a **microservices backend** for the Diabetify health app, consisting of **8 repositories** managed as Git submodules. The architecture separates mobile app backend (patient-facing) from administrative backend (doctor/admin-facing).

### Key Findings

**Mobile App Dependencies (3 repos):**
1. ✅ **api-gateway** - Main gateway for mobile app
2. ✅ **login** - User authentication service
3. ✅ **appointments** - Appointment management service
4. ⚠️ **glucoserver** - Glucose readings (partially for Tidepool integration)

**Admin/Development Only (4 repos):**
1. ❌ **container-managing** - Docker orchestration
2. ❌ **api-gateway-backoffice** - Admin gateway
3. ❌ **backoffice-web** - Admin frontend (React)
4. ⚠️ **glucoserver** - Also used by admin interface

### Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                   Diabetify Ecosystem                   │
├──────────────────────────┬──────────────────────────────┤
│   MOBILE APP STACK       │   ADMIN/BACKOFFICE STACK     │
├──────────────────────────┼──────────────────────────────┤
│ Ionic/Angular App        │ React Admin Web App          │
│        ↓                 │        ↓                     │
│ api-gateway (8004)       │ api-gateway-backoffice (8006)│
│        ↓                 │        ↓                     │
├──────────────────────────┴──────────────────────────────┤
│              SHARED BACKEND SERVICES                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  login   │  │appointments│ │glucoserver│            │
│  │  (8003)  │  │  (8005)   │  │  (8002)  │            │
│  └──────────┘  └──────────┘  └──────────┘             │
├─────────────────────────────────────────────────────────┤
│              LOCAL DEVELOPMENT                          │
│         container-managing (Docker Compose)             │
└─────────────────────────────────────────────────────────┘
```

---

## Repository Overview

### Complete Repository List

| Repository | Type | Purpose | Mobile Dependency | Admin Use | Lines of Code |
|-----------|------|---------|-------------------|-----------|---------------|
| **api-gateway** | FastAPI | Mobile app gateway | ✅ CRITICAL | ❌ | ~500 |
| **login** | FastAPI | User/admin auth | ✅ REQUIRED | ✅ | ~1,200 |
| **appointments** | FastAPI | Appointment mgmt | ✅ REQUIRED | ✅ | ~1,000 |
| **glucoserver** | FastAPI | Glucose readings | ⚠️ PARTIAL | ✅ | ~800 |
| **api-gateway-backoffice** | FastAPI | Admin gateway | ❌ | ✅ REQUIRED | ~500 |
| **backoffice-web** | React/TS | Admin frontend | ❌ | ✅ REQUIRED | ~2,500 |
| **container-managing** | Docker | Dev orchestration | ⚠️ DEV ONLY | ⚠️ DEV ONLY | ~300 |
| *TidepoolApi* | Submodule | External API | ⚠️ FUTURE | ❌ | External |

**Legend:**
- ✅ CRITICAL - Required for core functionality
- ✅ REQUIRED - Required for feature functionality
- ⚠️ PARTIAL - Partially used or planned
- ⚠️ DEV ONLY - Development/testing only
- ❌ - Not used

---

## Mobile App Dependencies

### Critical Path: Mobile User Journey

```
User Opens App
    ↓
1. LOGIN (login service)
   - Email/password authentication
   - JWT token generation
   - User profile retrieval
    ↓
2. API GATEWAY (api-gateway)
   - Token validation
   - Request routing
   - Service orchestration
    ↓
3. APPOINTMENTS (appointments service)
   - View scheduled appointments
   - Request new appointments
   - Join appointment queue
    ↓
4. GLUCOSE READINGS (glucoserver)
   - View glucose history
   - Manual entry (future)
   - Tidepool sync (primary source)
```

### Repository Deep Dive

#### 1. api-gateway ✅ CRITICAL

**Purpose:** Main gateway for mobile app - routes requests to backend services

**Port:** 8004 (local), Dynamic (Heroku)

**Deployment:**
- Heroku: dt-api-gateway-2eeb55a0ea38.herokuapp.com
- Procfile: `web: uvicorn app.main:app --host=0.0.0.0 --port=${PORT}`

**Key Endpoints:**
```python
# Authentication
POST /login                    # Patient login
GET  /users/me                 # Current user profile

# Appointments
GET  /appointments/me          # User's appointments
POST /appointments/enqueue     # Request appointment
POST /appointments/dequeue     # Leave queue
GET  /appointments/queue       # Queue status

# Glucose (proxied to glucoserver)
GET  /glucose/readings/{user_id}  # User's glucose data
```

**Service Proxies:**
```python
USERS_BASE_URL = http://login_service:8000
APPOINTMENTS_BASE_URL = http://appointments:8000
GLUCOSERVER_BASE_URL = http://glucoserver:8000
```

**Dependencies:**
- fastapi==0.114.0
- python-jose[cryptography] (JWT)
- passlib[bcrypt] (password hashing)
- requests (HTTP client)

**Mobile Integration:**
```typescript
// Mobile app configuration
environment.ts:
  apiGateway: 'http://localhost:8004'  // Development

environment.prod.ts:
  apiGateway: 'https://dt-api-gateway-2eeb55a0ea38.herokuapp.com'
```

#### 2. login ✅ REQUIRED

**Purpose:** User and admin authentication service

**Port:** 8003 (local), Dynamic (Heroku)

**Database:** users_db (PostgreSQL)

**Key Features:**
- User registration (email/password)
- Admin registration (separate table)
- JWT token generation
- Password recovery via email
- Profile management

**Database Schema:**
```sql
-- users table
id SERIAL PRIMARY KEY
dni INTEGER UNIQUE NOT NULL
username VARCHAR UNIQUE NOT NULL
email VARCHAR UNIQUE NOT NULL
hashed_password VARCHAR NOT NULL
name VARCHAR
surname VARCHAR
age INTEGER
gender VARCHAR
account_pending BOOLEAN DEFAULT FALSE

-- admins table
admin_id SERIAL PRIMARY KEY
username VARCHAR UNIQUE NOT NULL
email VARCHAR UNIQUE NOT NULL
hashed_password VARCHAR NOT NULL
```

**Mobile Endpoints:**
```python
POST /login                    # Patient authentication
POST /users/                   # User registration
GET  /users/{user_id}          # User profile
PUT  /users/                   # Update profile
GET  /users/email/{email}      # Find by email
POST /recover                  # Password recovery
```

**Environment Variables:**
```bash
DATABASE_URL=postgresql://...
NOREPLY_ACCOUNT=noreply@example.com
NOREPLY_PASSWORD=***
BACKOFFICE_FRONT_URL=https://backoffice.example.com
```

**Dependencies:**
- fastapi==0.114.0
- sqlalchemy==2.0.23 (ORM)
- alembic==1.13.0 (migrations)
- psycopg2-binary (PostgreSQL driver)
- python-jose, passlib (auth)

#### 3. appointments ✅ REQUIRED

**Purpose:** Appointment scheduling and queue management

**Port:** 8005 (local), Dynamic (Heroku)

**Database:** appointments_db (PostgreSQL)

**Key Features:**
- Appointment queue system
- Status management (pending/accepted/rejected/completed)
- Priority queue (FIFO)
- Admin approval workflow

**Database Schema:**
```sql
-- appointments table
id SERIAL PRIMARY KEY
user_id INTEGER NOT NULL
date TIMESTAMP
status VARCHAR  -- pending, accepted, rejected, completed
clinical_form JSONB
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

**Mobile Endpoints:**
```python
GET  /appointments/user/{user_id}  # User's appointments
POST /appointments/enqueue         # Request appointment
POST /appointments/dequeue         # Cancel request
GET  /appointments/queue           # Queue info
GET  /appointments/next            # Next in queue (admin)
```

**Queue Logic:**
```python
# Enqueue: Add to end of queue
# Dequeue: Remove from queue
# Next: Pop first from queue (FIFO)
# Status transitions:
#   pending → accepted (by admin)
#   pending → rejected (by admin)
#   accepted → completed (after consultation)
```

**Dependencies:**
- fastapi==0.114.0
- sqlalchemy==2.0.23
- alembic==1.13.0
- psycopg2-binary

#### 4. glucoserver ⚠️ PARTIAL

**Purpose:** Glucose readings storage (partially used - Tidepool is primary source)

**Port:** 8002 (local), Dynamic (Heroku)

**Database:** glucoserver_db (PostgreSQL)

**Current Status:**
- ⚠️ Mobile app uses **Tidepool API** as primary glucose source
- ⚠️ glucoserver planned for manual entry (not yet implemented)
- ✅ Used by admin interface for viewing patient data

**Database Schema:**
```sql
-- glucose_readings table
id SERIAL PRIMARY KEY
user_id INTEGER NOT NULL
value FLOAT NOT NULL
timestamp TIMESTAMP NOT NULL
unit VARCHAR DEFAULT 'mg/dL'
created_at TIMESTAMP DEFAULT NOW()
```

**Endpoints:**
```python
GET  /readings/{user_id}       # User's readings
POST /readings/                # Create reading
GET  /readings/{id}            # Specific reading
DELETE /readings/{id}          # Delete reading
```

**Mobile Integration:**
```typescript
// Current: Tidepool API (primary)
TidepoolSyncService.getReadings()

// Future: glucoserver (manual entry)
ReadingsService.createReading()
```

**Dependencies:**
- fastapi==0.114.0
- sqlalchemy==2.0.23
- alembic==1.13.0
- psycopg2-binary

---

## Architecture Diagrams

### Mobile App Request Flow

```
┌──────────────────────────────────────────────────────────┐
│                    MOBILE APP (Ionic)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Login   │  │Dashboard │  │Appointments│ │Readings │ │
│  │  Page    │  │  Page    │  │   Page   │  │  Page   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │              │              │      │
│       └─────────────┴──────────────┴──────────────┘      │
│                            ↓                             │
│              ┌─────────────────────────┐                 │
│              │  UnifiedAuthService     │                 │
│              │  (JWT token handling)   │                 │
│              └─────────────────────────┘                 │
│                            ↓                             │
│              ┌─────────────────────────┐                 │
│              │  ApiGatewayService      │                 │
│              │  (HTTP client)          │                 │
│              └─────────────────────────┘                 │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ↓ HTTPS
┌───────────────────────────────────────────────────────────┐
│               API-GATEWAY (FastAPI - Port 8004)           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  routes/auth.py         - /login, /users/me        │  │
│  │  routes/appointments.py - /appointments/*          │  │
│  │  routes/glucose.py      - /glucose/*               │  │
│  └─────────────────────────────────────────────────────┘  │
│                            ↓                              │
│         ┌──────────────────┼──────────────────┐           │
│         ↓                  ↓                  ↓           │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐       │
│  │   LOGIN    │   │APPOINTMENTS│   │ GLUCOSERVER│       │
│  │  Service   │   │  Service   │   │  Service   │       │
│  │ (port 8003)│   │ (port 8005)│   │ (port 8002)│       │
│  └──────┬─────┘   └──────┬─────┘   └──────┬─────┘       │
│         ↓                ↓                ↓               │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐       │
│  │  users_db  │   │appointments│   │glucoserver │       │
│  │(PostgreSQL)│   │    _db     │   │    _db     │       │
│  └────────────┘   └────────────┘   └────────────┘       │
└───────────────────────────────────────────────────────────┘
```

### Admin Backoffice Flow (Separate from Mobile)

```
┌──────────────────────────────────────────────────────────┐
│         BACKOFFICE-WEB (React Admin)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Login   │  │ Patients │  │Appointments│ │Glucose  │ │
│  │  Page    │  │   List   │  │   List   │  │  List   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │              │              │      │
│       └─────────────┴──────────────┴──────────────┘      │
│                            ↓                             │
│              ┌─────────────────────────┐                 │
│              │  React Admin            │                 │
│              │  Data Providers         │                 │
│              └─────────────────────────┘                 │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ↓ HTTPS
┌───────────────────────────────────────────────────────────┐
│       API-GATEWAY-BACKOFFICE (FastAPI - Port 8006)        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  routes/auth.py         - /token (admin login)     │  │
│  │  routes/admin.py        - /admin/* (admin mgmt)    │  │
│  │  routes/user.py         - /users/* (patient mgmt)  │  │
│  │  routes/appointments.py - /appointments/* (admin)  │  │
│  │  routes/glucose.py      - /glucose/* (view all)    │  │
│  └─────────────────────────────────────────────────────┘  │
│                            ↓                              │
│         ┌──────────────────┼──────────────────┐           │
│         ↓                  ↓                  ↓           │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐       │
│  │   LOGIN    │   │APPOINTMENTS│   │ GLUCOSERVER│       │
│  │  Service   │   │  Service   │   │  Service   │       │
│  │ (port 8003)│   │ (port 8005)│   │ (port 8002)│       │
│  └──────┬─────┘   └──────┬─────┘   └──────┬─────┘       │
│         ↓                ↓                ↓               │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐       │
│  │  users_db  │   │appointments│   │glucoserver │       │
│  │(PostgreSQL)│   │    _db     │   │    _db     │       │
│  └────────────┘   └────────────┘   └────────────┘       │
└───────────────────────────────────────────────────────────┘
```

### Local Development (container-managing)

```
┌─────────────────────────────────────────────────────────┐
│          DEVELOPER MACHINE (Docker Desktop)             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  container-managing/docker-compose.yml          │   │
│  │                                                  │   │
│  │  Services:                                       │   │
│  │    - glucoserver (8002)                         │   │
│  │    - login_service (8003)                       │   │
│  │    - api-gateway (8004/8000)                    │   │
│  │    - appointments (8005)                        │   │
│  │    - api-gateway-backoffice (8006)              │   │
│  │                                                  │   │
│  │  Databases:                                      │   │
│  │    - glucoserver_db                             │   │
│  │    - users_db                                    │   │
│  │    - appointments_db                            │   │
│  │                                                  │   │
│  │  Monitoring:                                     │   │
│  │    - dozzle (9999) - Web UI                     │   │
│  │    - lazydocker - Terminal TUI                  │   │
│  │                                                  │   │
│  │  Testing:                                        │   │
│  │    - tests (pytest integration tests)           │   │
│  │    - newman (Postman collection runner)         │   │
│  │    - *-unit-tests (per-service tests)           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Commands:                                              │
│    make up       - Start all services                   │
│    make test     - Run integration tests                │
│    make postman  - Run Postman tests                    │
│    make unit     - Run unit tests                       │
│    make logs     - Start Dozzle web UI                  │
│    make tui      - Start LazyDocker TUI                 │
└─────────────────────────────────────────────────────────┘
```

---

## Shared Components

### Authentication System (JWT)

**Shared Implementation Across Services:**

```python
# Common JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY")  # Same across all services
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Libraries (consistent across services)
from jose import jwt, JWTError
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token generation (login service)
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Token validation (gateways)
def verify_token(token: str):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload.get("sub")  # username
```

**Mobile App Integration:**

```typescript
// UnifiedAuthService (Angular)
export class UnifiedAuthService {
  private tokenKey = 'auth_token';

  async login(email: string, password: string) {
    const response = await this.http.post('/login', {
      email,
      password
    }).toPromise();

    localStorage.setItem(this.tokenKey, response.access_token);
    return response;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}

// AuthInterceptor (Angular)
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.authService.getToken();
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    return next.handle(req);
  }
}
```

### Database Schemas (Shared Data Models)

**users_db (login service):**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  dni INTEGER UNIQUE NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  hashed_password VARCHAR NOT NULL,
  name VARCHAR,
  surname VARCHAR,
  age INTEGER,
  gender VARCHAR,
  account_pending BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admins (
  admin_id SERIAL PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  hashed_password VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**appointments_db (appointments service):**
```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  date TIMESTAMP,
  status VARCHAR NOT NULL,  -- pending, accepted, rejected, completed
  clinical_form JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_status ON appointments(status);
```

**glucoserver_db (glucoserver service):**
```sql
CREATE TABLE glucose_readings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  value FLOAT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  unit VARCHAR DEFAULT 'mg/dL',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_glucose_user_id ON glucose_readings(user_id);
CREATE INDEX idx_glucose_timestamp ON glucose_readings(timestamp);
```

### Environment Variables

**Shared Across Services:**

```bash
# JWT signing (CRITICAL - must be same across all services)
SECRET_KEY=your-secret-key-here

# Email notifications (login service)
NOREPLY_ACCOUNT=noreply@example.com
NOREPLY_PASSWORD=your-email-password

# Backoffice URL (for email links)
BACKOFFICE_FRONT_URL=https://backoffice.example.com

# Database connections (per service)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**Mobile Gateway (api-gateway):**
```bash
USERS_BASE_URL=http://login_service:8000
APPOINTMENTS_BASE_URL=http://appointments:8000
GLUCOSERVER_BASE_URL=http://glucoserver:8000
SECRET_KEY=${SECRET_KEY}
```

**Admin Gateway (api-gateway-backoffice):**
```bash
USERS_BASE_URL=http://login_service:8000
APPOINTMENTS_BASE_URL=http://appointments:8000
GLUCOSERVER_BASE_URL=http://glucoserver:8000
SECRET_KEY=${SECRET_KEY}
```

---

## Authentication Flows

### Mobile User Login

```
User enters email/password
    ↓
Mobile App (UnifiedAuthService)
    ↓ POST /login
api-gateway
    ↓ POST /login (proxied)
login service
    ↓ Query users table
users_db
    ↓ Return user data
login service
    ↓ Generate JWT token
    ↓ Return { access_token, user_id, email, ... }
api-gateway
    ↓ Return to mobile
Mobile App
    ↓ Store token in localStorage
    ↓ Navigate to dashboard
```

**Token Structure:**
```json
{
  "sub": "user@example.com",
  "exp": 1699999999,
  "iat": 1699996399
}
```

**Token Usage:**
```
Mobile request with token
    ↓ Authorization: Bearer <token>
api-gateway
    ↓ Validate JWT signature with SECRET_KEY
    ↓ Check expiration
    ↓ Extract username from "sub"
    ↓ Forward request to backend service
backend service
    ↓ Process request
    ↓ Return response
```

### Admin Login (Backoffice)

```
Admin enters email/password
    ↓
React Admin App (authProvider)
    ↓ POST /token (OAuth2 form)
api-gateway-backoffice
    ↓ POST /admin/grantaccess
login service
    ↓ Query admins table (NOT users table)
users_db
    ↓ Return admin data
login service
    ↓ Generate JWT token
    ↓ Return { access_token }
api-gateway-backoffice
    ↓ Return to React Admin
React Admin App
    ↓ Store token in localStorage
    ↓ Navigate to dashboard
```

### Password Recovery (Mobile)

```
User requests password reset
    ↓
Mobile App
    ↓ POST /recover { email }
api-gateway
    ↓ POST /recover (proxied)
login service
    ↓ Generate 5-minute recovery token
    ↓ Send email with token link
    ↓ Return success
api-gateway
    ↓ Return to mobile
Mobile App
    ↓ Show "Check your email" message

User clicks email link
    ↓ Open mobile app with token
Mobile App
    ↓ Navigate to reset password page
    ↓ User enters new password
    ↓ POST /reset-password { token, new_password }
api-gateway
    ↓ POST /reset-password (proxied)
login service
    ↓ Validate token
    ↓ Hash new password
    ↓ Update users table
    ↓ Return success
```

---

## Deployment Strategy

### Production Deployment

**Heroku Apps:**

| Service | Heroku App | URL | Dyno Type |
|---------|-----------|-----|-----------|
| api-gateway | dt-api-gateway-2eeb55a0ea38 | dt-api-gateway-2eeb55a0ea38.herokuapp.com | web |
| api-gateway-backoffice | dt-api-gateway-backoffice-3dead350d8fa | dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com | web |
| login | (name?) | (internal) | web |
| appointments | (name?) | (internal) | web |
| glucoserver | (name?) | (internal) | web |
| backoffice-web | (name?) | (public URL) | web |

**Heroku Configuration:**

```bash
# api-gateway Procfile
web: uvicorn app.main:app --host=0.0.0.0 --port=${PORT}

# backoffice-web package.json
{
  "scripts": {
    "start": "serve -s dist",
    "heroku-postbuild": "npm run build"
  }
}

# backoffice-web static.json
{
  "root": "dist",
  "clean_urls": true,
  "routes": {
    "/**": "index.html"
  }
}
```

**Environment Variables (Heroku Config Vars):**

```bash
# api-gateway
heroku config:set \
  SECRET_KEY=*** \
  USERS_BASE_URL=https://login-service.herokuapp.com \
  APPOINTMENTS_BASE_URL=https://appointments-service.herokuapp.com \
  GLUCOSERVER_BASE_URL=https://glucoserver.herokuapp.com

# login service
heroku config:set \
  DATABASE_URL=postgres://*** \
  SECRET_KEY=*** \
  NOREPLY_ACCOUNT=noreply@example.com \
  NOREPLY_PASSWORD=*** \
  BACKOFFICE_FRONT_URL=https://backoffice.herokuapp.com

# backoffice-web
heroku config:set \
  VITE_API_BASE_URL=https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com
```

### Mobile App Deployment

**Development:**
```typescript
// environment.ts
export const environment = {
  production: false,
  apiGateway: 'http://localhost:8004',
  tidepool: {
    apiUrl: 'https://api.tidepool.org',
    clientId: 'dev-client-id',
    redirectUri: 'http://localhost:4200/callback'
  }
};
```

**Production:**
```typescript
// environment.prod.ts
export const environment = {
  production: true,
  apiGateway: 'https://dt-api-gateway-2eeb55a0ea38.herokuapp.com',
  tidepool: {
    apiUrl: 'https://api.tidepool.org',
    clientId: 'prod-client-id',
    redirectUri: 'https://diabetactic.app/callback'
  }
};
```

**Build Commands:**
```bash
# Web build
npm run build

# Android build
npm run cap:sync
npm run cap:android
# Build in Android Studio

# iOS build
npm run cap:sync
npm run cap:ios
# Build in Xcode
```

---

## Development Workflow

### Local Setup

**1. Clone Repositories:**
```bash
# Clone main repo with submodules
git clone --recurse-submodules <repo-url>
cd diabetactic

# Or initialize submodules separately
git submodule init
git submodule update
```

**2. Start Backend Services:**
```bash
cd extServices/container-managing

# Create .env file
cp .env.example .env
# Edit .env with your values

# Start all services
make up

# Or build and start
make build
```

**3. Verify Services:**
```bash
# Check health endpoints
curl http://localhost:8002/health  # glucoserver
curl http://localhost:8003/health  # login (if available)
curl http://localhost:8004/health  # api-gateway
curl http://localhost:8005/health  # appointments
curl http://localhost:8006/health  # api-gateway-backoffice

# View logs in browser
open http://localhost:9999  # Dozzle

# Or use terminal TUI
make tui  # LazyDocker
```

**4. Run Tests:**
```bash
# Integration tests
make test

# Postman tests
make postman

# Unit tests (all services)
make unit

# Specific service tests
docker compose run --rm glucoserver-unit-tests
```

**5. Start Mobile App:**
```bash
cd ../..  # Back to diabetactic root

# Install dependencies
npm install

# Start dev server
npm start

# Open in browser
open http://localhost:4200
```

### Development Loop

**Mobile App Development:**
```bash
# Watch mode (auto-reload)
npm start

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Lint and format
npm run lint:fix
npm run format
```

**Backend Service Development:**
```bash
cd extServices/container-managing

# Restart specific service after code changes
docker compose restart api-gateway

# View logs for specific service
docker compose logs -f api-gateway

# Run migrations
make migrate

# Generate new migrations
make createmigrations
```

### Testing Strategy

**Unit Tests (Mobile):**
- Jasmine/Karma
- Component tests
- Service tests
- Guard tests
- Location: `src/app/**/*.spec.ts`

**Integration Tests (Backend):**
- pytest
- API endpoint tests
- Service interaction tests
- Location: `extServices/container-managing/tests/tests/`

**E2E Tests (Mobile):**
- Playwright
- Full user flows
- Cross-browser testing
- Location: `playwright/tests/`

**Postman Tests (Backend):**
- Newman runner
- API contract tests
- Collection: `extServices/container-managing/tests/postman/`

---

## Integration Points

### Mobile ↔ api-gateway

**Services Used:**

1. **ApiGatewayService** (`src/app/core/services/api-gateway.service.ts`)
```typescript
@Injectable({ providedIn: 'root' })
export class ApiGatewayService {
  private apiUrl = environment.apiGateway;

  constructor(private http: HttpClient) {}

  // Authentication
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      email,
      password
    });
  }

  // User profile
  getCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/users/me`);
  }

  // Appointments
  getMyAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/appointments/me`);
  }

  enqueueAppointment(): Observable<QueueResponse> {
    return this.http.post<QueueResponse>(`${this.apiUrl}/appointments/enqueue`, {});
  }

  // Glucose (if not using Tidepool)
  getGlucoseReadings(userId: number): Observable<GlucoseReading[]> {
    return this.http.get<GlucoseReading[]>(
      `${this.apiUrl}/glucose/readings/${userId}`
    );
  }
}
```

2. **AuthInterceptor** (`src/app/core/interceptors/auth.interceptor.ts`)
```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: UnifiedAuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token && !req.url.includes('/login')) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req).pipe(
      catchError(error => {
        if (error.status === 401) {
          this.authService.logout();
          // Redirect to login
        }
        return throwError(() => error);
      })
    );
  }
}
```

### Mobile ↔ Tidepool API

**Primary Data Source for Glucose Readings:**

```typescript
// TidepoolAuthService
@Injectable({ providedIn: 'root' })
export class TidepoolAuthService {
  private apiUrl = environment.tidepool.apiUrl;
  private clientId = environment.tidepool.clientId;
  private redirectUri = environment.tidepool.redirectUri;

  // OAuth2 PKCE flow
  async login(): Promise<void> {
    const { codeVerifier, codeChallenge } = generatePKCE();
    localStorage.setItem('pkce_verifier', codeVerifier);

    const authUrl = `${this.apiUrl}/oauth2/authorize?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${this.redirectUri}&` +
      `response_type=code&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;

    window.location.href = authUrl;
  }

  // Exchange code for token
  async handleCallback(code: string): Promise<void> {
    const codeVerifier = localStorage.getItem('pkce_verifier');

    const response = await this.http.post(`${this.apiUrl}/oauth2/token`, {
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier
    }).toPromise();

    localStorage.setItem('tidepool_token', response.access_token);
  }
}

// TidepoolSyncService
@Injectable({ providedIn: 'root' })
export class TidepoolSyncService {
  // Fetch glucose readings
  getReadings(userId: string, startDate: Date, endDate: Date): Observable<Reading[]> {
    return this.http.get<Reading[]>(
      `${this.apiUrl}/data/${userId}`,
      {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: 'cbg,smbg'  // Continuous and self-monitoring BG
        },
        headers: {
          Authorization: `Bearer ${this.tidepoolAuth.getToken()}`
        }
      }
    );
  }
}
```

### Backoffice ↔ api-gateway-backoffice

**React Admin Data Providers:**

```typescript
// appointmentsDataProvider.tsx
export const appointmentsDataProvider = {
  getList: async (resource, params) => {
    const url = `${API_CONFIG.BASE_URL}/appointments/${resource.split('/')[1]}`;
    const response = await httpClient(url, {
      method: 'GET',
      includeToken: true
    });
    return {
      data: await response.json,
      total: response.json.length
    };
  },

  update: async (resource, params) => {
    const url = `${API_CONFIG.BASE_URL}/appointments/${params.action}/${params.id}`;
    const response = await httpClient(url, {
      method: 'PUT',
      includeToken: true
    });
    return { data: await response.json };
  }
};

// usersDataProvider.tsx
export const usersDataProvider = {
  getList: async () => {
    const response = await httpClient(`${API_CONFIG.BASE_URL}/users/`, {
      method: 'GET',
      includeToken: true
    });
    return {
      data: await response.json,
      total: response.json.length
    };
  },

  getOne: async (resource, params) => {
    const response = await httpClient(
      `${API_CONFIG.BASE_URL}/users/user/${params.id}`,
      {
        method: 'GET',
        includeToken: true
      }
    );
    return { data: await response.json };
  }
};
```

---

## Recommendations

### For Mobile Development Team

#### 1. Focus Areas

✅ **Priority: api-gateway integration**
- Implement all mobile endpoints
- Test authentication flow
- Handle token expiration
- Implement retry logic

✅ **Priority: Tidepool integration**
- OAuth2 PKCE flow
- Data sync service
- Offline caching
- Error handling

✅ **Secondary: appointments service**
- Queue management
- Real-time updates (consider WebSockets)
- Push notifications

⚠️ **Lower Priority: glucoserver**
- Currently using Tidepool as primary source
- glucoserver for manual entry (future feature)
- Can be implemented later

❌ **Ignore:**
- api-gateway-backoffice (admin only)
- backoffice-web (admin only)
- container-managing (dev environment only)

#### 2. Development Setup

**Recommended Workflow:**

```bash
# Terminal 1: Backend services
cd extServices/container-managing
make up

# Terminal 2: Mobile app
cd ../../
npm start

# Terminal 3: Tests
npm run test

# Terminal 4: Monitoring
cd extServices/container-managing
make tui
```

#### 3. Testing Strategy

**Unit Tests:**
- All services (`src/app/**/*.service.ts`)
- All components (`src/app/**/*.component.ts`)
- All guards (`src/app/core/guards/*.guard.ts`)
- Target: 80% coverage

**Integration Tests:**
- Backend API contract tests (pytest)
- Mobile E2E flows (Playwright)
- Test against local backend (container-managing)

**E2E Tests:**
- Login flow
- Appointment booking flow
- Glucose readings display
- Profile management

#### 4. Error Handling

**API Gateway Errors:**
```typescript
export class ErrorHandlerService {
  handle(error: HttpErrorResponse): void {
    if (error.status === 401) {
      // Token expired - redirect to login
      this.authService.logout();
      this.router.navigate(['/login']);
    } else if (error.status === 503) {
      // Service unavailable - retry
      this.showRetryDialog();
    } else if (error.status >= 500) {
      // Server error - log and show message
      this.logger.error('Server error', error);
      this.showErrorToast('Server error. Please try again.');
    } else {
      // Client error - show specific message
      this.showErrorToast(error.error.detail || 'Request failed');
    }
  }
}
```

### For Backend Development Team

#### 1. API Stability

**Breaking Changes:**
- ⚠️ Version API endpoints (`/v1/login`, `/v2/login`)
- ⚠️ Deprecation warnings in headers
- ⚠️ Maintain backward compatibility for 2 versions

**Non-Breaking Changes:**
- ✅ Add optional fields
- ✅ Add new endpoints
- ✅ Extend enums with new values

#### 2. Documentation

**Required:**
- OpenAPI/Swagger specs for all endpoints
- Example requests/responses
- Error codes and meanings
- Authentication requirements

**Location:**
- `extServices/container-managing/docs/openapi/`
- Auto-generate from FastAPI docstrings

#### 3. Monitoring

**Health Checks:**
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "api-gateway",
        "version": "1.0.0",
        "dependencies": {
            "login": await check_login_health(),
            "appointments": await check_appointments_health(),
            "glucoserver": await check_glucoserver_health()
        }
    }
```

**Logging:**
- Structure logs (JSON format)
- Include request IDs
- Log authentication attempts
- Log slow queries (>1s)

#### 4. Database Migrations

**Best Practices:**
```bash
# Generate migration
docker compose run login_service alembic revision --autogenerate -m "Add user preferences"

# Review migration SQL
docker compose run login_service alembic show <revision>

# Apply migration
make migrate

# Rollback if needed
make downgrade
```

### For DevOps/Infrastructure Team

#### 1. Heroku Deployment

**Recommended Add-ons:**
- Heroku Postgres (all database services)
- Papertrail (centralized logging)
- New Relic / Datadog (APM)
- Redis Cloud (caching, future)

**Deployment Pipeline:**
```bash
# Automated deployment on git push
git push heroku master

# Manual deployment
heroku container:push web --app api-gateway
heroku container:release web --app api-gateway
```

#### 2. Environment Management

**Config Vars Management:**
```bash
# Export production config
heroku config --app api-gateway > api-gateway.env

# Sync config across environments
heroku config:set --app api-gateway-staging $(cat api-gateway.env)
```

#### 3. Monitoring & Alerts

**Set up alerts for:**
- API response time > 2s (p95)
- Error rate > 5%
- Database connection pool exhaustion
- Memory usage > 80%
- Disk usage > 90%

#### 4. Scaling Strategy

**Horizontal Scaling:**
```bash
# Scale web dynos
heroku ps:scale web=2 --app api-gateway

# Auto-scaling (Heroku Standard/Performance)
heroku autoscale:enable --min 1 --max 4 --p95 300 --app api-gateway
```

### For QA Team

#### 1. Test Coverage

**Mobile App:**
- [ ] Authentication flows (login, logout, password reset)
- [ ] Tidepool OAuth integration
- [ ] Appointment booking (enqueue, dequeue, status)
- [ ] Glucose readings display
- [ ] Profile management
- [ ] Offline mode
- [ ] Push notifications

**Backend API:**
- [ ] All endpoints (via Postman collection)
- [ ] Authentication (valid/invalid tokens)
- [ ] Authorization (user can only access own data)
- [ ] Error handling (400, 401, 403, 404, 500)
- [ ] Rate limiting
- [ ] Data validation

#### 2. Test Environments

**Environments:**
1. **Local** - `http://localhost:8004` (container-managing)
2. **Staging** - `https://staging-api-gateway.herokuapp.com`
3. **Production** - `https://dt-api-gateway-2eeb55a0ea38.herokuapp.com`

**Test Data:**
- Use demo accounts (not production data)
- Reset test database daily
- Seed with known test cases

#### 3. Regression Testing

**Automated:**
```bash
# Backend integration tests
cd extServices/container-managing
make test

# Mobile E2E tests
cd ../../
npm run test:e2e
```

**Manual:**
- Critical user flows (after each deployment)
- Cross-device testing (iOS, Android, Web)
- Accessibility testing (WCAG 2.1 AA)

---

## Conclusion

### Summary of Findings

**Mobile App Dependencies:**
- ✅ api-gateway (CRITICAL)
- ✅ login service (REQUIRED)
- ✅ appointments service (REQUIRED)
- ⚠️ glucoserver (PARTIAL - future manual entry)
- ✅ Tidepool API (EXTERNAL - primary glucose source)

**Admin/Internal Only:**
- ❌ api-gateway-backoffice
- ❌ backoffice-web
- ❌ container-managing (dev only)

### Architecture Benefits

**Separation of Concerns:**
- Mobile and admin use different gateways
- Prevents admin features from bloating mobile API
- Independent scaling and deployment

**Microservices:**
- Independent services with clear boundaries
- Easier to maintain and update
- Can scale services independently

**Shared Services:**
- Single source of truth for users, appointments, glucose
- Consistent data across mobile and admin
- Reduced duplication

### Next Steps

1. **Mobile Team:**
   - Complete api-gateway integration
   - Implement Tidepool OAuth flow
   - Add offline mode
   - Write E2E tests

2. **Backend Team:**
   - Document API endpoints (OpenAPI)
   - Add health checks and monitoring
   - Implement rate limiting
   - Set up CI/CD pipeline

3. **DevOps Team:**
   - Set up Heroku pipelines (dev → staging → prod)
   - Configure monitoring and alerts
   - Implement auto-scaling
   - Set up backup and disaster recovery

4. **QA Team:**
   - Expand test coverage
   - Automate regression tests
   - Set up test data management
   - Document test cases

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Complete
