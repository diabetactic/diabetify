# IT Operations Runbook - Diabetactic

## Overview

Diabetactic is an Ionic/Angular mobile application for diabetes glucose management. This runbook provides hospital IT staff with essential information for deployment, maintenance, and troubleshooting.

**Technology Stack:**

- Angular 20 (standalone components)
- Ionic 8 Framework
- Capacitor 6.1 (native platform bridge)
- Tailwind CSS v3 + DaisyUI v5 (styling)
- Jest (unit testing with Jasmine compatibility layer)
- Playwright (E2E testing)
- Dexie (IndexedDB wrapper for offline storage)

## System Requirements

### Development & Build Environment

| Component      | Version   | Purpose                        |
| -------------- | --------- | ------------------------------ |
| Node.js        | 20+       | JavaScript runtime             |
| npm            | 10+       | Package manager                |
| Java JDK       | 21        | Android build requirements     |
| Android Studio | Latest    | Native Android development     |
| Android SDK    | API 22-34 | Android platform tools         |
| Gradle         | 8.13      | Android build system (bundled) |

### Production Environment

| Component       | Requirement                   |
| --------------- | ----------------------------- |
| Android Devices | Android 5.1+ (API 22+)        |
| Target SDK      | Android 14 (API 34)           |
| WebView         | Chromium 90+                  |
| Storage         | 50MB minimum                  |
| Network         | HTTPS connectivity to backend |

### Backend Connectivity

The app supports three backend modes:

- **Mock Mode**: Offline operation with in-memory data
- **Local Mode**: Docker backend at localhost:8000
- **Cloud Mode**: Heroku API Gateway (production, default)

## Installation & Setup

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/diabetactic/diabetactic-app.git
cd diabetactic-app

# 2. Install dependencies
npm install

# 3. Optional: Use mise for runtime version management
# mise simplifies managing Node.js, Java, and other runtime versions
# Install mise from https://mise.jdx.dev/
mise install        # Install all required runtimes
mise use java@21 node@20  # Activate specific versions

# 4. Build web assets
npm run build:prod

# 5. Verify setup
npm test            # Run unit tests
npm run lint        # Check code quality
```

### Android Environment Setup

```bash
# 1. Set environment variables (add to ~/.bashrc or ~/.zshrc)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export JAVA_HOME=/path/to/jdk-21

# 2. Verify installation
java -version          # Should show Java 21
android --version      # Should show Android SDK
adb devices           # Should list connected devices

# 3. Accept licenses
sdkmanager --licenses
```

## Backend Mode Configuration

### Mode Selection

Backend mode is controlled by the `ENV` environment variable:

```bash
# Development modes
npm start              # Default: mock mode (no backend required)
npm run start:mock     # Explicit mock mode (or ENV=mock npm start)
npm run start:local    # Local Docker backend (or ENV=local npm start)
npm run start:cloud    # Cloud Heroku backend (or ENV=cloud npm start)
```

### Configuration Files

**Environment Configuration**: `src/environments/environment.ts`

Key settings:

- `DEV_BACKEND_MODE`: Default backend mode ('mock', 'local', 'cloud') - currently set to 'cloud'
- `backendServices.apiGateway.baseUrl`: API endpoint URL (auto-configured based on mode)
- `features.offlineMode`: Enable/disable offline functionality (default: true)

### Backend Endpoints

| Mode  | Web Platform          | Android Platform                                           |
| ----- | --------------------- | ---------------------------------------------------------- |
| mock  | In-memory             | In-memory                                                  |
| local | http://localhost:8000 | http://10.0.2.2:8000 (emulator)                            |
| cloud | /api (via proxy)      | https://diabetactic-api-gateway-37949d6f182f.herokuapp.com |

### Verifying Backend Mode

Check active mode on app startup:

```bash
# 1. Start app in desired mode
npm run start:cloud

