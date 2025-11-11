import { TestBed } from '@angular/core/testing';

describe('Backend Services Health Checks', () => {
  // Service configuration with ports from docker-compose
  const services = [
    {
      name: 'api-gateway',
      url: 'http://localhost:8004/health',
      port: 8004,
      description: 'API Gateway - Main entry point',
    },
    {
      name: 'glucoserver',
      url: 'http://localhost:8002/health',
      port: 8002,
      description: 'Glucose Server - Glucose readings management',
    },
    {
      name: 'login',
      url: 'http://localhost:8003/health',
      port: 8003,
      description: 'Login Service - Authentication',
    },
    {
      name: 'appointments',
      url: 'http://localhost:8005/health',
      port: 8005,
      description: 'Appointments Service - Appointment management',
    },
  ];

  const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('Individual Service Health', () => {
    services.forEach(service => {
      it(
        `should have ${service.name} healthy at port ${service.port}`,
        async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

            const response = await fetch(service.url, {
              signal: controller.signal,
              method: 'GET',
            });

            clearTimeout(timeoutId);

            expect(response.status).toBe(200);

            // Try to parse response body if it's JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              expect(data).toBeDefined();
              console.log(`✓ ${service.name} health response:`, data);
            }
          } catch (error) {
            if ((error as Error).name === 'AbortError') {
              fail(`${service.name} health check timed out after ${HEALTH_CHECK_TIMEOUT}ms`);
            } else {
              fail(`${service.name} health check failed: ${(error as Error).message}`);
            }
          }
        },
        HEALTH_CHECK_TIMEOUT + 1000
      );
    });
  });

  describe('Overall System Health', () => {
    it(
      'should have all services responding within 5 seconds',
      async () => {
        const startTime = Date.now();
        const healthCheckPromises = services.map(async service => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

            const response = await fetch(service.url, {
              signal: controller.signal,
              method: 'GET',
            });

            clearTimeout(timeoutId);

            return {
              name: service.name,
              status: response.status,
              healthy: response.status === 200,
              responseTime: Date.now() - startTime,
            };
          } catch (error) {
            return {
              name: service.name,
              status: 0,
              healthy: false,
              error: (error as Error).message,
              responseTime: Date.now() - startTime,
            };
          }
        });

        const results = await Promise.all(healthCheckPromises);
        const totalTime = Date.now() - startTime;

        console.log('\n=== Service Health Summary ===');
        results.forEach(result => {
          const status = result.healthy ? '✓' : '✗';
          console.log(
            `${status} ${result.name}: ${result.healthy ? 'HEALTHY' : 'UNHEALTHY'} (${result.responseTime}ms)`
          );
          if (result.error) {
            console.log(`  Error: ${result.error}`);
          }
        });
        console.log(`Total time: ${totalTime}ms`);
        console.log('==============================\n');

        // Verify all services are healthy
        const unhealthyServices = results.filter(r => !r.healthy);

        expect(totalTime).toBeLessThan(HEALTH_CHECK_TIMEOUT);
        expect(unhealthyServices.length).toBe(
          0,
          `The following services are unhealthy: ${unhealthyServices.map(s => s.name).join(', ')}`
        );
      },
      HEALTH_CHECK_TIMEOUT + 1000
    );
  });

  describe('Docker Compose Services', () => {
    it('should verify docker-compose services are running', async () => {
      // This is an optional check that verifies services via docker-compose
      // Skip if running in CI or without docker-compose

      const checkDockerCompose = async (): Promise<boolean> => {
        try {
          // Quick check if docker-compose is available
          const response = await fetch('http://localhost:8004/health', {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
          });
          return response.ok;
        } catch {
          return false;
        }
      };

      const isDockerRunning = await checkDockerCompose();

      if (!isDockerRunning) {
        console.warn('⚠ Docker Compose services may not be running. Run: docker-compose up -d');
        pending('Docker Compose services are not running');
      }

      // If we reach here, docker services are running
      expect(isDockerRunning).toBe(true);
    }, 3000);
  });

  describe('Service Connectivity', () => {
    it('should verify all service ports are accessible', async () => {
      const portChecks = services.map(async service => {
        try {
          const response = await fetch(`http://localhost:${service.port}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          });

          return {
            name: service.name,
            port: service.port,
            accessible: true,
            status: response.status,
          };
        } catch (error) {
          return {
            name: service.name,
            port: service.port,
            accessible: false,
            error: (error as Error).message,
          };
        }
      });

      const results = await Promise.all(portChecks);

      console.log('\n=== Port Accessibility ===');
      results.forEach(result => {
        const status = result.accessible ? '✓' : '✗';
        console.log(
          `${status} ${result.name} (port ${result.port}): ${result.accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`
        );
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
      });
      console.log('==========================\n');

      const inaccessiblePorts = results.filter(r => !r.accessible);

      expect(inaccessiblePorts.length).toBe(
        0,
        `The following services are not accessible: ${inaccessiblePorts.map(s => `${s.name}:${s.port}`).join(', ')}`
      );
    }, 10000);
  });

  describe('Service Health Endpoints', () => {
    it('should return valid health check responses', async () => {
      const healthResponses = await Promise.all(
        services.map(async service => {
          try {
            const response = await fetch(service.url, {
              method: 'GET',
              signal: AbortSignal.timeout(3000),
            });

            let body: any = null;
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
              body = await response.json();
            } else {
              body = await response.text();
            }

            return {
              name: service.name,
              status: response.status,
              contentType,
              body,
              valid: response.status === 200,
            };
          } catch (error) {
            return {
              name: service.name,
              status: 0,
              error: (error as Error).message,
              valid: false,
            };
          }
        })
      );

      console.log('\n=== Health Endpoint Responses ===');
      healthResponses.forEach(response => {
        console.log(`\n${response.name}:`);
        console.log(`  Status: ${response.status}`);
        console.log(`  Content-Type: ${response.contentType || 'N/A'}`);
        console.log(`  Body:`, response.body);
        if (response.error) {
          console.log(`  Error: ${response.error}`);
        }
      });
      console.log('=================================\n');

      const invalidResponses = healthResponses.filter(r => !r.valid);

      expect(invalidResponses.length).toBe(
        0,
        `The following services returned invalid health responses: ${invalidResponses.map(r => r.name).join(', ')}`
      );
    }, 10000);
  });
});
