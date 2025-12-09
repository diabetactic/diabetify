# Backend API Investigation Report

**Date**: 2025-12-08
**Backend**: Heroku Production API
**Base URL**: https://diabetactic-api-gateway-37949d6f182f.herokuapp.com

---

## 1. POST /token - Authentication Endpoint

### Request

```http
POST /token
Content-Type: application/x-www-form-urlencoded

username=1000&password=tuvieja
```

### Response (HTTP 200) - **ACTUAL RESPONSE**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwIiwiZXhwIjoxNzY1MjM0NjYxfQ.iurNzkITFu1VXeJQuqR2dGr54OivfFCQI9uQU1i4kJo",
  "token_type": "bearer"
}
```

**Fields Returned**:

- `access_token` (string): JWT bearer token for authentication
- `token_type` (string): Always "bearer"

**Notable**:

- ❌ NO user data in login response
- ❌ NO gamification data
- ❌ NO user ID
- ✅ Only returns JWT token

**JWT Payload**:

```json
{
  "sub": "1000", // User ID as string
  "exp": 1765234661 // Expiration timestamp
}
```

---

## 2. GET /users/me - User Profile Endpoint

### Request

```http
GET /users/me
Authorization: Bearer {access_token}
```

### Response (HTTP 200) - **ACTUAL RESPONSE**

```json
{
  "dni": "1000",
  "name": "Nacho",
  "surname": "Scocco",
  "blocked": false,
  "email": "lstroia@fi.uba.ar",
  "tidepool": null,
  "hospital_account": "1",
  "times_measured": 0,
  "streak": 0,
  "max_streak": 0
}
```

**Fields Returned** (verified from actual response):

### User Profile Fields

- `dni` (string, required): National ID number
- `name` (string, required): First name
- `surname` (string, required): Last name
- `blocked` (boolean, required): Account blocked status
- `email` (string, required): Email address (format: email)
- `tidepool` (string | null): Tidepool user ID (nullable)
- `hospital_account` (string, required): Hospital account identifier

### Gamification Fields

- `times_measured` (integer, default: 0): Total number of glucose readings
- `streak` (integer, default: 0): Current consecutive days streak
- `max_streak` (integer, default: 0): Highest streak ever achieved

**Notable**:

- ❌ NO `id` field - user identified by `dni`
- ❌ NO `points` or `level` fields
- ❌ NO `achievements` array
- ✅ Gamification limited to: `times_measured`, `streak`, `max_streak`
- ✅ Tidepool integration via `tidepool` field (nullable)

---

## 3. GET /glucose/mine/latest - Latest Glucose Reading

### Response Schema (from OpenAPI)

```json
{
  "id": number,           // Reading ID
  "user_id": number,      // User ID (numeric, NOT dni)
  "glucose_level": number,
  "reading_type": "DESAYUNO" | "ALMUERZO" | "MERIENDA" | "CENA" | "EJERCICIO" | "OTRAS_COMIDAS" | "OTRO",
  "created_at": string,   // ISO 8601 timestamp
  "notes": string | null
}
```

**Reading Type Enum** (Spanish labels):

- `"DESAYUNO"` - Breakfast
- `"ALMUERZO"` - Lunch
- `"MERIENDA"` - Snack
- `"CENA"` - Dinner
- `"EJERCICIO"` - Exercise
- `"OTRAS_COMIDAS"` - Other meals
- `"OTRO"` - Other

---

## 4. Available Endpoints (from OpenAPI)

### Authentication

- `POST /token` - Login (form data: username, password)

### Users

- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update user profile

### Glucose Readings

- `GET /glucose/mine` - List all user readings
- `GET /glucose/mine/latest` - Get most recent reading
- `POST /glucose/create` - Create new reading

### Appointments

- `GET /appointments/mine` - List user appointments
- `GET /appointments/queue/open` - Get open appointment queue
- `GET /appointments/state` - Get appointment state
- `POST /appointments/create` - Create appointment
- `POST /appointments/submit` - Submit appointment
- `POST /appointments/placement` - Place appointment
- `POST /appointments/{appointment_id}/resolution` - Resolve appointment

---

## 5. Refresh User Data Without Re-login

### Tested Endpoints

❌ **GET /users/me/refresh** → 404 Not Found
❌ **GET /users/me/gamification** → 404 Not Found
❌ **GET /users/me/stats** → 404 Not Found
❌ **GET /gamification/stats** → 404 Not Found

### Conclusion

**✅ Use GET /users/me to refresh user data**

The `/users/me` endpoint is the canonical way to:

1. Get updated user profile
2. Get current gamification status (times_measured, streak, max_streak)
3. Refresh data without re-authentication

**Pattern**:

```typescript
// Refresh user data after actions (reading logged, etc.)
async refreshUserData(): Promise<void> {
  const userData = await this.apiGateway.request('users.me');

  // Update local profile with fresh gamification data
  await this.profileService.updateProfile(userData);
}
```

---

## 4. Available API Documentation

### OpenAPI Specification

```http
GET /openapi.json
```

**Available Endpoints** (from OpenAPI):

- `/token` - POST (login)
- `/users/register` - POST
- `/users/me` - GET, PUT, PATCH
- `/glucose/mine` - GET (list user readings)
- `/glucose/create` - POST
- `/glucose/{id}` - GET, PUT, DELETE
- `/appointments/mine` - GET
- `/appointments/create` - POST
- `/appointments/{id}` - GET, PUT, DELETE

### Interactive Docs

```http
GET /docs
```

Returns Swagger UI for interactive API testing.

---

## Key Findings

### 1. Login Flow

```
POST /token (username, password)
  ↓
