# Mobile MCP Setup Guide

This guide explains how to set up and use Mobile MCP (Model Context Protocol) for mobile device automation and testing in the Diabetactic project.

## Overview

Mobile MCP allows you to interact with Android and iOS devices/emulators directly from Cursor/Claude Code. It provides tools for:

- Listing available devices
- Taking screenshots
- Interacting with UI elements
- Installing/uninstalling apps
- Running automation tests

## Prerequisites

### Android Setup

1. **Android SDK Platform Tools** (already installed)

   ```bash
   # Verify ADB is available
   which adb
   # Should output: /opt/android-sdk/platform-tools/adb
   ```

2. **Enable USB Debugging** (for physical devices)
   - On your Android device: Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
   - Connect device via USB

3. **Android Emulator** (optional)

   ```bash
   # List available emulators
   emulator -list-avds

   # Start an emulator
   npm run android:emulator
   # Or manually:
   emulator -avd Medium_Phone_API_36.1 -no-snapshot-load &
   ```

### iOS Setup (macOS only)

1. **Xcode Command Line Tools**

   ```bash
   xcode-select --install
   ```

2. **List iOS Simulators**

   ```bash
   xcrun simctl list devices
   ```

3. **Boot a Simulator**
   ```bash
   xcrun simctl boot "iPhone 16"
   ```

## Mobile MCP Configuration

Mobile MCP is already configured and available in Cursor. The configuration uses:

```json
{
  "mcpServers": {
    "mobile-mcp": {
      "command": "npx",
      "args": ["-y", "@mobilenext/mobile-mcp"]
    }
  }
}
```

**Version**: 0.0.39 (verified)

## Available Mobile MCP Tools

The following tools are available through Mobile MCP:

### Device Management

- `mobile_list_available_devices` - List all connected devices/emulators
- `mobile_get_screen_size` - Get device screen dimensions
- `mobile_get_orientation` - Get current screen orientation
- `mobile_set_orientation` - Change screen orientation (portrait/landscape)

### App Management

- `mobile_list_apps` - List installed apps on device
- `mobile_install_app` - Install APK/IPA file
- `mobile_uninstall_app` - Uninstall app by package name
- `mobile_launch_app` - Launch app by package name
- `mobile_terminate_app` - Stop running app

### UI Interaction

- `mobile_list_elements_on_screen` - Get all UI elements with coordinates
- `mobile_click_on_screen_at_coordinates` - Click at x,y coordinates
- `mobile_double_tap_on_screen` - Double tap at coordinates
- `mobile_long_press_on_screen_at_coordinates` - Long press at coordinates
- `mobile_swipe_on_screen` - Swipe in direction (up/down/left/right)
- `mobile_type_keys` - Type text into focused element
- `mobile_press_button` - Press device button (HOME, BACK, VOLUME_UP, etc.)
- `mobile_open_url` - Open URL in browser

### Screenshots

- `mobile_take_screenshot` - Capture current screen
- `mobile_save_screenshot` - Save screenshot to file

## Usage Examples

### 1. List Available Devices

```bash
# In Cursor, you can ask:
"List available mobile devices"
```

Or use the tool directly:

```typescript
// Returns: { devices: [{ id: "emulator-5554", name: "Android Emulator", ... }] }
mobile_list_available_devices();
```

### 2. Install Diabetactic App

```bash
# Build and install the app
npm run mobile:install

# Or use Mobile MCP:
# 1. List devices to get device ID
# 2. Install using: mobile_install_app(device, path_to_apk)
```

### 3. Take Screenshot

```bash
# In Cursor, ask:
"Take a screenshot of the current device screen"
```

### 4. Interact with UI

```bash
# List elements to find coordinates
mobile_list_elements_on_screen(device)

# Click on an element
mobile_click_on_screen_at_coordinates(device, x, y)

# Type text
mobile_type_keys(device, "1000", false)  # Username
mobile_type_keys(device, "tuvieja", true)  # Password (submit=true)
```

## Diabetactic App Package Info

- **Package Name**: `io.diabetactic.app`
- **App ID**: `io.diabetactic.app`
- **Test Credentials**:
  - Username: `1000`
  - Password: `tuvieja`

## Common Workflows

### Testing Login Flow

1. Launch app: `mobile_launch_app(device, "io.diabetactic.app")`
2. Take screenshot to see current state
3. List elements to find input fields
4. Type username: `mobile_type_keys(device, "1000", false)`
5. Type password: `mobile_type_keys(device, "tuvieja", true)`
6. Take screenshot to verify login success

### Testing Glucose Reading

1. Navigate to readings page (swipe or click)
2. Click "Add Reading" button
3. Fill in glucose value
4. Submit form
5. Verify reading appears in list

### Debugging

```bash
# View Android logs
npm run android:logs

# Clear logs
npm run android:clear-logs

# Check connected devices
npm run android:devices
# Or: adb devices
```

## Troubleshooting

### No Devices Found

1. **Check ADB connection**:

   ```bash
   adb devices
   # Should show your device/emulator
   ```

2. **Restart ADB server**:

   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

3. **For emulators**: Ensure emulator is running
   ```bash
   # Check running emulators
   adb devices
   ```

### Permission Issues

- **Android**: Ensure USB debugging is enabled
- **iOS**: Ensure simulator is booted or device is trusted

### App Not Found

- Verify package name: `io.diabetactic.app`
- Install app first: `npm run mobile:install`
- Check installed apps: `mobile_list_apps(device)`

## Integration with Maestro

Mobile MCP complements Maestro E2E tests:

- **Maestro**: Full test automation with YAML flows
- **Mobile MCP**: Interactive testing and debugging from Cursor

Both can be used together for comprehensive mobile testing.

## Resources

- [Mobile MCP GitHub](https://github.com/mobile-next/mobile-mcp)
- [Mobile MCP Documentation](https://www.mcp.bar/server/mobile-next/mobile-mcp)
- [Maestro Documentation](https://maestro.mobile.dev)

## Quick Reference

```bash
# Device Management
adb devices                    # List devices
adb shell pm list packages    # List installed apps
adb logcat                    # View logs

# App Management
npm run mobile:install        # Build and install
npm run mobile:deploy         # Install APK
npm run android:uninstall     # Uninstall app

# Mobile MCP (via Cursor)
# Use natural language: "Take a screenshot", "Click on login button", etc.
```
