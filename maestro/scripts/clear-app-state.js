const { execSync } = require('child_process');
try {
  execSync('adb shell pm clear io.diabetactic.app', { timeout: 10000 });
  console.log('App state cleared successfully');
} catch (e) {
  console.log('Warning: Could not clear app state:', e.message);
}
