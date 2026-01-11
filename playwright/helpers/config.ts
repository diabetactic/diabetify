/**
 * Configuration Helper for Playwright Tests
 *
 * RE-EXPORTS from centralized test-config.ts for backward compatibility.
 * New code should import directly from '../config/test-config'.
 */

// Re-export everything from centralized config
export {
  API_URL,
  BACKOFFICE_URL,
  APP_URL as BASE_URL,
  PRIMARY_USER,
  SECONDARY_USER,
  HEROKU_URLS,
  TIMEOUTS,
  ADMIN_CREDENTIALS,
  isDockerMode,
  isMockMode,
  isCI,
  shouldRunHerokuTests,
  getSkipMessage,
  buildUrl,
  getTestCredentials,
} from '../config/test-config';

// Legacy exports for backward compatibility
import {
  PRIMARY_USER,
  TIMEOUTS,
  shouldRunHerokuTests as _shouldRunHerokuTests,
  getSkipMessage,
  HEROKU_URLS,
  buildUrl,
} from '../config/test-config';

/**
 * @deprecated Use PRIMARY_USER.dni from test-config instead
 */
export const TEST_USERNAME = PRIMARY_USER.dni;

/**
 * @deprecated Use PRIMARY_USER.password from test-config instead
 */
export const TEST_PASSWORD = PRIMARY_USER.password;

/**
 * @deprecated Use imports from test-config instead
 * Legacy TEST_CONFIG object for backward compatibility
 */
export const TEST_CONFIG = {
  herokuTestsEnabled: process.env['E2E_HEROKU_TESTS'] === 'true',
  credentials: {
    username: PRIMARY_USER.dni,
    password: PRIMARY_USER.password,
  },
  hasCredentials: Boolean(PRIMARY_USER.dni) && Boolean(PRIMARY_USER.password),
  timeouts: {
    herokuTest: TIMEOUTS.herokuTest,
    navigation: TIMEOUTS.navigation,
    apiCall: TIMEOUTS.api,
    hydration: TIMEOUTS.hydration,
  },
} as const;

/**
 * @deprecated Use getSkipMessage from test-config instead
 */
export function getHerokuSkipMessage(requireCredentials = true): string {
  if (!TEST_CONFIG.herokuTestsEnabled) {
    return getSkipMessage('heroku');
  }
  if (requireCredentials && !TEST_CONFIG.hasCredentials) {
    return getSkipMessage('credentials');
  }
  return '';
}

/**
 * @deprecated Use buildUrl from test-config instead
 */
export function buildApiUrl(backend: keyof typeof HEROKU_URLS, path: string): string {
  const baseUrl = HEROKU_URLS[backend];
  return buildUrl(path, baseUrl);
}
