# Maestro Integration Tests Summary

## Overview

This document summarizes the Maestro E2E tests for Diabetactic mobile app, designed for testing against the real Heroku backend.

**App ID**: `io.diabetactic.app`
**Backend**: `https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com`
**Test User**: ID `1000`, Password `tuvieja`
**Admin Credentials**: `admin` / `admin`

---

## Test Structure

```
maestro/
├── config.yaml              # Global config
├── flows/                   # Reusable flows
│   ├── login.yaml           # Login flow (handles welcome screen + login form)
│   └── navigate-appointments.yaml
├── scripts/
│   └── backoffice-api.js    # Admin API helper (accept/deny/clear)
└── tests/
    ├── readings/            # Glucose readings tests
    ├── appointments/        # Appointment state machine tests
    └── resolution/          # Resolution verification tests
```

---

## App Flow Understanding

### Welcome Screen

The app starts with a welcome screen showing:

- "¡Bienvenido a Diabetactic!" (Spanish)
- "Iniciar Sesión" button to proceed to login

### Login Form

After clicking "Iniciar Sesión" on welcome screen:

- DNI/Email input
- Password input
- "Iniciar Sesión" submit button

### Appointment State Machine

```
NONE → PENDING → ACCEPTED → CREATED
              ↘ DENIED
```

- **NONE**: No appointment, can request one
- **PENDING**: Waiting for admin approval
- **ACCEPTED**: Admin approved, can fill clinical form
- **DENIED**: Admin rejected, can request again
- **CREATED**: Clinical appointment completed with resolution

---

## Test Files

### 1. Readings Tests

#### `tests/readings/01-list-loads.yaml`

**Purpose**: Verify readings list page loads correctly

**Flow**:

1. Login via `flows/login.yaml`
2. Navigate to "Lecturas|Readings" tab
3. Wait for "Lecturas de Glucosa|Glucose Readings" header
4. Wait for data to load (either readings with "mg/dL" or empty state)
5. Assert page is functional

#### `tests/readings/02-add-reading.yaml`

**Purpose**: Add a glucose reading and verify it appears

**Flow**:

1. Login
2. Navigate to Readings tab
3. Tap "Agregar|Add" button
4. Fill glucose value (120) via Shadow DOM bypass
5. Optionally select meal context
6. Tap "Guardar lectura|Save Reading"
7. Verify reading appears in list

---

### 2. Appointment Tests

#### `tests/appointments/01-request-appointment.yaml`

**Purpose**: Test NONE → PENDING transition

**Prerequisite**: User has no pending appointment (NONE state)

**Flow**:

1. Login
2. Navigate to appointments
3. Verify "Solicitar Cita|Request Appointment" button visible (NONE state)
4. Tap request button
5. Wait for and verify "Pendiente|Pending" status

#### `tests/appointments/02-accept-appointment.yaml`

**Purpose**: Test PENDING → ACCEPTED transition via admin API

**Prerequisite**: User in PENDING state

**Flow**:

1. Login
2. Navigate to appointments
3. Verify "Pendiente|Pending" state
4. **Call backoffice API** with ACTION=accept
5. Pull to refresh
6. Verify "Aceptada|Accepted" state

#### `tests/appointments/03-create-appointment.yaml`

**Purpose**: Test ACCEPTED → CREATED transition via clinical form

**Prerequisite**: User in ACCEPTED state

**Flow**:

1. Login
2. Navigate to appointments
3. Verify "Agregar Nueva Cita|Add New Appointment" button (ACCEPTED state)
4. Tap to open clinical form
5. Fill: Glucose Objective (100), Dose (10)
6. Optionally select Insulin Type and Motive
7. Tap "Guardar|Save"
8. Verify return to appointments list

#### `tests/appointments/04-deny-appointment.yaml`

**Purpose**: Test PENDING → DENIED transition via admin API

**Prerequisite**: User in PENDING state

**Flow**:

1. Login
2. Navigate to appointments
3. Verify "Pendiente|Pending" state
4. **Call backoffice API** with ACTION=deny
5. Pull to refresh
6. Verify "Rechazada|Denied" state
7. Verify can request again

#### `tests/appointments/05-full-flow.yaml`

**Purpose**: Complete E2E test: NONE → PENDING → ACCEPTED → CREATED

**Flow**:

1. Clear app state + Launch
2. Login (inline, handles welcome screen)
3. Navigate to appointments
4. **Clear queue via API** (ensure NONE state)
5. Refresh and verify "Solicitar Cita" button
6. Request appointment → Wait for PENDING
7. **Accept via API** → Wait for ACCEPTED
8. Fill clinical form (Glucose: 110, Dose: 12)
9. Submit and verify completion

