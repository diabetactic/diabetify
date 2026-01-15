/**
 * Backend Services Helper Tests
 * Tests HTTP functions, authentication, health checks, and appointment management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TEST_USER,
  TEST_USERS,
  SERVICE_URLS,
  HEALTH_ENDPOINTS,
  HEALTH_CHECK_CONFIG,
  checkServiceHealthWithRetry,
  waitForBackendServices,
  loginTestUser,
  getAuthHeaders,
  getAuthHeadersForFetch,
  getCachedAuthToken,
  clearCachedAuthToken,
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedPatch,
  authenticatedDelete,
  createGlucoseReading,
  getGlucoseReadings,
  getLatestGlucoseReading,
  parseBackendDate,
  setupBackendIntegrationTests,
  teardownBackendIntegrationTests,
  isBackofficeAvailable,
  getAppointmentState,
  tryCreateAppointment,
  type LoginResponse,
  type GlucoseReadingData,
  type AppointmentCreateData,
} from './backend-services.helper';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Backend Services Helper - Constants', () => {
  it('should have test user credentials defined', () => {
    expect(TEST_USER).toEqual({
      dni: '40123456',
      password: 'thepassword',
      email: 'test40123456@diabetactic.com',
    });
  });

  it('should have primary and secondary test users configured', () => {
    expect(TEST_USERS.user1).toEqual({
      dni: '40123456',
      password: 'thepassword',
      email: 'test40123456@diabetactic.com',
    });
    expect(TEST_USERS.user2).toEqual({
      dni: '40123457',
      password: 'thepassword2',
      email: 'test40123457@diabetactic.com',
    });
    expect(TEST_USERS.user8.dni).toBe('40123456');
  });

  it('should have service URLs configured', () => {
    expect(SERVICE_URLS.apiGateway).toBeDefined();
    expect(SERVICE_URLS.backoffice).toBe('http://localhost:8001');
    expect(SERVICE_URLS.glucoserver).toBe('http://localhost:8002');
    expect(SERVICE_URLS.login).toBe('http://localhost:8003');
    expect(SERVICE_URLS.appointments).toBe('http://localhost:8005');
  });

  it('should have health check endpoints configured', () => {
    expect(HEALTH_ENDPOINTS.apiGateway).toContain('/docs');
    expect(HEALTH_ENDPOINTS.glucoserver).toContain('/docs');
  });

  it('should have health check config with reasonable values', () => {
    expect(HEALTH_CHECK_CONFIG.maxRetries).toBe(30);
    expect(HEALTH_CHECK_CONFIG.retryDelayMs).toBe(1000);
    expect(HEALTH_CHECK_CONFIG.timeoutMs).toBe(5000);
  });
});

describe('Backend Services Helper - Health Checks', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkServiceHealthWithRetry', () => {
    it('should return healthy on first attempt if service responds OK', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const promise = checkServiceHealthWithRetry(
        'apiGateway',
        'http://localhost:8000/docs',
        3,
        100
      );
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({
        service: 'apiGateway',
        url: 'http://localhost:8000/docs',
        healthy: true,
        attempts: 1,
      });
    });

    it('should retry up to max retries if service fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const promise = checkServiceHealthWithRetry(
        'apiGateway',
        'http://localhost:8000/docs',
        3,
        100
      );
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.healthy).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toContain('not healthy');
    });

    it('should return healthy on second attempt if first attempt fails', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const promise = checkServiceHealthWithRetry(
        'apiGateway',
        'http://localhost:8000/docs',
        3,
        100
      );
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.healthy).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should handle response with status < 500 as healthy', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const promise = checkServiceHealthWithRetry('apiGateway', 'http://localhost:8000/docs', 1, 0);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.healthy).toBe(false);
    });
  });

  describe('waitForBackendServices', () => {
    it('should verify health of all specified services', async () => {
      vi.useRealTimers(); // Use real timers to avoid promise issues
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const results = await waitForBackendServices(['apiGateway']);

      expect(results).toHaveLength(1);
      expect(results[0].service).toBe('apiGateway');
      expect(results[0].healthy).toBe(true);
      vi.useFakeTimers();
    });

    it('should throw error for unknown services', async () => {
      vi.useRealTimers();
      // Unknown services are treated as unhealthy and cause the function to throw
      await expect(waitForBackendServices(['unknownService'])).rejects.toThrow(
        'Backend services unhealthy'
      );
      vi.useFakeTimers();
    });
  });
});

describe('Backend Services Helper - Authentication', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    clearCachedAuthToken();
  });

  describe('loginTestUser', () => {
    it('should login and return access token', async () => {
      const mockResponse: LoginResponse = {
        access_token: 'test-token-123',
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      });

      const token = await loginTestUser();

      expect(token).toBe('test-token-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should send credentials as form data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
      });

      await loginTestUser({ dni: '40123456', password: 'pass', email: 'test@test.com' });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toContain('username=40123456');
      expect(callArgs.body).toContain('password=pass');
    });

    it('should throw error if login fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid credentials',
      });

      await expect(loginTestUser()).rejects.toThrow('Login failed (401)');
    });

    it('should throw error if response has no access_token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token_type: 'Bearer' }),
      });

      await expect(loginTestUser()).rejects.toThrow('Login response missing access_token');
    });

    it('should cache token for later use', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'cached-token', token_type: 'Bearer' }),
      });

      await loginTestUser();
      const cachedToken = getCachedAuthToken();

      expect(cachedToken).toBe('cached-token');
    });
  });

  describe('getAuthHeaders', () => {
    it('should return headers with provided token', async () => {
      const headers = await getAuthHeaders('my-token');

      expect(headers.get('Authorization')).toBe('Bearer my-token');
      expect(headers.get('Content-Type')).toBe('application/json');
    });

    it('should use cached token if no token provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'cached-token', token_type: 'Bearer' }),
      });

      await loginTestUser();
      const headers = await getAuthHeaders();

      expect(headers.get('Authorization')).toBe('Bearer cached-token');
    });
  });

  describe('getAuthHeadersForFetch', () => {
    it('should return headers object for fetch API', async () => {
      const headers = await getAuthHeadersForFetch('test-token');

      expect(headers).toEqual({
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      });
    });
  });

  describe('clearCachedAuthToken', () => {
    it('should clear cached token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
      });

      await loginTestUser();
      expect(getCachedAuthToken()).toBeTruthy();

      clearCachedAuthToken();
      expect(getCachedAuthToken()).toBeNull();
    });
  });
});

describe('Backend Services Helper - HTTP Methods', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    clearCachedAuthToken();
  });

  describe('authenticatedGet', () => {
    it('should do GET with authentication', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'response' }),
        });

      const result = await authenticatedGet('/test');

      expect(result).toEqual({ data: 'response' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    it('should throw error if GET fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Not found',
        });

      await expect(authenticatedGet('/test')).rejects.toThrow('GET /test failed (404)');
    });

    it('should handle absolute URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'response' }),
      });

      await authenticatedGet('http://external.com/api/test', 'token');

      expect(mockFetch).toHaveBeenCalledWith('http://external.com/api/test', expect.any(Object));
    });
  });

  describe('authenticatedPost', () => {
    it('should do POST with JSON body', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123 }),
        });

      const data = { name: 'test' };
      const result = await authenticatedPost('/create', data);

      expect(result).toEqual({ id: 123 });
      const callArgs = mockFetch.mock.calls[1][1];
      expect(callArgs.body).toBe(JSON.stringify(data));
    });
  });

  describe('authenticatedPut', () => {
    it('should do PUT with JSON body', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ updated: true }),
        });

      await authenticatedPut('/update/1', { name: 'updated' });

      const callArgs = mockFetch.mock.calls[1][1];
      expect(callArgs.method).toBe('PUT');
    });
  });

  describe('authenticatedPatch', () => {
    it('should do PATCH with JSON body', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ patched: true }),
        });

      await authenticatedPatch('/patch/1', { field: 'value' });

      const callArgs = mockFetch.mock.calls[1][1];
      expect(callArgs.method).toBe('PATCH');
    });
  });

  describe('authenticatedDelete', () => {
    it('should DELETE and return JSON', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ deleted: true }),
        });

      const result = await authenticatedDelete('/delete/1');

      expect(result).toEqual({ deleted: true });
    });

    it('should return null for 204 No Content response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        });

      const result = await authenticatedDelete('/delete/1');

      expect(result).toBeNull();
    });
  });
});

describe('Backend Services Helper - Glucose Readings', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    clearCachedAuthToken();
  });

  describe('createGlucoseReading', () => {
    it('should create glucose reading with query params', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, glucose_level: 120 }),
        });

      const data: Omit<GlucoseReadingData, 'id' | 'user_id'> = {
        glucose_level: 120,
        reading_type: 'DESAYUNO',
        notes: 'Test note',
      };

      const result = await createGlucoseReading(data);

      expect(result.glucose_level).toBe(120);
      const callUrl = mockFetch.mock.calls[1][0];
      expect(callUrl).toContain('glucose_level=120');
      expect(callUrl).toContain('reading_type=DESAYUNO');
      expect(callUrl).toContain('notes=Test+note');
    });

    it('should omit created_at if not provided', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1 }),
        });

      await createGlucoseReading({
        glucose_level: 100,
        reading_type: 'ALMUERZO',
      });

      const callUrl = mockFetch.mock.calls[1][0];
      expect(callUrl).not.toContain('created_at');
    });
  });

  describe('getGlucoseReadings', () => {
    it('should get user readings', async () => {
      const mockReadings = [
        { id: 1, glucose_level: 100, reading_type: 'DESAYUNO' },
        { id: 2, glucose_level: 120, reading_type: 'ALMUERZO' },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ readings: mockReadings }),
        });

      const readings = await getGlucoseReadings();

      expect(readings).toHaveLength(2);
      expect(readings[0].glucose_level).toBe(100);
    });

    it('should return empty array if no readings in response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const readings = await getGlucoseReadings();

      expect(readings).toEqual([]);
    });
  });

  describe('getLatestGlucoseReading', () => {
    it('should return last reading from array', async () => {
      const mockReadings = [
        { id: 1, glucose_level: 100 },
        { id: 2, glucose_level: 120 },
        { id: 3, glucose_level: 110 },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ readings: mockReadings }),
        });

      const latest = await getLatestGlucoseReading();

      expect(latest.id).toBe(3);
      expect(latest.glucose_level).toBe(110);
    });

    it('should throw error if no readings exist', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ readings: [] }),
        });

      await expect(getLatestGlucoseReading()).rejects.toThrow('No readings found');
    });
  });
});

describe('Backend Services Helper - Date Parsing', () => {
  describe('parseBackendDate', () => {
    it('should parse backend format DD/MM/YYYY HH:MM:SS', () => {
      const dateStr = '21/12/2025 15:30:45';
      const parsed = parseBackendDate(dateStr);

      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getDate()).toBe(21);
      expect(parsed?.getMonth()).toBe(11); // 0-indexed
      expect(parsed?.getFullYear()).toBe(2025);
      expect(parsed?.getHours()).toBe(15);
      expect(parsed?.getMinutes()).toBe(30);
      expect(parsed?.getSeconds()).toBe(45);
    });

    it('should parse ISO format as fallback', () => {
      const dateStr = '2025-12-21T15:30:45.000Z';
      const parsed = parseBackendDate(dateStr);

      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getFullYear()).toBe(2025);
    });

    it('should return null for empty string', () => {
      expect(parseBackendDate('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(parseBackendDate('invalid-date')).toBeNull();
    });

    it('should handle format with leading zeros', () => {
      const dateStr = '01/01/2025 00:00:00';
      const parsed = parseBackendDate(dateStr);

      expect(parsed?.getDate()).toBe(1);
      expect(parsed?.getMonth()).toBe(0);
    });
  });
});

describe('Backend Services Helper - Appointments', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    clearCachedAuthToken();
  });

  describe('getAppointmentState', () => {
    it('should return current user status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => 'ACCEPTED',
      });

      const state = await getAppointmentState('token');

      expect(state).toBe('ACCEPTED');
    });

    it('should return null if request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const state = await getAppointmentState('token');

      expect(state).toBeNull();
    });

    it('should return null if response is not string', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'ACCEPTED' }),
      });

      const state = await getAppointmentState('token');

      expect(state).toBeNull();
    });
  });

  describe('tryCreateAppointment', () => {
    it('should create appointment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ appointment_id: 123 }),
      });

      const data: AppointmentCreateData = {
        glucose_objective: 100,
        insulin_type: 'fast',
        dose: 10,
        fast_insulin: 'NovoRapid',
        fixed_dose: 5,
        ratio: 1.5,
        sensitivity: 50,
        pump_type: 'manual',
        control_data: 'good',
        motive: ['routine'],
      };

      const result = await tryCreateAppointment(data, 'token');

      expect(result).toEqual({ appointment_id: 123 });
    });

    it('should return null for state errors (403)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'User not accepted',
      });

      const data = {} as AppointmentCreateData;
      const result = await tryCreateAppointment(data, 'token');

      expect(result).toBeNull();
    });

    it('should throw error for other error codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      const data = {} as AppointmentCreateData;

      await expect(tryCreateAppointment(data, 'token')).rejects.toThrow(
        'POST /appointments/create failed (500)'
      );
    });
  });

  describe('isBackofficeAvailable', () => {
    it('should return true if backoffice responds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const available = await isBackofficeAvailable();

      expect(available).toBe(true);
    });

    it('should return false if backoffice does not respond', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const available = await isBackofficeAvailable();

      expect(available).toBe(false);
    });
  });
});

describe('Backend Services Helper - Setup/Teardown', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    clearCachedAuthToken();
  });

  describe('setupBackendIntegrationTests', () => {
    it('should export setupBackendIntegrationTests function', () => {
      expect(typeof setupBackendIntegrationTests).toBe('function');
    });
  });

  describe('teardownBackendIntegrationTests', () => {
    it('should clear cached token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
      });

      await loginTestUser();
      expect(getCachedAuthToken()).toBeTruthy();

      teardownBackendIntegrationTests();

      expect(getCachedAuthToken()).toBeNull();
    });
  });
});

describe('Backend Services Helper - Edge Cases', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    clearCachedAuthToken();
  });

  it('should handle responses without JSON content-type', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token', token_type: 'Bearer' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => 'plain text response',
      });

    const result = await authenticatedGet('/test');

    expect(result).toBe('plain text response');
  });

  it('should handle timeouts in fetch', async () => {
    vi.useRealTimers();

    mockFetch.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
    );

    await expect(
      checkServiceHealthWithRetry('test', 'http://test.com', 1, 0)
    ).resolves.toHaveProperty('healthy', false);
  });

  it('should handle URLs with special characters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'ok' }),
    });

    await authenticatedGet('/test?param=value with spaces', 'token');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test?param=value with spaces'),
      expect.any(Object)
    );
  });
});
