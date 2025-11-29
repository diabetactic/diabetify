/** @type {import('jest').Config} */
const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'integration',
  testMatch: ['<rootDir>/src/app/tests/integration/**/*.(spec|integration).ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/www/',
    '<rootDir>/playwright/',
  ],
  // Keep integration runs predictable and light on resources
  maxWorkers: 1,
  testTimeout: 20000,
  collectCoverage: false,
  coverageDirectory: 'coverage/diabetactic-integration',
};
