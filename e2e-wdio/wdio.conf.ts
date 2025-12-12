import type { Options } from '@wdio/types'

export const config: Options.Testrunner = {
    runner: 'local',
    specs: [
        './test/specs/**/*.ts'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:platformVersion': '34',
        'appium:deviceName': 'Android Emulator',
        'appium:app': '../android/app/build/outputs/apk/debug/app-debug.apk',
        'appium:automationName': 'UiAutomator2',
        'appium:appPackage': 'io.diabetactic.app',
        'appium:autoGrantPermissions': true,
    }],
    logLevel: 'info',
    bail: 0,
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
}
