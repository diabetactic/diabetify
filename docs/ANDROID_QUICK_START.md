# Android Quick Start

## ✅ Your Setup is Ready!

- **Java 21** - Installed and configured
- **Android Studio** - Already configured (.idea folder exists)
- **Gradle 8.13.1** - Latest version
- **Target SDK 34** - Android 14

## Open in Android Studio

### Option 1: GUI

```bash
cd /home/julito/TPP/diabetify-extServices-20251103-061913/diabetify
# Then: File > Open > Select 'android' folder
```

### Option 2: Command Line

```bash
studio android/
```

## Quick Build & Run

### One-Command Build + Install

```bash
cd android/
./quick-build.sh
```

This script will:

1. ✓ Check Java version
2. ✓ Start emulator if needed
3. ✓ Build debug APK
4. ✓ Install on device/emulator
5. ✓ Show filtered logcat output

### Using npm Scripts (Recommended)

From the project root, use these convenient npm scripts:

```bash
# Build web app + sync to Capacitor + build Android APK + install
npm run mobile:install

# Just build (no install)
npm run mobile:build

# Build release version (requires signing configuration)
npm run mobile:build:release

# Build + install + view logs
npm run mobile:run

# Open Android Studio
npm run android:open
```

### Manual Build

```bash
cd android/
./gradlew assembleDebug installDebug
```

### Build from Project Root (Step-by-Step)

```bash
# Step 1: Build web app (production)
npm run build:prod

# Step 2: Sync web assets to Capacitor
npx cap sync android

# Step 3: Build Android APK
cd android && ./gradlew assembleDebug

# Step 4: Install on device/emulator
./gradlew installDebug
```

Or use the combined command:

```bash
npm run mobile:sync  # Build + sync (steps 1-2)
```

## Useful Commands

### Check Setup

```bash
java -version          # Should show Java 21
./gradlew --version    # Should show Gradle 8.x
adb devices           # List connected devices
```

### Clean Build

```bash
cd android/
./gradlew clean assembleDebug
```

### View Logs

```bash
# All app logs
adb logcat | grep -i diabetactic

# WebView logs (console.log from Angular app)
adb logcat | grep -i chromium

# Capacitor logs
adb logcat | grep -i capacitor
```

### Uninstall App

```bash
adb uninstall io.diabetactic.app
```

## Gradle Tasks

```bash
./gradlew tasks  # List all available tasks
./gradlew assembleDebug  # Build debug APK
./gradlew assembleRelease  # Build release APK (needs signing)
./gradlew installDebug  # Install debug APK
./gradlew clean  # Clean build artifacts
./gradlew dependencies  # Show dependency tree
```

## Android Studio Run Configurations

When you open the project in Android Studio, you'll have these configurations:

1. **app** - Default run configuration (builds and installs)
2. **Clean Build** - Gradle task to clean before building
3. **Install on Device** - Quick install without full rebuild

## Project Structure

```
android/
├── app/src/main/
│   ├── AndroidManifest.xml
│   ├── res/
│   │   ├── mipmap-*/ic_launcher*.png  # App icons (updated!)
│   │   ├── values/strings.xml
│   │   └── ...
│   └── assets/public/  # Your Ionic/Angular web app
├── build.gradle  # Project config
├── app/build.gradle  # App config
└── quick-build.sh  # One-command build script
```

## Common Workflows

### Update Web App and Rebuild

After making changes to the Angular/Ionic code:

```bash
# Option 1: Full rebuild using npm script (recommended)
npm run mobile:install

# Option 2: Manual steps
npm run build:prod
npx cap sync android
cd android && ./gradlew installDebug
```

### Quick Development Cycle

For rapid development iterations:

```bash
# Terminal 1: Run web dev server with live reload
npm run start:mock  # or start:local, start:cloud

# Test in browser at http://localhost:4200
# Make changes, see updates instantly

# When ready to test on Android:
npm run mobile:install
```

### Update Icons

Icons are already configured! Located at:

```bash
android/app/src/main/res/mipmap-*/ic_launcher*.png
android/app/src/main/res/mipmap-*/ic_launcher_round*.png
```

To regenerate icons from source:

```bash
# Source icon at: src/assets/icon/app-icon.png
# Use Capacitor icon generator or update manually in Android Studio
```

### Debug WebView

```bash
# 1. Open app on device
# 2. In Chrome desktop: chrome://inspect
# 3. Find your device
# 4. Click "inspect" on io.diabetactic.app
# 5. Full DevTools with console, network, etc.
```

## Debugging in Android Studio

### Set Breakpoints

- Open `app/src/main/java/io/ionic/starter/MainActivity.java`
- Click in gutter to set breakpoint
- Run in Debug mode (Shift + F9)

### View Logs

- **Logcat** panel (Alt + 6)
- Filter by:
  - Package: `io.diabetactic.app`
  - Tag: `Capacitor`, `Chromium`
  - Level: Debug, Info, Warn, Error

## Tips

1. **First Build is Slow** - Gradle downloads dependencies (~2-5 min)
2. **Subsequent Builds are Fast** - ~30 seconds with incremental builds
3. **Use npm Scripts** - `npm run mobile:install` handles everything
4. **Use Quick Build Script** - `cd android && ./quick-build.sh` for manual builds
5. **Chrome DevTools for Web Debugging** - `chrome://inspect`
6. **Android Studio for Native Debugging** - Breakpoints, native logs
7. **Test in Browser First** - Use `npm run start:mock` for rapid iteration
8. **Clean Build if Issues** - `npm run mobile:clean && npm run mobile:build`

## Need Help?

See full documentation:

- `docs/ANDROID_STUDIO_SETUP.md` - Complete setup guide
- `docs/BACKEND_MODE_GUIDE.md` - Backend configuration
- `docs/CONSOLE_LOG_TIPS.md` - Debugging tips

## Backend Mode for Mobile Builds

Mobile builds always use **production configuration** which defaults to cloud/Heroku backend.

The backend is configured in `src/environments/environment.prod.ts`:

```typescript
// Production always uses cloud backend
backendMode: 'cloud',
apiGateway: {
  baseUrl: 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com'
}
```

For web development with different backends, see [Backend Mode Guide](BACKEND_MODE_GUIDE.md).

---

## Status: ✅ Ready to Go!

Your Android development environment is fully configured. Choose your preferred method:

### Method 1: npm Scripts (Easiest)

```bash
# Build + install in one command
npm run mobile:install

# Or build + install + view logs
npm run mobile:run
```

### Method 2: Quick Build Script

```bash
cd android && ./quick-build.sh
```

### Method 3: Android Studio (GUI)

1. Open Android Studio
2. Select `android/` folder
3. Wait for Gradle sync
4. Click Run ▶️

### Method 4: Capacitor CLI

```bash
npm run build:prod
npx cap run android
```
