import { defineConfig, Plugin } from 'vitest/config';
import { fileURLToPath } from 'url';
import angular from '@analogjs/vite-plugin-angular';

// Plugin to inject polyfills before Ionic Core loads
function ionicPolyfillPlugin(): Plugin {
  return {
    name: 'ionic-polyfill',
    enforce: 'pre',
    // Inject polyfill code before any @ionic/core imports
    transform(code, id) {
      if (id.includes('@ionic/core')) {
        const polyfill = `
          // Vitest polyfill for Ionic Core
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
    // Use forks for proper test isolation - each test file gets fresh state
    pool: 'forks',
    poolOptions: {
      forks: {
        isolate: true,
      },
    },
    // Run tests within each file sequentially to prevent IndexedDB race conditions
    // Files still run in parallel for speed, but tests within each file are sequential
    sequence: {
      concurrent: false, // Tests within a file run sequentially
    },
    setupFiles: [
      'src/setup-polyfills.ts', // MUST be first - polyfills for jsdom
      '@analogjs/vitest-angular/setup-zone',
      'src/test-setup/index.ts', // TestBed init + mocks + Jasmine compatibility
    ],
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules/**'],
    reporters: ['default', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.mock.ts'],
    },
    // Dependency handling for Vitest
    deps: {
      // Inline these packages so they're transformed properly
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
  // Pre-bundle ionic to handle directory imports
  optimizeDeps: {
    include: ['@ionic/angular', '@ionic/core', '@ionic/core/loader', '@ionic/core/components'],
    esbuildOptions: {
      // Resolve directory imports
      mainFields: ['module', 'main'],
    },
  },
  resolve: {
    alias: [
      // App path aliases
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
      // Redirect ALL Stencil imports (including subpaths) to mock - use regex to catch all subpaths
      {
        find: /^@stencil\/core(.*)$/,
        replacement: fileURLToPath(new URL('./src/mocks/stencil-core.mock.ts', import.meta.url)),
      },
      // Redirect @ionic/angular to mock (more specific paths MUST be first)
      {
        find: '@ionic/angular/standalone',
        replacement: fileURLToPath(new URL('./src/mocks/ionic-angular.mock.ts', import.meta.url)),
      },
      {
        find: '@ionic/angular',
        replacement: fileURLToPath(new URL('./src/mocks/ionic-angular.mock.ts', import.meta.url)),
      },
      // Redirect @ionic/core/loader specifically (MUST be before regex)
      {
        find: '@ionic/core/loader',
        replacement: fileURLToPath(new URL('./src/mocks/ionic-core.mock.ts', import.meta.url)),
      },
      // Redirect ALL Ionic Core imports to mock
      {
        find: /^@ionic\/core(.*)$/,
        replacement: fileURLToPath(new URL('./src/mocks/ionic-core.mock.ts', import.meta.url)),
      },
    ],
    // Enable directory index resolution for Ionic ESM imports
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
});