# 2. Open browser console (F12) - look for startup logs from start-with-env.mjs:
# [dev] ENV=cloud → API_GATEWAY_URL=https://diabetactic-api-gateway-37949d6f182f.herokuapp.com
# (ng serve --configuration heroku --proxy-config proxy.conf.json)
```

## Deployment Procedures

### Web Deployment

```bash
# 1. Build production bundle
npm run build:prod

# 2. Output location: www/
# Deploy www/ contents to web server (nginx, Apache, etc.)

# 3. Verify build
ls -lh www/
```

### Android APK Build

#### Debug Build (Development/Testing)

```bash
# Option 1: All-in-one command
npm run mobile:build

# Option 2: Step-by-step
# 1. Build web assets and sync to Android
npm run mobile:sync

# 2. Build debug APK
npm run android:build
# Or manually:
# cd android && ./gradlew assembleDebug

# 3. Output location:
# android/app/build/outputs/apk/debug/app-debug.apk

# 4. Install on device
npm run android:install
# Or manually:
# adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

#### Release Build (Production)

```bash
# 1. Ensure signing is configured (see APP_SIGNING_GUIDE.md)

# 2. Build release APK
npm run mobile:build:release
# Or step-by-step:
# npm run mobile:sync
# npm run android:build:release

# 3. Output location:
# android/app/build/outputs/apk/release/app-release.apk

# 4. Verify signature
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

### Deployment Checklist

Pre-deployment checks:

- [ ] Build passes without errors (`npm run build:prod`)
- [ ] All unit tests pass (`npm test`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Lint checks pass (`npm run lint` and `npm run lint:styles`)
- [ ] Code formatted (`npm run format`)
- [ ] Backend connectivity verified (test all three modes: mock, local, cloud)
- [ ] Accessibility tests pass (`npm run test:a11y`)

Android APK preparation:

- [ ] APK signed with production keystore (see APP_SIGNING_GUIDE.md)
- [ ] Version code incremented in android/app/build.gradle
- [ ] Version name updated to semantic version (e.g., 1.0.0)
- [ ] App ID verified: io.diabetactic.app
- [ ] Release APK built and tested (`npm run mobile:build:release`)

Final checks:

- [ ] Release notes prepared
- [ ] Backup previous version and keystore
- [ ] Test APK on multiple devices and Android versions
- [ ] Verify app permissions in AndroidManifest.xml
- [ ] Check app icon and splash screen

## Environment Variables

### Application Environment

Variables set at build time (not runtime):

```bash
# Backend mode (development only)
ENV=mock|local|cloud

# Build configuration (Angular)
NG_BUILD_CONFIGURATION=production|development

# Platform detection
CAPACITOR_PLATFORM=android|ios|web
```

### Android Build Environment

Set in `android/gradle.properties`:

```properties
# JVM memory settings
org.gradle.jvmargs=-Xmx1536m

# AndroidX support
android.useAndroidX=true
```

### Backend Configuration

Production backend URL can be configured in environment files:

1. Edit `src/environments/environment.ts` (development) or `environment.prod.ts` (production)
2. Update the `getBaseUrl()` function or Heroku URL constant
3. Current Heroku API Gateway: `https://diabetactic-api-gateway-37949d6f182f.herokuapp.com`
4. Rebuild application after changes

Override URLs via environment variables (development only):

- `HEROKU_API_BASE_URL` - for cloud/heroku mode
- `LOCAL_API_GATEWAY_URL` - for local mode
- `MOCK_API_GATEWAY_URL` - for mock mode

## Troubleshooting

### Common Issues

#### Backend Mode Issues

**Problem**: App doesn't connect to expected backend (wrong mode active)

**Solution**:

```bash
# 1. Check which mode is active in browser console (F12)
# Look for: [dev] ENV=cloud → API_GATEWAY_URL=...

# 2. Verify environment.ts DEV_BACKEND_MODE setting
# Current default: 'cloud'

# 3. Override with ENV variable if needed
npm run start:mock    # Force mock mode
npm run start:local   # Force local Docker mode
npm run start:cloud   # Force cloud/Heroku mode

# 4. For Android builds, mode is set at build time
# Rebuild with desired environment configuration
```

