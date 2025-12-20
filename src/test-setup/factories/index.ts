/**
 * Test Data Factories
 *
 * Exporta todas las factories para crear datos de prueba en el proyecto Diabetify.
 * Estas factories proporcionan datos mock realistas para pruebas unitarias e integración.
 *
 * @example
 * ```typescript
 * import {
 *   createMockReading,
 *   createMockAppointment,
 *   createMockUserProfile
 * } from '@test-setup/factories';
 *
 * const reading = createMockReading({ value: 120 });
 * const appointment = createMockAppointment({ motive: ['HIPOGLUCEMIA'] });
 * const profile = createMockUserProfile({ age: 12 });
 * ```
 */

// Readings factories
export {
  createMockReading,
  createMockSMBGReading,
  createMockCBGReading,
  createMockReadings,
  createReadingWithStatus,
  createReadingsWithAllStatuses,
  createDailyGlucosePattern,
  createUnsyncedReadings,
} from './readings.factory';

// Appointments factories
export {
  createMockAppointment,
  createMockAppointments,
  createMockAppointmentRequest,
  createAppointmentWithMotive,
  createAppointmentWithInsulin,
  createScheduledAppointment,
  createUpcomingAppointments,
  createMockQueueStateResponse,
  createMockResolutionResponse,
  createEmergencyResolution,
  createResolvedAppointments,
  resetAppointmentIdCounter,
} from './appointments.factory';

// Profile factories
export {
  createMockUserProfile,
  createMockUserProfiles,
  createMockUserPreferences,
  createMockTidepoolConnection,
  createMockAvatar,
  createMockTargetRange,
  createProfileWithAccountState,
  createChildProfile,
  createTeenProfile,
  createProfileWithTheme,
  createProfileWithEmergencyContact,
  createProfileWithoutOnboarding,
  resetProfileIdCounter,
} from './profile.factory';
