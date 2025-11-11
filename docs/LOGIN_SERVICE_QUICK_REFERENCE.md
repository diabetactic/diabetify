# Login Service Quick Reference

## TL;DR

**Status**: Functional but NOT production-ready
**Branch**: feature/inttest
**Framework**: FastAPI 0.63.0 + PostgreSQL

### Critical Findings

| Feature | Status | Details |
|---------|--------|---------|
| User Registration | ✅ YES | POST /users/ - Fully implemented |
| Token Generation | ❌ NO | No JWT, returns raw user objects |
| Refresh Tokens | ❌ NO | No token refresh mechanism |
| Password Hashing | 🔴 INSECURE | Using SHA-256 without salt (should use bcrypt) |
| Token Validation | ❌ NO | No Bearer auth, no middleware |

---

## All Endpoints (17 Total)

### User Endpoints (7)

```
POST   /users/grantaccess          # Login (returns User object, NO TOKEN)
POST   /users/                     # Create user (REGISTRATION) ✅
GET    /users/                     # Get all users
GET    /users/from_dni/{dni}       # Get user by DNI
GET    /users/{user_id}            # Get user by ID
GET    /users/force/{user_id}      # Get user (bypass blocked check)
POST   /users/block/{user_id}      # Toggle blocked status
```

### Admin Endpoints (9)

```
POST   /admin/                     # Create admin
POST   /admin/grantaccess          # Admin login
POST   /admin/password/check       # Verify password
PUT    /admin/password/change      # Change password
PUT    /admin/mail/change          # Change email
POST   /admin/password/recover     # Send recovery email
GET    /admin/from_username/{user} # Get admin by username
GET    /admin/from_mail/{email}    # Get admin by email
GET    /admin/{admin_id}           # Get admin by ID
```

### Health

```
GET    /health                     # Service health
```

---

## Registration Implementation

**Endpoint**: `POST /users/`

**Request**:
```json
{
  "dni": "12345678",
  "password": "SecurePass123",
  "name": "Juan",
  "surname": "Perez",
  "email": "juan@example.com",
  "hospital_account": "HSP-001",
  "tidepool": null
}
```

**Response**:
```json
{
  "user_id": 4,
  "dni": "12345678",
  "name": "Juan",
  "surname": "Perez",
  "blocked": false,
  "email": "juan@example.com",
  "tidepool": null,
  "hospital_account": "HSP-001",
  "times_measured": 0,
  "streak": 0,
  "max_streak": 0
}
```

**Implementation**: `app/routes/user_routes.py:64` → `app/cruds/user_cruds.py:48`

---

## Authentication Flow (Current)

```
Client
  ↓
POST /users/grantaccess { dni, password }
  ↓
1. Query user by DNI
2. Check if blocked
3. Hash password (SHA-256)
4. Compare hashes
5. Return User object (NO TOKEN!)
  ↓
Client receives User object
```

**Problem**: No stateless authentication, clients must store credentials or user data.

---

## Database Schema

### Users Table
```sql
user_id           INTEGER PRIMARY KEY
dni               VARCHAR(50) UNIQUE NOT NULL
password          VARCHAR(100) NOT NULL        -- SHA-256 hash
name              VARCHAR(50) NOT NULL
surname           VARCHAR(50) NOT NULL
blocked           BOOLEAN NOT NULL
email             VARCHAR(100) UNIQUE NOT NULL
tidepool          VARCHAR(100) NULL
hospital_account  VARCHAR(100) UNIQUE NOT NULL
times_measured    INTEGER DEFAULT 0
max_streak        INTEGER DEFAULT 0
streak            INTEGER DEFAULT 0
```

### Admins Table
```sql
admin_id    INTEGER PRIMARY KEY
username    VARCHAR(50) UNIQUE NOT NULL
password    VARCHAR(100) NOT NULL  -- SHA-256 hash
email       VARCHAR(100) UNIQUE NOT NULL
```

---

## Security Issues

### 🔴 Critical

1. **Insecure Password Hashing**
   - Using: SHA-256 (no salt)
   - Should use: bcrypt with automatic salt
   - Impact: All passwords vulnerable to rainbow tables

2. **No JWT Tokens**
   - No access tokens generated
   - No refresh tokens
   - Must store user objects client-side

3. **No Token Validation**
   - No Bearer authentication
   - No protected route middleware
   - No token expiration

### 🟡 High Priority

