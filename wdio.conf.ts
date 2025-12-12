import type { Options } from '@wdio/types';
import { join } from 'path';

export const config: Options.Testrunner = {
    runner: 'local',
    automator: 'appium',
    specs: [
        './test/e2e/specs/**/*.ts'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [
        {
            platformName: 'Android',
            'appium:platformVersion': '12.0',
            'appium:deviceName': 'Android Emulator',
            'appium:automationName': 'UiAutomator2',
            'appium:app': join(process.cwd(), 'android/app/build/outputs/apk/debug/app-debug.apk'),
            'appium:autoWebView': true,
        }
    ],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: ['appium'],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },
};
