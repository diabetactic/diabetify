import { execSync } from 'child_process';
import { Page } from '@playwright/test';

// App package ID from capacitor.config.ts
const APP_ID = 'io.diabetactic.app';

/**
 * Executes a shell command and logs it.
 * @param command The command to execute.
 */
function runCommand(command: string) {
  console.log(`Executing: ${command}`);
  try {
    return execSync(command, { stdio: 'pipe' }).toString();
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    throw error;
  }
}

/**
 * Returns the app's package ID.
 */
export const getAppId = (): string => APP_ID;

/**
 * Force-stops the application using ADB.
 */
export const stopApp = (): void => {
  runCommand(`adb shell am force-stop ${APP_ID}`);
};

/**
 * Starts the application's main activity using ADB.
 */
export const startApp = (): void => {
  // Use monkey to launch the main activity
  runCommand(`adb shell monkey -p ${APP_ID} -c android.intent.category.LAUNCHER 1`);
};

/**
 * Restarts the app by stopping and then starting it.
 * @param page The Playwright page object to wait on.
 */
export const restartApp = async (page: Page): Promise<void> => {
  stopApp();
  // Wait for the app to fully close by waiting for the root element to be detached
  await page.waitForSelector('ion-app', { state: 'detached', timeout: 5000 });
  startApp();
  // Wait for the app to relaunch and the webview to be ready
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForSelector('ion-app', { state: 'visible', timeout: 10000 });
};
