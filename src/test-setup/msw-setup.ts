/**
 * MSW Setup for Vitest Integration Tests
 *
 * This file integrates MSW with Vitest for network-level API mocking.
 * Import this in test files that need to mock API responses.
 */
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server, resetMockState } from '../mocks/server';

/**
 * Setup MSW server lifecycle hooks.
 * Call this in beforeAll/afterAll of your integration test suites.
 */
export function setupMSW(): void {
  beforeAll(() => {
    // Start MSW server before all tests in the suite
    server.listen({
      onUnhandledRequest: 'warn',
    });
  });

  afterEach(() => {
    // Reset handlers and mock state between tests for isolation
    server.resetHandlers();
    resetMockState();
  });

  afterAll(() => {
    // Clean up server after all tests complete
    server.close();
  });
}

/**
 * Utility to add custom handlers for specific test scenarios.
 * Use this when you need to override default handlers.
 *
 * @example
 * ```typescript
 * import { http, HttpResponse } from 'msw';
 * import { addHandlers } from '@test-setup/msw-setup';
 *
 * test('handles error response', async () => {
 *   addHandlers(
 *     http.get('/api/data', () => HttpResponse.json({ error: 'fail' }, { status: 500 }))
 *   );
 *   // Test error handling...
 * });
 * ```
 */
export function addHandlers(...handlers: Parameters<typeof server.use>): void {
  server.use(...handlers);
}

// Re-export MSW utilities for convenience
export { http, HttpResponse, delay } from 'msw';
export { server, resetMockState, seedMockData } from '../mocks/server';
