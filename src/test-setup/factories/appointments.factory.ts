/**
 * Factory para crear datos de prueba de citas médicas (appointments)
 * Proporciona funciones helper para generar Appointment con valores realistas
 */

import type {
  Appointment,
  CreateAppointmentRequest,
  AppointmentMotive,
  InsulinType,
  PumpType,
  AppointmentQueueState,
  AppointmentQueueStateResponse,
  AppointmentResolutionResponse,
} from '@models/appointment.model';

/**
 * ID counter para appointments mock
 */
let appointmentIdCounter = 1;

/**
 * Genera un ID único para appointments
 */
const generateAppointmentId = (): number => {
  return appointmentIdCounter++;
};

/**
 * Resetea el contador de IDs (útil para tests)
 */
export const resetAppointmentIdCounter = (): void => {
  appointmentIdCounter = 1;
};

/**
 * Configuración por defecto para appointments
 */
const DEFAULT_APPOINTMENT_CONFIG = {
  userId: 1000,
  glucoseObjective: 120,
  dose: 10,
  fixedDose: 5,
  ratio: 10,
  sensitivity: 50,
};

/**
 * Crea un appointment mock completo
 *
 * @param overrides - Valores para sobrescribir los defaults
 * @returns Appointment completo
 *
 * @example
 * ```typescript
 * // Appointment básico
 * const appointment = createMockAppointment();
 *
 * // Appointment con valores específicos
 * const appointment = createMockAppointment({
 *   glucose_objective: 110,
 *   insulin_type: 'rapid',
 *   motive: ['HIPOGLUCEMIA']
 * });
 * ```
 */
export const createMockAppointment = (
  overrides?: Partial<Appointment>
): Appointment => {
  return {
    appointment_id: generateAppointmentId(),
    user_id: DEFAULT_APPOINTMENT_CONFIG.userId,
    glucose_objective: DEFAULT_APPOINTMENT_CONFIG.glucoseObjective,
    insulin_type: 'rapid',
    dose: DEFAULT_APPOINTMENT_CONFIG.dose,
    fast_insulin: 'novorapid',
    fixed_dose: DEFAULT_APPOINTMENT_CONFIG.fixedDose,
    ratio: DEFAULT_APPOINTMENT_CONFIG.ratio,
    sensitivity: DEFAULT_APPOINTMENT_CONFIG.sensitivity,
    pump_type: 'none',
    control_data: 'Glucosa estable últimas 2 semanas',
    motive: ['AJUSTE'],
    another_treatment: null,
    other_motive: null,
    ...overrides,
  };
};

/**
 * Crea múltiples appointments
 *
 * @param count - Número de appointments a crear
 * @param overrides - Valores para sobrescribir en todos los appointments
 * @returns Array de appointments
 *
 * @example
 * ```typescript
 * const appointments = createMockAppointments(5);
 * const userAppointments = createMockAppointments(3, { user_id: 1001 });
 * ```
 */
export const createMockAppointments = (
  count: number,
  overrides?: Partial<Appointment>
): Appointment[] => {
  return Array.from({ length: count }, () => createMockAppointment(overrides));
};

/**
 * Crea un CreateAppointmentRequest mock
 *
 * @param overrides - Valores para sobrescribir los defaults
 * @returns Request de creación de appointment
 *
 * @example
 * ```typescript
 * const request = createMockAppointmentRequest({
 *   motive: ['HIPOGLUCEMIA', 'DUDAS'],
 *   other_motive: 'Consulta sobre alimentación'
 * });
 * ```
 */
export const createMockAppointmentRequest = (
  overrides?: Partial<CreateAppointmentRequest>
): CreateAppointmentRequest => {
  return {
    glucose_objective: DEFAULT_APPOINTMENT_CONFIG.glucoseObjective,
    insulin_type: 'rapid',
    dose: DEFAULT_APPOINTMENT_CONFIG.dose,
    fast_insulin: 'novorapid',
    fixed_dose: DEFAULT_APPOINTMENT_CONFIG.fixedDose,
    ratio: DEFAULT_APPOINTMENT_CONFIG.ratio,
    sensitivity: DEFAULT_APPOINTMENT_CONFIG.sensitivity,
    pump_type: 'none',
    control_data: 'Glucosa estable últimas 2 semanas',
    motive: ['AJUSTE'],
    ...overrides,
  };
};

/**
 * Crea un appointment con un motivo específico
 *
 * @param motive - Motivo del appointment
 * @param additionalMotives - Motivos adicionales (opcional)
 * @returns Appointment con el motivo especificado
 *
 * @example
 * ```typescript
 * const hypoglycemiaAppointment = createAppointmentWithMotive('HIPOGLUCEMIA');
 * const multiMotiveAppointment = createAppointmentWithMotive('AJUSTE', ['DUDAS']);
 * ```
 */
export const createAppointmentWithMotive = (
  motive: AppointmentMotive,
  additionalMotives?: AppointmentMotive[]
): Appointment => {
  const motives = [motive, ...(additionalMotives || [])];
  return createMockAppointment({ motive: motives });
};

