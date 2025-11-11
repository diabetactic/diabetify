// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const fs = require('fs');
const { env } = process;

function resolveChromeBinary() {
  try {
    const puppeteer = require('puppeteer');
    const executable = puppeteer.executablePath();
    if (executable && fs.existsSync(executable)) {
      return executable;
    }
  } catch (error) {
    // Ignore when puppeteer is not installed in the environment
  }

  if (env.CHROME_BIN && fs.existsSync(env.CHROME_BIN)) {
    return env.CHROME_BIN;
  }

  if (env.CHROME_BIN) {
    delete env.CHROME_BIN;
  }

  return null;
}

const resolvedChrome = resolveChromeBinary();
if (resolvedChrome) {
  env.CHROME_BIN = resolvedChrome;
}

module.exports = function (config) {
  const isCI = !!env.CI || !!env.GITHUB_ACTIONS || env.KARMA_HEADLESS === 'true';
  const useHeadless = !!resolvedChrome || isCI;

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
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
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
