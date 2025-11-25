// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const fs = require('fs');
const path = require('path');
const { env } = process;
const consoleLogLevel = env.KARMA_CONSOLE_LEVEL || 'warn';
const captureConsole = env.KARMA_CAPTURE_CONSOLE !== 'false';

// Ensure a local, writable Chromium config directory to avoid ~/.config permission issues
const localConfigDir = path.join(__dirname, '.chromium-config');
if (!fs.existsSync(localConfigDir)) {
  fs.mkdirSync(localConfigDir, { recursive: true });
}
env.XDG_CONFIG_HOME = localConfigDir;

// If CHROME_BIN is set but invalid, clear it.
if (env.CHROME_BIN && !fs.existsSync(env.CHROME_BIN)) {
  delete env.CHROME_BIN;
}

// If no CHROME_BIN is set, but Chromium exists at a common path, use it.
if (!env.CHROME_BIN && fs.existsSync('/usr/bin/chromium')) {
  env.CHROME_BIN = '/usr/bin/chromium';
}

module.exports = function (config) {
  const isCI = !!env.CI || !!env.GITHUB_ACTIONS || env.KARMA_HEADLESS === 'true';
  const useHeadless = isCI || !!env.CHROME_BIN;

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
      require('karma-spec-reporter'),
    ],
    client: {
      jasmine: {
        // Jasmine configuration options
        // Random execution disabled for more predictable test runs
        random: false,
        // Stop on first failure for faster feedback during development
        stopSpecOnExpectationFailure: false,
        // Increased timeout for Ionic component initialization
        timeoutInterval: 10000,
      },
      // Flag used by test.ts to avoid loading unit specs during integration runs
      integration: env.KARMA_INTEGRATION === 'true',
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
      captureConsole,
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    // Ensure files array is always defined to avoid FileList .filter on undefined
    files: [],
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/diabetactic'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' }, // For CI integration
      ],
      check: {
        global: {
          statements: 50,
          branches: 50,
          functions: 50,
          lines: 50,
        },
      },
    },
    reporters: ['spec', 'kjhtml'],
    browserConsoleLogOptions: {
      level: consoleLogLevel,
      format: '%b %T: %m',
      terminal: true,
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: !isCI,
    browsers: [useHeadless ? 'ChromeHeadlessCI' : 'Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          '--disable-extensions',
          `--user-data-dir=${path.join(localConfigDir, 'karma-profile')}`,
          '--disable-crash-reporter',
        ],
      },
    },
    singleRun: isCI,
    restartOnFileChange: true,
    browserNoActivityTimeout: 120000,
    browserDisconnectTimeout: 20000,
    browserDisconnectTolerance: 3,
    captureTimeout: 300000,
  });
};
