/**
 * Docker Test Manager
 *
 * Provides utilities for managing the Docker test environment, including:
 * - Checking health of Docker services (api_gateway, glucoserver)
 * - Orchestrating setup and teardown of test dependencies
 * - Centralizing configuration for Docker E2E tests
 */

import { API_URL, BACKOFFICE_URL } from './config';

const SERVICE_HEALTH_ENDPOINTS: Record<string, string> = {
  api_gateway: `${API_URL}/docs`, // Swagger UI endpoint
  glucoserver: `${API_URL}/glucose/health`,
  backoffice: `${BACKOFFICE_URL}/health`,
};

const MAX_RETRIES = 30;
const RETRY_INTERVAL = 2000; // 2 seconds

export class DockerTestManager {
  /**
   * Checks if a Docker service is healthy by polling its health endpoint.
   *
   * @param serviceName - The name of the service to check.
   * @returns A promise that resolves when the service is healthy.
   * @throws If the service is not healthy after the maximum number of retries.
   */
  private static async isServiceHealthy(serviceName: string): Promise<void> {
    const healthEndpoint = SERVICE_HEALTH_ENDPOINTS[serviceName];
    if (!healthEndpoint) {
      throw new Error(`Health endpoint for service '${serviceName}' not found.`);
    }

    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const response = await fetch(healthEndpoint);
        if (response.ok) {
          console.log(`✅ Service '${serviceName}' is healthy.`);
          return;
        }
      } catch (error) {
        // Ignore fetch errors (e.g., service not yet available)
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
    }

    throw new Error(`❌ Service '${serviceName}' is not healthy after ${MAX_RETRIES} retries.`);
  }

  /**
   * Ensures that a list of Docker services are healthy before running tests.
   *
   * @param services - An array of service names to check.
   * @returns A promise that resolves when all services are healthy.
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
