# Diabetactic Backend API - Quick Reference

**Base URL**: `https://diabetactic-api-gateway-37949d6f182f.herokuapp.com`

---

## Authentication

### Login

```typescript
POST /token
Content-Type: application/x-www-form-urlencoded

username={dni}&password={password}

// Returns
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**⚠️ IMPORTANT**: Login does NOT return user data. You must call `/users/me` next.

---

## User Profile

### Get Current User

```typescript
GET /users/me
Authorization: Bearer {token}

// Returns
{
  "dni": "1000",              // User ID (STRING, not number!)
  "name": "Nacho",
  "surname": "Scocco",
  "blocked": false,
  "email": "lstroia@fi.uba.ar",
  "tidepool": null,
  "hospital_account": "1",

  // Gamification (auto-updated by backend)
  "times_measured": 0,        // Total readings count
  "streak": 0,                // Current consecutive days
  "max_streak": 0             // Best streak ever
}
```

### Update Profile

```typescript
PATCH /users/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Name",
  "email": "new@email.com"
}
```

---

## Glucose Readings

### List My Readings

```typescript
GET /glucose/mine
Authorization: Bearer {token}

// Returns array of readings
```

### Get Latest Reading

```typescript
GET /glucose/mine/latest
Authorization: Bearer {token}

// Returns
{
  "id": 12345,
  "user_id": 1000,
  "glucose_level": 120.5,
  "reading_type": "DESAYUNO",  // Spanish enum!
  "created_at": "2025-12-08T10:30:00",
  "notes": "Feeling good"
}
```

### Create Reading

```typescript
POST /glucose/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "glucose_level": 120.5,
  "reading_type": "DESAYUNO",  // Required - see enum below
  "notes": "Optional notes"
}
```

### Reading Type Enum (Spanish)

```typescript
type ReadingType =
  | 'DESAYUNO' // Breakfast
  | 'ALMUERZO' // Lunch
  | 'MERIENDA' // Snack
  | 'CENA' // Dinner
  | 'EJERCICIO' // Exercise
  | 'OTRAS_COMIDAS' // Other meals
  | 'OTRO'; // Other
```

---

## Appointments

### List My Appointments

```typescript
GET /appointments/mine
Authorization: Bearer {token}
```

### Get Appointment Queue

```typescript
GET /appointments/queue/open
Authorization: Bearer {token}
```

### Get Appointment State

```typescript
GET /appointments/state
Authorization: Bearer {token}
```

### Create Appointment

```typescript
POST /appointments/create
Authorization: Bearer {token}
Content-Type: application/json
```

### Submit Appointment

```typescript
POST /appointments/submit
Authorization: Bearer {token}
Content-Type: application/json
```

### Resolve Appointment

```typescript
POST /appointments/{appointment_id}/resolution
Authorization: Bearer {token}
Content-Type: application/json
```

---

## Common Patterns

### Login Flow (CORRECT)

```typescript
// Step 1: Get token
const { access_token } = await apiGateway.request('auth.login', {
  body: { username: dni, password },
});

await storage.set('auth_token', access_token);

// Step 2: Get user profile (includes gamification)
const userProfile = await apiGateway.request('users.me');

await profileService.setProfile(userProfile);
```

### Refresh User Data

```typescript
// After logging a reading, update streaks
async function refreshUserData() {
  const user = await apiGateway.request('users.me');
  await profileService.updateProfile(user);

  // Check if streak increased
  if (user.streak > previousStreak) {
    showStreakNotification(user.streak);
  }
}
```

### Error Handling

```typescript
try {
  await apiGateway.request('glucose.create', { body: reading });
  await refreshUserData(); // Update gamification
} catch (error) {
  if (error.status === 401) {
    // Token expired - re-login
    await authService.logout();
    router.navigate('/login');
  } else if (error.status === 422) {
    // Validation error
    showError(error.detail);
  }
}
```

---

## Key Differences from Other APIs

| Feature          | Expected                   | Diabetactic API          |
| ---------------- | -------------------------- | ------------------------ |
| User ID          | Numeric `id`               | String `dni`             |
| Login response   | User data included         | Only token               |
| Gamification     | Points/levels/achievements | Just counts/streaks      |
| Reading types    | English                    | Spanish (DESAYUNO, etc.) |
| Refresh endpoint | Dedicated `/refresh`       | Reuse `/users/me`        |

---

## Testing

**Test Credentials**:

- Username: `1000`
- Password: `tuvieja`
- DNI: `"1000"` (string)

**Interactive Docs**: `GET /docs` (Swagger UI)

**OpenAPI Spec**: `GET /openapi.json`

---

_Last updated: 2025-12-08_