4. **No Rate Limiting** - Brute force possible
5. **No Email Verification** - Fake accounts possible
6. **CORS Wide Open** - `allow_origins=["*"]`
7. **No Audit Logging** - Can't detect attacks

---

## Required Fixes for Production

### Phase 1: Critical Security (1-2 weeks)

**1. Replace Password Hashing**
```bash
pip install passlib[bcrypt]
```

```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)
```

**2. Implement JWT Tokens**
```bash
pip install python-jose[cryptography]
```

```python
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=30)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY)
```

**3. Update Login Response**
```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**4. Add Token Validation Middleware**
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

def get_current_user(token: str = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY)
        return payload["sub"]
    except:
        raise HTTPException(status_code=401)
```

### Phase 2: High Priority (1 week)

- [ ] Rate limiting (slowapi)
- [ ] Email verification flow
- [ ] Audit logging
- [ ] CORS restriction

### Phase 3: Medium Priority (2 weeks)

- [ ] RBAC (roles/permissions)
- [ ] Account lockout
- [ ] Password complexity
- [ ] User password recovery

---

## Code Locations

| Feature | File | Line |
|---------|------|------|
| User Registration | `app/routes/user_routes.py` | 64-68 |
| User Registration CRUD | `app/cruds/user_cruds.py` | 48-62 |
| User Login | `app/routes/user_routes.py` | 22-31 |
| Password Hashing | `app/helpers/user_helpers.py` | 4-5 |
| User Model | `app/models/user_model.py` | 5-18 |
| User Schema | `app/schemas/user_schema.py` | 4-30 |
| Admin Login | `app/routes/admin_routes.py` | 21-34 |
| Email Sending | `app/helpers/mail_send_helpers.py` | 15-41 |
| Main App | `app/main.py` | 1-24 |

---

## Test Accounts (Seeded)

### Users
```
DNI: 1000, Password: tuvieja, Email: 1@example.com (Active)
DNI: 1001, Password: tumadre, Email: 2@example.com (Blocked)
DNI: 1002, Password: tuvieja, Email: 3@example.com (Active)
```

### Admin
```
Username: admin, Password: admin, Email: 1@example.com
```

---

## Dependencies Missing for Modern Auth

```
python-jose[cryptography]  # JWT tokens
passlib[bcrypt]            # Secure password hashing
python-multipart           # Form data
redis                      # Session storage
slowapi                    # Rate limiting
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:port/db
NOREPLY_ACCOUNT=noreply@example.com
NOREPLY_PASSWORD=smtp_password
BACKOFFICE_FRONT_URL=https://admin.example.com
```

**Missing (need to add)**:
```env
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>
JWT_ALGORITHM=HS256
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=https://app.example.com
```

---

## Quick Test Commands

```bash
# Health check
curl http://localhost:8000/health

# Register user
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "dni": "99999",
    "password": "test123",
    "name": "Test",
    "surname": "User",
    "email": "test@example.com",
    "hospital_account": "TEST-001"
  }'

# Login (returns User object, not token)
curl -X POST http://localhost:8000/users/grantaccess \
  -H "Content-Type: application/json" \
  -d '{"dni": "99999", "password": "test123"}'

# Get all users
curl http://localhost:8000/users/
```

---

## Migration Strategy for Password Re-hashing

**Recommended: Hybrid Verification (Gradual)**

```python
def verify_password_hybrid(plain: str, stored: str, user_id: int):
    # Try bcrypt first (new format)
    try:
        if pwd_context.verify(plain, stored):
            return True
    except:
        pass

    # Fallback to SHA-256 (legacy)
    legacy = hashlib.sha256(plain.encode()).hexdigest()
    if stored == legacy:
        # Rehash with bcrypt and update
        new_hash = pwd_context.hash(plain)
        update_password(user_id, new_hash)
        return True

    return False
```

This allows seamless migration without forcing password resets.

---

## Summary

**What Works**:
- User registration with validation
- Basic authentication (credential checking)
- Admin management
- Email sending (password recovery)
- Database migrations

**What's Missing**:
- JWT token generation
- Refresh tokens
- Token validation middleware
- Secure password hashing
- Rate limiting
- Email verification
- Audit logging
- Session management

**Effort to Fix**: 4-5 weeks for production-ready

**For Full Details**: See `LOGIN_SERVICE_INVESTIGATION_REPORT.md`
