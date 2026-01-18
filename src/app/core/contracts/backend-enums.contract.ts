/**
 * Backend Contract Definitions
 *
 * CRITICAL: These values are the EXACT enum values accepted by the backend.
 * They are defined in the backend Python services and MUST match exactly.
 *
 * Source files:
 * - glucoserver/models/glucose_reading_model.py - ReadingTypeEnum
 * - appointments/app/schemas/appointment_schema.py - MotivesEnum
 * - appointments/app/schemas/queue_schema.py - AppointmentStateEnum
 *
 * DO NOT modify these values unless the backend has been updated.
 * Any mismatch will cause 422 Validation Errors from the API.
 */

// ============================================================================
// GLUCOSE READING TYPES
// Source: glucoserver/models/glucose_reading_model.py
// ============================================================================

/**
 * Valid reading_type values for glucose readings.
 * Backend: ReadingTypeEnum (Pydantic enum)
 *
 * IMPORTANT: These are the ONLY values the backend accepts.
 * Values like 'NOCHE', 'AYUNO', 'FASTING', 'NIGHT' are NOT valid.
 */
export const BACKEND_READING_TYPES = [
  'DESAYUNO',
  'ALMUERZO',
  'MERIENDA',
  'CENA',
  'EJERCICIO',
  'OTRAS_COMIDAS',
  'OTRO',
] as const;

export type BackendReadingType = (typeof BACKEND_READING_TYPES)[number];

/**
 * Human-readable descriptions for documentation
 */
export const READING_TYPE_DESCRIPTIONS: Record<BackendReadingType, string> = {
  DESAYUNO: 'Breakfast (morning meals)',
  ALMUERZO: 'Lunch (midday meals)',
  MERIENDA: 'Snack (between meals)',
  CENA: 'Dinner (evening meals)',
  EJERCICIO: 'Exercise-related reading',
  OTRAS_COMIDAS: 'Other meals (bedtime, fasting, etc.)',
  OTRO: 'Other/unspecified',
};

// ============================================================================
// APPOINTMENT MOTIVES
// Source: appointments/app/schemas/appointment_schema.py
// ============================================================================

/**
 * Valid motive values for appointments.
 * Backend: MotivesEnum (Pydantic enum)
 *
 * IMPORTANT: These are the ONLY values the backend accepts.
 * Values like 'control_routine', 'follow_up', 'emergency' are NOT valid.
 */
export const BACKEND_APPOINTMENT_MOTIVES = [
  'AJUSTE',
  'HIPOGLUCEMIA',
  'HIPERGLUCEMIA',
  'CETOSIS',
  'DUDAS',
  'OTRO',
] as const;

export type BackendAppointmentMotive = (typeof BACKEND_APPOINTMENT_MOTIVES)[number];

/**
 * Human-readable descriptions for documentation
 */
export const MOTIVE_DESCRIPTIONS: Record<BackendAppointmentMotive, string> = {
  AJUSTE: 'Treatment/dose adjustment',
  HIPOGLUCEMIA: 'Hypoglycemia (low blood sugar)',
  HIPERGLUCEMIA: 'Hyperglycemia (high blood sugar)',
  CETOSIS: 'Ketosis',
  DUDAS: 'Questions/doubts',
  OTRO: 'Other',
};

// ============================================================================
// APPOINTMENT QUEUE STATES
// Source: appointments/app/schemas/queue_schema.py
// ============================================================================

/**
 * Valid appointment queue states from the backend.
 * Backend: AppointmentStateEnum (Pydantic enum)
 *
 * Includes 'NONE' - returned when user has no appointment in queue.
 */
export const BACKEND_QUEUE_STATES = ['PENDING', 'ACCEPTED', 'DENIED', 'CREATED', 'NONE'] as const;

export type BackendQueueState = (typeof BACKEND_QUEUE_STATES)[number];

/**
 * Frontend-only queue states (not from backend)
 */
export const FRONTEND_ONLY_QUEUE_STATES = [] as const;

export type FrontendOnlyQueueState = (typeof FRONTEND_ONLY_QUEUE_STATES)[number];

/**
 * All queue states (backend + frontend)
 */
export const ALL_QUEUE_STATES = [...BACKEND_QUEUE_STATES, ...FRONTEND_ONLY_QUEUE_STATES] as const;

export type AllQueueState = BackendQueueState | FrontendOnlyQueueState;

/**
 * Human-readable descriptions for documentation
 */
export const QUEUE_STATE_DESCRIPTIONS: Record<AllQueueState, string> = {
  PENDING: 'Request submitted, waiting for review',
  ACCEPTED: 'Request accepted, user can fill the form',
  DENIED: 'Request denied by admin',
  CREATED: 'Appointment form has been submitted',
  NONE: 'No queue entry exists (frontend-only state)',
};

// ============================================================================
// API ENDPOINT CONTRACTS
// ============================================================================

/**
 * API endpoint paths used by the frontend
 * These should match the routes defined in api-gateway-service.ts
 */
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/token',
  AUTH_REGISTER: '/users/register',

  // Users
  USERS_ME: '/users/me',

  // Glucose
  GLUCOSE_LIST: '/glucose/mine',
  GLUCOSE_CREATE: '/glucose/create',

  // Appointments
  APPOINTMENTS_LIST: '/appointments/mine',
  APPOINTMENTS_CREATE: '/appointments/create',
  APPOINTMENTS_QUEUE_STATE: '/appointments/state',
  APPOINTMENTS_QUEUE_SUBMIT: '/appointments/submit',
} as const;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a value is a valid backend reading type
 */
export function isValidBackendReadingType(value: string): value is BackendReadingType {
  return BACKEND_READING_TYPES.includes(value as BackendReadingType);
}

/**
 * Check if a value is a valid backend appointment motive
 */
export function isValidBackendMotive(value: string): value is BackendAppointmentMotive {
  return BACKEND_APPOINTMENT_MOTIVES.includes(value as BackendAppointmentMotive);
}

/**
 * Check if a value is a valid backend queue state
 */
export function isValidBackendQueueState(value: string): value is BackendQueueState {
  return BACKEND_QUEUE_STATES.includes(value as BackendQueueState);
}

/**
 * Assert a value is a valid backend reading type or throw
 */
export function assertValidReadingType(value: string): asserts value is BackendReadingType {
  if (!isValidBackendReadingType(value)) {
    throw new Error(
      `Invalid reading_type "${value}". Valid values: ${BACKEND_READING_TYPES.join(', ')}`
    );
  }
}

/**
 * Assert a value is a valid backend motive or throw
 */
export function assertValidMotive(value: string): asserts value is BackendAppointmentMotive {
  if (!isValidBackendMotive(value)) {
    throw new Error(
      `Invalid motive "${value}". Valid values: ${BACKEND_APPOINTMENT_MOTIVES.join(', ')}`
    );
  }
}
