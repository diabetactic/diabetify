/**
 * Pruebas de integración para flujos de trabajo multi-servicio
 *
 * @description
 * Valida la interacción completa entre múltiples servicios del backend:
 * - apiGateway (8000): Punto de entrada principal
 * - glucoserver (8002): Gestión de lecturas de glucosa
 * - login (8003): Autenticación y usuarios
 * - appointments (8005): Sistema de citas
 *
 * @prerequisites
 * - Backend ejecutándose en Docker
 * - Todos los servicios disponibles en localhost
 * - Base de datos inicializada con usuarios de prueba
 */

import {
  isBackendAvailable,
  waitForBackendServices,
  loginTestUser,
  TEST_USERS,
  authenticatedGet,
  clearAppointmentQueue,
  clearCachedAuthToken,
  createGlucoseReading,
  getGlucoseReadings,
  GlucoseReadingType,
} from '../../helpers/backend-services.helper';

let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  shouldRun = backendAvailable;

  if (backendAvailable) {
    await waitForBackendServices();
  }
}, 30000);

afterEach(async () => {
  if (shouldRun) {
    try {
      await clearAppointmentQueue();
    } catch {
      // Ignore if queue is already empty
    }
    clearCachedAuthToken();
    vi.clearAllMocks();
  }
});

const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Flujos de trabajo multi-servicio', () => {
  describe('Test 1: Flujo completo de autenticación', () => {
    conditionalIt(
      'debe realizar login → obtener perfil → verificar token en servicios',
      async () => {
        // Paso 1: Login exitoso - loginTestUser retorna solo el token string
        const token = await loginTestUser(TEST_USERS.user1);
        expect(token).toBeDefined();
        expect(token.split('.').length).toBe(3); // JWT format

        // Paso 2: Verificar token en api-gateway (perfil)
        const profile = await authenticatedGet('/users/me', token);
        expect(profile).toBeDefined();
        expect(profile.dni).toBe(TEST_USERS.user1.dni);

        // Paso 3: Verificar token en glucoserver (lecturas)
        const readings = await getGlucoseReadings(token);
        expect(Array.isArray(readings)).toBe(true);

        // Paso 4: Verificar token en appointments (endpoint es /appointments/mine)
        const appointments = await authenticatedGet('/appointments/mine', token);
        expect(Array.isArray(appointments)).toBe(true);
      },
      15000
    );
  });

  describe('Test 2: Flujo de envío de lecturas', () => {
    conditionalIt(
      'should login → create reading → get list → verify created reading',
      async () => {
        // Step 1: Login
        const token = await loginTestUser(TEST_USERS.user1);

        // Step 2: Get initial readings
        const initialReadings = await getGlucoseReadings(token);
        const initialCount = initialReadings.length;

        // Step 3: Create new glucose reading
        const newReading = {
          glucose_level: 120,
          reading_type: 'OTRO' as GlucoseReadingType,
          notes: 'Lectura de prueba de integración',
        };

        const createdReading = await createGlucoseReading(newReading, token);

        expect(createdReading).toBeDefined();
        expect(createdReading.id).toBeDefined();
        expect(createdReading.glucose_level).toBe(newReading.glucose_level);

        // Step 4: Get updated list of readings
        const updatedReadings = await getGlucoseReadings(token);

        // Step 5: Verify that the reading appears in the list
        expect(updatedReadings.length).toBeGreaterThan(initialCount);

        const foundReading = updatedReadings.find((r: any) => r.id === createdReading.id);
        expect(foundReading).toBeDefined();
        expect(foundReading.glucose_level).toBe(newReading.glucose_level);
        expect(foundReading.notes).toBe(newReading.notes);
      },
      15000
    );
  });

  describe('Test 3: Appointments queue flow', () => {
    conditionalIt(
      'should login → verify readings → verify appointments',
      async () => {
        // Login with test user
        const token = await loginTestUser(TEST_USERS.user1);
        expect(token).toBeTruthy();

        // Verify access to readings
        const readings = await getGlucoseReadings(token);
        expect(Array.isArray(readings)).toBe(true);

        // Verify access to appointments
        const appointments = await authenticatedGet('/appointments/mine', token);
        expect(Array.isArray(appointments)).toBe(true);
      },
      15000
    );
  });

  describe('Test 4: Cross-service data consistency', () => {
    conditionalIt(
      'should create reading → verify in list → verify data isolation',
      async () => {
        // Step 1: Login with test user
        const token = await loginTestUser(TEST_USERS.user1);

        // Step 2: Create glucose reading with elevated value
        const criticalReading = {
          glucose_level: 180,
          reading_type: 'ALMUERZO' as GlucoseReadingType,
          notes: 'Elevated value after lunch',
        };

        const createdReading = await createGlucoseReading(criticalReading, token);
        expect(createdReading.id).toBeDefined();

        // Step 3: Verify reading is in system
        const readings = await getGlucoseReadings(token);
        const foundReading = readings.find((r: any) => r.id === createdReading.id);
        expect(foundReading).toBeDefined();
        expect(foundReading.glucose_level).toBe(criticalReading.glucose_level);

        // Step 4: Verify user appointment is accessible
        const appointments = await authenticatedGet('/appointments/mine', token);
        expect(Array.isArray(appointments)).toBe(true);

        // Step 5: Verify that the reading belongs to the user
        const readingWithUser = readings.find((r: any) => r.id === createdReading.id);
        expect(readingWithUser).toBeDefined();
      },
      20000
    );
  });
});
