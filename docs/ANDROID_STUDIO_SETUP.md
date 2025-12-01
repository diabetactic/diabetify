# Android Studio Setup Guide

## Prerequisites

1. **Android Studio** - Latest stable version (Ladybug 2024.2.1 or newer)
2. **Java 21** (JDK 21) - Required for Gradle
3. **Android SDK** - Platform 36 (Android 15) + Build Tools 34.0.0

## Quick Setup

### 1. Install Required Tools

```bash
# Check Java version (must be 21)
java -version

# If not Java 21, install via mise (already configured in this project)
mise install java@21
mise use java@21

# Verify Android SDK
echo $ANDROID_HOME  # Should point to Android SDK
```

### 2. Open Project in Android Studio

```bash
# From project root
cd android/
# Then: File > Open in Android Studio
# Or from command line:
studio android/
```

### 3. First-Time Setup

When opening for the first time:

1. **Trust Gradle Scripts** - Click "Trust Project"
2. **Gradle Sync** - Wait for automatic sync (may take 2-5 minutes)
3. **Accept License Agreements** - If prompted
4. **Download Missing SDK Components** - If prompted

## Run Configurations

### Configuration 1: Build Debug APK

**Name**: `app (Debug)`
**Type**: Android App
**Module**: diabetify.app.main
**Installation Option**: Default APK
**Launch**: Default Activity

### Configuration 2: Build and Install

**Name**: `Build & Install on Device`
**Type**: Gradle
**Tasks**: `assembleDebug installDebug`
**Arguments**: `--stacktrace`

### Configuration 3: Clean Build

**Name**: `Clean Build`
**Type**: Gradle
**Tasks**: `clean assembleDebug`

## Build Variants

Android Studio > Build Variants panel (left sidebar):

- **debug** - Development build with debugging enabled
- **release** - Production build (requires signing)

## Gradle Configuration

### Project-level `android/build.gradle`:

```groovy
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.3'
        classpath 'com.google.gms:google-services:4.4.2'
    }
}
```

### App-level `android/app/build.gradle`:

```groovy
android {
    namespace 'io.ionic.starter'
    compileSdk 34

    defaultConfig {
        applicationId "io.ionic.starter"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Common Tasks

### Build Debug APK

```bash
cd android/
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on Device/Emulator

```bash
./gradlew installDebug
```

### Clean Build

```bash
./gradlew clean assembleDebug
```

### Check Dependencies

```bash
./gradlew dependencies
```

### Run with Logs

```bash
./gradlew installDebug && adb logcat | grep -i diabetactic
```

## SDK Manager Settings

### Required SDK Platforms

- **Android 15.0 (API 36)** - For testing latest Android
- **Android 14.0 (API 34)** - Target SDK
- **Android 5.1 (API 22)** - Minimum SDK

### Required SDK Tools

- **Android SDK Build-Tools 34.0.0**
- **Android SDK Platform-Tools** (latest)
- **Android Emulator** (latest)
- **Google Play Services** (if using Firebase)

## AVD (Emulator) Setup

### Recommended AVD Configuration

**Name**: `Medium_Phone_API_36`
**Device**: Pixel 5 or Pixel 6
**System Image**: Android 15.0 (API 36) with Google APIs
**RAM**: 2048 MB
**Internal Storage**: 2048 MB
**Graphics**: Hardware - GLES 2.0

### Create AVD via Command Line

```bash
# List available system images
sdkmanager --list | grep system-images

# Download system image
sdkmanager "system-images;android-36;google_apis;x86_64"

# Create AVD
avdmanager create avd \
  -n Medium_Phone_API_36 \
  -k "system-images;android-36;google_apis;x86_64" \
  -d "pixel_5"
```

## Debugging Setup

### Enable USB Debugging on Device

1. **Settings** > **About Phone**
2. Tap **Build Number** 7 times
3. **Settings** > **Developer Options**
4. Enable **USB Debugging**
5. Enable **Install via USB**

### Verify Device Connection

```bash
adb devices
# Should show: <device-id>  device
```

### View Logs in Real-Time

```bash
# All logs
adb logcat

# Filter by app
adb logcat | grep "io.ionic.starter"

# Clear logs
adb logcat -c
```

