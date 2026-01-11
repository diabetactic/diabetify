/**
 * Centralized Test Configuration for Playwright E2E Tests
 *
 * IMPORTANT: Never hardcode credentials in test files. Always import from here.
 *
 * Environment variables take precedence over defaults, allowing CI/CD to override.
 */

// =============================================================================
// TEST USERS
// =============================================================================

export interface TestUser {
  readonly dni: string;
  readonly password: string;
  readonly name: string;
  readonly surname: string;
  readonly email: string;
}

/**
 * Primary test user - used for most E2E tests
 */
export const PRIMARY_USER: TestUser = {
  dni: process.env['E2E_TEST_USERNAME'] || '40123456',
  password: process.env['E2E_TEST_PASSWORD'] || 'thepassword',
  name: 'Test',
  surname: 'User',
  email: 'test40123456@diabetactic.com',
} as const;

/**
 * Secondary test user - used for multi-user E2E tests
 */
export const SECONDARY_USER: TestUser = {
  dni: process.env['E2E_TEST_USERNAME_2'] || '40123457',
  password: process.env['E2E_TEST_PASSWORD_2'] || 'thepassword2',
  name: 'Second',
  surname: 'Tester',
  email: 'test40123457@diabetactic.com',
} as const;

// =============================================================================
// BACKEND URLS
// =============================================================================

/**
 * API Gateway - Main user-facing API (login, readings, appointments, profile)
 */
export const API_URL = process.env['E2E_API_URL'] || 'http://localhost:8000';

/**
 * Backoffice API - Admin operations (queue management, user CRUD, test setup)
 */
export const BACKOFFICE_URL = process.env['E2E_BACKOFFICE_URL'] || 'http://localhost:8001';

/**
 * App Base URL - Frontend application
 */
export const APP_URL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';

/**
 * Heroku production URLs (for cloud integration tests)
 */
export const HEROKU_URLS = {
  apiGateway: 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com',
  glucoServer: 'https://dt-api-gateway-glucoserver-791f97472097.herokuapp.com',
  backoffice: 'https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com',
} as const;

// =============================================================================
// BACKOFFICE ADMIN CREDENTIALS
// =============================================================================

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin',
} as const;

// =============================================================================
// TIMEOUTS (milliseconds)
// =============================================================================

export const TIMEOUTS = {
  /** Page navigation timeout */
  navigation: 30_000,
  /** User action timeout (clicks, fills) */
  action: 15_000,
  /** API call timeout */
  api: 10_000,
  /** Ionic hydration wait */
  hydration: 5_000,
  /** Default test timeout */
  test: 60_000,
  /** Heroku tests (cold start consideration) */
  herokuTest: 90_000,
} as const;

// =============================================================================
// TEST TAGS
// =============================================================================

/**
 * Test tags for filtering and categorization
 *
 * Usage in test files:
 *   test('should do something @smoke @docker', async ({ page }) => { ... });
 *
 * Run filtered:
 *   pnpm test:e2e:smoke          # Only @smoke tests
 *   pnpm test:e2e:functional     # Only @functional tests
 *   pnpm test:e2e:visual         # Only @visual tests
 */
export const TEST_TAGS = {
  /** Quick sanity tests - run first, fail fast */
  smoke: '@smoke',
  /** Feature tests - comprehensive functional coverage */
  functional: '@functional',
  /** Visual regression tests - screenshot comparisons */
  visual: '@visual',
  /** Docker backend tests (legacy, prefer @functional) */
  docker: '@docker',
  /** Docker visual tests (legacy, prefer @visual) */
  dockerVisual: '@docker-visual',
  /** Mock backend visual tests */
  visualMock: '@visual-mock',
} as const;

// =============================================================================
// ENVIRONMENT FLAGS
// =============================================================================

/**
 * Check if running against Docker backend
 */
export const isDockerMode = process.env['E2E_DOCKER_TESTS'] === 'true';

/**
 * Check if running against mock backend
 */
export const isMockMode = process.env['E2E_MOCK_MODE'] === 'true';

/**
 * Check if running in CI environment
 */
export const isCI = !!process.env['CI'];

// =============================================================================
// CONSOLIDATED CONFIG OBJECT
// =============================================================================

/**
 * Master configuration object - prefer importing individual exports above
 */
export const TestConfig = {
  users: {
    primary: PRIMARY_USER,
    secondary: SECONDARY_USER,
  },
  urls: {
    api: API_URL,
    backoffice: BACKOFFICE_URL,
    app: APP_URL,
    heroku: HEROKU_URLS,
  },
  admin: ADMIN_CREDENTIALS,
  timeouts: TIMEOUTS,
  tags: TEST_TAGS,
  flags: {
    isDockerMode,
    isMockMode,
    isCI,
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get credentials for the current test mode
 * Falls back to primary user if not specified
 */
export function getTestCredentials(userType: 'primary' | 'secondary' = 'primary'): TestUser {
  return userType === 'secondary' ? SECONDARY_USER : PRIMARY_USER;
}

/**
 * Build API endpoint URL
 *
 * @param path - API path (e.g., '/users/me', '/glucose/mine')
 * @param base - Base URL (defaults to API_URL)
 * @returns Complete URL
 *
 * @example
 * const url = buildUrl('/users/me');
 * // Returns: 'http://localhost:8000/users/me'
 */
export function buildUrl(path: string, base: string = API_URL): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Check if Heroku tests should run
 */
export function shouldRunHerokuTests(requireCredentials = true): boolean {
  if (process.env['E2E_HEROKU_TESTS'] !== 'true') {
    return false;
  }
  if (requireCredentials && (!PRIMARY_USER.dni || !PRIMARY_USER.password)) {
    return false;
  }
  return true;
}

/**
 * Get skip message for conditional test execution
 */
export function getSkipMessage(reason: 'heroku' | 'docker' | 'credentials'): string {
  switch (reason) {
    case 'heroku':
      return 'Set E2E_HEROKU_TESTS=true to run Heroku integration tests';
    case 'docker':
      return 'Set E2E_DOCKER_TESTS=true to run Docker backend tests';
    case 'credentials':
      return 'Requires E2E_TEST_USERNAME and E2E_TEST_PASSWORD environment variables';
    default:
      return 'Test skipped';
  }
}