**Problem**: Mock mode not working properly

**Solution**:

1. Verify `DEV_BACKEND_MODE` is set to `'mock'` in `src/environments/environment.ts`
2. Check that mock adapters are properly implemented in services
3. Clear browser cache and reload
4. No backend connection required - all data is in-memory

**Problem**: Local mode can't connect to Docker backend

**Solution**:

```bash
# 1. Verify Docker containers are running
docker ps | grep diabetactic

# 2. Check API Gateway is accessible
curl http://localhost:8000/health

# 3. For Android emulator, use special IP
# Web: http://localhost:8000
# Android emulator: http://10.0.2.2:8000

# 4. Verify Docker Compose configuration
docker-compose up -d
```

#### Build Failures

**Problem**: `npm install` fails with dependency errors

**Solution**:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Problem**: Gradle build fails with "Java version mismatch"

**Solution**:

```bash
# Verify Java version (requires Java 17+ for Android Gradle Plugin)
java -version

# Set JAVA_HOME explicitly
export JAVA_HOME=/path/to/jdk-17-or-21

# Or use mise (recommended for managing multiple runtime versions)
mise install java@21
mise use java@21

# Note: Android build.gradle uses JavaVersion.VERSION_17 as target
```

**Problem**: Android build fails with "SDK not found"

**Solution**:

```bash
# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk

# Verify SDK tools installed
sdkmanager --list_installed
```

#### Runtime Issues

**Problem**: App shows "Network Error" immediately

**Solution**:

1. Check backend mode in browser console (F12) - look for start-with-env.mjs logs
2. Verify backend URL is accessible:
   ```bash
   # For cloud mode:
   curl -I https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/health
   # For local mode:
   curl -I http://localhost:8000/health
   ```
3. Check CORS headers on backend (must allow origin)
4. For Android: Verify `cleartext: true` and `allowNavigation: ['*']` in capacitor.config.ts
5. Try switching to mock mode for testing: `npm run start:mock`

**Problem**: App crashes on startup (Android)

**Solution**:

```bash
# Check logcat for errors
npm run android:logs
# Or manually:
# adb logcat | grep -i "diabetactic\|chromium\|capacitor"

# Common issues:
# - WebView outdated: Update Android System WebView from Play Store
# - Permissions: Check AndroidManifest.xml for required permissions
# - Missing native modules: Run npm run cap:sync or npx cap sync android
# - Plugin errors: Check that all Capacitor plugins are properly installed
```

**Problem**: Data not syncing with backend

**Solution**:

1. Check network connectivity: Settings > Network
2. Verify backend health endpoint
3. Check browser/logcat for HTTP errors
4. Clear app storage: Settings > Apps > Diabetactic > Clear Data

#### Database Issues

**Problem**: IndexedDB quota exceeded

**Solution**:

```javascript
// Check quota usage in browser console
navigator.storage.estimate().then(estimate => {
  console.log(`${estimate.usage} / ${estimate.quota}`);
});

// Clear database (data loss!)
// Settings > Apps > Diabetactic > Clear Storage
```

### Performance Issues

**Problem**: App slow to load

**Solution**:

1. Check bundle size: `npm run build:analyze` (then run `npx webpack-bundle-analyzer dist/stats.json`)
2. Ensure using production build: `npm run build:prod`
3. Clear app cache and data
4. Check device storage (need 100MB+ free)
5. Verify not running in debug/development mode on production

**Problem**: High memory usage

**Solution**:

1. Check for memory leaks in Chrome DevTools
2. Verify RxJS subscriptions are unsubscribed
3. Restart app
4. Clear IndexedDB

## Log Locations & Monitoring

### Web Application Logs

**Browser Console** (Chrome DevTools):

```
Right-click > Inspect > Console tab
Filter: "diabetactic" or "api-gateway"
```

**Log Format**:

