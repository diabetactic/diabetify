# Android Production Release Configuration

This document describes the Android production release configuration for Diabetactic.

## Configuration Files

### 1. `keystore.properties.template`
Template file for signing configuration. Contains placeholders for:
- `storeFile`: Path to your release keystore (.jks file)
- `storePassword`: Keystore password
- `keyAlias`: Key alias name
- `keyPassword`: Key password

### 2. `app/build.gradle`
Updated with:
- **Keystore properties loading**: Reads from `keystore.properties` if it exists
- **Release signing config**: Configures release signing when keystore is available
- **ProGuard/R8 optimization**:
  - `minifyEnabled true`: Enables code shrinking and obfuscation
  - `shrinkResources true`: Removes unused resources
  - Uses `proguard-android-optimize.txt` for aggressive optimization
- **Build variants**: Different configurations for debug and release
- **Manifest placeholders**: Controls cleartext traffic per build type

### 3. `gradle.properties`
Added placeholders for signing configuration (documentation purposes).

### 4. `app/src/main/res/xml/network_security_config.xml`
Network security configuration:
- **Base config**: Disables cleartext traffic by default (HTTPS only)
- **Localhost exception**: Allows HTTP for localhost (development with Capacitor)
- **Emulator hosts**: Allows connection to Android emulator (10.0.2.2) and Genymotion (10.0.3.2)
- **Google Fonts**: Configured for HTTPS only

### 5. `app/proguard-rules.pro`
Enhanced ProGuard rules for production:
- Preserves line numbers for crash reports
- Protects Capacitor/Ionic plugin classes
- Keeps WebView JavaScript interfaces
- Preserves AndroidX classes
- Protects native methods, Parcelable, and Serializable classes
- Suppresses warnings for optional dependencies

## Setup Instructions

### Step 1: Generate Release Keystore

Generate a new release keystore (one-time setup):

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/release-keystore.jks \
  -alias diabetactic-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You will be prompted for:
- Keystore password (choose a strong password)
- Key password (can be same as keystore password)
- Your name, organization, city, state, country

**IMPORTANT**: Store this keystore file and passwords securely! You'll need them for all future releases.

### Step 2: Create keystore.properties

Copy the template and fill in your values:

```bash
cd android
cp keystore.properties.template keystore.properties
```

Edit `keystore.properties` with your actual values:

```properties
storeFile=../android/release-keystore.jks
storePassword=your_actual_keystore_password
keyAlias=diabetactic-release
keyPassword=your_actual_key_password
```

**IMPORTANT**: Never commit `keystore.properties` or `*.jks` files to git! They are in `.gitignore`.

### Step 3: Build Release APK/AAB

Build a signed release APK:

```bash
cd android
./gradlew assembleRelease
```

Or build an Android App Bundle (recommended for Play Store):

```bash
cd android
./gradlew bundleRelease
```

Output locations:
- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB: `app/build/outputs/bundle/release/app-release.aab`

### Step 4: Test Release Build

Install the release APK on a test device:

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

Verify:
- App launches correctly
- All features work as expected
- No cleartext traffic warnings in logcat
- ProGuard hasn't broken any functionality

## Security Features

1. **Code Obfuscation**: ProGuard/R8 obfuscates class and method names
2. **Resource Shrinking**: Removes unused resources to reduce APK size
3. **HTTPS Only**: Cleartext (HTTP) traffic disabled in production
4. **Secure Storage**: Keystore credentials never committed to version control
5. **Release Signing**: APK signed with your private key for authenticity

## Troubleshooting

### Build fails with "keystore not found"
- Ensure `keystore.properties` exists in the `android/` directory
- Verify the `storeFile` path is correct (relative to `android/` directory)

### ProGuard removes needed classes
- Add specific keep rules to `proguard-rules.pro`
- Use `-keep class your.package.ClassName { *; }` to protect specific classes

### "Cleartext traffic not permitted" error
- This is expected in production builds (security feature)
- Ensure your backend uses HTTPS
- For development, use debug build variant

### App crashes after ProGuard
- Check stack traces in Play Console or Crashlytics
- Add keep rules for classes that use reflection
- Test thoroughly before release

## Build Variants

- **Debug**:
  - Uses debug keystore
  - Allows cleartext traffic for localhost
  - No code obfuscation
  - Faster builds

- **Release**:
  - Uses production keystore (if configured)
  - HTTPS only (no cleartext)
  - Code obfuscation enabled
  - Resource shrinking enabled
  - Optimized for size and performance

## Next Steps

1. Test release build thoroughly
2. Upload to Google Play Console (internal/alpha testing)
3. Configure Play Store listing (screenshots, description, etc.)
4. Set up crash reporting (Firebase Crashlytics recommended)
5. Configure signing in Play Console for automated updates
6. Plan staged rollout strategy

## Additional Resources

- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [ProGuard/R8 Configuration](https://developer.android.com/studio/build/shrink-code)
- [Network Security Configuration](https://developer.android.com/training/articles/security-config)
- [Publishing on Google Play](https://developer.android.com/studio/publish)
