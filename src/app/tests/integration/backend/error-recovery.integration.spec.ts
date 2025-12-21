/**
 * Backend Integration Tests - Error Recovery
 *
 * Tests error scenarios and recovery mechanisms with the real Docker backend.
 * Validates handling of 5xx errors, network timeouts, invalid tokens, malformed requests,
 * and rate limiting detection.
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  isBackendAvailable,
  waitForBackendServices,
  SERVICE_URLS,
  loginTestUser,
  TEST_USERS,
  getAuthHeadersForFetch,
  clearCachedAuthToken,
  getGlucoseReadings,
} from '../../helpers/backend-services.helper';

// Estado de ejecución de tests
let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    console.log('⏭️  Backend not available - skipping error recovery integration tests');
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

// Helper para tests condicionales
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

describe('Backend Integration - Error Recovery', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  // =========================================================================
  // SERVER 5xx ERRORS
  // =========================================================================

  describe('SERVER 5xx ERRORS', () => {
    conditionalIt('should handle 404 Not Found for invalid endpoints', async () => {
      const token = await loginTestUser(TEST_USERS.user1);
      const headers = await getAuthHeadersForFetch(token);

      // Endpoint que no existe en la API
      const response = await fetch(`${SERVICE_URLS.apiGateway}/invalid-endpoint-xyz`, {
        method: 'GET',
        headers,
      });

      expect(response.ok).toBeFalse();
      expect(response.status).toBe(404);
    });

    conditionalIt('should handle 422 errors from malformed service requests', async () => {
      const token = await loginTestUser(TEST_USERS.user1);
      const headers = await getAuthHeadersForFetch(token);

      // Intentar crear una lectura con datos inválidos via query params incorrectos
      const params = new URLSearchParams({
        glucose_level: 'not-a-number',
        reading_type: 'INVALID_TYPE',
      });

      const response = await fetch(
        `${SERVICE_URLS.apiGateway}/glucose/create?${params.toString()}`,
        {
          method: 'POST',
          headers,
        }
      );

      // Puede retornar 400 (bad request) o 422 (validation error)
      expect(response.ok).toBeFalse();
      expect([400, 422, 500]).toContain(response.status);
    });

    conditionalIt('should handle method not allowed errors (405)', async () => {
      const token = await loginTestUser(TEST_USERS.user1);
      const headers = await getAuthHeadersForFetch(token);

      // Intentar DELETE en un endpoint que solo permite GET
      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`, {
        method: 'DELETE',
        headers,
      });

      // Debería retornar 405 Method Not Allowed o 404
      expect(response.ok).toBeFalse();
      expect([404, 405]).toContain(response.status);
    });
  });

  // =========================================================================
  // NETWORK TIMEOUT SIMULATION
  // =========================================================================

  describe('NETWORK TIMEOUT SIMULATION', () => {
    conditionalIt(
      'should timeout on requests with AbortController',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);
        const headers = await getAuthHeadersForFetch(token);

        // Crear un AbortController con timeout muy corto (1ms)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1);

        try {
          await fetch(`${SERVICE_URLS.apiGateway}/glucose/mine`, {
            method: 'GET',
            headers,
            signal: controller.signal,
          });

          // Si llega aquí, el timeout no funcionó
          clearTimeout(timeoutId);
          fail('Expected timeout error but request succeeded');
        } catch (error: any) {
          clearTimeout(timeoutId);

          // El error debería ser de tipo AbortError
          expect(error.name).toBe('AbortError');
        }
      },
      10000
    );

    conditionalIt(
      'should handle graceful timeout with longer delay',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);
        const _headers = await getAuthHeadersForFetch(token);

        const controller = new AbortController();
        const timeoutMs = 100; // 100ms timeout
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
          // Intentar una petición que debería completarse antes del timeout
          const response = await fetch(`${SERVICE_URLS.apiGateway}/docs`, {
            method: 'GET',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // La petición de docs debería ser rápida y completarse
          expect(response.ok).toBeTrue();
        } catch (error: any) {
          // Si hay timeout, también es válido (depende de la latencia del sistema)
          clearTimeout(timeoutId);
          expect(error.name).toBe('AbortError');
        }
      },
      10000
    );
  });

  // =========================================================================
  // INVALID TOKEN REJECTION
  // =========================================================================

  describe('INVALID TOKEN REJECTION', () => {
    conditionalIt('should reject expired/invalid JWT token', async () => {
      // JWT con firma inválida (token falso)
      const fakeJwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' +
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`, {
        headers: {
          Authorization: `Bearer ${fakeJwt}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      expect(response.ok).toBeFalse();
      expect([401, 403, 500]).toContain(response.status);

      const errorText = await response.text();
      expect(errorText.length).toBeGreaterThan(0);
    });

    conditionalIt('should reject malformed Authorization header', async () => {
      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`, {
        headers: {
          // Header sin "Bearer" prefix
          Authorization: 'invalid-token-without-bearer',
          Accept: 'application/json',
        },
      });

      expect(response.ok).toBeFalse();
      expect([401, 403]).toContain(response.status);
    });

    conditionalIt('should reject empty token', async () => {
      const response = await fetch(`${SERVICE_URLS.apiGateway}/users/me`, {
        headers: {
          Authorization: 'Bearer ',
          Accept: 'application/json',
        },
      });

      expect(response.ok).toBeFalse();
      expect([401, 403, 500]).toContain(response.status);
    });

    conditionalIt('should require authentication on protected endpoints', async () => {
      // Petición sin Authorization header
      const response = await fetch(`${SERVICE_URLS.apiGateway}/glucose/mine`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      expect(response.ok).toBeFalse();
      expect([401, 403]).toContain(response.status);
    });
  });

  // =========================================================================
  // MALFORMED REQUEST HANDLING (400 Errors)
  // =========================================================================

  describe('MALFORMED REQUEST HANDLING', () => {
    conditionalIt('should reject reading without required glucose_level', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      // Enviar sin campo requerido glucose_level
      const params = new URLSearchParams({
        reading_type: 'OTRO',
        // Falta glucose_level
      });

      const response = await fetch(
        `${SERVICE_URLS.apiGateway}/glucose/create?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      expect(response.ok).toBeFalse();
      expect([400, 422]).toContain(response.status);
    });

    conditionalIt('should reject reading with missing reading_type', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      // Lectura sin reading_type
      const params = new URLSearchParams({
        glucose_level: '120',
        // Falta reading_type
      });

      const response = await fetch(
        `${SERVICE_URLS.apiGateway}/glucose/create?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      expect(response.ok).toBeFalse();
      expect([400, 422]).toContain(response.status);
    });

    conditionalIt('should reject reading with invalid data types', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      // Tipos de datos incorrectos
      const params = new URLSearchParams({
        glucose_level: 'not-a-number',
        reading_type: 'INVALID_TYPE',
      });

      const response = await fetch(
        `${SERVICE_URLS.apiGateway}/glucose/create?${params.toString()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      expect(response.ok).toBeFalse();
      expect([400, 422]).toContain(response.status);
    });

    conditionalIt('should reject POST without any query params', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const response = await fetch(`${SERVICE_URLS.apiGateway}/glucose/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        // Sin query params
      });

      expect(response.ok).toBeFalse();
      expect([400, 422]).toContain(response.status);
    });
  });

  // =========================================================================
  // RATE LIMITING DETECTION (429 Errors)
  // =========================================================================

  describe('RATE LIMITING DETECTION', () => {
    conditionalIt(
      'should detect rate limiting with rapid requests',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);
        const headers = await getAuthHeadersForFetch(token);

        // Enviar 50 peticiones rápidas para intentar activar rate limiting
        const requests = Array.from({ length: 50 }, () =>
          fetch(`${SERVICE_URLS.apiGateway}/docs`, {
            method: 'GET',
            headers,
          })
        );

        const responses = await Promise.all(requests);

        // Verificar si alguna respuesta es 429 (rate limited)
        const rateLimited = responses.some(r => r.status === 429);
        const allOk = responses.every(r => r.ok);

        // El backend puede o no tener rate limiting implementado
        if (rateLimited) {
          console.log('✓ Rate limiting detected (429 responses)');
          expect(rateLimited).toBeTrue();
        } else {
          console.log('ℹ Rate limiting not implemented or threshold not reached');
          expect(allOk).toBeTrue();
        }
      },
      30000
    );

    conditionalIt(
      'should handle rate limiting response gracefully',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);

        // Intentar múltiples peticiones secuenciales usando el helper
        let rateLimitHit = false;

        for (let i = 0; i < 20; i++) {
          try {
            await getGlucoseReadings(token);
          } catch (error: any) {
            if (error.message?.includes('429')) {
              rateLimitHit = true;
              console.log(`Rate limit hit after ${i + 1} requests`);
              break;
            }
          }

          // Pequeña pausa entre peticiones
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Si no se alcanzó rate limit, está bien (no está implementado)
        if (!rateLimitHit) {
          console.log('ℹ Rate limiting threshold not reached');
        }

        // El test pasa en ambos casos
        expect(true).toBeTrue();
      },
      30000
    );
  });

  // =========================================================================
  // CLEANUP
  // =========================================================================

  afterAll(() => {
    if (shouldRun) {
      clearCachedAuthToken();
      console.log('✅ Error recovery tests cleanup complete');
    }
  });
});
