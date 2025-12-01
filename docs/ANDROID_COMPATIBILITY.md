# Android Compatibility Guide - Diabetactic

## Overview

This guide details Android version support, testing requirements, and known compatibility issues for the Diabetactic mobile application.

## SDK Version Support

### Current Configuration

Located in `/home/julito/TPP/diabetify-extServices-20251103-061913/diabetify/android/variables.gradle`:

```groovy
ext {
    minSdkVersion = 22      // Android 5.1 (Lollipop)
    compileSdkVersion = 34  // Android 14
    targetSdkVersion = 34   // Android 14
}
```

### Version Definitions

| SDK Level | Android Version | Support Level  | Release Date |
| --------- | --------------- | -------------- | ------------ |
| 22        | 5.1 (Lollipop)  | Minimum        | March 2015   |
| 34        | 14              | Target/Compile | October 2023 |

### Market Coverage

Based on Android version distribution (as of 2025):

| Android Version | API Level | Market Share | Supported |
| --------------- | --------- | ------------ | --------- |
| 14              | 34        | ~15%         | Yes       |
| 13              | 33        | ~20%         | Yes       |
| 12              | 31-32     | ~25%         | Yes       |
| 11              | 30        | ~15%         | Yes       |
| 10              | 29        | ~12%         | Yes       |
| 9 (Pie)         | 28        | ~8%          | Yes       |
| 8 (Oreo)        | 26-27     | ~3%          | Yes       |
| 7 (Nougat)      | 24-25     | ~1.5%        | Yes       |
| 6 (Marshmallow) | 23        | ~0.5%        | Yes       |
| 5.1 (Lollipop)  | 22        | <0.5%        | Yes       |
| 5.0 and below   | <22       | <0.5%        | No        |

**Total Coverage**: 99.5%+ of active Android devices

## Testing Matrix

### Priority Devices & Versions

#### Tier 1 - Critical (Must Test)

| Android Version | API Level | Device Examples      | Test Priority |
| --------------- | --------- | -------------------- | ------------- |
| 14              | 34        | Pixel 8, Samsung S24 | Critical      |
| 13              | 33        | Pixel 7, Samsung S23 | Critical      |
| 12              | 31        | Pixel 6, Samsung S22 | High          |
| 11              | 30        | Pixel 5, Samsung S21 | High          |

#### Tier 2 - Important (Should Test)

| Android Version | API Level | Device Examples      | Test Priority |
| --------------- | --------- | -------------------- | ------------- |
| 10              | 29        | Pixel 4, Samsung S20 | Medium        |
| 9               | 28        | Pixel 3, Samsung S10 | Medium        |
| 8               | 26-27     | Pixel 2, Samsung S9  | Low           |
| 7               | 24-25     | Pixel 1, Samsung S7  | Low           |

#### Tier 3 - Minimum Support (Optional Test)

| Android Version | API Level | Device Examples   | Test Priority |
| --------------- | --------- | ----------------- | ------------- |
| 5.1             | 22        | Old budget phones | Very Low      |

### Emulator Testing

**Recommended AVDs** (Android Virtual Devices):

```bash
# Create test emulators
avdmanager create avd -n Test_API34 -k "system-images;android-34;google_apis;x86_64" -d "pixel_6"
avdmanager create avd -n Test_API30 -k "system-images;android-30;google_apis;x86_64" -d "pixel_5"
avdmanager create avd -n Test_API26 -k "system-images;android-26;google_apis;x86_64" -d "pixel_2"
avdmanager create avd -n Test_API22 -k "system-images;android-22;google_apis;x86_64" -d "Nexus 5"

# Start emulator
emulator -avd Test_API34
```

### Physical Device Testing

**Minimum Test Coverage**:

- One device running Android 14 (API 34)
- One device running Android 10-12 (API 29-31)
- One older device running Android 7-9 (API 24-28)

**Recommended Test Scenarios**:

1. Fresh install on each Android version
2. Upgrade from previous version
3. Different screen sizes (phone, tablet)
4. Different manufacturers (Samsung, Pixel, Xiaomi, etc.)

## Feature Compatibility

### Capacitor Plugin Requirements

