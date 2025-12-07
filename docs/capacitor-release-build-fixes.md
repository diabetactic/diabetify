# Capacitor HTTP Release Build Issues - Research & Solutions

**Date:** 2025-12-06
**Problem:** Login and HTTP requests stuck/failing in Android release APK but working in debug builds
**Root Cause:** ProGuard minification removing critical Capacitor classes + network security configuration

---

## 🔍 Research Summary

### The Core Problem

When `minifyEnabled = true` in `build.gradle` (line 49), ProGuard/R8 obfuscates and removes classes it thinks are unused. This breaks Capacitor plugins that rely on:

1. **Reflection** - Runtime class loading for plugins
2. **Native HTTP** - CapacitorHttp for bypassing CORS
3. **Network Security** - SSL/TLS certificate validation

**Current Status Analysis:**

✅ **Good:**

- Network security config exists and references in manifest
- CapacitorConfig has `cleartext: true` for dev
- Using HTTPS scheme (`androidScheme: 'https'`)

❌ **Missing:**

- **ProGuard rules are empty** (only comments in `proguard-rules.pro`)
- **No Capacitor plugin keep rules**
- **No OkHttp/HTTP client rules**

---

## 🚨 Critical Issues Found

### Issue #1: Empty ProGuard Rules

**File:** `android/app/proguard-rules.pro`
**Current State:** Only default comments, no actual rules
**Impact:** ProGuard removes all Capacitor plugin classes in release builds

### Issue #2: Build Configuration

**File:** `android/app/build.gradle` (line 51)
**Current:** `proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'`
**Problem:** Using deprecated `proguard-android.txt` instead of optimized version

### Issue #3: Network Security Config Overly Restrictive

**File:** `android/app/src/main/res/xml/network_security_config.xml`
**Issue:** `cleartextTrafficPermitted="false"` for localhost blocks Capacitor live reload

---

## ✅ Solutions - Priority Order

### Solution 1: Add Capacitor ProGuard Rules (CRITICAL)

**Action:** Add comprehensive ProGuard rules to `android/app/proguard-rules.pro`

