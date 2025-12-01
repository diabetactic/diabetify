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
  // Client-side scheduling fields (not from backend)
  scheduled_date?: Date;
  reminder_minutes_before?: number; // Default: 30 minutes
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
 */
export const APPOINTMENT_MOTIVES = [
  'control_routine',
  'follow_up',
  'emergency',
  'consultation',
  'adjustment',
  'other',
] as const;

export type AppointmentMotive = (typeof APPOINTMENT_MOTIVES)[number];

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
export const QUEUE_STATES = ['PENDING', 'ACCEPTED', 'DENIED', 'CREATED', 'NONE'] as const;

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
 */
export interface AppointmentResolutionResponse {
  appointment_id: number;
  state: AppointmentQueueState;
  resolved_at?: string;
  resolved_by?: string;
  notes?: string;
}
