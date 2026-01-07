/**
 * Vitest Configuration for MSW Integration Tests
 *
 * Separate configuration for tests that use MSW (Mock Service Worker).
 * These tests mock the network layer and test real HTTP interactions.
 *
 * Run with: pnpm exec vitest --config vitest.msw.config.ts
 */
import { defineConfig, Plugin } from 'vitest/config';
import { fileURLToPath } from 'url';
import angular from '@analogjs/vite-plugin-angular';

// Plugin to inject polyfills before Ionic Core loads
function ionicPolyfillPlugin(): Plugin {
  return {
    name: 'ionic-polyfill',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('@ionic/core')) {
        const polyfill = `
          if (typeof globalThis !== 'undefined') {
            const g = globalThis;
            if (typeof g.document !== 'undefined' && !g.document.adoptedStyleSheets) {
              Object.defineProperty(g.document, 'adoptedStyleSheets', {
                value: [],
                writable: true,
                configurable: true,
              });
            }
          }
        `;
        return polyfill + code;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [ionicPolyfillPlugin(), angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    isolate: true,
    sequence: {
      concurrent: false,
    },
    setupFiles: [
      'src/setup-polyfills.ts',
      '@analogjs/vitest-angular/setup-zone',
      'src/test-setup/index.ts',
      'src/test-setup/msw-setup.ts', // MSW setup added
    ],
    // Only include MSW integration tests
    include: ['src/app/tests/integration-msw/**/*.spec.ts'],
    exclude: ['node_modules/**'],
    reporters: ['default', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.mock.ts'],
    },
    server: {
      deps: {
        inline: [
          '@capacitor/core',
          '@capacitor/preferences',
          '@capacitor/device',
          '@capacitor/network',
          '@ngx-translate/core',
          '@analogjs/vitest-angular',
          /^@angular\//,
          /^@ionic\//,
          /^@stencil\//,
        ],
      },
    },
    // Longer timeout for network-mocked tests
    testTimeout: 10000,
  },
  optimizeDeps: {
    include: [
      '@ionic/angular',
      '@ionic/core',
      '@ionic/core/loader',
      '@ionic/core/components',
      'msw',
    ],
    esbuildOptions: {
      mainFields: ['module', 'main'],
    },
  },
  resolve: {
    alias: [
      { find: '@core', replacement: fileURLToPath(new URL('./src/app/core', import.meta.url)) },
      { find: '@shared', replacement: fileURLToPath(new URL('./src/app/shared', import.meta.url)) },
      { find: '@env', replacement: fileURLToPath(new URL('./src/environments', import.meta.url)) },
      {
        find: '@services',
        replacement: fileURLToPath(new URL('./src/app/core/services', import.meta.url)),
      },
      {
        find: '@models',
        replacement: fileURLToPath(new URL('./src/app/core/models', import.meta.url)),
      },
      {
        find: '@guards',
        replacement: fileURLToPath(new URL('./src/app/core/guards', import.meta.url)),
      },
      {
        find: '@interceptors',
        replacement: fileURLToPath(new URL('./src/app/core/interceptors', import.meta.url)),
      },
      {
        find: '@test-setup',
        replacement: fileURLToPath(new URL('./src/test-setup', import.meta.url)),
      },
      {
        find: /^@stencil\/core(.*)$/,
        replacement: fileURLToPath(new URL('./src/mocks/stencil-core.mock.ts', import.meta.url)),
      },
      {
        find: '@ionic/angular/standalone',
        replacement: fileURLToPath(new URL('./src/mocks/ionic-angular.mock.ts', import.meta.url)),
      },
      {
        find: '@ionic/angular',
        replacement: fileURLToPath(new URL('./src/mocks/ionic-angular.mock.ts', import.meta.url)),
      },
      {
        find: '@ionic/core/loader',
        replacement: fileURLToPath(new URL('./src/mocks/ionic-core.mock.ts', import.meta.url)),
      },
      {
        find: /^@ionic\/core(.*)$/,
        replacement: fileURLToPath(new URL('./src/mocks/ionic-core.mock.ts', import.meta.url)),
      },
    ],
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
});