Based on [official Capacitor ProGuard rules](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/proguard-rules.pro) and [troubleshooting guide](https://capacitorjs.com/docs/android/troubleshooting):

```proguard
# ===================================
# Capacitor Core & Plugins
# ===================================

# Keep Capacitor v3+ plugin annotations
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}

# Keep all Capacitor plugins
-keep public class * extends com.getcapacitor.Plugin

# Keep Capacitor v2 plugins (for backward compatibility)
-keep @com.getcapacitor.NativePlugin public class * {
  @com.getcapacitor.PluginMethod public <methods>;
}

# Keep Capacitor Bridge and WebView
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# Keep plugin method signatures
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
}

# ===================================
# Capacitor HTTP & Network
# ===================================

# Keep OkHttp (used by CapacitorHttp)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }

# Keep CapacitorHttp implementation
-keep class com.getcapacitor.plugin.http.** { *; }

# ===================================
# AndroidX & Google Libraries
# ===================================

# Keep AndroidX annotations
-keep class androidx.annotation.** { *; }
-keepattributes *Annotation*

# Keep AndroidX AppCompat
-keep class androidx.appcompat.** { *; }
-keep interface androidx.appcompat.** { *; }

# ===================================
# JavaScript Interface
# ===================================

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# ===================================
# Reflection & Serialization
# ===================================

# Keep source file names and line numbers for stack traces
-keepattributes SourceFile,LineNumberTable

# Keep generic signatures for reflection
-keepattributes Signature

# Keep exceptions for proper error reporting
-keepattributes Exceptions

# Renaming for obfuscation
-renamesourcefileattribute SourceFile

# ===================================
# Cordova Plugins (if any legacy plugins)
# ===================================

-keep public class * extends org.apache.cordova.* {
    public <methods>;
    public <fields>;
}

# ===================================
# Gson/JSON (for API responses)
# ===================================

# Keep Gson classes for JSON parsing
-keep class com.google.gson.** { *; }
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# Keep JSON model classes (adjust package name to your models)
-keep class io.diabetactic.app.models.** { *; }

# ===================================
# Security & Storage
# ===================================

# Keep Capacitor SecureStorage plugin
-keep class com.aparajita.capacitor.securestorage.** { *; }

# Keep Preferences plugin
-keep class com.capacitorjs.plugins.preferences.** { *; }

# ===================================
# Debugging Rules (remove in production)
# ===================================

# Uncomment for debugging ProGuard issues:
# -printconfiguration build/outputs/logs/configuration.txt
# -printusage build/outputs/logs/usage.txt
# -printseeds build/outputs/logs/seeds.txt
```

**Sources:**

- [Capacitor ProGuard rules (main)](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/proguard-rules.pro)
- [Capacitor troubleshooting - ProGuard](https://capacitorjs.com/docs/android/troubleshooting)
- [OkHttp R8/ProGuard documentation](https://square.github.io/okhttp/features/r8_proguard/)

---

### Solution 2: Update build.gradle ProGuard Configuration

**File:** `android/app/build.gradle` (line 51)

**Change from:**

```gradle
proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
```

**Change to:**

```gradle
proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
```

**Why:** The `proguard-android-optimize.txt` file includes R8 optimizations and is the modern standard. The old `proguard-android.txt` only provides keep rules without optimizations, causing performance issues.

**Source:** [Android Developers - Configure R8 Keep Rules](https://android-developers.googleblog.com/2025/11/configure-and-troubleshoot-r8-keep-rules.html)

---

### Solution 3: Fix Network Security Config

**File:** `android/app/src/main/res/xml/network_security_config.xml`

**Current issues:**

- Line 17: `cleartextTrafficPermitted="false"` for localhost blocks Capacitor
- All domains set to HTTPS only (good for production, but needs localhost exception)

**Recommended fix:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Production: Disable cleartext (HTTP) by default -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" /> <!-- Allow user-installed CAs for testing -->
        </trust-anchors>
    </base-config>

    <!-- Allow localhost for Capacitor (debug and dev builds only) -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain> <!-- Android emulator -->
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>

    <!-- HTTPS-only domains -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">fonts.googleapis.com</domain>
        <domain includeSubdomains="true">fonts.gstatic.com</domain>
        <!-- Add your production API domains here -->
        <domain includeSubdomains="true">herokuapp.com</domain>
    </domain-config>
</network-security-config>
```

**Important:** For production release to Play Store, consider removing localhost cleartext permission or using build variants.

**Sources:**

- [Android Network Security Configuration](https://developer.android.com/privacy-and-security/security-config)
- [Ionic HTTP cleartext fix](https://medium.com/@aliyousefi-dev/ionic-http-not-working-on-lan-after-build-capacitor-fix-for-android-9-2fdd279aea84)

---

### Solution 4: Enable CapacitorHttp Properly

**File:** `capacitor.config.ts`

**Current config is good** but ensure CapacitorHttp is explicitly enabled:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.diabetactic.app',
  appName: 'diabetactic',
  webDir: 'www',
  server: {
    cleartext: true, // For dev - disable in production
    androidScheme: 'https', // Good - using HTTPS
    allowNavigation: ['*'],
  },
  plugins: {
    // Explicitly enable CapacitorHttp (bypasses CORS)
    CapacitorHttp: {
      enabled: true,
    },
    SecureStorage: {
      sharedPreferencesName: 'io.diabetactic.secure.prefs',
    },
  },
};

export default config;
```

**Why:** By default, CapacitorHttp patching of `window.fetch` and `XMLHttpRequest` is disabled. Enabling it ensures native HTTP is used instead of web-based requests.

**Sources:**

- [Capacitor HTTP Plugin API](https://capacitorjs.com/docs/apis/http)
- [Bypassing CORS with CapacitorHttp](https://capacitorjs.jp/blog/bypassing-cors-with-the-http-plugin)

---

## 🔧 Implementation Checklist

### Priority 1 - Critical Fixes

- [ ] **Add ProGuard rules** to `android/app/proguard-rules.pro` (see Solution 1)
- [ ] **Update build.gradle** to use `proguard-android-optimize.txt` (Solution 2)
- [ ] **Enable CapacitorHttp** in `capacitor.config.ts` (Solution 4)

### Priority 2 - Network Configuration

- [ ] **Update network security config** for localhost cleartext (Solution 3)
- [ ] **Test release build** with HTTP requests to backend
- [ ] **Verify HTTPS** connections work properly

### Priority 3 - Testing & Validation

- [ ] Build release APK: `cd android && ./gradlew assembleRelease`
- [ ] Install on physical device: `adb install -r app/build/outputs/apk/release/app-release.apk`
- [ ] Test login flow with real backend
- [ ] Test HTTP requests (readings, appointments, etc.)
- [ ] Check logcat for any ProGuard-related errors: `adb logcat | grep -i "proguard\|capacitor\|http"`

### Priority 4 - Debugging (if issues persist)

- [ ] Enable ProGuard debug output by uncommenting debug rules in proguard-rules.pro:
  ```proguard
  -printconfiguration build/outputs/logs/configuration.txt
  -printusage build/outputs/logs/usage.txt
  ```
- [ ] Review generated configuration: `android/app/build/outputs/logs/configuration.txt`
- [ ] Search for missing classes: `adb logcat | grep ClassNotFoundException`

---

## 📊 Known Capacitor HTTP Issues (Context)

### Issue: CORS on Native Android

**Problem:** Backend CORS origins must include both iOS (`capacitor://localhost`) and Android (`http://localhost` or `https://localhost`)
**Solution:** Configure backend to allow Capacitor origins
**Source:** [CORS Problem with Capacitor 6](https://community.auth0.com/t/cors-problem-with-capacitor-6-android/137642)

### Issue: Custom Scheme Bug

**Problem:** Android uses `app://` instead of `app://localhost` for custom schemes
**Workaround:** Use default HTTPS scheme or configure backend to accept both
**Source:** [Capacitor Issue #6936](https://github.com/ionic-team/capacitor/issues/6936)

### Issue: Plugin Not Implemented

**Problem:** Error "Plugin not implemented" after release build
**Solution:** Run `npx cap sync android` and sync Gradle in Android Studio
**Source:** [Capacitor Troubleshooting](https://capacitorjs.com/docs/android/troubleshooting)

---

## 🎯 Root Cause Summary

| Component            | Issue                                 | Impact                     | Fix Priority |
| -------------------- | ------------------------------------- | -------------------------- | ------------ |
| **ProGuard Rules**   | Empty file removes Capacitor plugins  | ⛔ CRITICAL - Login fails  | 🔴 P0        |
| **build.gradle**     | Using deprecated proguard-android.txt | ⚠️ HIGH - No optimizations | 🟡 P1        |
| **Network Security** | Localhost cleartext blocked           | ⚠️ MEDIUM - Dev issues     | 🟡 P2        |
| **CapacitorHttp**    | Not explicitly enabled                | ⚠️ MEDIUM - CORS issues    | 🟡 P2        |

---

## 📚 Additional Resources

### Official Capacitor Documentation

- [Android Troubleshooting](https://capacitorjs.com/docs/android/troubleshooting)
- [HTTP Plugin API](https://capacitorjs.com/docs/apis/http)
- [Capacitor Configuration](https://capacitorjs.com/docs/config)

### ProGuard/R8 Documentation

- [Official Capacitor ProGuard Rules](https://github.com/ionic-team/capacitor/blob/main/android/capacitor/proguard-rules.pro)
- [Android R8 Best Practices](https://android-developers.googleblog.com/2025/11/configure-and-troubleshoot-r8-keep-rules.html)
- [OkHttp R8/ProGuard](https://square.github.io/okhttp/features/r8_proguard/)

### Community Issues & Solutions

- [Capacitor Issue #739 - minifyEnabled crashes](https://github.com/ionic-team/capacitor/issues/739)
- [Capacitor Issue #6189 - Capacitor 4 crash](https://github.com/ionic-team/capacitor/issues/6189)
- [Stack Overflow - Capacitor v3 plugins not working](https://stackoverflow.com/questions/66477843/capacitor-v3-plugins-not-working-on-android-build)

### Network Security

- [Android Network Security Config](https://developer.android.com/privacy-and-security/security-config)
- [Ionic HTTP cleartext fix](https://medium.com/@aliyousefi-dev/ionic-http-not-working-on-lan-after-build-capacitor-fix-for-android-9-2fdd279aea84)
- [Stack Overflow - ERR_CLEARTEXT_NOT_PERMITTED](https://stackoverflow.com/questions/54752716/why-am-i-seeing-neterr-cleartext-not-permitted-errors-after-upgrading-to-cordo)

---

## ⚡ Quick Start - Apply All Fixes

Run this command to see a complete diff of required changes:

```bash
# 1. Create backup
cp android/app/proguard-rules.pro android/app/proguard-rules.pro.backup
cp android/app/build.gradle android/app/build.gradle.backup
cp android/app/src/main/res/xml/network_security_config.xml android/app/src/main/res/xml/network_security_config.xml.backup

# 2. Review this document's Solution 1-4 sections above

# 3. Apply changes manually or ask Claude Code to implement them

# 4. Test release build
npm run mobile:build:release

# 5. Install and test
npm run mobile:install
```

---

**Last Updated:** 2025-12-06
**Tested With:** Capacitor 6.2.1, Android API 34, Gradle 8.x
**Status:** Ready for implementation
