# WebdriverIO End-to-End Testing Setup

This document outlines the steps to set up and run WebdriverIO end-to-end tests for the Diabetactic mobile application.

## Prerequisites

- Node.js v20 or higher
- Java 17 or higher
- A working Android development environment, including the Android SDK and a configured emulator or physical device.

## 1. Install Dependencies

The required dependencies for WebdriverIO are listed in `package.json`. To install them, run the following command from the root of the project:

```bash
npm install
```

This will install WebdriverIO, the Appium service, and other necessary packages.

## 2. Build the Android App

Before running the tests, you need to build the Android application to generate the `.apk` file that WebdriverIO will use.

```bash
npm run mobile:build
```

This command will build the app and place the debug APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

## 3. Configure WebdriverIO

The WebdriverIO configuration is located in `wdio.conf.ts`. This file is pre-configured to run tests on a local Android emulator with Appium. The configuration specifies the platform, device, and app details.

Key configuration options:

- **`specs`**: The location of the test files.
- **`capabilities`**: The configuration for the Appium driver, including the path to the app APK.
- **`services`**: The services to use, such as the Appium service for local testing.

## 4. Running the Tests

To run the WebdriverIO tests, use the following npm script:

```bash
npm run test:e2e:wdio
```

This command will:

1. Start the Appium server automatically (if not already running).
2. Launch the Android emulator (if not already running).
3. Install the Diabetactic app on the emulator.
4. Run the tests located in `test/e2e/wdio/`.

## 5. Writing Tests

Tests are written using the Mocha framework and the WebdriverIO API. You can find example tests in the `test/e2e/wdio/` directory.

### Example Test

```typescript
describe('Diabetactic App', () => {
  it('should open the app and have the correct package name', async () => {
    const packageName = await driver.getCurrentPackage();
    expect(packageName).toEqual('io.diabetactic.app');
  });

  it('should find the welcome text', async () => {
    const welcomeText = await $('//android.widget.TextView[@text="Welcome to Diabetactic"]');
    await welcomeText.waitForDisplayed({ timeout: 30000 });
    expect(await welcomeText.isDisplayed()).toBe(true);
  });
});
```
