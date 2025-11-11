# Login Service API Endpoint Map

**Base URL**: `http://localhost:8000` (development)

---

## Visual API Map

```
/
├── health [GET]                              # Service health check
│
├── users/
│   ├── [POST]                                # Create user (REGISTRATION) ✅
│   ├── [GET]                                 # Get all users
│   ├── grantaccess [POST]                    # User login (NO TOKEN!) ⚠️
│   ├── from_dni/{user_dni} [GET]             # Get user by DNI
│   ├── {user_id} [GET]                       # Get user by ID
│   ├── force/{user_id} [GET]                 # Get user by ID (force)
│   └── block/{user_id} [POST]                # Toggle user blocked status
│
└── admin/
    ├── [POST]                                # Create admin account
    ├── grantaccess [POST]                    # Admin login
    ├── from_username/{username} [GET]        # Get admin by username
    ├── from_mail/{email} [GET]               # Get admin by email
    ├── {admin_id} [GET]                      # Get admin by ID
    ├── password/
    │   ├── check [POST]                      # Verify password
    │   ├── change [PUT]                      # Change password
    │   └── recover [POST]                    # Send recovery email
    └── mail/
        └── change [PUT]                      # Change email
```

---

## Detailed Endpoint Specifications

### 1. Health Check

```
GET /health
```

**Response**:
```json
{
  "status": "ok"
}
```

---

### 2. User Registration (CREATE)

```
POST /users/
```

**Request Body**:
```json
{
  "dni": "string (unique, required)",
  "password": "string (required)",
  "name": "string (required)",
  "surname": "string (required)",
  "email": "string (unique, required)",
  "hospital_account": "string (unique, required)",
  "tidepool": "string (optional)"
}
```