```
2025-11-30T12:34:56.789Z [INFO] [ApiGateway] GET /users/me succeeded
2025-11-30T12:34:56.790Z [ERROR] [Database] Failed to save reading | Error: QuotaExceededError
```

**Log Levels**:

- DEBUG: Detailed debugging information
- INFO: General informational messages
- WARN: Warning messages
- ERROR: Error messages with stack traces

### Android Application Logs

**Logcat** (via adb):

```bash
# Real-time logs with npm script (recommended)
npm run android:logs

# All logs from app
adb logcat | grep "io.diabetactic.app"

# Filter by tag
adb logcat -s Diabetactic

# Clear logs before starting
npm run android:clear-logs
# Or manually:
# adb logcat -c

# Save logs to file
adb logcat > diabetactic.log
```

**Common Log Tags**:

- `Capacitor`: Capacitor plugin logs
- `Chromium`: WebView/browser logs
- `Diabetactic`: Application-specific logs
- `HTTP`: Network request logs

### Production Monitoring

**Recommended Monitoring Points**:

1. **API Health**: Monitor `/health` endpoint on backend
2. **Error Rate**: Track ERROR level logs
3. **Response Times**: Monitor API request latency
4. **Crash Reports**: Use Sentry or Firebase Crashlytics (optional)
5. **User Metrics**: Active users, sessions, feature usage

**Health Check Endpoint**:

```bash
# Check backend health
curl https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/health

# Expected response:
# {"status":"healthy","timestamp":"2025-11-30T12:34:56.789Z"}

# Check from Android device (using adb shell)
adb shell curl https://diabetactic-api-gateway-37949d6f182f.herokuapp.com/health
```

### Log Retention

- **Browser Console**: Session-based (cleared on reload)
- **Android Logcat**: Limited buffer (rotates automatically)
- **Backend Logs**: Heroku keeps 1500 lines (upgrade for more)

**For Production**: Implement centralized logging (Splunk, ELK, CloudWatch)

## Security Considerations

### Data Protection

- **PHI Redaction**: Logger service automatically redacts sensitive fields (glucose values, names, emails)
- **Secure Storage**: User credentials stored in Android Keystore
- **HTTPS Only**: Production enforces HTTPS connections
- **Token Expiration**: Auth tokens expire after inactivity

### Network Security

- **Certificate Pinning**: Not enabled (consider for production)
- **Clear Text Traffic**: Enabled for local development only
- **API Gateway**: All requests route through single gateway

### Access Control

- **Authentication**: Required for all backend operations
- **Local Auth**: Username/password stored securely
- **Tidepool OAuth**: External authentication option

## Backup & Recovery

### Database Backup

```bash
# Export user data (feature not implemented)
# Manual backup: Extract IndexedDB from browser DevTools > Application > Storage

# Android: Backup app data
adb backup -f diabetactic-backup.ab io.diabetactic.app

# Restore from backup
adb restore diabetactic-backup.ab
```

### Configuration Backup

Critical files to backup before updates:

- `android/app/build.gradle` (version info, signing config)
- `android/keystore.jks` (CRITICAL - NEVER commit to git, store securely)
- `android/key.properties` (if using signed builds)
- `src/environments/environment.prod.ts` (production backend URLs)
- `src/environments/environment.ts` (development backend URLs)
- `capacitor.config.ts` (app configuration, package ID)
- `package.json` (dependencies and script configurations)

## Version Management

### Version Numbering

Located in `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 1        // Integer, increment for each release
    versionName "1.0"    // String, semantic version
}
```

**Version Strategy**:

- `versionCode`: Auto-increment on each build (1, 2, 3, ...)
- `versionName`: Semantic versioning (1.0.0, 1.1.0, 2.0.0)

### Release Process

1. Update version numbers in build.gradle
2. Update changelog
3. Build signed release APK
4. Test on multiple devices
5. Tag git commit: `git tag v1.0.0`
6. Deploy to distribution channel

## Support Contacts

