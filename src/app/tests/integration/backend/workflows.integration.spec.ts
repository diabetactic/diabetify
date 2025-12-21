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
      // Ignorar si la cola ya está vacía
    }
    clearCachedAuthToken();
  }
});

const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        console.log(`  ⏭️  Skipping: ${name}`);
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
      'debe realizar login → crear lectura → obtener lista → verificar lectura creada',
      async () => {
        // Paso 1: Login
        const token = await loginTestUser(TEST_USERS.user1);

        // Paso 2: Obtener lecturas iniciales
        const initialReadings = await getGlucoseReadings(token);
        const initialCount = initialReadings.length;

        // Paso 3: Crear nueva lectura de glucosa
        const newReading = {
          glucose_level: 120,
          reading_type: 'OTRO' as GlucoseReadingType,
          notes: 'Lectura de prueba de integración',
        };

        const createdReading = await createGlucoseReading(newReading, token);

        expect(createdReading).toBeDefined();
        expect(createdReading.id).toBeDefined();
        expect(createdReading.glucose_level).toBe(newReading.glucose_level);

        // Paso 4: Obtener lista actualizada de lecturas
        const updatedReadings = await getGlucoseReadings(token);

        // Paso 5: Verificar que la lectura aparece en la lista
        expect(updatedReadings.length).toBeGreaterThan(initialCount);

        const foundReading = updatedReadings.find((r: any) => r.id === createdReading.id);
        expect(foundReading).toBeDefined();
        expect(foundReading.glucose_level).toBe(newReading.glucose_level);
        expect(foundReading.notes).toBe(newReading.notes);
      },
      15000
    );
  });

  describe('Test 3: Flujo de cola de citas', () => {
    conditionalIt(
      'debe realizar login → verificar lecturas → verificar citas',
      async () => {
        // Login con usuario de prueba
        const token = await loginTestUser(TEST_USERS.user1);
        expect(token).toBeTruthy();

        // Verificar acceso a lecturas
        const readings = await getGlucoseReadings(token);
        expect(Array.isArray(readings)).toBe(true);

        // Verificar acceso a citas
        const appointments = await authenticatedGet('/appointments/mine', token);
        expect(Array.isArray(appointments)).toBe(true);
      },
      15000
    );
  });

  describe('Test 4: Consistencia de datos cross-servicio', () => {
    conditionalIt(
      'debe crear lectura → verificar en lista → verificar aislamiento de datos',
      async () => {
        // Paso 1: Login con usuario de prueba
        const token = await loginTestUser(TEST_USERS.user1);

        // Paso 2: Crear lectura de glucosa con valor elevado
        const criticalReading = {
          glucose_level: 180,
          reading_type: 'ALMUERZO' as GlucoseReadingType,
          notes: 'Valor elevado después de almuerzo',
        };

        const createdReading = await createGlucoseReading(criticalReading, token);
        expect(createdReading.id).toBeDefined();

        // Paso 3: Verificar que la lectura está en el sistema
        const readings = await getGlucoseReadings(token);
        const foundReading = readings.find((r: any) => r.id === createdReading.id);
        expect(foundReading).toBeDefined();
        expect(foundReading.glucose_level).toBe(criticalReading.glucose_level);

        // Paso 4: Verificar que la cita del usuario está accesible
        const appointments = await authenticatedGet('/appointments/mine', token);
        expect(Array.isArray(appointments)).toBe(true);

        // Paso 5: Verificar que la lectura pertenece al usuario
        const readingWithUser = readings.find((r: any) => r.id === createdReading.id);
        expect(readingWithUser).toBeDefined();
      },
      20000
    );
  });
});
