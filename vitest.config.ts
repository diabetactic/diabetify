import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/setup-vitest.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.mock.ts'],
    },
    // Allow external dependencies that need to be processed
    deps: {
      inline: [
        '@ionic/angular',
        '@ionic/core',
        '@capacitor/core',
        '@capacitor/preferences',
        '@capacitor/device',
        '@capacitor/network',
        '@ngx-translate/core',
      ],
    },
  },
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/app/core', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/app/shared', import.meta.url)),
      '@env': fileURLToPath(new URL('./src/environments', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/app/core/services', import.meta.url)),
      '@models': fileURLToPath(new URL('./src/app/core/models', import.meta.url)),
      '@guards': fileURLToPath(new URL('./src/app/core/guards', import.meta.url)),
      '@interceptors': fileURLToPath(new URL('./src/app/core/interceptors', import.meta.url)),
    },
  },
});