| Plugin                              | Min SDK | Notes                             |
| ----------------------------------- | ------- | --------------------------------- |
| @capacitor/core                     | 22      | Core functionality                |
| @capacitor/app                      | 22      | App lifecycle                     |
| @capacitor/browser                  | 22      | In-app browser                    |
| @capacitor/device                   | 22      | Device info                       |
| @capacitor/haptics                  | 22      | Vibration                         |
| @capacitor/keyboard                 | 22      | Keyboard events                   |
| @capacitor/local-notifications      | 22      | Local notifications               |
| @capacitor/network                  | 22      | Network status                    |
| @capacitor/preferences              | 22      | Key-value storage                 |
| @capacitor/splash-screen            | 22      | Splash screen                     |
| @capacitor/status-bar               | 22      | Status bar styling                |
| @aparajita/capacitor-secure-storage | 22      | Android Keystore (secure storage) |

### Android Features Used

| Feature            | Min API | Used In App | Compatibility Notes              |
| ------------------ | ------- | ----------- | -------------------------------- |
| WebView (Chromium) | 22      | Yes         | Must be 90+ for full support     |
| IndexedDB          | 22      | Yes         | Dexie database                   |
| Service Workers    | 24      | No          | Not used (offline via IndexedDB) |
| Notifications      | 22      | Yes         | Channels required on API 26+     |
| Keystore           | 18      | Yes         | Secure token storage             |
| HTTPS              | 22      | Yes         | All network requests             |
| FileProvider       | 22      | No          | Not currently used               |

## WebView Requirements

### Minimum WebView Version

**Required**: Chromium 90+ (released April 2021)

**Check WebView version**:

```bash
# On device
adb shell dumpsys webview

# Or in app
# Settings > Apps > Android System WebView > App details
```

**Why Chromium 90+**:

- IndexedDB performance improvements
- ES2020 JavaScript support
- CSS Grid and Flexbox improvements
- Required for Angular 20 and Ionic 8

### WebView Update Policy

| Android Version | WebView Update      | Hospital Action Required   |
| --------------- | ------------------- | -------------------------- |
| 10+ (API 29+)   | Auto via Play Store | Monitor only               |
| 7-9 (API 24-28) | Via Play Store      | Ensure auto-update enabled |
| 5-6 (API 22-23) | Manual update       | Verify WebView version     |

**Update WebView** (for Android 5-6):

```bash
# Download latest WebView APK from APKMirror
# Or from Play Store: "Android System WebView"
adb install -r android-system-webview.apk
```

## Known Compatibility Issues

### Android 14 (API 34)