Returns: { access_token, token_type }
  ↓
GET /users/me (with Bearer token)
  ↓
Returns: Full user profile + gamification data
```

### 2. Gamification Data Location

- ✅ ALL gamification data comes from `/users/me`
- ❌ NO separate gamification endpoint
- ✅ Gamification fields: `times_measured`, `streak`, `max_streak`
- ❌ NO points, level, or achievements (simpler than expected)

### 3. Refresh Pattern

```typescript
// After any action that might earn points:
await this.apiGateway.request('users.me'); // Get fresh data
```

### 4. Data Structure Differences

**Current App Assumption** (WRONG):

```typescript
// App expects gamification in login response
interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    points: number; // ❌ NOT in /token response
  };
}
```

**Actual Backend** (CORRECT):

```typescript
// Login only returns token
interface TokenResponse {
  access_token: string;
  token_type: string;
}

// User data comes from /users/me
interface UserProfile {
  dni: string; // National ID (instead of numeric id)
  name: string;
  surname: string;
  blocked: boolean;
  email: string;
  tidepool: string | null; // Tidepool integration
  hospital_account: string;

  // Gamification (simpler than expected)
  times_measured: number; // Total readings count
  streak: number; // Current consecutive days
  max_streak: number; // Best streak ever
}
```

**Key Differences**:

- ❌ NO numeric `id` field - user identified by `dni` (string)
- ❌ NO complex gamification (points, levels, achievements)
- ✅ Simple gamification: just counts and streaks
- ✅ Tidepool integration field present but nullable

---

## Recommendations

### 1. Fix Login Flow

```typescript
async login(username: string, password: string): Promise<void> {
  // Step 1: Get token
  const tokenResponse = await this.apiGateway.request('auth.login', {
    body: { username, password }
  });

  await this.storage.set('auth_token', tokenResponse.access_token);

  // Step 2: Fetch user profile (includes gamification)
  const userProfile = await this.apiGateway.request('users.me');

  await this.profileService.setProfile(userProfile);
}
```

### 2. Refresh After Actions

```typescript
async logGlucoseReading(reading: Reading): Promise<void> {
  await this.apiGateway.request('readings.create', { body: reading });

  // Refresh to get updated points/achievements
  await this.refreshUserData();
}
```

### 3. Periodic Refresh

```typescript
// Refresh on app resume from background
this.platform.resume.subscribe(() => {
  this.refreshUserData();
});
```

---

## Testing Credentials

**Username**: 1000
**Password**: tuvieja
**DNI**: "1000" (string)

---

## Critical Insights Summary

### ✅ What We Learned

1. **Login returns ONLY token** - No user data whatsoever
2. **User ID is `dni` (string)** - Not a numeric `id` field
3. **Gamification is minimal** - Just 3 fields: `times_measured`, `streak`, `max_streak`
4. **No points/levels/achievements** - Backend doesn't have complex gamification
5. **Reading types are Spanish** - "DESAYUNO", "ALMUERZO", etc.
6. **Tidepool field exists** - But is nullable (optional integration)
7. **Refresh via GET /users/me** - Only way to get updated gamification data

### ❌ Common Misconceptions

- ❌ Login response includes user data → **FALSE**
- ❌ User has numeric `id` field → **FALSE** (it's `dni` string)
- ❌ Gamification has points/levels → **FALSE** (just counts/streaks)
- ❌ Separate gamification endpoint → **FALSE** (all in /users/me)
- ❌ Reading types in English → **FALSE** (Spanish enum values)

### 🔧 Required Code Changes

1. **Login flow must call `/users/me` after `/token`** to get user profile
2. **User models must use `dni: string`** not `id: number`
3. **Gamification models simplified** - remove points/levels/achievements
4. **Reading type mapping** - handle Spanish enum values from backend
5. **Refresh mechanism** - call `/users/me` after actions to update streaks

---

_Generated: 2025-12-08_
_Test User: 1000 / tuvieja (dni: "1000", name: "Nacho Scocco")_
