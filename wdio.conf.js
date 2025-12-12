
exports.config = {
    specs: [
        './test/wdio/app/readings-add.spec.ts'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        maxInstances: 1,
        browserName: 'chrome',
        'goog:chromeOptions': {
             args: ['--headless', '--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox']
        },
    }],
    logLevel: 'info',
    bail: 0,
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: ['appium'],
    framework: 'jasmine',
    reporters: ['spec'],
    jasmineOpts: {
        defaultTimeoutInterval: 60000,
    },
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            transpileOnly: true,
            project: 'test/wdio/tsconfig.wdio.json'
        }
    }
}
