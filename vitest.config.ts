import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import {
  ionicPolyfillPlugin,
  createAliases,
  inlineDeps,
  resolveConfig,
  optimizeDepsConfig,
} from './vitest.shared';

export default defineConfig({
  plugins: [ionicPolyfillPlugin(), angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    isolate: true,
    sequence: { concurrent: false },
    setupFiles: [
      'src/setup-polyfills.ts',
      '@analogjs/vitest-angular/setup-zone',
      'src/test-setup/index.ts',
    ],
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules/**'],
    reporters: ['default', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: [
        'src/app/**/*.spec.ts',
        'src/app/**/*.mock.ts',
        'src/app/tests/**',
        'src/app/testing/**',
        'src/app/**/*.module.ts',
        'src/app/**/index.ts',
        'src/app/**/*.model.ts',
        'src/app/**/constants/**',
        'src/app/shared/components/debug-panel/**',
        'src/app/shared/components/env-badge/**',
        'src/app/shared/icons/**',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 80,
          statements: 80,
        },
      },
    },
    server: {
      deps: {
        inline: inlineDeps,
      },
    },
  },
  optimizeDeps: optimizeDepsConfig,
  resolve: {
    alias: createAliases(),
    ...resolveConfig,
  },
});
