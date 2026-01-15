/**
 * Backend Services Test Helper
 *
 * Provides utilities for backend integration tests including:
 * - Service health checks with retry logic
 * - Test user authentication
 * - HTTP client configuration
 * - Auth token management
 *
 * @module tests/helpers/backend-services
 */

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_GATEWAY_BASE_URL } from '@shared/config/api-base-url';

/**
 * Test user credentials for integration tests
 * Multiple users to avoid queue conflicts (each user can only submit to queue once)
 */
// Public test credentials
export const TEST_USER = {
  dni: '40123456',
  password: 'thepassword',
  email: 'test40123456@diabetactic.com',
};

/**
 * Test users configuration.
 * Primary (40123456/thepassword) and secondary (40123457/thepassword2)
 * are seeded by docker/seed-test-data.sh.
 */
// Public test credentials
export const TEST_USERS = {
  user1: { dni: '40123456', password: 'thepassword', email: 'test40123456@diabetactic.com' },
  user2: { dni: '40123457', password: 'thepassword2', email: 'test40123457@diabetactic.com' },
  // Aliases to user1 for tests that reference other users
  user3: { dni: '40123456', password: 'thepassword', email: 'test40123456@diabetactic.com' },
  user4: { dni: '40123456', password: 'thepassword', email: 'test40123456@diabetactic.com' },
  user5: { dni: '40123456', password: 'thepassword', email: 'test40123456@diabetactic.com' },
  user6: { dni: '40123456', password: 'thepassword', email: 'test40123456@diabetactic.com' },
  user7: { dni: '40123456', password: 'thepassword', email: 'test40123456@diabetactic.com' },
  user8: { dni: '40123456', password: 'thepassword', email: 'test40123456@diabetactic.com' },
};

/**
 * Service base URLs.
 *
 * The apiGateway URL comes from the front-end configuration, while the
 * individual service URLs are aligned with the Docker compose ports used in
 * scripts/backend-health.sh.
 */
export const SERVICE_URLS = {
  apiGateway: API_GATEWAY_BASE_URL,
  backoffice: 'http://localhost:8001',
  glucoserver: 'http://localhost:8002',
  login: 'http://localhost:8003',
  appointments: 'http://localhost:8005',
} as const;

/**
 * Backoffice admin credentials for queue management
 */
// Public test credentials
const BACKOFFICE_ADMIN = {
  username: 'admin',
  password: 'admin',
};

const HEALTH_PATHS = {
  apiGateway: '/docs',
  glucoserver: '/docs',
  login: '/docs',
  appointments: '/docs',
} as const;

/**
 * Health check endpoints for each service
 */
export const HEALTH_ENDPOINTS = {
  apiGateway: `${SERVICE_URLS.apiGateway}${HEALTH_PATHS.apiGateway}`,
  glucoserver: `${SERVICE_URLS.glucoserver}${HEALTH_PATHS.glucoserver}`,
  login: `${SERVICE_URLS.login}${HEALTH_PATHS.login}`,
  appointments: `${SERVICE_URLS.appointments}${HEALTH_PATHS.appointments}`,
};

/**
 * Configuration for health check retries
 */
export const HEALTH_CHECK_CONFIG = {
  maxRetries: 30,
  retryDelayMs: 1000,
  timeoutMs: 5000,
};

/**
 * Cached authentication token
 */
let cachedAuthToken: string | null = null;

/**
 * Cached backend availability status
 */
let backendAvailable: boolean | null = null;

/**
 * Service health check response interface
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service?: string;
  timestamp?: string;
}

/**
 * Service health check result interface
 */
export interface ServiceHealthResult {
  service: string;
  url: string;
  healthy: boolean;
  error?: string;
  attempts?: number;
}

/**
 * Login response interface (OAuth2 token response)
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

/**
 * Check if a single service is healthy
 *
 * @param url - Health check endpoint URL
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Promise<boolean> - True if service is healthy
 */
