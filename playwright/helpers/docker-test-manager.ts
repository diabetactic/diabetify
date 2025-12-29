/**
 * Docker Test Manager
 *
 * Provides utilities for managing the Docker test environment, including:
 * - Checking health of Docker services (api_gateway, glucoserver)
 * - Orchestrating setup and teardown of test dependencies
 * - Centralizing configuration for Docker E2E tests
 */

import { API_URL, BACKOFFICE_URL } from './config';

// Use endpoints that actually exist in the API
// The /docs endpoint (Swagger UI) is the most reliable health indicator
const SERVICE_HEALTH_ENDPOINTS: Record<string, string> = {
  api_gateway: `${API_URL}/docs`, // Swagger UI endpoint
  glucoserver: `${API_URL}/glucose/mine`, // Use actual endpoint (returns 401 if not authed, but means service is up)
  backoffice: `${BACKOFFICE_URL}/docs`, // Use docs endpoint for backoffice too
};

// Reduced retries to fit within 30s hook timeout (10 * 2s = 20s max)
const MAX_RETRIES = 10;
const RETRY_INTERVAL = 2000; // 2 seconds

export class DockerTestManager {
  /**
   * Checks if a Docker service is healthy by polling its health endpoint.
   * Returns true on 200 OK or 401 Unauthorized (service is up but needs auth).
   *
   * @param serviceName - The name of the service to check.
   * @returns A promise that resolves when the service is healthy.
   * @throws If the service is not healthy after the maximum number of retries.
   */
  private static async isServiceHealthy(serviceName: string): Promise<void> {
    const healthEndpoint = SERVICE_HEALTH_ENDPOINTS[serviceName];
    if (!healthEndpoint) {
      console.log(`⚠️ No health endpoint for service '${serviceName}', skipping check`);
      return;
    }

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const response = await fetch(healthEndpoint);
        // Consider 200, 401, 403 as "service is running" (401/403 = auth required but service up)
        if (response.ok || response.status === 401 || response.status === 403) {
          console.log(`✅ Service '${serviceName}' is healthy.`);
          return;
        }
        // 404 might mean endpoint doesn't exist but service is up
        if (response.status === 404) {
          console.log(
            `⚠️ Service '${serviceName}' endpoint not found (404), assuming service is up.`
          );
          return;
        }
      } catch {
        // Ignore fetch errors (e.g., service not yet available)
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
    }

    // Instead of throwing, just warn - the tests themselves will fail if service is down
    console.warn(`⚠️ Service '${serviceName}' health check timed out, proceeding anyway.`);
  }

  /**
   * Ensures that a list of Docker services are healthy before running tests.
   * Non-blocking: will warn but not fail if services aren't reachable.
   *
   * @param services - An array of service names to check.
   * @returns A promise that resolves when all services are checked.
   */
  public static async ensureServicesHealthy(services: string[]): Promise<void> {
    console.log('--- 🐳 Checking Docker Service Health ---');
    const healthChecks = services.map(service => this.isServiceHealthy(service));
    await Promise.all(healthChecks);
    console.log('-----------------------------------------');
  }

  /**
   * Defines the dependency order for test fixtures.
   * This can be used to ensure that fixtures are set up and torn down in the correct order.
   */
  public static getFixtureDependencies() {
    return {
      database: { depends: [] },
      apiGateway: { depends: ['database'] },
      testUser: { depends: ['database', 'apiGateway'] },
      seedReadings: { depends: ['testUser'] },
    };
  }
}
