import type { Options } from '@wdio/types'
import { join } from 'node:path'

const { CI, DRIVER } = process.env
const isCI = !!CI
const isAndroid = DRIVER === 'android'
const isLocal = !isCI

export const config: Options.Testrunner = {
  // ====================
  // Runner Configuration
  // ====================
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true,
    },
  },

  // ==================
  // Specify Test Files
  // ==================
  specs: ['./test/e2e/wdio/**/*.spec.ts'],

  // ============
  // Capabilities
  // ============
  maxInstances: 1,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Android Emulator',
      'appium:platformVersion': '13.0',
      'appium:app': join(
        process.cwd(),
        'android/app/build/outputs/apk/debug/app-debug.apk',
      ),
      'appium:newCommandTimeout': 240,
    },
  ],

  // ===================
  // Test Configurations
  // ===================
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: isLocal ? ['appium'] : [],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  // =====
  // Hooks
  // =====
  onPrepare: async function (config, capabilities) {
    if (isLocal) {
      console.log('Appium will be started automatically.')
    }
  },
}
