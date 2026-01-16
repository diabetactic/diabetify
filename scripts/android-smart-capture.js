const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots', 'android-captures');

function runAdb(command) {
  try {
    return execSync(`adb ${command}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    return '';
  }
}

function captureScreenshot(name) {
  const filename = `${name}.png`;
  const remotePath = `/sdcard/${filename}`;
  const localPath = path.join(OUTPUT_DIR, filename);

  runAdb(`shell screencap -p ${remotePath}`);
  runAdb(`pull ${remotePath} ${localPath}`);
  runAdb(`shell rm ${remotePath}`);
  console.log(`📸 Saved: ${name}.png`);
}

function getHierarchy() {
    runAdb('shell uiautomator dump /sdcard/view.xml');
    return runAdb('shell cat /sdcard/view.xml');
}

function findCoords(text) {
    const xml = getHierarchy();
    // Bounds look like "[x1,y1][x2,y2]"
    // Look for node with matching text or content-desc
    const regex = new RegExp(`(?:text|content-desc)=\"[^\"]*${text}[^\"]*\"[^>]*bounds=\"\\[(\\d+),(\\d+)\\]\[(\\d+),(\\d+)\]\"`, 'i');
    const match = xml.match(regex);
    if (match) {
        return {
            x: Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2),
            y: Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2)
        };
    }
    return null;
}

function tap(textOrCoords) {
    let x, y, label;
    if (typeof textOrCoords === 'string') {
        const coords = findCoords(textOrCoords);
        if (!coords) {
            console.log(`⚠️  Could not find "${textOrCoords}"`);
            return false;
        }
        x = coords.x;
        y = coords.y;
        label = textOrCoords;
    } else {
        x = textOrCoords.x;
        y = textOrCoords.y;
        label = `${x},${y}`;
    }

    console.log(`👆 Tapping ${label}...`);
    runAdb(`shell input tap ${x} ${y}`);
    sleep(2500); // Wait for transition
    return true;
}

function sleep(ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {}
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('🚀 Starting Smart Capture...');
  
  // 1. Welcome Screen
  captureScreenshot('01-welcome');
  
  // Try to click "Iniciar Sesión" or "Login"
  // Note: Since WebView might not expose text to uiautomator, 
  // I will use coordinates for the buttons on this specific emulator (Pixel 5)
  // if text search fails.
  
  if (!tap('Iniciar Sesión') && !tap('Login')) {
      console.log('Falling back to coordinates for Welcome -> Login button');
      runAdb('shell input tap 540 1600'); // Estimate for center button
      sleep(2000);
  }
  
  captureScreenshot('02-login-form');

  // 2. Login
  console.log('⌨️  Entering credentials...');
  // Tap DNI field (top one)
  runAdb('shell input tap 540 800'); 
  runAdb('shell input text "40123456"');
  sleep(500);
  // Tap Password field
  runAdb('shell input tap 540 1000');
  runAdb('shell input text "thepassword"');
  sleep(500);
  // Tap Sign In button
  runAdb('shell input tap 540 1250');
  console.log('⏳ Waiting for dashboard...');
  sleep(5000);
  
  captureScreenshot('03-dashboard');

  // 3. Navigation (Tabs)
  // Dashboard tab
  tap({x: 180, y: 2250});
  captureScreenshot('04-tab-dashboard');
  
  // Readings tab
  tap({x: 540, y: 2250});
  captureScreenshot('05-tab-readings');
  
  // Profile tab
  tap({x: 900, y: 2250});
  captureScreenshot('06-tab-profile');

  // 4. Modal Interaction
  console.log('👆 Tapping Settings in Profile...');
  runAdb('shell input tap 540 600'); // Tap top list item
  sleep(2000);
  captureScreenshot('07-settings-modal');
  
  // Close modal
  runAdb('shell input keyevent 4'); // Android back button
  sleep(1000);

  // 5. FAB
  tap({x: 180, y: 2250}); // Back to Dashboard
  console.log('👆 Tapping FAB...');
  runAdb('shell input tap 540 2000');
  sleep(2000);
  captureScreenshot('08-add-reading-modal');

  console.log('✅ Done. Please verify screenshots in screenshots/android-captures/');
}

main();