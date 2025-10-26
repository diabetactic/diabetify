# Backend Team Handoff - Critical Issues & Roadmap

**Date**: 2025-10-10
**For**: Backend development team
**From**: Mobile app analysis
**Priority**: URGENT review needed before production launch

---

## Executive Summary

The mobile app team analyzed all backend microservices in `relatedServices/` and identified **critical security and performance issues** that must be addressed before production launch. This document provides a prioritized roadmap for backend improvements.

**Current Status**: ⚠️ Backend works but has critical security vulnerabilities
**Mobile App Status**: ✅ Can work around most issues, but some are blockers

---

## 🔴 URGENT - Production Blockers (Fix Before Launch)

### 1. SHA-256 Password Hashing (Login Service) - CRITICAL SECURITY

**File**: `relatedServices/login/app/services/auth_service.py`

**Current Code**:

```python
def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()
```

**Issue**: SHA-256 is too fast and vulnerable to brute-force attacks. Modern GPUs can test billions of hashes per second.

**Fix Required**:

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

**Migration Strategy**:

- All existing users must reset their passwords (can't decrypt SHA-256)
- Add `password_reset_required` flag to users table
- Force password reset on next login

**Estimated Effort**: 4-6 hours (includes migration script and testing)

---

### 2. No Pagination (Glucoserver) - CRITICAL PERFORMANCE

**File**: `relatedServices/glucoserver/app/routers/readings.py`

**Current Code**:

```python
@router.get("/readings/")
def get_all_readings(db: Session = Depends(get_db)):
    return db.query(GlucoseReading).all()  # Returns ALL records!
```

**Issue**: As patients use the app, this endpoint will return thousands of readings (MBs of data). Mobile app downloads entire database on every sync.

**Fix Required**:

```python
from typing import Optional
from datetime import datetime

@router.get("/readings/")
def get_readings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    since: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(GlucoseReading).filter_by(user_id=current_user.id)

    if since:
        query = query.filter(GlucoseReading.timestamp > since)

    total = query.count()
    readings = query.order_by(GlucoseReading.timestamp.desc()).offset(skip).limit(limit).all()

    return {
        "items": readings,
        "total": total,
        "page": skip // limit + 1,
        "page_size": limit
    }
```

**Mobile Impact**: Must update API integration to use pagination params

**Estimated Effort**: 2-3 hours

---

### 3. Missing Authentication (Appointments & Glucoserver) - SECURITY

**Files**:

- `relatedServices/appointments/app/routers/appointments.py`
- `relatedServices/glucoserver/app/routers/readings.py`

**Issue**: These services don't validate JWT tokens. Anyone can create/read/delete appointments and glucose readings.

**Fix Required**:

```python
from fastapi import Depends
from app.dependencies import get_current_user

@router.get("/readings/")
def get_readings(
    current_user: User = Depends(get_current_user),  # Add this
    db: Session = Depends(get_db)
):
    # Filter by user_id
    return db.query(GlucoseReading).filter_by(user_id=current_user.id).all()
```

**Additional Work**:

- Add `get_current_user` dependency to both services
- Add `user_id` foreign key to `glucose_readings` and `appointments` tables
- Create migration scripts

**Estimated Effort**: 4-6 hours per service (8-12 hours total)

---

### 4. CORS Wildcard Configuration - SECURITY

**Files**: All services (`app/main.py`)

**Current Code**:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Accepts requests from ANY domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Fix Required**:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.diabetify.com",
        "capacitor://localhost",  # Mobile app
        "ionic://localhost"       # Mobile app
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Estimated Effort**: 30 minutes per service (2 hours total)

---

## 🟡 HIGH PRIORITY - Impacts User Experience

### 5. No Refresh Token Mechanism (Login Service)

**Issue**: JWT expires in 30 minutes. Users must re-login frequently.

**Current Flow**:

```
1. User logs in → Gets JWT (30min expiry)
2. After 30 minutes → JWT expires
3. User must log in again with email/password
```

**Desired Flow**:

```
1. User logs in → Gets access token (30min) + refresh token (7 days)
2. After 30 minutes → Access token expires
3. Mobile app uses refresh token to get new access token (no re-login needed)
4. After 7 days → Refresh token expires, user must log in again
```

**Implementation**:

```python
from datetime import timedelta

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)

    access_token = create_access_token(
        data={"sub": user.email, "type": "access"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    refresh_token = create_refresh_token(
        data={"sub": user.email, "type": "refresh"},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/token/refresh")
async def refresh_access_token(refresh_token: str):
    # Validate refresh token
    # Issue new access token
    pass
```

**Mobile Impact**: Major UX improvement, but mobile app must be updated

**Estimated Effort**: 6-8 hours

---

### 6. Queue Capacity Bug (Appointments Service)

**File**: `relatedServices/appointments/app/services/queue_service.py`

**Issue**: Logic bug may allow overbooking

**Current Code** (approximate):

```python
def check_appointment_availability(absolute_placement, queue_size):
    return absolute_placement < queue_size  # Bug: doesn't account for current queue state
```

**Fix Required**: Review and fix queue capacity checking logic

**Estimated Effort**: 3-4 hours (requires understanding business logic)

---

### 7. Synchronous I/O (All Services) - PERFORMANCE

**Issue**: All services use `requests` library (blocking I/O). Should use async `httpx`.

**Current**:

```python
import requests

response = requests.get(url)  # Blocks entire service
```

**Better**:

```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.get(url)  # Non-blocking
```

**Mobile Impact**: Faster API responses

**Estimated Effort**: 8-12 hours (requires testing all endpoints)

---

## 🟢 MEDIUM PRIORITY - Nice to Have

### 8. No Rate Limiting

**Issue**: Services vulnerable to abuse (credential stuffing, DoS)

**Fix**:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/token")
@limiter.limit("5/minute")
async def login(request: Request, ...):
    # Login logic
```

**Estimated Effort**: 2-3 hours per service

---

### 9. Missing Database Indexes

**Issue**: Queries will slow down as data grows

**Fix**: Add indexes to frequently queried columns

```sql
CREATE INDEX idx_glucose_user_timestamp ON glucose_readings(user_id, timestamp);
CREATE INDEX idx_appointments_user_date ON appointments(user_id, appointment_date);
```

**Estimated Effort**: 1-2 hours

---

### 10. No Real-Time Updates (WebSocket)

**Issue**: Mobile app must poll for new data (battery drain, latency)

**Desired**: WebSocket endpoint for real-time glucose updates

**Implementation**:

```python
from fastapi import WebSocket

@app.websocket("/ws/readings")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await validate_token(token)
    await manager.connect(user.id, websocket)
    # Push new readings in real-time
```

**Mobile Impact**: Major UX improvement, better battery life

**Estimated Effort**: 12-16 hours (requires architecture changes)

---

## 📋 Recommended Roadmap

### Phase 1: Security Fixes (Week 1-2) 🔴 BEFORE PRODUCTION

- [ ] SHA-256 → bcrypt migration (4-6 hours)
- [ ] Add authentication to all services (8-12 hours)
- [ ] Fix CORS wildcard (2 hours)
- [ ] Add user_id filtering (4 hours)

**Total Effort**: 18-24 hours (3-4 days)

---

### Phase 2: Performance Improvements (Week 3-4) 🟡 URGENT

- [ ] Add pagination to glucoserver (2-3 hours)
- [ ] Fix appointments queue bug (3-4 hours)
- [ ] Add database indexes (1-2 hours)
- [ ] Migrate to async I/O (8-12 hours)

**Total Effort**: 14-21 hours (2-3 days)

---

### Phase 3: UX Improvements (Week 5-6) 🟢 HIGH VALUE

- [ ] Implement refresh token flow (6-8 hours)
- [ ] Add rate limiting (6-9 hours)
- [ ] Add health check endpoints (2-3 hours)

**Total Effort**: 14-20 hours (2-3 days)

---

### Phase 4: Real-Time Features (Month 2+) 🔵 FUTURE

- [ ] WebSocket implementation (12-16 hours)
- [ ] Event-driven architecture (40+ hours)
- [ ] Distributed tracing (20+ hours)

---

## 🛡️ Security Compliance Notes

### HIPAA Considerations

- **Data Encryption**: ✅ HTTPS in transit
- **Access Logging**: ❌ Not implemented (should log all data access)
- **Audit Trail**: ❌ Not implemented (should track all CRUD operations)
- **Data Retention**: ❌ No policy defined

### Required Before Production

1. Implement access logging (who accessed what data when)
2. Create audit trail for all patient data operations
3. Define and enforce data retention policy
4. Add privacy policy endpoints

---

## 📊 Current Architecture Summary

```
Mobile App (Ionic/Angular)
    ↓ HTTPS
API Gateway (FastAPI 0.114.0)
    ↓ Synchronous HTTP Proxy
├── Login Service (FastAPI 0.109.0 + PostgreSQL)
│   - OAuth2 Password Flow
│   - JWT tokens (30min expiry)
│   - ⚠️ SHA-256 password hashing
│
├── Appointments Service (FastAPI 0.109.0 + PostgreSQL)
│   - Queue-based scheduling
│   - ⚠️ No authentication
│   - ⚠️ Queue capacity bug
│
├── Glucoserver Service (FastAPI 0.109.0 + PostgreSQL)
│   - Glucose reading CRUD
│   - ⚠️ No pagination
│   - ⚠️ No authentication
│
└── Container Managing (Docker Compose + Shell Scripts)
    - Service orchestration
    - Not production-ready
```

---

## 📖 Detailed Documentation

For complete technical details, see:

- **Backend Analysis**: `.taskmaster/docs/backend-services-analysis.md` (714 lines)
- **API Reference**: `.taskmaster/docs/backend-api-reference.md` (1,530 lines)
- **Mobile Integration**: `.taskmaster/docs/mobile-backend-integration.md` (2,580 lines)

---

## 🤝 Mobile App Workarounds

The mobile team will implement the following workarounds to handle current backend limitations:

1. **No Pagination**: Client-side filtering and aggressive caching
2. **No Refresh Tokens**: Session expiry warnings + biometric quick re-login
3. **Performance**: 5-minute HTTP cache, offline-first architecture
4. **Security**: SecureStorage for tokens, client-side validation

These workarounds allow the mobile app to function but **do not replace the need for backend fixes**.

---

## ❓ Questions for Backend Team

1. **SHA-256 Migration**: When can we schedule the password migration? (Forces all users to reset)
2. **Pagination**: Can this be prioritized? Mobile app downloads MBs of data currently
3. **Refresh Tokens**: Is this on the roadmap? Major UX improvement
4. **WebSocket**: Interest in real-time updates for future?
5. **Production Timeline**: What's the target launch date? (Affects prioritization)

---

## 📞 Contact

For questions about this analysis or mobile integration requirements:

- See comprehensive docs in `.taskmaster/docs/`
- Mobile team can provide example implementations
- Backend-mobile integration meeting recommended

---

**Last Updated**: 2025-10-10
**Status**: Ready for backend team review and prioritization
