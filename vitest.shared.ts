import { fileURLToPath } from 'url';
import type { Plugin, AliasOptions } from 'vite';

export function ionicPolyfillPlugin(): Plugin {
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

const BASE_URL = new URL('./', import.meta.url);

export function createAliases(): AliasOptions {
  return [
    { find: '@core', replacement: fileURLToPath(new URL('./src/app/core', BASE_URL)) },
    { find: '@shared', replacement: fileURLToPath(new URL('./src/app/shared', BASE_URL)) },
    { find: '@env', replacement: fileURLToPath(new URL('./src/environments', BASE_URL)) },
    { find: '@services', replacement: fileURLToPath(new URL('./src/app/core/services', BASE_URL)) },
    { find: '@models', replacement: fileURLToPath(new URL('./src/app/core/models', BASE_URL)) },
    { find: '@guards', replacement: fileURLToPath(new URL('./src/app/core/guards', BASE_URL)) },
    {
      find: '@interceptors',
      replacement: fileURLToPath(new URL('./src/app/core/interceptors', BASE_URL)),
    },
    { find: '@mocks', replacement: fileURLToPath(new URL('./src/mocks', BASE_URL)) },
    { find: '@test-setup', replacement: fileURLToPath(new URL('./src/test-setup', BASE_URL)) },
    {
      find: /^@stencil\/core(.*)$/,
      replacement: fileURLToPath(new URL('./src/mocks/stencil-core.mock.ts', BASE_URL)),
    },
    {
      find: '@ionic/angular/standalone',
      replacement: fileURLToPath(new URL('./src/mocks/ionic-angular.mock.ts', BASE_URL)),
    },
    {
      find: '@ionic/angular',
      replacement: fileURLToPath(new URL('./src/mocks/ionic-angular.mock.ts', BASE_URL)),
    },
    {
      find: '@ionic/core/loader',
      replacement: fileURLToPath(new URL('./src/mocks/ionic-core.mock.ts', BASE_URL)),
    },
    {
      find: /^@ionic\/core(.*)$/,
      replacement: fileURLToPath(new URL('./src/mocks/ionic-core.mock.ts', BASE_URL)),
    },
    {
      find: '@capacitor-mlkit/barcode-scanning',
      replacement: fileURLToPath(new URL('./src/test-setup/barcode-scanner.mock.ts', BASE_URL)),
    },
    {
      find: 'capacitor-widget-bridge',
      replacement: fileURLToPath(new URL('./src/mocks/capacitor-widget-bridge.mock.ts', BASE_URL)),
    },
    {
      find: 'chartjs-plugin-zoom',
      replacement: fileURLToPath(new URL('./src/mocks/chartjs-plugin-zoom.mock.ts', BASE_URL)),
    },
    {
      find: 'hammerjs',
      replacement: fileURLToPath(new URL('./src/mocks/hammerjs.mock.ts', BASE_URL)),
    },
  ];
}

export const inlineDeps = [
  '@capacitor/core',
  '@capacitor/preferences',
  '@capacitor/device',
  '@capacitor/network',
  '@ngx-translate/core',
  '@analogjs/vitest-angular',
  /^@angular\//,
  /^@ionic\//,
  /^@stencil\//,
];

export const resolveConfig = {
  mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
  extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
};

export const optimizeDepsConfig = {
  include: ['@ionic/angular', '@ionic/core', '@ionic/core/loader', '@ionic/core/components'],
  esbuildOptions: { mainFields: ['module', 'main'] },
};
