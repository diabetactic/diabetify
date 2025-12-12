# Playwright for Android E2E Testing

This document provides a guide to setting up and running Playwright end-to-end tests on an Android device or emulator. It also offers a comparison with Maestro and outlines the known limitations of using Playwright for mobile testing in this project.

## 1. Setup Guide

This guide explains how to run Playwright E2E tests on a real Android device or emulator. This allows for testing the application's behavior in a genuine Android WebView environment.

### Prerequisites

1.  **Android SDK**: Ensure you have the Android SDK installed and configured on your machine. The `adb` (Android Debug Bridge) command-line tool should be in your system's PATH.

2.  **Android Device or Emulator**:
    - **Real Device**: Connect an Android device to your computer via USB.
    - **Emulator**: Alternatively, you can use an Android emulator set up through Android Studio.

3.  **USB Debugging**: Enable "Developer options" and "USB debugging" on your Android device. You can find instructions on how to do this in the [official Android documentation](https://developer.android.com/studio/debug/dev-options).

### Step-by-Step Instructions

1.  **Verify Device Connection**:
    Open your terminal and run the following command to ensure your device is recognized by ADB:

    ```bash
    adb devices
    ```

    You should see your device listed in the output.

2.  **Forward the CDP Port**:
    To allow Playwright to communicate with the Chrome browser or WebView on your Android device, you need to forward the Chrome DevTools Protocol (CDP) port. Use the following `adb` command:

    ```bash
    adb forward tcp:9222 localabstract:chrome_devtools_remote
    ```

    This command forwards port `9222` on your local machine to the Chrome DevTools on your Android device.

3.  **Run the Tests**:
    Once the device is connected and the port is forwarded, you can run the Playwright tests. The existing test suite is already configured to connect to the Android device when you set the `E2E_ANDROID` environment variable.

    In your terminal, run the following command:

    ```bash
    E2E_ANDROID=true npm run test:e2e
    ```

    This will execute the Playwright tests against the Chrome browser on your connected Android device.

### How it Works: The CDP Connection

Playwright's "real device" testing mode for Android leverages the **Chrome DevTools Protocol (CDP)**. Here's a simplified breakdown of the process:

1.  When you run `adb forward ...`, you're creating a communication channel between your computer and the Android device.
2.  Playwright's test runner, when `E2E_ANDROID` is true, is configured to connect to a browser over CDP at `http://localhost:9222`.
3.  The test commands are sent over this connection to the Chrome browser running on the Android device, which then executes them within the WebView.

## 2. Playwright vs. Maestro

Both Playwright and Maestro are used in this project for E2E testing, but they serve different purposes. Here’s a comparison to help you choose the right tool for your needs:

| Feature            | Playwright                                                                                                  | Maestro                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Primary Target** | **WebView content** inside the Android app.                                                                 | **Native UI components** and full app interaction.                                             |
| **Test Language**  | TypeScript / JavaScript                                                                                     | YAML                                                                                           |
| **Strengths**      | - Precision testing of web content.<br>- Cross-platform (web and mobile web).<br>- Rich debugging features. | - Testing of native UI elements.<br>- Simple, declarative syntax.<br>- Resilient to flakiness. |
| **Limitations**    | - **Cannot interact with native UI**.<br>- Limited to what's available in the WebView.                      | - Less suited for complex logic.<br>- Requires separate setup.                                 |
| **When to Use**    | - For features entirely within the WebView.<br>- When reusing web E2E tests.                                | - For flows involving native UI.<br>- For full-app user journeys.                              |

In summary, use **Playwright** for testing the web-based parts of the app, and **Maestro** for testing the native shell and end-to-end flows that involve native UI.

## 3. Known Limitations

The primary limitation of using Playwright for Android testing in this project is that it can **only interact with the WebView content**.

- **No Native UI Interaction**: Playwright cannot see or interact with any native Android UI elements, such as the top status bar, navigation buttons, or any other native components outside of the WebView.
- **WebView Only**: Testing is strictly limited to the HTML, CSS, and JavaScript that is rendered within the WebView.

For any tests that require interaction with native UI, **Maestro is the recommended and required tool**.
