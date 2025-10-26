# Diabetify Backend Services - Complete Architecture Analysis

This document contains the comprehensive analysis of all Diabetify backend microservices and the backoffice web application.

## Table of Contents

1. [Login Service (Authentication)](#login-service)
2. [Appointments Service](#appointments-service)
3. [Glucoserver Service](#glucoserver-service)
4. [Backoffice Web Application](#backoffice-web)
5. [Architecture Summary](#architecture-summary)

---

# Login Service

## Overview

FastAPI-based authentication microservice handling both patient and admin authentication.

**Technology**: FastAPI, SQLAlchemy 1.3.24, PostgreSQL, SHA-256 password hashing
**Database**: PostgreSQL (Heroku)
**Deployment**: Heroku with Alembic migrations

## ⚠️ Critical Security Issues

### HIGH SEVERITY: Insecure Password Hashing

- **Current**: SHA-256 without salt
- **Risk**: Vulnerable to rainbow table attacks and brute-force
- **Recommendation**: Migrate to bcrypt or Argon2id immediately

**Migration Strategy**:

```python
# Add password_bcrypt column
# During login: verify SHA-256, then generate bcrypt hash
# After migration period: drop old password column
```

### Missing JWT Token System

- Service only validates credentials, doesn't generate tokens
- Gateways handle JWT generation externally
- No refresh token mechanism
- No token revocation

## API Endpoints

### User Authentication

- **POST /users/grantaccess** - Patient login (DNI-based)
- **POST /users/** - User registration
- **GET /users/** - List all users (no pagination)
- **GET /users/from_dni/{dni}** - Get user by DNI
- **GET /users/{user_id}** - Get user by ID
- **GET /users/force/{user_id}** - Get blocked user (admin)
- **POST /users/block/{user_id}** - Toggle block status

### Admin Authentication

- **POST /admin/grantaccess** - Admin login (username-based)
- **POST /admin/** - Admin registration
- **POST /admin/password/check** - Verify password
- **PUT /admin/password/change** - Change password
- **PUT /admin/mail/change** - Update email
- **POST /admin/password/recover** - Password recovery via email
- **GET /admin/from_username/{username}** - Get admin by username
- **GET /admin/{admin_id}** - Get admin by ID

## Database Models

### User Table

```sql
- user_id (PK, auto-increment)
- dni (unique) - National ID
- password (SHA-256 hash)
- name, surname
- blocked (boolean)
- email (unique)
- tidepool (optional)
- hospital_account (unique)
- times_measured, streak, max_streak (gamification)
```

### Admin Table

```sql
- admin_id (PK, auto-increment)
- username (unique)
- password (SHA-256 hash)
- email (unique)
```

## Security Gaps

1. ❌ SHA-256 password hashing (insecure)
2. ❌ No JWT token generation
3. ❌ No rate limiting
4. ❌ CORS wildcard (`origins=["*"]`)
5. ❌ No password requirements
6. ❌ Debug print statements in production code
7. ❌ Password in query params (`/admin/password/change?new_password=...`)

## Recommendations

1. **Immediate**: Replace SHA-256 with bcrypt
2. **Immediate**: Implement OAuth2 + JWT token generation
3. **High**: Add rate limiting on `/grantaccess` endpoints
4. **High**: Restrict CORS origins
5. **Medium**: Add password complexity requirements
6. **Medium**: Implement refresh token system
7. **Low**: Remove debug prints and improve error messages

---

# Appointments Service

## Overview

FastAPI microservice managing appointment requests between patients and healthcare professionals using a queue-based system.

**Technology**: FastAPI 0.63.0, SQLAlchemy 1.3.24, PostgreSQL
**Architecture**: Queue-based appointment management with lifecycle states

## Appointment Lifecycle

```
PATIENT: Submit → PENDING → (Doctor accepts) → ACCEPTED
                            ↓ (Doctor denies)  ↓ DENIED
                    (Patient creates details) ↓
                                    CREATED → (Doctor creates resolution)
```

## API Endpoints

### Appointment Management

- **GET /appointments** - Get all appointments
- **GET /appointments/from_user/{user_id}** - User's appointments
- **GET /appointments/{appointment_id}** - Single appointment
- **POST /appointments/create** - Create appointment (requires ACCEPTED status)
- **GET /appointments/{id}/resolution** - Get doctor's resolution
- **POST /appointments/create_resolution** - Doctor creates resolution

### Queue Management

- **GET /queue** - All queue entries
- **GET /queue/pending** - Pending appointments
- **GET /queue/accepted** - Accepted appointments
- **GET /queue/created** - Created appointments
- **GET /queue/state/{user_id}** - User's appointment state
- **GET /queue/placement/{user_id}** - User's position in line
- **POST /queue/submit?user_id={id}** - Submit appointment request
- **GET /queue/size** - Get max queue capacity
- **POST /queue/size?new_size={x}** - Update queue capacity
- **PUT /queue/accept/{queue_placement}** - Accept appointment
- **PUT /queue/deny/{queue_placement}** - Deny appointment
- **DELETE /queue** - Clear entire queue (⚠️ destructive)

## Database Models

### Appointments Table

```sql
- appointment_id (PK)
- user_id
- glucose_objective (float)
- insulin_type, dose
- fast_insulin, fixed_dose
- ratio, sensitivity
- pump_type (optional)
- another_treatment (optional)
- control_data (PDF link)
- motive (ENUM array)
- other_motive
```

### Appointment Resolution Table

```sql
- appointment_id (PK/FK)
- change_basal_type, change_basal_dose, change_basal_time
- change_fast_type, change_ratio, change_sensitivity
- emergency_care (boolean)
- needed_physical_appointment (boolean)
```

### Appointment Queue Table

```sql
- queue_placement (PK) - Auto-incrementing position
- user_id (UNIQUE) - One appointment per user
- appointment_state (ENUM: PENDING/ACCEPTED/DENIED/CREATED)
```

## 🐛 Critical Bugs

### Queue Capacity Bug

**Issue**: Compares absolute `queue_placement` (ever-increasing) vs `queue_size` (fixed capacity)

- Once placement numbers exceed size, queue becomes permanently full
- **Fix**: Count active entries instead of comparing placement number

### Missing Relationships

- ❌ No FK from appointments to users table
- ❌ No FK from AppointmentQueue to appointments
- ❌ No timestamps (created_at, updated_at)

## Security Issues

1. ❌ No authentication/authorization checks
2. ❌ Anyone can accept/deny appointments
3. ❌ No role-based access control (RBAC)
4. ❌ No rate limiting
5. ❌ CORS wildcard (`origins=["*"]`)
6. ❌ No input sanitization

## Recommendations

1. **Critical**: Fix queue capacity bug
2. **Critical**: Add authentication middleware
3. **High**: Add timestamps to all tables
4. **High**: Implement RBAC (doctor/patient/admin roles)
5. **High**: Add foreign key relationships
6. **Medium**: Implement event system for notifications
7. **Medium**: Add appointment status tracking
8. **Low**: Add priority queue system

---

# Glucoserver Service

## Overview

FastAPI microservice for managing glucose readings with simple CRUD operations.

**Technology**: FastAPI 0.63.0, SQLAlchemy 1.3.24, PostgreSQL
**Architecture**: Simple data storage with no analytics

## API Endpoints

### Glucose Reading Management

- **POST /readings/** - Create glucose reading
- **GET /readings/** - Get all readings (⚠️ NO PAGINATION)
- **GET /readings/user?user_id={id}** - User's readings (⚠️ NO PAGINATION)
- **GET /readings/user/latest?user_id={id}** - Last 15 days
- **DELETE /readings/{reading_id}** - Delete reading

## Database Model

```sql
CREATE TABLE glucose_readings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,  -- ❌ No FK to users
    glucose_level DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    reading_type reading_type_enum NOT NULL
);
```

### Reading Type ENUM

```
DESAYUNO, ALMUERZO, MERIENDA, CENA, EJERCICIO, OTRAS_COMIDAS, OTRO
```

## 🚨 Critical Issues

### NO PAGINATION

- `GET /readings/` loads **entire table** into memory
- `GET /readings/user?user_id={id}` loads **all user readings**
- **Risk**: Out of memory errors with thousands of readings

### Missing Database Indexes

```sql
-- CRITICAL: Add these indexes immediately
CREATE INDEX idx_glucose_readings_user_id ON glucose_readings(user_id);
CREATE INDEX idx_glucose_readings_created_at ON glucose_readings(created_at DESC);
CREATE INDEX idx_glucose_readings_user_created ON glucose_readings(user_id, created_at DESC);
```

### Missing BLE Metadata

- ❌ No sequence_number (for duplicate detection)
- ❌ No device_id (which BLE device)
- ❌ No sample_type (capillary, venous, etc.)
- ❌ No sample_location (finger, earlobe, etc.)
- ❌ No unit field (assumes mg/dL everywhere)
- ❌ No sync_source (manual vs BLE)

## Missing Features

1. ❌ No pagination on any endpoint
2. ❌ No date range filtering
3. ❌ No statistics endpoints (avg, min, max, trends)
4. ❌ No time-in-range calculations
5. ❌ No export functionality (CSV, PDF)
6. ❌ No bulk import endpoint
7. ❌ No idempotent sync (duplicates possible)
8. ❌ No real-time updates (WebSocket/SSE)
9. ❌ No caching layer
10. ❌ No data retention policy

## Recommendations

### Immediate (Critical)

```python
# 1. Add Pagination
@router.get("/user")
async def get_readings(
    user_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit
    readings = db.query(GlucoseReading)\
        .filter(GlucoseReading.user_id == user_id)\
        .order_by(GlucoseReading.created_at.desc())\
        .offset(offset)\
        .limit(limit)\
        .all()
    return {"readings": readings, "page": page}
```

```sql
-- 2. Add Database Indexes
CREATE INDEX idx_glucose_readings_user_id ON glucose_readings(user_id);
CREATE INDEX idx_glucose_readings_created_at ON glucose_readings(created_at DESC);
```

```python
# 3. Implement Idempotent BLE Sync
@router.post("/readings/sync")
async def sync_reading(
    payload: GlucoseReadingPost,
    device_id: str = Header(...),
    sequence_number: int = Header(...),
    db: Session = Depends(get_db)
):
    # Check for duplicate
    existing = db.query(GlucoseReading).filter(
        GlucoseReading.user_id == payload.user_id,
        GlucoseReading.device_id == device_id,
        GlucoseReading.sequence_number == sequence_number
    ).first()

    if existing:
        return GlucoseReadingSerializer.serialize(existing)

    # Create new reading
    # ...
```

### High Priority

1. Add statistics endpoints
2. Implement date range filtering
3. Add bulk import endpoint
4. Migrate to async SQLAlchemy 2.0
5. Add Redis caching for frequent queries

### Medium Priority

1. Add WebSocket for real-time updates
2. Implement time-in-range calculations
3. Add export functionality (CSV, PDF)
4. Add data retention policy
5. Add HbA1c estimation

---

# Backoffice Web Application

## Overview

**React 18** (NOT Vue.js) + TypeScript admin dashboard for healthcare professionals.

**Technology Stack**:

- React 18.3.0 + TypeScript 5.1.6
- Vite 5.3.5 (build tool)
- React Admin 5.5.3 (admin framework)
- Material-UI v6.4.4
- React Query (TanStack Query)
- Heroku deployment

## Application Structure

```
src/
├── config/api.ts              # API endpoint configuration
├── components/                # Shared UI components
│   ├── CustomLogin.tsx       # Login page with gradient design
│   ├── CustomAppBar.tsx      # Top navigation
│   ├── CustomTheme.tsx       # Light/dark theme
│   └── AdminRegisterModal.tsx # Admin registration
├── users/                     # Patient management
│   ├── usersDataProvider.tsx
│   ├── usersList.tsx
│   └── MeasurementsModal.tsx # View glucose readings
├── appointments/              # Appointment queue management
│   ├── pendingAppointmentsList.tsx
│   ├── acceptedAppointmentsList.tsx
│   └── createdAppointmentsList.tsx
├── glucose/                   # Glucose reading management
│   ├── glucoseDataProvider.tsx
│   ├── readingCreate.tsx
│   └── readings.tsx
├── admins/                    # Admin management
│   └── adminsDataProvider.tsx
├── authProvider.tsx           # JWT authentication
└── App.tsx                    # Root component
```

## Features

### 1. Authentication System

- JWT-based with 30-minute expiration
- Token stored in localStorage
- Automatic session verification every 30 seconds
- Admin registration modal on login page

### 2. Dashboard

- Welcome card with gradient background
- Daily appointment summary
- List of today's created appointments
- Dark mode support

### 3. Patient Management (`/pacientes`)

- DataGrid with export to CSV
- Columns: ID, DNI, Full Name, Status
- Per-patient actions:
  - **Measurements Modal**: View glucose readings grouped by date
    - Color coding: Red (<70), Yellow (>180), Green (70-180)
    - Reading type badges with emojis
    - Delete measurements capability
  - **Clinical History Modal**: View medical history (currently mock data)

### 4. Appointment Queue Management

- **Pending** (`/consultas/pendientes`): Accept/decline requests
- **Accepted** (`/consultas/aceptadas`): Approved appointments
- **Created**: Daily created appointments on dashboard
- Queue management: Modify daily size, empty queue
- Real-time queue size display

### 5. Glucose Management (`/mediciones`)

- Create readings for patients
- Reading types: DESAYUNO, ALMUERZO, MERIENDA, CENA, EJERCICIO, etc.
- Form validation (glucose >= 0)
- Redirect after creation

### 6. Admin Management

- Registration modal with validation
- Error handling for duplicate username/email
- Success notifications

## API Integration

### Centralized Configuration

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com',
  ENDPOINTS: {
    TOKEN: '/token',
    USERS: '/users',
    APPOINTMENTS: '/appointments',
    GLUCOSE: '/glucose',
    ADMIN: '/admin',
  },
};
```

### HTTP Client Pattern

```typescript
export const httpClient = (url: string, options: HttpClientOptions = {}) => {
  const token = localStorage.getItem('token');
  if (token && options.includeToken !== false) {
    options.headers.set('Authorization', `Bearer ${token}`);
  }
  return fetchUtils.fetchJson(url, options);
};
```

## Data Provider Pattern

React Admin's declarative data management:

- `getList()` - Fetch list of resources
- `create()` - Create new resource
- `update()` - Update existing resource
- `delete()` - Delete resource
- Custom methods per resource

## State Management

1. **React Query** (via React Admin) - API caching and refetching
2. **Local State** (useState) - Form inputs, modals, loading states
3. **localStorage** - Session persistence (token, tokenExpiration)

## UI/UX Patterns

### Theme System

- Light/Dark mode toggle
- Custom gradients:
  - Light: `linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)`
  - Dark: `linear-gradient(135deg, #1a237e 0%, #3949ab 100%)`

### Color Coding

**Glucose Levels**:

- Red (< 70 mg/dL) - Hypoglycemia
- Yellow (> 180 mg/dL) - Hyperglycemia
- Green (70-180 mg/dL) - Normal

**Reading Types**:

- Blue: DESAYUNO
- Purple: ALMUERZO
- Light Blue: MERIENDA
- Orange: CENA
- Green: EJERCICIO

### Responsive Design

- MUI Grid system
- Breakpoints: xs, sm, md, lg
- Measurements modal adapts:
  - Mobile: 1 card/row
  - Tablet: 2 cards/row
  - Desktop: 4 cards/row
  - Large: 5 cards/row

## Security Considerations

### Issues

1. ❌ Token in localStorage (vulnerable to XSS)
2. ❌ No CSRF protection
3. ❌ Many `any` types (weak type safety)
4. ❌ Sequential user fetching (N+1 problem)
5. ❌ Hardcoded API URL (should use env vars)

### Recommendations

1. Use HttpOnly cookies for token storage
2. Implement CSRF tokens
3. Replace `any` with proper TypeScript interfaces
4. Use `Promise.all()` for parallel fetching
5. Move API URL to environment variables

## Deployment

### Build Configuration (Vite)

```typescript
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  base: './',
  build: { sourcemap: true },
});
```

### Heroku Configuration

**Procfile**: `web: npm run start`
**static.json**: SPA routing with fallback to `index.html`
**Build**: `npm run build` (Vite) → `npm run start` (serve)

## Mobile-Web Integration Opportunities

1. **Shared Types**: Extract common interfaces into package
2. **API Standardization**: Align date formats, ENUM values
3. **Real-Time Sync**: Add WebSocket for live updates
4. **Component Patterns**: Share logic (glucose color coding, reading badges)
5. **Data Visualization**: Add charting library (works on both platforms)
6. **PWA**: Convert to Progressive Web App for offline access

## Areas for Improvement

### Critical

1. Replace `any` types with proper interfaces
2. Use environment variables for API URL
3. Integrate real clinical history data (remove mock)
4. Implement proper error tracking (Sentry)

### High Priority

1. Add unit tests (none exist)
2. Implement code splitting with React.lazy()
3. Add analytics (Google Analytics, Mixpanel)
4. Improve session management (check on every API call)

### Medium Priority

1. Add charting library (Recharts, ApexCharts)
2. Implement PWA capabilities
3. Add Storybook for component documentation
4. Optimize image loading (use SVG for logo)

---

# Architecture Summary

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DIABETIFY ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Mobile     │────────▶│   API Gateway   │────────▶│   Login      │
│   App        │  REST   │   (Patient)     │   REST  │   Service    │
│   (Ionic)    │         │                 │         │   (Auth)     │
└──────────────┘         └─────────────────┘         └──────────────┘
                                  │                           │
                                  │                           ▼
                                  │                  ┌──────────────┐
                                  ├─────────────────▶│ Appointments │
                                  │                  │   Service    │
                                  │                  └──────────────┘
                                  │                           │
                                  │                           ▼
                                  │                  ┌──────────────┐
                                  └─────────────────▶│  Glucoserver │
                                                     │   Service    │
                                                     └──────────────┘

┌──────────────┐         ┌─────────────────┐
│  Backoffice  │────────▶│   API Gateway   │──────▶ Same services
│   Web        │  REST   │   (Backoffice)  │        (different
│   (React)    │         │                 │         permissions)
└──────────────┘         └─────────────────┘
```

## Service Dependencies

| Service                    | Technology      | Database   | Key Function                        |
| -------------------------- | --------------- | ---------- | ----------------------------------- |
| **api-gateway**            | FastAPI 0.114.0 | None       | Patient mobile API, JWT generation  |
| **api-gateway-backoffice** | FastAPI 0.114.0 | None       | Admin web API, JWT generation       |
| **login**                  | FastAPI 0.63.0  | PostgreSQL | User/admin authentication (SHA-256) |
| **appointments**           | FastAPI 0.63.0  | PostgreSQL | Queue-based appointment management  |
| **glucoserver**            | FastAPI 0.63.0  | PostgreSQL | Glucose reading storage             |
| **backoffice-web**         | React 18 + Vite | None       | Healthcare professional dashboard   |

## Critical Issues Summary

### Security (HIGH SEVERITY)

1. ⚠️ **Login service**: SHA-256 password hashing (insecure)
2. ⚠️ **All services**: CORS wildcard (`origins=["*"]`)
3. ⚠️ **All services**: No rate limiting
4. ⚠️ **All services**: No HTTPS enforcement
5. ⚠️ **Gateways**: Shared SECRET_KEY (tokens interchangeable)
6. ⚠️ **Appointments**: No authentication checks on endpoints

### Performance (HIGH SEVERITY)

1. ⚠️ **All services**: Synchronous I/O (requests library)
2. ⚠️ **Glucoserver**: No pagination (loads entire tables)
3. ⚠️ **All services**: No database indexes on user_id
4. ⚠️ **All services**: No connection pooling
5. ⚠️ **Gateways**: Double network hop (JWT decode + user lookup)

### Data Integrity (MEDIUM SEVERITY)

1. ⚠️ **Appointments**: Queue capacity bug
2. ⚠️ **All services**: Missing timestamps (created_at, updated_at)
3. ⚠️ **All services**: No foreign key relationships
4. ⚠️ **Glucoserver**: Missing BLE metadata fields
5. ⚠️ **Glucoserver**: No duplicate detection

### Missing Features (MEDIUM SEVERITY)

1. ⚠️ **All services**: No refresh token mechanism
2. ⚠️ **All services**: No event/notification system
3. ⚠️ **All services**: No health check endpoints
4. ⚠️ **All services**: No metrics export (Prometheus)
5. ⚠️ **Glucoserver**: No statistics/analytics endpoints
6. ⚠️ **All services**: No API versioning

## Immediate Action Items

### Priority 1 (Do This Week)

1. **Login**: Replace SHA-256 with bcrypt
2. **Glucoserver**: Add pagination to all list endpoints
3. **Glucoserver**: Add database indexes on user_id and created_at
4. **Appointments**: Fix queue capacity bug
5. **All services**: Restrict CORS to specific origins

### Priority 2 (Do This Month)

1. **All services**: Migrate to async SQLAlchemy 2.0
2. **All services**: Implement rate limiting
3. **All services**: Add timestamps to all tables
4. **Gateways**: Implement connection pooling with httpx
5. **Login**: Implement OAuth2 + JWT token generation
6. **Appointments**: Add authentication middleware with RBAC
7. **Glucoserver**: Implement idempotent BLE sync endpoint

### Priority 3 (Do This Quarter)

1. **All services**: Add health check and metrics endpoints
2. **All services**: Implement refresh token system
3. **All services**: Add event-driven notifications
4. **Glucoserver**: Add statistics and analytics endpoints
5. **Backoffice**: Replace `any` types with proper interfaces
6. **Backoffice**: Add comprehensive unit tests
7. **All services**: Implement API versioning

## Mobile Integration Checklist

### Authentication

- ✅ JWT-based auth pattern defined
- ⚠️ No refresh token mechanism
- ❌ No biometric authentication
- ❌ Token stored in localStorage (insecure)

### Data Synchronization

- ✅ API endpoints documented
- ⚠️ No idempotent BLE sync
- ❌ No offline queue management
- ❌ No duplicate detection

### Real-Time Features

- ❌ No WebSocket support
- ❌ No Server-Sent Events
- ❌ No push notifications
- ❌ No real-time glucose updates

### Type Safety

- ✅ Pydantic models on backend
- ⚠️ TypeScript interfaces needed for mobile
- ❌ No shared type definitions
- ❌ Date format inconsistencies

### Performance

- ⚠️ Synchronous I/O (slow)
- ⚠️ No pagination (memory issues)
- ⚠️ No caching layer
- ⚠️ No connection pooling

## Conclusion

The Diabetify backend architecture provides a solid foundation for a diabetes management platform but requires significant hardening for production use. The most critical issues are:

1. **Security**: Insecure password hashing, CORS vulnerabilities, missing RBAC
2. **Performance**: Synchronous I/O, missing pagination, no database indexes
3. **Reliability**: Missing timestamps, no event system, queue capacity bug
4. **Scalability**: No caching, no connection pooling, no horizontal scaling strategy

With the recommended improvements implemented, the system can safely handle thousands of concurrent users with sub-100ms response times and proper security measures.

**Next Steps**: Prioritize fixing the login service SHA-256 vulnerability and adding pagination to glucoserver, as these pose immediate risks to security and stability.
