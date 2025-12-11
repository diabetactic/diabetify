const { execSync } = require('child_process');
try {
  execSync('adb shell am start -n io.diabetactic.app/.MainActivity', { timeout: 10000 });
  console.log('App started successfully via ADB');
} catch (e) {
  console.log('Warning: Could not start app via ADB:', e.message);
}
