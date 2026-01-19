# E2E Test - Database Evidence

**Test Date**: $(date +%Y-%m-%d)
**User**: 40999999 (user_id: 133)
**Email**: jcrespo@fi.uba.ar

---

## Glucose Reading Verification

(To be filled during test)

---

## Appointment Flow - Success

### Queue State Transitions

(To be filled during test)

### Appointment Creation

(To be filled during test)

### Resolution Creation

(To be filled during test)

---

## Appointment Flow - Denied

### Queue State Transitions

(To be filled during test)

---

## Summary

(To be filled at end of test)

## Glucose Reading Verification

**Reading Added**: 136 mg/dL at 07:46 (Desayuno context)

**API Response** (GET /readings/user/latest?user_id=133):
```json
{
  "readings": [
    {
      "id": 233,
      "user_id": 133,
      "glucose_level": 136.0,
      "created_at": "18/01/2026 07:46:15",
      "reading_type": "DESAYUNO",
      "notes": null
    }
  ]
}
```

**Status**: ✅ VERIFIED - Reading present in glucoserver database

---

## Appointment Flow - Success

### State: NONE → PENDING
**Action**: User clicked "Solicitar Cita"
**API Response** (GET /queue/state/133): "PENDING"
**Queue Placement**: 1

### State: PENDING → ACCEPTED
**Action**: Admin accepted via PUT /queue/accept/1
**API Response**: true
**State After**: "ACCEPTED"

### State: ACCEPTED → CREATED
**Action**: User filled and submitted appointment form
**Appointment ID**: 134

**Appointment Data** (GET /appointments/from_user/latest/133):
```json
{
  "user_id": 133,
  "glucose_objective": 110.0,
  "insulin_type": "rapid",
  "dose": 8.0,
  "fast_insulin": "Novorapid",
  "fixed_dose": 4.0,
  "ratio": 12.0,
  "sensitivity": 40.0,
  "pump_type": "none",
  "motive": ["AJUSTE"],
  "appointment_id": 134
}
```

### State: CREATED → RESOLVED
**Action**: Admin created resolution via POST /appointments/create_resolution

**Resolution Data**:
```json
{
  "appointment_id": 134,
  "change_basal_type": "Lantus",
  "change_basal_dose": 10.0,
  "change_basal_time": "21:00",
  "change_fast_type": "Novorapid",
  "change_ratio": 10.0,
  "change_sensitivity": 35.0,
  "emergency_care": false,
  "needed_physical_appointment": true,
  "glucose_scale": [["Bajo", 70], ["Objetivo", 110], ["Alto", 180]]
}
```

**NOTE**: `needed_physical_appointment: true` - Email notification should have been triggered to jcrespo@fi.uba.ar

---

## Appointment Flow - Denied

### State: NONE (after queue clear)
**Action**: Admin cleared queue via DELETE /queue
**API Response**: State returned to "NONE"

### State: NONE → PENDING
**Action**: User clicked "Solicitar Cita"
**Queue Placement**: 0

### State: PENDING → DENIED
**Action**: Admin denied via PUT /queue/deny/0
**API Response**: true
**Final State**: "DENIED"

**UI Display**: "Rechazada - Su solicitud no fue aceptada" (red border)

**Status**: ✅ VERIFIED - Denied flow works correctly
