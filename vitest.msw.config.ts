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
  css: {
    postcss: {},
  },
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    isolate: true,
    sequence: { concurrent: false },
    css: false,
    setupFiles: [
      'src/setup-polyfills.ts',
      '@analogjs/vitest-angular/setup-zone',
      'src/test-setup/index.ts',
      'src/test-setup/msw-setup.ts',
    ],
    include: ['src/app/tests/integration-msw/**/*.spec.ts'],
    exclude: ['node_modules/**'],
    reporters: ['default', 'html'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.mock.ts'],
    },
    server: {
      deps: {
        inline: inlineDeps,
      },
    },
  },
  optimizeDeps: {
    ...optimizeDepsConfig,
    include: [...optimizeDepsConfig.include, 'msw'],
  },
  resolve: {
    alias: createAliases(),
    ...resolveConfig,
  },
});
