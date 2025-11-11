/**
 * Appointment-related models for tele-appointments feature
 */

/**
 * Appointment status enum
 */
export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

/**
 * Appointment type enum
 */
export enum AppointmentType {
  VIDEO = 'video',
  IN_PERSON = 'in_person',
  PHONE = 'phone',
}

/**
 * Healthcare provider model
 */
export interface Provider {
  id: string;
  name: string;
  specialty?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
}

/**
 * Appointment model
 */
export interface Appointment {
  id: string;
  userId: string;
  provider: Provider;
  dateTime: string; // ISO 8601 format
  duration: number; // Duration in minutes
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  location?: string; // Physical location for in-person appointments
  videoCallUrl?: string; // Video call URL for video appointments
  phoneNumber?: string; // Phone number for phone appointments
  glucoseDataShared?: boolean;
  glucoseShareDate?: string; // ISO 8601 format
  glucoseRecordCount?: number;
  cancellationReason?: string;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Appointment list response from API
 */
export interface AppointmentListResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Create appointment request
 */
export interface CreateAppointmentRequest {
  providerId: string;
  dateTime: string;
  duration: number;
  type: AppointmentType;
  reason?: string;
  notes?: string;
}

/**
 * Update appointment request
 */
export interface UpdateAppointmentRequest {
  dateTime?: string;
  duration?: number;
  type?: AppointmentType;
  reason?: string;
  notes?: string;
  status?: AppointmentStatus;
}

/**
 * Cancel appointment request
 */
export interface CancelAppointmentRequest {
  reason?: string;
}

/**
 * Reschedule appointment request
 */
export interface RescheduleAppointmentRequest {
  newDateTime: string;
  reason?: string;
}
