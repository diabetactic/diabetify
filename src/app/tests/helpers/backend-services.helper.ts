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
import { API_GATEWAY_BASE_URL } from '../../shared/config/api-base-url';

/**
 * Test user credentials for integration tests
 * Multiple users to avoid queue conflicts (each user can only submit to queue once)
 */
export const TEST_USER = {
  dni: '1000',
  password: 'tuvieja',
  email: 'test@test.com',
};

export const TEST_USERS = {
  user1: { dni: '1000', password: 'tuvieja', email: '1@example.com' },
  user2: { dni: '1001', password: 'tumadre', email: '2@example.com' },
  user3: { dni: '1002', password: 'tuvieja', email: '3@example.com' },
  user4: { dni: '1003', password: 'tuvieja', email: 'test4@test.com' },
  user5: { dni: '1004', password: 'tuvieja', email: 'test5@test.com' },
  user6: { dni: '1005', password: 'tuvieja', email: 'test6@test.com' },
  user7: { dni: '1006', password: 'tuvieja', email: 'test7@test.com' },
  user8: { dni: '1007', password: 'tuvieja', email: 'test8@test.com' },
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
  glucoserver: 'http://localhost:8002',
  login: 'http://localhost:8003',
  appointments: 'http://localhost:8005',
} as const;

const HEALTH_PATHS = {
  apiGateway: '/health',
  glucoserver: '/health',
  login: '/health',
  appointments: '/health',
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

    const data = await response.json();
    return data.status === 'healthy' || response.status === 200;
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
  servicesToCheck: string[] = ['apiGateway', 'login', 'glucoserver', 'appointments']
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
 */
export async function clearAppointmentQueue(): Promise<void> {
  // Clear queue directly against the appointments service to avoid tight coupling
  // to any API Gateway path mapping.
  const response = await fetch(`${SERVICE_URLS.appointments}/queue`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to clear appointment queue (${response.status}): ${errorText}`);
  }
}

/**
 * Submit user to appointment queue and get them accepted
 * This is required before creating appointments
 *
 * @param credentials - User credentials (optional, defaults to TEST_USER)
 * @returns Promise<{token: string, queuePosition: number}> - Auth token and queue position
 */
export async function setupAppointmentQueue(
  credentials = TEST_USER
): Promise<{ token: string; queuePosition: number }> {
  try {
    // Step 1: Login with specific user credentials
    const token = await loginTestUser(credentials);
    console.log(`✅ User ${credentials.dni} logged in`);

    // Step 2: Submit to queue (via api-gateway)
    const queuePosition = await authenticatedPost('/appointments/submit', {}, token);
    console.log(`✅ User ${credentials.dni} submitted to queue at position ${queuePosition}`);

    // Step 3: Accept the appointment directly via the appointments service
    const acceptUrl = `${SERVICE_URLS.appointments}/queue/accept/${queuePosition}`;
    const acceptResponse = await fetch(acceptUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!acceptResponse.ok) {
      const errorText = await acceptResponse.text();
      throw new Error(`Failed to accept appointment (${acceptResponse.status}): ${errorText}`);
    }

    console.log(`✅ Appointment accepted for user ${credentials.dni} at position ${queuePosition}`);
    return { token, queuePosition };
  } catch (error) {
    console.error(`❌ Failed to setup appointment queue for user ${credentials.dni}:`, error);
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