---

### 3. Resolution Tests

#### `tests/resolution/01-verify-resolution.yaml`

**Purpose**: Verify resolution details display after appointment creation

**Prerequisite**: User has at least one CREATED appointment

**Flow**:

1. Login
2. Navigate to appointments
3. Wait for "Actual|Current" (CREATED appointments)
4. Tap on appointment card
5. Verify detail page shows: Glucose Objective, Dose, mg/dL

---

## Backoffice API Helper

`scripts/backoffice-api.js` - Node.js script for admin operations

### Actions:

- `ACTION=clear` - Delete all pending appointments
- `ACTION=accept` - Accept user's pending appointment
- `ACTION=deny` - Deny user's pending appointment

### Environment Variables:

- `BACKOFFICE_API_URL` - API base URL
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` - Admin credentials
- `USER_ID` - Target user ID

### API Endpoints Used:

- `POST /token` - Get admin auth token
- `GET /appointments/pending` - List pending appointments
- `PUT /appointments/accept/{queue_placement}` - Accept appointment
- `PUT /appointments/deny/{queue_placement}` - Deny appointment
- `DELETE /appointments` - Clear all appointments

---

## Key Patterns

### Bilingual Text Matching

```yaml
text: 'Spanish Text|English Text'
```

Maestro matches either Spanish OR English version.

### Shadow DOM Bypass (for Ionic inputs)

```yaml
- tapOn:
    text: 'Label Text'
- inputText: 'value'
- hideKeyboard
```

### Hydration Waits

```yaml
- extendedWaitUntil:
    visible:
      text: 'Element Text'
    timeout: 15000
```

### Test Determinism

- `clearState: io.diabetactic.app` at test start
- `ACTION=clear` via backoffice API to reset queue state

---

## Test Failure History & Fixes

### Failure 1: `anyOf` Property Not Supported

**Error**: `Unknown Property: anyOf`
**Cause**: Maestro doesn't support `anyOf` construct for multiple text options
**Fix**: Replaced all `anyOf` with single text assertions or bilingual regex patterns

```yaml
# WRONG
- assertVisible:
    anyOf:
      - text: 'Pending'
      - text: 'Pendiente'

# CORRECT
- assertVisible:
    text: 'Pendiente|Pending'
```

### Failure 2: Welcome Screen Not Handled

**Error**: `Assertion is false: "Diabetactic" is visible`
**Cause**: Tests assumed login form shows first, but app has welcome screen
**Screenshot**: Welcome screen shows "¡Bienvenido a Diabetactic!" with "Iniciar Sesión" button
**Fix**: Added welcome screen handling before login form

```yaml
# Added to login flow:
- extendedWaitUntil:
    visible:
      text: 'Diabetactic'
    timeout: 10000
- tapOn:
    text: 'Iniciar Sesión'
```

### Failure 3: Text with Special Characters

**Error**: `Assertion is false: "Bienvenido a Diabetactic|Welcome to Diabetactic" is visible`
**Cause**: Actual text is "¡Bienvenido a Diabetactic!" with exclamation marks
**Fix**: Simplified to just `text: 'Diabetactic'` which is contained in the full text

### Failure 4: Subdirectory Tests Not Found

**Error**: `Top-level directories do not contain any Flows`
**Cause**: Maestro doesn't recursively search subdirectories by default
**Fix**: Use glob pattern `tests/**/*.yaml` to include all nested tests

---

## Current Issues (Debug Notes)

1. **Welcome Screen**: App shows welcome screen first, requires "Iniciar Sesión" tap before login form
2. **Text Matching**: Exact text matching required - special characters matter
3. **Bilingual Regex**: `text|text` pattern only works for simple alternation, not partial matching

---

## Running Tests

```bash
# Install Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run all tests
cd maestro
maestro test tests/**/*.yaml \
  --env TEST_USER_ID=1000 \
  --env TEST_USER_PASSWORD=tuvieja \
  --env BACKOFFICE_API_URL=https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com \
  --env BACKOFFICE_ADMIN_USERNAME=admin \
  --env BACKOFFICE_ADMIN_PASSWORD=admin

# Run single test
maestro test tests/appointments/05-full-flow.yaml --env ...

# Test backoffice API directly
ACTION=clear USER_ID=1000 node scripts/backoffice-api.js
```

---

## CI Integration (CircleCI)

Job `maestro-tests` in `.circleci/config.yml`:

- Runs on `android/android-machine` executor
- Creates AVD with API 33
- Builds and installs debug APK
- Runs Maestro tests with JUnit output
- Stores results as artifacts