| Issue Type        | Contact                                  |
| ----------------- | ---------------------------------------- |
| Build/Deployment  | DevOps Team                              |
| Backend API       | Backend Team (API Gateway)               |
| Database Issues   | Database Administrator                   |
| Security Concerns | Security Team                            |
| Android-Specific  | Mobile Development Team                  |
| User Issues       | Help Desk (escalate to development team) |

## Additional Resources

- [Android Studio Setup Guide](./ANDROID_STUDIO_SETUP.md)
- [App Signing Guide](./APP_SIGNING_GUIDE.md)
- [Android Compatibility Matrix](./ANDROID_COMPATIBILITY.md)
- [Backend Mode Configuration](./BACKEND_MODE_GUIDE.md)
- [NPM Scripts Reference](./NPM_SCRIPTS_GUIDE.md)
- [Testing Guide](./TESTING_GUIDE.md)

## Quick Reference Commands

```bash
# Development
npm start                      # Start dev server (mock mode, default)
npm run start:mock             # Start with mock backend
npm run start:local            # Start with local Docker backend
npm run start:cloud            # Start with cloud Heroku backend
npm run build:prod             # Production build

# Testing
npm test                       # Unit tests (Jest with Jasmine compatibility)
npm run test:watch             # Unit tests in watch mode
npm run test:coverage          # Unit tests with coverage report
npm run test:e2e               # E2E tests (Playwright)
npm run test:e2e:headed        # E2E tests with browser visible
npm run test:a11y              # Accessibility tests
npm run lint                   # ESLint code quality check
npm run lint:styles            # Stylelint CSS/SCSS check
npm run format                 # Prettier formatting
npm run quality                # Run lint + tests combined

# Android
npm run mobile:sync            # Build & sync to Android
npm run mobile:build           # Build debug APK (all-in-one)
npm run mobile:build:release   # Build release APK (all-in-one)
npm run android:build          # Build debug APK only
npm run android:build:release  # Build release APK only
npm run android:install        # Install debug APK to device
npm run android:logs           # View device logs
npm run android:devices        # List connected devices
npm run android:open           # Open Android Studio

# Troubleshooting
npm run clean                  # Clean dependencies and reinstall
npm run clean:all              # Clean everything (deps + Android build)
npm run mobile:clean           # Clean Android build only
npm run android:clear-logs     # Clear Android logs
adb devices                    # List connected devices
```

## Maintenance Schedule

### Daily

- Monitor error logs
- Check backend health endpoint
- Review user-reported issues

### Weekly

- Review dependency updates
- Check disk space on build server
- Verify backup procedures

### Monthly

- Security patch updates
- Performance analysis
- Database maintenance

### Quarterly

- Major version updates (Angular, Ionic, Capacitor)
- Security audit
- Disaster recovery drill

## Testing Framework

### Unit Tests (Jest)

The application uses **Jest** as the testing framework with a **Jasmine compatibility layer**. This means:

- Test files use `*.spec.ts` naming convention
- Both Jest and Jasmine syntax are supported:
  - Jest: `jest.fn()`, `jest.spyOn()`, `mockResolvedValue()`
  - Jasmine: `jasmine.createSpyObj()`, `spyOn().and.returnValue()`
- Capacitor plugins are pre-mocked in `setup-jest.ts`
- Tests run with `npm test` or `npm run test:watch`

**Key Testing Files:**

- `jest.config.ts` - Jest configuration
- `setup-jest.ts` - Global test setup and Capacitor mocks
- Test files: Located alongside source files (`*.spec.ts`)

### E2E Tests (Playwright)

End-to-end tests use Playwright for browser automation:

- Test location: `playwright/tests/`
- Run with: `npm run test:e2e` (headless) or `npm run test:e2e:headed` (visible browser)
- Accessibility tests: `npm run test:a11y`
- Configuration: `playwright.config.ts`

### Test Coverage

Generate coverage reports:

```bash
npm run test:coverage

# Coverage output: coverage/lcov-report/index.html
```

Target coverage:

- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+
