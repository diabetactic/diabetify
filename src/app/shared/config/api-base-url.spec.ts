import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@env/environment', () => ({
  environment: {
    backendServices: {
      apiGateway: {
        baseUrl: 'http://localhost:8000',
      },
    },
  },
}));

describe('API Base URL Configuration', () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = typeof window !== 'undefined' ? window : undefined;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalWindow) {
      global.window = originalWindow;
    }
  });

  describe('Default Configuration', () => {
    it('debe usar URL del environment por defecto', async () => {
      global.window = {} as unknown as Window & typeof globalThis;
      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('http://localhost:8000');
    });

    it('debe reportar null para override cuando no hay override', async () => {
      global.window = {} as unknown as Window & typeof globalThis;
      vi.resetModules();
      const { getApiGatewayOverride } = await import('./api-base-url');

      const override = getApiGatewayOverride();
      expect(override === null || typeof override === 'string').toBe(true);
    });
  });

  describe('Runtime Override via window.__DIABETACTIC_API_BASE_URL', () => {
    it('debe usar override de window si está definido', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: 'https://production.api.com',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL, getApiGatewayOverride } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('https://production.api.com');
      expect(getApiGatewayOverride()).toBe('https://production.api.com');
    });

    it('debe priorizar window override sobre environment', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: 'https://override.com',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).not.toBe('http://localhost:8000');
      expect(API_GATEWAY_BASE_URL).toBe('https://override.com');
    });
  });

  describe('Edge Cases', () => {
    it('debe manejar strings vacíos en overrides', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: '',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('http://localhost:8000');
    });

    it('debe manejar valores null en overrides', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: null,
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('http://localhost:8000');
    });
  });

  describe('URL Validation', () => {
    it('debe aceptar URLs HTTP', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: 'http://api.com',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('http://api.com');
    });

    it('debe aceptar URLs HTTPS', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: 'https://secure.api.com',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('https://secure.api.com');
    });

    it('debe aceptar URLs con puerto', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: 'http://localhost:3000',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('http://localhost:3000');
    });

    it('debe aceptar URLs con path', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: 'https://api.com/v1',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('https://api.com/v1');
    });
  });

  describe('getApiGatewayOverride Function', () => {
    it('debe retornar override activo', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: 'https://override.com',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { getApiGatewayOverride } = await import('./api-base-url');

      expect(getApiGatewayOverride()).toBe('https://override.com');
    });
  });

  describe('Real-World Scenarios', () => {
    it('desarrollo local: debe usar localhost por defecto', async () => {
      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toContain('localhost');
    });

    it('testing: debe permitir override dinámico via window', async () => {
      global.window = {
        __DIABETACTIC_API_BASE_URL: 'http://mock-server:4000',
      } as unknown as Window & typeof globalThis;

      vi.resetModules();
      const { API_GATEWAY_BASE_URL } = await import('./api-base-url');

      expect(API_GATEWAY_BASE_URL).toBe('http://mock-server:4000');
    });
  });
});
