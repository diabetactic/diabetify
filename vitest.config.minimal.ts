import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['@analogjs/vitest-angular/setup-zone'],
    include: ['src/**/*.spec.ts'],
  },
});
