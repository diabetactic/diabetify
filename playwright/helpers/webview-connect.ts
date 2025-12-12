import { chromium, Page } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

const CDP_PORT = 9222;
const MAX_RETRIES = 10;
const RETRY_DELAY = 500; // ms

async function checkCdpEndpoint(): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:${CDP_PORT}/json/version`, res => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

/**
 * Finds the PID of the Android WebView process for a given package name.
 * @param packageName - The name of the package to find the WebView PID for.
 * @returns The PID of the WebView process.
 */
export async function getWebViewPid(packageName: string): Promise<number> {
  const { stdout } = await execAsync(
    `adb shell "cat /proc/net/unix | grep 'webview_devtools_remote'"`
  );

  const pids = (stdout.match(/@webview_devtools_remote_(\d+)/g) || []).map(s =>
    parseInt(s.split('_').pop()!, 10)
  );

  if (pids.length === 0) {
    throw new Error('No active WebView found.');
  }

  for (const pid of pids) {
    try {
      const { stdout: psOut } = await execAsync(`adb shell "ps -ef | awk '\\$2==${pid}'"`);
      if (psOut.includes(packageName)) {
        console.log(`Found WebView PID: ${pid} for package ${packageName}`);
        return pid;
      }
    } catch (err) {
      console.warn(`Error checking PID ${pid}:`, err);
    }
  }

  throw new Error(`No WebView process found for package '${packageName}'.`);
}

/**
 * Connects to the Android WebView of the application.
 * @param packageName - The name of the package to connect to.
 * @returns A Playwright Page object connected to the WebView.
 */
export async function connectToWebView(packageName: string): Promise<Page> {
  console.log(`Connecting to Android WebView for package: ${packageName}...`);

  try {
    const pid = await getWebViewPid(packageName);

    console.log(`Forwarding ADB port for PID: ${pid}...`);
    await execAsync(`adb forward tcp:${CDP_PORT} localabstract:webview_devtools_remote_${pid}`);

    let retries = 0;
    while (retries < MAX_RETRIES) {
      if (await checkCdpEndpoint()) {
        console.log('CDP endpoint is active.');
        break;
      }
      console.log(`CDP endpoint not ready, retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      retries++;
    }

    if (retries === MAX_RETRIES) {
      throw new Error('CDP endpoint health check failed after multiple retries.');
    }

    console.log('Connecting to CDP endpoint...');
    const browser = await chromium.connectOverCDP(`http://localhost:${CDP_PORT}`);
    const page = browser.contexts()[0].pages()[0];

    page.on('close', () => {
      console.log('WebView page closed. Disconnecting...');
      disconnectFromWebView();
    });

    console.log('Successfully connected to WebView.');
    return page;
  } catch (error) {
    console.error('Failed to connect to WebView:', error);
    await disconnectFromWebView();
    throw error;
  }
}

/**
 * Disconnects from the Android WebView and cleans up resources.
 */
export async function disconnectFromWebView(): Promise<void> {
  console.log('Cleaning up ADB port forwarding...');
  try {
    await execAsync(`adb forward --remove tcp:${CDP_PORT}`);
    console.log('ADB port forwarding removed.');
  } catch (error) {
    console.error('Failed to remove ADB port forwarding:', error);
  }
}
