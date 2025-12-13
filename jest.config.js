/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/www/',
    '<rootDir>/playwright/',

    // Skip integration tests (those run separately)
    '<rootDir>/src/app/tests/integration/',
    // Exclude environment files (not tests)
    '<rootDir>/src/environments/',
  ],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    // Exclude test infrastructure
    '!src/app/**/*.spec.ts',
    '!src/app/tests/**',
    '!src/app/testing/**',
    // Exclude Angular boilerplate
    '!src/app/**/*.module.ts',
    '!src/app/**/*.routes.ts',
    '!src/app/**/index.ts',
    // Exclude Ionic demo/boilerplate
    '!src/app/explore-container/**',
    // Exclude entry points
    '!src/main.ts',
    '!src/polyfills.ts',
  ],
  coverageDirectory: 'coverage/diabetactic',
  coverageReporters: ['html', 'text-summary', 'lcov'],
  // JUnit reporter for CI test results
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results/jest',
        outputName: 'junit.xml',
      },
    ],
  ],
  coverageThreshold: {
    global: {
      statements: 20,
      branches: 15,
      functions: 15,
      lines: 20,
    },
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@env/(.*)$': '<rootDir>/src/environments/$1',
    '^@environments/(.*)$': '<rootDir>/src/environments/$1',
    '^@models/(.*)$': '<rootDir>/src/app/core/models/$1',
    '^@services/(.*)$': '<rootDir>/src/app/core/services/$1',
    '^@guards/(.*)$': '<rootDir>/src/app/core/guards/$1',
    '^@interceptors/(.*)$': '<rootDir>/src/app/core/interceptors/$1',
    // Mock ionicons to avoid ESM issues
    'ionicons/components/ion-icon.js': '<rootDir>/src/app/tests/mocks/ionicons.mock.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@ionic|@stencil|@capacitor|@capgo|@angular|rxjs|@ngx-translate|lucide-angular|dexie|tslib|@faker-js|ionicons)/)',
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  // Memory-optimized parallel execution
  // Use only 2 workers to prevent memory exhaustion
  maxWorkers: 2,
  // Run tests sequentially within each worker to reduce memory spikes
  workerIdleMemoryLimit: '512MB',
  // Cache for faster subsequent runs
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  // Faster test execution
  testEnvironment: 'jsdom',
  // Clear mocks between tests
  clearMocks: true,
  // Restore original implementations after each test
  restoreMocks: true,
  // Timeout for slow tests
  testTimeout: 10000,
  // Less verbose to reduce output overhead
  verbose: false,
  // Detect memory leaks
  detectOpenHandles: false,
  // Force garbage collection between tests
  logHeapUsage: false,
};
