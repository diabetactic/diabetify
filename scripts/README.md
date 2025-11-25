# Diabetactic Testing Scripts

Automated testing, building, and deployment scripts for quick UI validation and state management.

## Setup (One-time)

Add to your shell configuration (`.zshrc`):

```bash
# Diabetactic Testing Commands
if [ -f "$HOME/TPP/diabetify-extServices-20251103-061913/diabetify/scripts/aliases.sh" ]; then
  source "$HOME/TPP/diabetify-extServices-20251103-061913/diabetify/scripts/aliases.sh"
fi
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Quick Commands

### Pre-Flight Check
```bash
# Check if everything is ready (device, APK, app state)
check-app
```

### Common Workflows

#### After modifying UI (CSS, HTML)
```bash
# Option 1: Quick rebuild + screenshot
rebuild-apk && deploy-apk && screenshot "my-feature-name"

# Option 2: Full test with all screens
test-ui
```

#### After code changes
```bash
# Rebuild and restart
rebuild-and-deploy

# Verify it works
check-logs
```

#### Debugging
```bash
# Check current errors
check-logs

# Follow app logs in real-time (Ctrl+C to stop)
tail-logs
```

### All Available Commands

| Command | Purpose |
|---------|---------|
| `check-app` | Verify device, APK, app state |
| `apk-info` | Show APK build time and size |
| `device-info` | Show device Android version, model |
| `launch-app` | Start the app |
| `stop-app` | Stop the app |
| `restart-app` | Stop and start the app |
| `clear-app-data` | Clear app cache (for fresh start) |
| `rebuild-apk` | Build Android APK with Gradle |
| `deploy-apk` | Install APK to device |
| `rebuild-and-deploy` | Rebuild, install, and restart |
| `screenshot <name>` | Capture named screenshot to /tmp |
| `test-ui-fast` | Quick navigation through all tabs with screenshots |
| `test-ui` | Full UI test with state verification |
| `check-logs` | Show recent error logs |
| `tail-logs` | Follow app logs (Ctrl+C to stop) |
| `diabetify-help` | Show this help information |

## Script Files

### `check-state.sh`
Pre-flight verification script. Checks:
- Device connectivity
- Java 25 installation
- Android SDK configuration
- Maestro availability
- APK build status and timestamp
- App installation status
- App running status
- Web build status

**Usage:**
```bash
./scripts/check-state.sh
```

### `quick-ui-test.sh`
Comprehensive automated UI test. Performs:
1. Device check
2. Rebuild if needed (compares web build vs APK timestamps)
3. Install APK
4. Launch app
5. Navigate all screens
6. Capture screenshots
7. Verify layout

**Usage:**
```bash
./scripts/quick-ui-test.sh
```

### `aliases.sh`
Shell functions for testing commands. Source to enable all commands.

**Usage:**
```bash
source scripts/aliases.sh
```

## Common Issues & Solutions

### "APK not found" error
```bash
# The APK hasn't been built. Build it:
rebuild-apk
```

### "Device not connected"
```bash
# Check if emulator is running:
adb devices

# If not listed, start emulator from Android Studio or:
emulator -avd your_avd_name &
```

### "App won't start"
```bash
# Check for errors
check-logs

# Clear app data and retry
clear-app-data
restart-app
```

### Button coordinates changed after rebuild
The scripts use **text-based selectors** with Maestro, so they automatically adapt to layout changes. No need to update coordinates!

## Environment

Scripts automatically configure:
- `JAVA_HOME=/home/julito/.local/share/mise/installs/java/25.0.1`
- `ANDROID_HOME=$HOME/Android/Sdk`

These are set in each script that needs them.

## Testing Workflow

### Typical Development Cycle

```bash
# 1. Check prerequisites
check-app

# 2. Make code changes
# (edit .html, .scss, .ts files)

# 3. Rebuild and test
rebuild-apk && deploy-apk

# 4. Quick visual check
screenshot "feature-name"

# 5. Full validation if needed
test-ui
```

### After Major Changes

```bash
# 1. Verify state
check-app

# 2. Full rebuild
rebuild-and-deploy

# 3. Check for errors
check-logs

# 4. Capture screenshots
test-ui-fast
```

## Automation Example

Create a shell alias for your specific workflow:

```bash
# In your shell config or aliases.sh:
alias test-feature='rebuild-apk && deploy-apk && screenshot "feature" && echo "✓ Ready to test"'

# Then use:
test-feature
```

## Notes

- All screenshots are saved to `/tmp/`
- Build logs are saved to `/tmp/gradle.log`
- Scripts check APK timestamp vs web build timestamp to avoid unnecessary rebuilds
- Maestro tests use text-based selectors (not coordinates) for reliability
- Commands are color-coded for clarity (green=success, red=error, yellow=warning)

## Help

Get command reference anytime:
```bash
diabetify-help
```
