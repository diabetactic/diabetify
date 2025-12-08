/**
 * Configuration Helper for Playwright Tests
 *
 * Centralizes backend URLs and test configuration
 */

/**
 * Heroku Backend URLs
 */
export const HEROKU_URLS = {
  /**
   * Main API Gateway
   * Used by: heroku-integration.spec.ts, heroku-appointments-flow.spec.ts, heroku-profile-sync.spec.ts
   */
  apiGateway: 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com',

  /**
   * Glucose Server
   * Used by: heroku-readings-crud.spec.ts
   */
  glucoServer: 'https://dt-api-gateway-glucoserver-791f97472097.herokuapp.com',

  /**
   * Backoffice API (Admin operations)
   * Used by: Maestro tests for queue management
   */
  backoffice: 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com',
} as const;

/**
 * Test Environment Configuration
 */
export const TEST_CONFIG = {
  /**
   * Enable Heroku integration tests
   */
  herokuTestsEnabled: process.env.E2E_HEROKU_TESTS === 'true',

  /**
   * Test credentials
   */
  credentials: {
    username: process.env.E2E_TEST_USERNAME || '',
    password: process.env.E2E_TEST_PASSWORD || '',
  },

  /**
   * Check if credentials are available
   */
  hasCredentials: Boolean(process.env.E2E_TEST_USERNAME) && Boolean(process.env.E2E_TEST_PASSWORD),

  /**
   * Timeouts (in milliseconds)
   */
  timeouts: {
    herokuTest: 60000, // 60s for Heroku tests (accounts for cold start)
    navigation: 20000, // 20s for page navigation
    apiCall: 15000, // 15s for API calls
    hydration: 5000, // 5s for Ionic hydration
  },
} as const;

/**
 * Check if Heroku tests should run
 *
 * @param requireCredentials - Whether credentials are required
 * @returns true if tests should run, false if they should be skipped
 */
export function shouldRunHerokuTests(requireCredentials = true): boolean {
  if (!TEST_CONFIG.herokuTestsEnabled) {
    return false;
  }

  if (requireCredentials && !TEST_CONFIG.hasCredentials) {
    return false;
  }

  return true;
}

/**
 * Get skip message for Heroku tests
 *
 * @param requireCredentials - Whether credentials are required
 * @returns Skip message to use with test.skip()
 */
export function getHerokuSkipMessage(requireCredentials = true): string {
  if (!TEST_CONFIG.herokuTestsEnabled) {
    return 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests';
  }

  if (requireCredentials && !TEST_CONFIG.hasCredentials) {
    return 'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables';
  }

  return '';
}

/**
 * Build API endpoint URL
 *
 * @param backend - Backend name ('apiGateway' | 'glucoServer' | 'backoffice')
 * @param path - API path (e.g., '/users/me', '/glucose/mine')
 * @returns Complete URL
 *
 * @example
 * const url = buildApiUrl('apiGateway', '/users/me');
 * // Returns: 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/users/me'
 */
export function buildApiUrl(backend: keyof typeof HEROKU_URLS, path: string): string {
  const baseUrl = HEROKU_URLS[backend];
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