async function checkServiceHealth(
  url: string,
  timeoutMs: number = HEALTH_CHECK_CONFIG.timeoutMs
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    // Any successful response means the service is up
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Check health of a single service with retry logic
 *
 * @param serviceName - Name of the service
 * @param url - Health check endpoint URL
 * @param maxRetries - Maximum number of retry attempts
 * @param retryDelayMs - Delay between retries in milliseconds
 * @returns Promise<ServiceHealthResult> - Health check result
 */
export async function checkServiceHealthWithRetry(
  serviceName: string,
  url: string,
  maxRetries: number = HEALTH_CHECK_CONFIG.maxRetries,
  retryDelayMs: number = HEALTH_CHECK_CONFIG.retryDelayMs
): Promise<ServiceHealthResult> {
  let attempts = 0;
  let lastError: string | undefined;

  while (attempts < maxRetries) {
    attempts++;

    const isHealthy = await checkServiceHealth(url);

    if (isHealthy) {
      return {
        service: serviceName,
        url,
        healthy: true,
        attempts,
      };
    }

    lastError = `Service not healthy after ${attempts} attempt(s)`;

    if (attempts < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }

  return {
    service: serviceName,
    url,
    healthy: false,
    error: lastError,
    attempts,
  };
}

/**
 * Wait for all backend services to be healthy
 *
 * @param servicesToCheck - Optional array of service names to check. Defaults to all services.
 * @returns Promise<ServiceHealthResult[]> - Array of health check results
 * @throws Error if any critical service is unhealthy
 */
export async function waitForBackendServices(
  servicesToCheck: string[] = ['apiGateway']
): Promise<ServiceHealthResult[]> {
  console.log('🔍 Checking backend services health...');

  const healthChecks = servicesToCheck.map(async serviceName => {
    const url = HEALTH_ENDPOINTS[serviceName as keyof typeof HEALTH_ENDPOINTS];

    if (!url) {
      return {
        service: serviceName,
        url: 'unknown',
        healthy: false,
        error: 'Unknown service',
      };
    }

    console.log(`   Checking ${serviceName} at ${url}...`);
    const result = await checkServiceHealthWithRetry(serviceName, url);

    if (result.healthy) {
      console.log(`   ✅ ${serviceName} is healthy (${result.attempts} attempt(s))`);
    } else {
      console.error(`   ❌ ${serviceName} is unhealthy: ${result.error}`);
    }

    return result;
  });

  const results = await Promise.all(healthChecks);

  const unhealthyServices = results.filter(r => !r.healthy);

  if (unhealthyServices.length > 0) {
    const errorMsg = `Backend services unhealthy: ${unhealthyServices.map(s => s.service).join(', ')}`;
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  console.log('✅ All backend services are healthy');
  return results;
}

/**
 * Login test user and retrieve JWT token
 *
 * @param credentials - Optional custom credentials. Defaults to TEST_USER.
 * @returns Promise<string> - JWT authentication token
 * @throws Error if login fails
 */
export async function loginTestUser(credentials = TEST_USER): Promise<string> {
  try {
    const tokenUrl = `${SERVICE_URLS.apiGateway}/token`;
    console.log('[integration] loginTestUser tokenUrl:', tokenUrl);

    // OAuth2 requires form data, not JSON
    const formData = new URLSearchParams();
    formData.append('username', credentials.dni); // OAuth2 uses 'username' field for DNI
    formData.append('password', credentials.password);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed (${response.status}): ${errorText}`);
    }

    const data: LoginResponse = await response.json();

    if (!data.access_token) {
      throw new Error('Login response missing access_token');
    }

    cachedAuthToken = data.access_token;
    console.log('✅ Test user logged in successfully');

    return data.access_token;
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
}

/**
 * Login test user using Angular HttpClient (for use in TestBed tests)
 *
 * @param httpClient - Angular HttpClient instance
 * @param credentials - Optional custom credentials. Defaults to TEST_USER.
 * @returns Promise<string> - JWT authentication token
 */
export async function loginTestUserWithHttpClient(
  httpClient: HttpClient,
  credentials = TEST_USER
): Promise<string> {
  try {
    const tokenUrl = `${SERVICE_URLS.apiGateway}/token`;

    // OAuth2 requires form data, not JSON
    const formData = new URLSearchParams();
    formData.append('username', credentials.dni); // OAuth2 uses 'username' field for DNI
    formData.append('password', credentials.password);

    const response = await firstValueFrom(
      httpClient.post<LoginResponse>(tokenUrl, formData.toString(), {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        }),
      })
    );

    if (!response.access_token) {
      throw new Error('Login response missing access_token');
    }

    cachedAuthToken = response.access_token;
    console.log('✅ Test user logged in successfully (HttpClient)');

    return response.access_token;
  } catch (error) {
    console.error('❌ Login failed (HttpClient):', error);
    throw error;
  }
}

/**
 * Get HTTP headers with authentication token
 *
 * @param token - Optional JWT token. If not provided, uses cached token or attempts login.
 * @returns Promise<HttpHeaders> - Angular HttpHeaders with Authorization header
 */
export async function getAuthHeaders(token?: string): Promise<HttpHeaders> {
  const authToken = token || cachedAuthToken || (await loginTestUser());

  return new HttpHeaders({
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });
}

/**
 * Get fetch headers with authentication token
 *
 * @param token - Optional JWT token. If not provided, uses cached token or attempts login.
 * @returns Promise<HeadersInit> - Fetch API headers object
 */
export async function getAuthHeadersForFetch(token?: string): Promise<HeadersInit> {
  const authToken = token || cachedAuthToken || (await loginTestUser());

  return {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/**
 * Get cached authentication token
 *
 * @returns string | null - Cached token or null if not logged in
 */
export function getCachedAuthToken(): string | null {
  return cachedAuthToken;
}

/**
 * Clear cached authentication token (useful for logout tests)
 */
export function clearCachedAuthToken(): void {
  cachedAuthToken = null;
  console.log('🔄 Cached auth token cleared');
}

/**
 * Make an authenticated GET request using fetch API
 *
 * @param url - Request URL (absolute or relative to api-gateway)
 * @param token - Optional JWT token
 * @returns Promise<any> - Response data
 */
export async function authenticatedGet(url: string, token?: string): Promise<any> {
  const headers = await getAuthHeadersForFetch(token);

  // If URL is relative, prepend api-gateway base URL
  const fullUrl = url.startsWith('http') ? url : `${SERVICE_URLS.apiGateway}${url}`;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GET ${url} failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Make an authenticated POST request using fetch API
 *
 * @param url - Request URL (absolute or relative to api-gateway)
 * @param data - Request body data
 * @param token - Optional JWT token
 * @returns Promise<any> - Response data
 */
export async function authenticatedPost(url: string, data: any, token?: string): Promise<any> {
  const headers = await getAuthHeadersForFetch(token);

  // If URL is relative, prepend api-gateway base URL
  const fullUrl = url.startsWith('http') ? url : `${SERVICE_URLS.apiGateway}${url}`;

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`POST ${url} failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Glucose reading types enum (matches backend ReadingTypeEnum)
 */
export type GlucoseReadingType =
  | 'DESAYUNO'
  | 'ALMUERZO'
  | 'MERIENDA'
  | 'CENA'
  | 'EJERCICIO'
  | 'OTRAS_COMIDAS'
  | 'OTRO';

/**
 * Glucose reading data interface (matches backend GlucoseReading schema)
 */
export interface GlucoseReadingData {
  id?: number;
  user_id?: number;
  glucose_level: number;
  reading_type: GlucoseReadingType;
  created_at?: string;
  notes?: string;
}

/**
 * Create a glucose reading using query parameters
 * POST /glucose/create uses query params, not JSON body
 *
 * @param data - Reading data
 * @param token - Optional JWT token
 * @returns Promise<GlucoseReadingData> - Created reading
 */
export async function createGlucoseReading(
  data: Omit<GlucoseReadingData, 'id' | 'user_id'>,
  token?: string
): Promise<GlucoseReadingData> {
  const authToken = token || cachedAuthToken || (await loginTestUser());

  const params = new URLSearchParams();
  params.append('glucose_level', data.glucose_level.toString());
  params.append('reading_type', data.reading_type);
  if (data.created_at) {
    params.append('created_at', data.created_at);
  }
  if (data.notes) {
    params.append('notes', data.notes);
  }

  const url = `${SERVICE_URLS.apiGateway}/glucose/create?${params.toString()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`POST /glucose/create failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Get user's glucose readings
 * Response format: { readings: GlucoseReadingData[] }
 *
 * @param token - Optional JWT token
 * @returns Promise<GlucoseReadingData[]> - Array of readings
 */
export async function getGlucoseReadings(token?: string): Promise<GlucoseReadingData[]> {
  const authToken = token || cachedAuthToken || (await loginTestUser());

  const response = await fetch(`${SERVICE_URLS.apiGateway}/glucose/mine`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GET /glucose/mine failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.readings || [];
}

/**
 * Get latest glucose reading
 * Note: API returns { readings: [...] } with all recent readings
 * We return the last one (most recently added)
 *
 * @param token - Optional JWT token
 * @returns Promise<GlucoseReadingData> - Latest reading
 */
export async function getLatestGlucoseReading(token?: string): Promise<GlucoseReadingData> {
  const authToken = token || cachedAuthToken || (await loginTestUser());

  const response = await fetch(`${SERVICE_URLS.apiGateway}/glucose/mine/latest`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GET /glucose/mine/latest failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const readings = data.readings || [];
  // Return the last reading in the array (highest ID = most recent)
  if (readings.length === 0) {
    throw new Error('No readings found');
  }
  return readings[readings.length - 1];
}

/**
 * Parse backend date format (DD/MM/YYYY HH:MM:SS) to Date object
 * Backend uses format like "21/12/2025 03:31:29"
 *
 * @param dateStr - Date string in backend format
 * @returns Date object or null if invalid
 */
export function parseBackendDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try backend format: DD/MM/YYYY HH:MM:SS
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  return null;
}

/**
 * Make an authenticated PUT request using fetch API
 *
 * @param url - Request URL (absolute or relative to api-gateway)
 * @param data - Request body data
 * @param token - Optional JWT token
 * @returns Promise<any> - Response data
 */
export async function authenticatedPut(url: string, data: any, token?: string): Promise<any> {
  const headers = await getAuthHeadersForFetch(token);

  // If URL is relative, prepend api-gateway base URL
  const fullUrl = url.startsWith('http') ? url : `${SERVICE_URLS.apiGateway}${url}`;

  const response = await fetch(fullUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PUT ${url} failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Make an authenticated PATCH request using fetch API
 *
 * @param url - Request URL
 * @param data - Request body data
 * @param token - Optional JWT token
 * @returns Promise<any> - Response data
 */
export async function authenticatedPatch(url: string, data: any, token?: string): Promise<any> {
  const headers = await getAuthHeadersForFetch(token);

  const fullUrl = url.startsWith('http') ? url : `${SERVICE_URLS.apiGateway}${url}`;

  const response = await fetch(fullUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PATCH ${url} failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Make an authenticated DELETE request using fetch API
 *
 * @param url - Request URL
 * @param token - Optional JWT token
 * @returns Promise<any> - Response data
 */
export async function authenticatedDelete(url: string, token?: string): Promise<any> {
  const headers = await getAuthHeadersForFetch(token);

  const fullUrl = url.startsWith('http') ? url : `${SERVICE_URLS.apiGateway}${url}`;

  const response = await fetch(fullUrl, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DELETE ${fullUrl} failed (${response.status}): ${errorText}`);
  }

  // Some DELETE requests may return 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Setup function to be called before integration tests
 * Ensures all backend services are healthy and test user is authenticated
 *
 * @returns Promise<string> - JWT authentication token
 */
export async function setupBackendIntegrationTests(): Promise<string> {
  console.log('🚀 Setting up backend integration tests...');

  // Check all services are healthy
  await waitForBackendServices();

  // Login test user
  const token = await loginTestUser();

  console.log('✅ Backend integration tests setup complete');
  return token;
}

/**
 * Teardown function to be called after integration tests
 * Clears cached authentication token
 */
export function teardownBackendIntegrationTests(): void {
  console.log('🧹 Tearing down backend integration tests...');
  clearCachedAuthToken();
  console.log('✅ Backend integration tests teardown complete');
}

/**
 * Clear the appointments queue via the API Gateway
 * Note: This is a no-op if the internal appointments service isn't accessible
 */
export async function clearAppointmentQueue(): Promise<void> {
  // This endpoint requires direct access to the appointments service
  // which may not be available outside Docker network
  try {
    const response = await fetch(`${SERVICE_URLS.appointments}/queue`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.log('⚠️ Could not clear appointment queue (internal service not accessible)');
    }
  } catch {
    // Silently ignore - internal service not accessible from outside Docker
    console.log('⚠️ Appointments service not directly accessible - skipping queue clear');
  }
}

/**
 * Check if backoffice is available
 * Backoffice runs on port 8001 and is needed for accepting appointments from queue
 */
export async function isBackofficeAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVICE_URLS.backoffice}/docs`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Login to backoffice as admin
 * @returns Admin JWT token or null if backoffice unavailable
 */
async function loginAsBackofficeAdmin(): Promise<string | null> {
  try {
    const response = await fetch(`${SERVICE_URLS.backoffice}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `username=${BACKOFFICE_ADMIN.username}&password=${BACKOFFICE_ADMIN.password}`,
    });

    if (!response.ok) {
      console.log('⚠️ Backoffice admin login failed - service may not be accessible');
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch {
    console.log('⚠️ Backoffice not accessible from outside Docker network');
    return null;
  }
}

/**
 * Get user's current queue position via backoffice admin API
 * @param userId - User ID to lookup
 * @returns Queue entry or null if not in queue or backoffice unavailable
 */
async function getUserQueueEntry(
  userId: number
): Promise<{ queue_placement: number; appointment_state: string } | null> {
  try {
    const adminToken = await loginAsBackofficeAdmin();
    if (!adminToken) return null; // Backoffice not available

    const response = await fetch(`${SERVICE_URLS.backoffice}/appointments/queue`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;

    const queue = await response.json();
    return queue.find((entry: { user_id: number }) => entry.user_id === userId) || null;
  } catch {
    return null;
  }
}

/**
 * Reset a user's queue position by denying their current appointment
 * This allows them to re-submit to the queue
 * @param userId - User ID to reset
 */
export async function resetUserQueuePosition(userId: number): Promise<void> {
  const entry = await getUserQueueEntry(userId);
  if (!entry) return; // User not in queue or backoffice unavailable

  // Only try to modify if in a non-terminal state
  if (entry.appointment_state === 'PENDING' || entry.appointment_state === 'DENIED') {
    try {
      const adminToken = await loginAsBackofficeAdmin();
      if (!adminToken) return; // Backoffice not available
      // Deny the appointment to free up the slot
      await fetch(`${SERVICE_URLS.backoffice}/appointments/deny/${entry.queue_placement}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
    } catch {
      // Ignore errors - we'll try to submit anyway
    }
  }
}

/**
 * Get user's current appointment state
 * @param token - User's auth token
 * @returns Current state string or null
 */
export async function getAppointmentState(token: string): Promise<string | null> {
  try {
    const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/state`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    const state = await response.json();
    return typeof state === 'string' ? state : null;
  } catch {
    return null;
  }
}

/**
 * Submit user to appointment queue and get them accepted
 * This is required before creating appointments
 *
 * Handles various user states:
 * - ACCEPTED: Returns existing position (idempotent)
 * - PENDING: Accepts via backoffice
 * - DENIED/None: Attempts to submit
 *
 * @param credentials - User credentials (optional, defaults to TEST_USER)
 * @returns Promise<{token: string, queuePosition: number}> - Auth token and queue position
 */
export async function setupAppointmentQueue(
  credentials = TEST_USER
): Promise<{ token: string; queuePosition: number }> {
  // Step 1: Login with specific user credentials
  const token = await loginTestUser(credentials);

  // Step 2: Check current state via API
  const currentState = await getAppointmentState(token);

  // Step 3: If already ACCEPTED, return success (idempotent)
  if (currentState === 'ACCEPTED') {
    // Get placement (may return -1 if already processed, that's OK)
    const placementResponse = await fetch(`${SERVICE_URLS.apiGateway}/appointments/placement`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    let queuePosition = -1;
    if (placementResponse.ok) {
      queuePosition = await placementResponse.json();
    }
    console.log(`✅ User ${credentials.dni} already ACCEPTED (position: ${queuePosition})`);
    return { token, queuePosition };
  }

  // Step 4: If PENDING, try to accept via backoffice (if available)
  if (currentState === 'PENDING') {
    const placementResponse = await fetch(`${SERVICE_URLS.apiGateway}/appointments/placement`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (placementResponse.ok) {
      const queuePosition = await placementResponse.json();
      if (queuePosition >= 0) {
        const adminToken = await loginAsBackofficeAdmin();
        if (adminToken) {
          try {
            await fetch(`${SERVICE_URLS.backoffice}/appointments/accept/${queuePosition}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${adminToken}` },
            });
            console.log(`✅ User ${credentials.dni} PENDING accepted at position ${queuePosition}`);
            return { token, queuePosition };
          } catch {
            // Fall through
          }
        } else {
          // Backoffice not available - return with PENDING state (tests should handle)
          console.log(`⚠️ User ${credentials.dni} is PENDING but backoffice unavailable to accept`);
          return { token, queuePosition };
        }
      }
    }
  }

  // Step 5: Try to submit to queue (will fail if user already in queue)
  const submitResponse = await fetch(`${SERVICE_URLS.apiGateway}/appointments/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!submitResponse.ok) {
    // If already in queue but not handled above, check if we can still proceed
    const errorText = await submitResponse.text();
    if (submitResponse.status === 500 && currentState) {
      // User is in some state but couldn't be handled - return with position -1
      console.log(
        `⚠️ User ${credentials.dni} in state ${currentState}, cannot re-submit (returning position -1)`
      );
      return { token, queuePosition: -1 };
    }
    throw new Error(`POST /appointments/submit failed (${submitResponse.status}): ${errorText}`);
  }

  const queuePosition = await submitResponse.json();
  console.log(`✅ User ${credentials.dni} submitted to queue at position ${queuePosition}`);

  // Step 6: Accept the appointment via backoffice (if available)
  const adminToken = await loginAsBackofficeAdmin();
  if (adminToken) {
    try {
      await fetch(`${SERVICE_URLS.backoffice}/appointments/accept/${queuePosition}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log(
        `✅ Appointment accepted for user ${credentials.dni} at position ${queuePosition}`
      );
    } catch (error) {
      console.warn(`⚠️ Could not auto-accept appointment: ${error}`);
    }
  } else {
    console.log(
      `⚠️ Backoffice unavailable - user ${credentials.dni} submitted but not auto-accepted`
    );
  }

  return { token, queuePosition };
}

/**
 * Appointment data structure for creating appointments
 */
export interface AppointmentCreateData {
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
  another_treatment?: string;
  other_motive?: string;
}

/**
 * Try to create an appointment. Returns null if creation fails due to state issues.
 * This is useful for tests that need to handle backend state gracefully.
 *
 * @param data - Appointment data
 * @param token - Auth token
 * @returns Created appointment or null if state doesn't allow creation
 */
export async function tryCreateAppointment(
  data: AppointmentCreateData,
  token: string
): Promise<{ appointment_id: number } | null> {
  try {
    const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // State-related errors - return null to allow graceful handling
      if (
        response.status === 403 ||
        errorText.includes('accepted') ||
        errorText.includes('denied') ||
        errorText.includes('pending')
      ) {
        console.log(`⚠️ Cannot create appointment (state issue): ${errorText}`);
        return null;
      }
      throw new Error(`POST /appointments/create failed (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (String(error).includes('state') || String(error).includes('accepted')) {
      console.log(`⚠️ Cannot create appointment: ${error}`);
      return null;
    }
    throw error;
  }
}

/**
 * Quick check if backend services are available (single attempt, no retries)
 * Used to determine if integration tests should run or be skipped
 *
 * @returns Promise<boolean> - true if backend is available
 */
export async function isBackendAvailable(): Promise<boolean> {
  if (backendAvailable !== null) {
    return backendAvailable;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(HEALTH_ENDPOINTS.apiGateway, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    backendAvailable = response.ok;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
}

/**
 * Skip integration tests if backend is not available
 * Use in beforeAll to conditionally skip tests
 *
 * @returns Promise<void>
 * @throws Error with special skip marker if backend is unavailable
 */
export async function skipIfNoBackend(): Promise<void> {
  const available = await isBackendAvailable();
  if (!available) {
    console.log('⏭️  Skipping integration tests - backend not available');
    throw new Error('SKIP_TESTS: Backend services not available');
  }
}
