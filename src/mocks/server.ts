/**
 * MSW Server Setup for Node.js (Vitest)
 *
 * Configures the Mock Service Worker for running in Node.js environment.
 * Used by Vitest integration tests to intercept HTTP requests.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the MSW server with all handlers
export const server = setupServer(...handlers);

// Export server lifecycle methods for test configuration
export const startServer = () => {
  server.listen({
    onUnhandledRequest: 'warn', // Log warnings for unhandled requests
  });
};

export const stopServer = () => {
  server.close();
};

export const resetHandlers = () => {
  server.resetHandlers();
};

// Re-export utilities from handlers for test convenience
export { resetMockState, seedMockData } from './handlers';