**Response** (200 OK):
```json
{
  "user_id": 1,
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

**Errors**:
- `403`: User already has an account
- `500`: Internal server error

**Implementation**: `app/routes/user_routes.py:64`

---

### 3. User Login (GRANT ACCESS)

```
POST /users/grantaccess
```

**Request Body**:
```json
{
  "dni": "string (required)",
  "password": "string (required)"
}
```

**Response** (200 OK):
```json
{
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

**⚠️ IMPORTANT**: Returns User object, NOT a token!

**Errors**:
- `403`: Incorrect username or password
- `401`: User blocked by admin

**Implementation**: `app/routes/user_routes.py:22`

---

### 4. Get All Users

```
GET /users/
```

**Response** (200 OK):
```json
[
  {
    "user_id": 1,
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
  },
  ...
]
```

**Implementation**: `app/routes/user_routes.py:34`

---

### 5. Get User by DNI

```
GET /users/from_dni/{user_dni}
```

**Parameters**:
- `user_dni` (path, string): National ID

**Response** (200 OK):
```json
{
  "user_id": 1,
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

**Errors**:
- `403`: User not found

**Implementation**: `app/routes/user_routes.py:40`

---

### 6. Get User by ID

```
GET /users/{user_id}
```

**Parameters**:
- `user_id` (path, integer): User ID

**Response** (200 OK):
```json
{
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

**Errors**:
- `403`: User not found or blocked

**Implementation**: `app/routes/user_routes.py:47`

---

### 7. Get User by ID (Force)

```
GET /users/force/{user_id}
```

**Parameters**:
- `user_id` (path, integer): User ID

**Response** (200 OK):
```json
{
  "user_id": 1,
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

**Difference from `/users/{user_id}`**: Does NOT check blocked status

**Errors**:
- `403`: User does not exist

**Implementation**: `app/routes/user_routes.py:53`

---

### 8. Toggle User Blocked Status

```
POST /users/block/{user_id}
```

**Parameters**:
- `user_id` (path, integer): User ID

**Response** (200 OK):
```json
{
  "user_id": 1,
  "dni": "12345678",
  "name": "Juan",
  "surname": "Perez",
  "blocked": true,  // ← Toggled
  "email": "juan@example.com",
  "tidepool": null,
  "hospital_account": "HSP-001",
  "times_measured": 0,
  "streak": 0,
  "max_streak": 0
}
```

**Errors**:
- `404`: User not found
- `500`: Internal server error

**Implementation**: `app/routes/user_routes.py:60`

---

### 9. Create Admin

```
POST /admin/
```

**Request Body**:
```json
{
  "username": "string (unique, required)",
  "email": "string (unique, required)",
  "password": "string (required)"
}
```

**Response** (201 Created):
```json
{
  "admin_id": 1,
  "username": "admin",
  "email": "admin@example.com"
}
```

**Errors**:
- `400`: Username or email already exists
- `500`: Internal server error

**Implementation**: `app/routes/admin_routes.py:13`

---

### 10. Admin Login

```
POST /admin/grantaccess
```

**Request Body**:
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response** (200 OK):
```json
{
  "username": "admin",
  "email": "admin@example.com"
}
```

**⚠️ IMPORTANT**: Returns Admin object, NOT a token!

**Errors**:
- `403`: Incorrect username or password

**Implementation**: `app/routes/admin_routes.py:21`

---

### 11. Check Admin Password

```
POST /admin/password/check
```

**Request Body**:
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response** (200 OK):
```json
null
```

**Errors**:
- `403`: Incorrect username or password

**Use Case**: Verify password before sensitive operations

**Implementation**: `app/routes/admin_routes.py:36`

---

### 12. Change Admin Password

```
PUT /admin/password/change
```

**Query Parameters**:
- `admin_id` (integer, required): Admin ID
- `new_password` (string, required): New password

**Response** (200 OK):
```json
null
```

**Errors**:
- `500`: Internal server error

**Implementation**: `app/routes/admin_routes.py:41`

---

### 13. Change Admin Email

```
PUT /admin/mail/change
```

**Query Parameters**:
- `admin_id` (integer, required): Admin ID
- `new_mail` (string, required): New email address

**Response** (200 OK):
```json
{
  "username": "admin",
  "email": "newemail@example.com"
}
```

**Errors**:
- `500`: Internal server error

**Implementation**: `app/routes/admin_routes.py:46`

---

### 14. Send Password Recovery Email

```
POST /admin/password/recover
```

**Query Parameters**:
- `email` (string, required): Admin email
- `token` (string, required): Recovery token (generated externally)

**Response** (200 OK):
```json
"Mail should be received anytime"
```

**Note**: Always returns success message (security practice - doesn't disclose if email exists)

**Email Content**:
```
Subject: Recuperar contraseña

Ingresa acá para recuperar tu contraseña:
{BACKOFFICE_FRONT_URL}?token={token}

Por favor, no responder este mail.
```

**Implementation**: `app/routes/admin_routes.py:54`

---

### 15. Get Admin by Username

```
GET /admin/from_username/{username}
```

**Parameters**:
- `username` (path, string): Admin username

**Response** (200 OK):
```json
{
  "admin_id": 1,
  "username": "admin",
  "email": "admin@example.com"
}
```

**Errors**:
- `403`: Admin not found

**Implementation**: `app/routes/admin_routes.py:66`

---

### 16. Get Admin by Email

```
GET /admin/from_mail/{email}
```

**Parameters**:
- `email` (path, string): Admin email

**Response** (200 OK):
```json
{
  "admin_id": 1,
  "username": "admin",
  "email": "admin@example.com"
}
```

**Errors**:
- `403`: Admin not found

**Implementation**: `app/routes/admin_routes.py:72`

---

### 17. Get Admin by ID

```
GET /admin/{admin_id}
```

**Parameters**:
- `admin_id` (path, integer): Admin ID

**Response** (200 OK):
```json
{
  "username": "admin",
  "email": "admin@example.com"
}
```

**Errors**:
- `403`: Admin not found

**Implementation**: `app/routes/admin_routes.py:78`

---

## Authentication Requirements

**Current State**: ❌ No authentication required for ANY endpoint

**All endpoints are PUBLIC** - no Bearer token validation, no API keys, no session checks.

**Security Risk**: Anyone can:
- Read all user data
- Create users/admins
- Block users
- Change admin passwords/emails

**Recommended**: Add token validation middleware to all endpoints except:
- `POST /users/grantaccess` (login)
- `POST /admin/grantaccess` (admin login)
- `GET /health` (health check)

---

## Postman Collection Example

```json
{
  "info": {
    "name": "Diabetify Login Service",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register User",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/users/",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"dni\": \"12345678\",\n  \"password\": \"SecurePass123\",\n  \"name\": \"Juan\",\n  \"surname\": \"Perez\",\n  \"email\": \"juan@example.com\",\n  \"hospital_account\": \"HSP-001\"\n}"
        }
      }
    },
    {
      "name": "User Login",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/users/grantaccess",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"dni\": \"12345678\",\n  \"password\": \"SecurePass123\"\n}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:8000"
    }
  ]
}
```

---

## cURL Examples

### Register User
```bash
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "dni": "12345678",
    "password": "SecurePass123",
    "name": "Juan",
    "surname": "Perez",
    "email": "juan@example.com",
    "hospital_account": "HSP-001"
  }'
```

### Login User
```bash
curl -X POST http://localhost:8000/users/grantaccess \
  -H "Content-Type: application/json" \
  -d '{"dni": "12345678", "password": "SecurePass123"}'
```

### Get All Users
```bash
curl http://localhost:8000/users/
```

### Block User
```bash
curl -X POST http://localhost:8000/users/block/1
```

### Create Admin
```bash
curl -X POST http://localhost:8000/admin/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newadmin",
    "email": "newadmin@example.com",
    "password": "AdminPass123"
  }'
```

### Admin Login
```bash
curl -X POST http://localhost:8000/admin/grantaccess \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

### Send Password Recovery
```bash
curl -X POST "http://localhost:8000/admin/password/recover?email=admin@example.com&token=abc123"
```

---

## OpenAPI/Swagger Documentation

**Access**: `http://localhost:8000/docs` (auto-generated by FastAPI)

**Alternative**: `http://localhost:8000/redoc` (ReDoc UI)

---

## Summary

| Category | Count |
|----------|-------|
| Total Endpoints | 17 |
| User Endpoints | 7 |
| Admin Endpoints | 9 |
| Health Endpoints | 1 |
| POST Methods | 7 |
| GET Methods | 8 |
| PUT Methods | 2 |
| DELETE Methods | 0 |
| Protected Endpoints | 0 (ALL PUBLIC) |

**Critical Missing**:
- ❌ No Bearer token authentication
- ❌ No token validation middleware
- ❌ No rate limiting
- ❌ All endpoints are public

**For Implementation Details**: See `LOGIN_SERVICE_INVESTIGATION_REPORT.md`
