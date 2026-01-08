/**
 * Appointment models - aligned with ExtServices backend
 *
 * The backend provides CLINICAL treatment data, not scheduling data.
 * These models match the actual API response from the appointments service.
 */

/**
 * Appointment (clinical treatment record) from ExtServices API
 * This is what the backend actually returns and accepts
 */
export interface Appointment {
  appointment_id: number;
  user_id: number;
  glucose_objective: number;
  insulin_type: string;
  dose: number;
  fast_insulin: string;
  fixed_dose: number;
  ratio: number;
  sensitivity: number;
  pump_type: string;
  another_treatment?: string | null;
  control_data: string;
  motive: string[];
  other_motive?: string | null;
  status: string;
  timestamps: { [key: string]: string };
}

/**
 * Request to create a new appointment (clinical form)
 */
export interface CreateAppointmentRequest {
  glucose_objective: number;
  insulin_type: string;
  dose: number;
  fast_insulin: string;
  fixed_dose: number;
  ratio: number;
  sensitivity: number;
  pump_type: string;
  control_data: string;
  motive: string[];
  other_motive?: string;
  another_treatment?: string;
}

/**
 * Appointment list response from API
 */
export interface AppointmentListResponse {
  appointments: Appointment[];
  total?: number;
}

/**
 * Common appointment motives (for UI dropdowns)
 * Backend enum: AJUSTE, HIPOGLUCEMIA, HIPERGLUCEMIA, CETOSIS, DUDAS, OTRO
 */
export const APPOINTMENT_MOTIVES = [
  'AJUSTE',
  'HIPOGLUCEMIA',
  'HIPERGLUCEMIA',
  'CETOSIS',
  'DUDAS',
  'OTRO',
] as const;

export type AppointmentMotive = (typeof APPOINTMENT_MOTIVES)[number];

/**
 * Mapping from backend motive to translation keys for UI display
 */
export const MOTIVE_TRANSLATION_KEYS: Record<AppointmentMotive, string> = {
  AJUSTE: 'appointments.motives.adjustment',
  HIPOGLUCEMIA: 'appointments.motives.hypoglycemia',
  HIPERGLUCEMIA: 'appointments.motives.hyperglycemia',
  CETOSIS: 'appointments.motives.ketosis',
  DUDAS: 'appointments.motives.questions',
  OTRO: 'appointments.motives.other',
};

/**
 * Common insulin types (for UI dropdowns)
 */
export const INSULIN_TYPES = ['rapid', 'short', 'intermediate', 'long', 'mixed', 'none'] as const;

export type InsulinType = (typeof INSULIN_TYPES)[number];

/**
 * Common pump types (for UI dropdowns)
 */
export const PUMP_TYPES = ['medtronic', 'omnipod', 'tandem', 'none', 'other'] as const;

export type PumpType = (typeof PUMP_TYPES)[number];

/**
 * Appointment queue states
 * CREATED: User has created an appointment (after being ACCEPTED)
 */
export const QUEUE_STATES = [
  'PENDING',
  'ACCEPTED',
  'DENIED',
  'CREATED',
  'NONE',
  'BLOCKED',
] as const;

export type AppointmentQueueState = (typeof QUEUE_STATES)[number];

/**
 * Response from GET /appointments/state
 */
export interface AppointmentQueueStateResponse {
  state: AppointmentQueueState;
  position?: number;
  message?: string;
}

/**
 * Response from POST /appointments/submit
 */
export interface AppointmentSubmitResponse {
  success: boolean;
  state: AppointmentQueueState;
  position?: number;
  message?: string;
}

/**
 * Response from GET /appointments/{id}/resolution
 * Contains doctor's treatment recommendations from the resolution
 */
export interface AppointmentResolutionResponse {
  appointment_id: number;
  // Treatment change recommendations
  change_basal_type: string;
  change_basal_dose: number;
  change_basal_time: string;
  change_fast_type: string;
  change_ratio: number;
  change_sensitivity: number;
  // Flags
  emergency_care: boolean;
  needed_physical_appointment: boolean;
  // Optional
  glucose_scale?: string | null;
  // Legacy fields (for backwards compatibility with old UI expectations)
  state?: AppointmentQueueState;
  resolved_at?: string;
  resolved_by?: string;
  notes?: string;
}
