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
    ],
    include: ['src/app/tests/integration/backend/**/*.{spec,integration}.ts'],
    exclude: ['node_modules/**'],
    reporters: ['default', 'html'],
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
    poolOptions: {
      forks: { singleFork: true },
    },
    coverage: { enabled: false },
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