## Common Issues & Fixes

### Issue: Gradle Sync Failed

**Solution**:

```bash
cd android/
./gradlew clean
rm -rf .gradle/
# Then: File > Sync Project with Gradle Files in Android Studio
```

### Issue: Java Version Mismatch

**Solution**:

```bash
# Check current Java version
java -version

# Set Java 21 via mise
mise use java@21
mise install java@21

# Or set JAVA_HOME manually
export JAVA_HOME=/path/to/jdk-21
```

### Issue: SDK Not Found

**Solution**:

```bash
# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools

# Add to ~/.bashrc or ~/.zshrc for persistence
```

### Issue: Emulator Won't Start

**Solution**:

```bash
# Check AVD list
emulator -list-avds

# Start with more RAM
emulator -avd Medium_Phone_API_36 -memory 2048

# Or wipe data
emulator -avd Medium_Phone_API_36 -wipe-data
```

### Issue: Build Failed - Missing Dependencies

**Solution**:

```bash
# Sync Capacitor changes
npm run build:mobile

# Or manually
npx cap sync android
```

## IDE Settings Recommendations

### Editor Settings

- **File** > **Settings** > **Editor** > **Code Style** > **Kotlin**
  - Use project scheme
  - Indent: 4 spaces

### Build Settings

- **File** > **Settings** > **Build, Execution, Deployment** > **Gradle**
  - Build and run using: **Gradle**
  - Run tests using: **Gradle**
  - Gradle JDK: **Java 21**

### Performance Settings

- **File** > **Settings** > **Appearance & Behavior** > **System Settings**
  - Memory Settings: Increase heap size to 2048 MB
  - Enable **Power Save Mode** when not actively developing

## Useful Android Studio Shortcuts

| Action        | Shortcut (Mac) | Shortcut (Linux/Win) |
| ------------- | -------------- | -------------------- |
| Build Project | ⌘ + F9         | Ctrl + F9            |
| Run           | ⌃ + R          | Shift + F10          |
| Debug         | ⌃ + D          | Shift + F9           |
| Stop          | ⌘ + F2         | Ctrl + F2            |
| Sync Gradle   | ⌘ + Shift + O  | Ctrl + Shift + O     |
| Logcat        | ⌘ + 6          | Alt + 6              |
| Terminal      | ⌥ + F12        | Alt + F12            |

## Project Structure in Android Studio

```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/io/ionic/starter/  # Main app code
│   │       ├── res/                    # Resources
│   │       │   ├── drawable/           # Icons, images
│   │       │   ├── layout/             # XML layouts
│   │       │   ├── mipmap-*/           # Launcher icons
│   │       │   └── values/             # Strings, colors, themes
│   │       └── assets/                 # Web assets (from npm build)
│   │           └── public/             # Ionic/Capacitor web app
│   └── build.gradle                    # App-level Gradle config
├── build.gradle                        # Project-level Gradle config
├── gradle.properties                   # Gradle properties
├── settings.gradle                     # Gradle settings
└── capacitor.config.json               # Capacitor configuration
```

## Integration with VS Code

You can use VS Code for TypeScript/Angular development and Android Studio for native builds:

1. **Edit code in VS Code**: `src/app/...`
2. **Build web app**: `npm run build`
3. **Sync to Android**: `npx cap sync android`
4. **Open Android Studio**: `studio android/`
5. **Build & Run**: Android Studio run configuration

## Automated Build Script

Create `.vscode/tasks.json` for integrated builds:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Android Debug",
      "type": "shell",
      "command": "npm run build:mobile",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": []
    },
    {
      "label": "Install on Device",
      "type": "shell",
      "command": "cd android && ./gradlew installDebug",
      "group": "build",
      "problemMatcher": []
    }
  ]
}
```

## Next Steps

After setup:

1. ✅ Verify Gradle sync successful
2. ✅ Build debug APK: `./gradlew assembleDebug`
3. ✅ Create/start AVD
4. ✅ Install and run app
5. ✅ View logs in Logcat
6. ✅ Set breakpoints and debug

Happy coding! 🚀