**Issue**: Foreground service restrictions
**Impact**: Background notifications may be delayed
**Workaround**: Not applicable (app doesn't use foreground services)
**Status**: No impact

**Issue**: Safer component exporting
**Impact**: None (Capacitor handles this)
**Workaround**: Ensure `android:exported` set correctly in manifest
**Status**: Resolved in Capacitor 6.1+

### Android 13 (API 33)

**Issue**: Runtime notification permission required
**Impact**: Must request permission for local notifications
**Workaround**: App requests permission on first launch
**Status**: Implemented

**Issue**: Granular media permissions
**Impact**: None (app doesn't access media)
**Workaround**: N/A
**Status**: No impact

### Android 12 (API 31)

**Issue**: Approximate location only
**Impact**: None (app doesn't use location)
**Workaround**: N/A
**Status**: No impact

**Issue**: Splash screen API changes
**Impact**: Custom splash screen may not work
**Workaround**: Use Capacitor splash-screen plugin
**Status**: Working correctly

### Android 11 (API 30)

**Issue**: Scoped storage enforcement
**Impact**: None (app uses IndexedDB, not file system)
**Workaround**: N/A
**Status**: No impact

**Issue**: Package visibility changes
**Impact**: None
**Workaround**: N/A
**Status**: No impact

### Android 10 (API 29)

**Issue**: Dark mode support
**Impact**: App should respect system dark mode
**Workaround**: Implemented via CSS variables
**Status**: Working correctly

**Issue**: Gesture navigation
**Impact**: Edge swipes may conflict with navigation
**Workaround**: Ensure proper padding for gesture areas
**Status**: Tested and working

### Android 9 (API 28)

**Issue**: Cleartext traffic blocked by default
**Impact**: HTTP requests fail (HTTPS only)
**Workaround**: `android:usesCleartextTraffic="true"` for local dev
**Status**: Configured in capacitor.config.ts

**Issue**: Apache HTTP client removed
**Impact**: None (Capacitor uses HttpURLConnection)
**Workaround**: N/A
**Status**: No impact

### Android 8 (API 26-27)

**Issue**: Notification channels required
**Impact**: Notifications without channels won't show
**Workaround**: Capacitor handles channel creation
**Status**: Working correctly

**Issue**: Background execution limits
**Impact**: None (app is offline-first)
**Workaround**: N/A
**Status**: No impact

### Android 7 (API 24-25)

**Issue**: Network security config
**Impact**: HTTPS certificate validation stricter
**Workaround**: Ensure valid SSL certificates
**Status**: Working correctly

**Issue**: File-based encryption
**Impact**: None (improves security)
**Workaround**: N/A
**Status**: Beneficial

### Android 6 (API 23)

**Issue**: Runtime permissions
**Impact**: Must request permissions at runtime
**Workaround**: Capacitor handles permission requests
**Status**: Working correctly

**Issue**: Doze mode
**Impact**: Background tasks may be delayed
**Workaround**: Use high-priority notifications
**Status**: Acceptable behavior

### Android 5.1 (API 22)

**Issue**: Old WebView version
**Impact**: May not support latest JS features
**Workaround**: Ensure WebView updated to 90+
**Status**: Requires manual verification

**Issue**: Limited Material Design support
**Impact**: Some UI elements may look different
**Workaround**: Ionic handles fallbacks
**Status**: Acceptable degradation

## Performance Considerations

### Memory Constraints

| Android Version | Typical RAM | App Memory Limit | Recommendation        |
| --------------- | ----------- | ---------------- | --------------------- |
| 14              | 8-12 GB     | 512 MB+          | Full features enabled |
| 13              | 6-8 GB      | 512 MB+          | Full features enabled |
| 12              | 4-8 GB      | 256-512 MB       | Full features enabled |
| 11              | 4-6 GB      | 256-512 MB       | Full features enabled |
| 10              | 3-6 GB      | 192-256 MB       | Monitor memory usage  |
| 9               | 2-4 GB      | 128-256 MB       | Monitor memory usage  |
| 8               | 2-4 GB      | 128-192 MB       | Limit cached data     |
| 7               | 1.5-3 GB    | 96-128 MB        | Limit cached data     |
| 5.1-6           | 1-2 GB      | 64-96 MB         | Aggressive cleanup    |

### Storage Recommendations

| Android Version | IndexedDB Quota   | Recommendation              |
| --------------- | ----------------- | --------------------------- |
| 10+             | 60% of free space | No limits needed            |
| 9               | 50% of free space | Monitor quota               |
| 8               | 50 MB default     | Request quota increase      |
| 7               | 50 MB default     | Request quota increase      |
| 5.1-6           | 50 MB default     | Aggressive cache management |

**Check quota**:

```javascript
// In browser console or app
navigator.storage.estimate().then(estimate => {
  console.log(`${estimate.usage} / ${estimate.quota} bytes`);
});
```

## Testing Procedures

### Pre-Release Testing Checklist

#### Functional Testing

- [ ] Install fresh on each target Android version (14, 12, 10, 8, 7)
- [ ] Upgrade from previous version (data migration)
- [ ] Login/logout functionality
- [ ] Create/read/update/delete glucose readings
- [ ] Appointment management
- [ ] Offline functionality (airplane mode)
- [ ] Sync when coming back online
- [ ] Dark mode switching
- [ ] Language switching (EN/ES)
- [ ] Notifications (local reminders)
- [ ] WebView version check

#### Performance Testing

- [ ] App startup time (<3 seconds on modern devices)
- [ ] Memory usage (<200 MB on devices with 4GB+ RAM)
- [ ] Battery drain (minimal when idle)
- [ ] Network performance (fast on 4G/5G, acceptable on 3G)
- [ ] Database operations (<100ms for reads, <500ms for writes)
- [ ] Smooth scrolling (60 FPS on modern devices)

#### Compatibility Testing

- [ ] WebView version 90+ detected
- [ ] HTTPS connections work (no certificate errors)
- [ ] IndexedDB quota sufficient (>10 MB available)
- [ ] No console errors on startup
- [ ] Permissions granted correctly
- [ ] No crashes on rotation
- [ ] Works on tablets (responsive layout)

### Automated Testing

**Run E2E tests on multiple Android versions**:

```bash
# Start emulators
emulator -avd Test_API34 &
emulator -avd Test_API30 &
emulator -avd Test_API26 &

# Wait for boot
adb wait-for-device

# Install and test
npm run mobile:build
npm run test:mobile

# Or manually
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
npm run test:e2e
```

## Troubleshooting Version-Specific Issues

### Android 14 Issues

**Problem**: Notifications not showing

**Solution**:

```xml
<!-- Ensure in AndroidManifest.xml -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

**Problem**: App crashes on startup

**Solution**: Check logcat for `IllegalStateException` related to component exports

### Android 7-9 Issues

**Problem**: "NET::ERR_CLEARTEXT_NOT_PERMITTED"

**Solution**: Enable cleartext for local development:

```typescript
// capacitor.config.ts
server: {
  cleartext: true,
  androidScheme: 'https',
}
```

**Problem**: Slow database operations

**Solution**: Ensure WebView is updated to version 90+

### Android 5.1-6 Issues

**Problem**: "Quota exceeded" errors

**Solution**: Request persistent storage:

```javascript
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    console.log(`Persistent storage: ${granted}`);
  });
}
```

**Problem**: UI elements misaligned

**Solution**: Test with older WebView, may need CSS fallbacks

## Deprecation Timeline

### Future Android Versions

| Android Version | Expected Release | Impact                       |
| --------------- | ---------------- | ---------------------------- |
| 15              | Q4 2024          | May require targetSdk update |
| 16              | Q4 2025          | May require minSdk increase  |

### Minimum SDK Increase Plan

**Current**: API 22 (Android 5.1)
**Recommended timeline**:

- 2025: Stay at API 22 (covers 99.5% devices)
- 2026: Consider increasing to API 24 (Android 7.0)
- 2027+: Increase to API 26 (Android 8.0)

**Reason**: Google Play requires targetSdk to be within 1 year of latest release

## Manufacturer-Specific Notes

### Samsung Devices

- Generally excellent compatibility
- Good WebView update policy
- May have aggressive battery optimization (disable for Diabetactic)

### Xiaomi Devices

- MIUI may restrict background operations
- Ensure "Autostart" enabled for app
- Disable "Battery saver" for Diabetactic

### Huawei Devices (without Google Play)

- No Google Play Services
- Must side-load APK
- WebView may be outdated (manual update required)

### OnePlus Devices

- Aggressive RAM management
- May kill app in background
- Lock app in recent apps menu

## Accessibility Support

### Screen Readers

- **TalkBack** (Android built-in): Supported on API 22+
- Ensure semantic HTML and ARIA labels
- Test with TalkBack enabled

### Font Scaling

- Respect system font size (Settings > Display > Font size)
- Test with "Largest" font setting
- Ensure text doesn't overflow containers

### Color Contrast

- WCAG 2.1 AA compliance
- Dark mode support
- High contrast mode compatible

## Regional Considerations

### Language Support

- English (US, UK)
- Spanish (Spain, Latin America)
- RTL languages: Not currently supported

### Date/Time Formats

- Respects device locale settings
- ISO 8601 for internal storage
- Localized display via Angular i18n

## Additional Resources

- [Android Platform Versions Dashboard](https://developer.android.com/about/dashboards)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [WebView Release Notes](https://chromiumdash.appspot.com/releases?platform=Android)
- [Android API Level Distribution](https://apilevels.com/)

## Support Contact

| Issue Type             | Contact                 |
| ---------------------- | ----------------------- |
| Version compatibility  | Mobile Development Team |
| Device-specific bugs   | QA Team                 |
| Performance issues     | Performance Team        |
| WebView problems       | DevOps Team             |
| Accessibility concerns | Accessibility Team      |

## Quick Reference

```bash
# Check device Android version
adb shell getprop ro.build.version.release

# Check device API level
adb shell getprop ro.build.version.sdk

# Check WebView version
adb shell dumpsys webview | grep -i version

# List all connected devices with versions
adb devices -l

# Install APK ignoring version
adb install -r -d app-debug.apk

# View app memory usage
adb shell dumpsys meminfo io.diabetactic.app

# Check app permissions
adb shell dumpsys package io.diabetactic.app | grep permission
```
