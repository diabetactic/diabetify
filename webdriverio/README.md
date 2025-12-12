# WebdriverIO E2E Tests

This directory contains the WebdriverIO E2E tests for the Diabetactic app.

## Prerequisites

- Node.js and npm installed
- Android SDK and emulator setup
- Appium and UiAutomator2 driver installed (`npm run test:wdio:setup`)
- A debug build of the Android app located at `android/app/build/outputs/apk/debug/app-debug.apk`

## Running the Tests

To run the tests, use the following command from the root of the repository:

```bash
npm run test:e2e:wdio
```

This will run all the spec files in the `webdriverio/specs` directory.

## Test User

The tests use the following user:

- **DNI:** `2003`
- **Password:** `webdriverio_test`

## Page Objects

The page objects are located in the `webdriverio/pageobjects` directory. They follow the Page Object Model (POM) pattern.

## Test Specs

The test specs are located in the `webdriverio/specs` directory. Each spec file corresponds to a feature of the app.