/**
 * Crea un appointment con tipo de insulina específico
 *
 * @param insulinType - Tipo de insulina
 * @param pumpType - Tipo de bomba (opcional)
 * @returns Appointment con la configuración de insulina especificada
 *
 * @example
 * ```typescript
 * const rapidInsulin = createAppointmentWithInsulin('rapid');
 * const pumpUser = createAppointmentWithInsulin('rapid', 'medtronic');
 * ```
 */
export const createAppointmentWithInsulin = (
  insulinType: InsulinType,
  pumpType?: PumpType
): Appointment => {
  return createMockAppointment({
    insulin_type: insulinType,
    pump_type: pumpType || 'none',
  });
};

/**
 * Crea un appointment programado (con fecha y recordatorio)
 *
 * @param scheduledDate - Fecha de la cita
 * @param reminderMinutes - Minutos antes para recordatorio (default: 30)
 * @returns Appointment programado
 *
 * @example
 * ```typescript
 * const tomorrow = new Date();
 * tomorrow.setDate(tomorrow.getDate() + 1);
 * const scheduled = createScheduledAppointment(tomorrow, 60);
 * ```
 */
export const createScheduledAppointment = (
  scheduledDate: Date,
  reminderMinutes: number = 30
): Appointment => {
  return createMockAppointment({
    scheduled_date: scheduledDate,
    reminder_minutes_before: reminderMinutes,
  });
};

/**
 * Crea appointments programados para los próximos N días
 *
 * @param days - Número de días
 * @param overrides - Valores para sobrescribir
 * @returns Array de appointments programados
 *
 * @example
 * ```typescript
 * const weekSchedule = createUpcomingAppointments(7);
 * ```
 */
export const createUpcomingAppointments = (
  days: number,
  overrides?: Partial<Appointment>
): Appointment[] => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    date.setHours(10, 0, 0, 0); // 10 AM por defecto

    return createScheduledAppointment(date, 30);
  }).map(appointment => ({ ...appointment, ...overrides }));
};

/**
 * Crea una respuesta de estado de cola mock
 *
 * @param state - Estado de la cola
 * @param position - Posición en la cola (opcional)
 * @returns Respuesta de estado de cola
 *
 * @example
 * ```typescript
 * const pending = createMockQueueStateResponse('PENDING', 5);
 * const accepted = createMockQueueStateResponse('ACCEPTED');
 * ```
 */
export const createMockQueueStateResponse = (
  state: AppointmentQueueState,
  position?: number
): AppointmentQueueStateResponse => {
  const messages: Record<AppointmentQueueState, string> = {
    PENDING: 'Tu solicitud está en cola de espera',
    ACCEPTED: 'Tu solicitud ha sido aceptada',
    DENIED: 'Tu solicitud ha sido rechazada',
    CREATED: 'Cita creada exitosamente',
    NONE: 'No tienes solicitudes pendientes',
    BLOCKED: 'Tu cuenta está bloqueada',
  };

  return {
    state,
    position,
    message: messages[state],
  };
};

/**
 * Crea una respuesta de resolución de appointment mock
 *
 * @param appointmentId - ID del appointment
 * @param overrides - Valores para sobrescribir
 * @returns Respuesta de resolución
 *
 * @example
 * ```typescript
 * const resolution = createMockResolutionResponse(123, {
 *   emergency_care: true,
 *   change_basal_dose: 15
 * });
 * ```
 */
export const createMockResolutionResponse = (
  appointmentId: number,
  overrides?: Partial<AppointmentResolutionResponse>
): AppointmentResolutionResponse => {
  return {
    appointment_id: appointmentId,
    change_basal_type: 'lantus',
    change_basal_dose: 10,
    change_basal_time: '22:00',
    change_fast_type: 'novorapid',
    change_ratio: 12,
    change_sensitivity: 45,
    emergency_care: false,
    needed_physical_appointment: false,
    glucose_scale: null,
    state: 'CREATED',
    resolved_at: new Date().toISOString(),
    resolved_by: 'Dr. García',
    notes: 'Ajuste de dosis según patrón de glucosa',
    ...overrides,
  };
};

/**
 * Crea una resolución que requiere atención de emergencia
 *
 * @param appointmentId - ID del appointment
 * @returns Resolución con bandera de emergencia
 *
 * @example
 * ```typescript
 * const emergency = createEmergencyResolution(123);
 * ```
 */
export const createEmergencyResolution = (
  appointmentId: number
): AppointmentResolutionResponse => {
  return createMockResolutionResponse(appointmentId, {
    emergency_care: true,
    needed_physical_appointment: true,
    notes: 'Requiere atención médica urgente',
  });
};

/**
 * Crea múltiples appointments con diferentes estados de resolución
 *
 * @param count - Número de appointments
 * @returns Array de appointments con resoluciones variadas
 *
 * @example
 * ```typescript
 * const resolved = createResolvedAppointments(3);
 * ```
 */
export const createResolvedAppointments = (
  count: number
): Array<{ appointment: Appointment; resolution: AppointmentResolutionResponse }> => {
  return Array.from({ length: count }, () => {
    const appointment = createMockAppointment();
    const resolution = createMockResolutionResponse(appointment.appointment_id);
    return { appointment, resolution };
  });
};
