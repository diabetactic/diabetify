# NPM Scripts Complete Reference

All commands run from project root. **No need to cd into android folder!**

This project has 60+ npm scripts organized into categories for development, testing, building, and deployment.

## 🚀 Development Server (4 scripts)

Start the Ionic dev server with different backend configurations.

| Command               | What it does                        | Backend Mode           | Port |
| --------------------- | ----------------------------------- | ---------------------- | ---- |
| `npm start`           | Start dev server (auto-detects ENV) | Default: mock          | 8100 |
| `npm run start:mock`  | Start with mock backend             | Mock (safe)            | 8100 |
| `npm run start:local` | Start with local Docker backend     | Local (localhost:8000) | 8100 |
| `npm run start:cloud` | Start with Heroku backend           | Cloud (production API) | 8100 |

**How it works**: Uses `scripts/start-with-env.mjs` to detect ENV variable and configure environment.

**Most used**: `npm run start:mock` for development

**When to use each**:

- `start:mock` - Default for UI development, no backend needed
- `start:local` - Testing against local Docker services
- `start:cloud` - Testing against production Heroku API

---

## 📦 Web Build Scripts (5 scripts)

Build the Angular/Ionic web app for browser deployment.

| Command                 | What it does                         | Optimization | AOT | Output Dir |
| ----------------------- | ------------------------------------ | ------------ | --- | ---------- |
| `npm run build`         | Standard development build           | No           | No  | `www/`     |
| `npm run build:dev`     | Development build (alias for build)  | No           | No  | `www/`     |
| `npm run build:prod`    | Production build (AOT, tree-shaking) | Yes          | Yes | `www/`     |
| `npm run build:mock`    | Build with mock environment config   | No           | No  | `www/`     |
| `npm run build:heroku`  | Build with Heroku environment config | No           | No  | `www/`     |
| `npm run build:analyze` | Build with webpack bundle analysis   | No           | No  | `www/`     |

**Most used**: `npm run build:prod` before deploying or building mobile app

**AOT (Ahead-of-Time compilation)**: Compiles Angular templates during build instead of runtime.

**When to use**:

- `build:prod` - **Always use before mobile builds** or production deployment
- `build:analyze` - Investigating bundle size and optimization opportunities (run `npx webpack-bundle-analyzer dist/stats.json` after)
- `build:mock` - Testing mock backend in production build
- `build:heroku` - Deploying to Heroku with cloud backend config

---

## 📱 Mobile Build Scripts (7 scripts)

Build the Capacitor mobile app for Android deployment.

### Quick Commands (Most Used)

| Command                  | What it does                            | Time    | Components                   |
| ------------------------ | --------------------------------------- | ------- | ---------------------------- |
| `npm run mobile:run`     | **Build, install, show logs**           | ~2 min  | Web + APK + Install + Logcat |
| `npm run mobile:install` | Build web + Android + install on device | ~90 sec | Web + APK + Install          |
| `npm run mobile:build`   | Build web + Android APK (no install)    | ~60 sec | Web + APK                    |
| `npm run deploy:local`   | Alias for mobile:install                | ~90 sec | Web + APK + Install          |

**Start here**: `npm run mobile:run` - Does everything and shows logs

### All Mobile Commands

| Command                        | What it does                           | Steps Performed                             |
| ------------------------------ | -------------------------------------- | ------------------------------------------- |
| `npm run mobile:sync`          | Build web (prod) + sync to Capacitor   | `build:prod` → `cap sync`                   |
| `npm run mobile:build`         | Full build: web + Android debug APK    | `mobile:sync` → `gradlew assembleDebug`     |
| `npm run mobile:build:release` | Build release APK (needs signing)      | `mobile:sync` → `gradlew assembleRelease`   |
| `npm run mobile:install`       | Build + install on device/emulator     | `mobile:build` → `gradlew installDebug`     |
| `npm run mobile:run`           | Build + install + show logs (filtered) | `mobile:install` → `adb logcat` (filtered)  |
| `npm run mobile:clean`         | Clean Android build + web artifacts    | Remove `android/build`, `www/`, `.angular/` |
| `npm run mobile:rebuild`       | Clean + rebuild everything             | `mobile:clean` → `mobile:build`             |

**When to use**:

- `mobile:run` - Daily mobile development (full cycle)
- `mobile:build` - Just need APK file
- `mobile:sync` - Updated Capacitor plugins or web code only
- `mobile:clean` - Build artifacts causing issues
- `mobile:rebuild` - Nuclear option when everything is broken

---

## 🤖 Android Specific Scripts (8 scripts)

Work with Android Studio, Gradle, ADB, and emulators directly.

| Command                         | What it does                                   | Use when                                   |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| `npm run android:open`          | Open project in Android Studio                 | Need to edit native Android code           |
| `npm run android:build`         | Build debug APK only (no web build)            | Testing native changes without web rebuild |
| `npm run android:build:release` | Build release APK (Gradle only)                | Creating signed production build           |
| `npm run android:install`       | Install existing debug APK to device           | APK already built, just need to install    |
| `npm run android:uninstall`     | Remove app from device                         | Clean install or testing fresh state       |
| `npm run android:logs`          | Show filtered logcat output                    | Debugging app issues on device             |
| `npm run android:clear-logs`    | Clear logcat buffer                            | Clean slate before capturing new logs      |
| `npm run android:devices`       | List all connected devices and emulators       | Verify device connection                   |
| `npm run android:emulator`      | Start default emulator (Medium_Phone_API_36.1) | Launch emulator without Android Studio     |

**Log filtering**: `android:logs` filters for "diabetactic", "chromium", and "capacitor" keywords only.

**Use when**: You've already built the web app and just need Android-specific changes

**Commands execute from**: `android/` directory (using `cd android && ...`)

---

## 🎯 Deploy Scripts (3 scripts)

Deploy APK to devices or prepare for distribution.

| Command                 | What it does                          | Steps Performed                   | Output                                              |
| ----------------------- | ------------------------------------- | --------------------------------- | --------------------------------------------------- |
| `npm run deploy:local`  | Build and install on connected device | `mobile:install`                  | Installed on device                                 |
| `npm run deploy:device` | Build and force reinstall with ADB    | `mobile:build` → `adb install -r` | Installed on device (forced)                        |
| `npm run deploy:apk`    | Build APK and display file path       | `mobile:build` → echo path        | `android/app/build/outputs/apk/debug/app-debug.apk` |

**APK Path**: `android/app/build/outputs/apk/debug/app-debug.apk`

**To share APK**: Run `npm run deploy:apk` then copy from path above

**Difference**:

- `deploy:local` - Uses Gradle's `installDebug` task
- `deploy:device` - Uses `adb install -r` (force reinstall flag)
- `deploy:apk` - Just builds, no install

---

## 🧪 Testing Scripts (10 scripts)

Run unit tests, E2E tests, integration tests, and accessibility audits.

### Unit Tests (Jest)

| Command                 | What it does                   | Framework | Watch Mode | Coverage Report |
| ----------------------- | ------------------------------ | --------- | ---------- | --------------- |
| `npm test`              | Run all unit tests             | Jest      | No         | No              |
| `npm run test:unit`     | Run all unit tests (alias)     | Jest      | No         | No              |
| `npm run test:watch`    | Run tests in watch mode        | Jest      | Yes        | No              |
| `npm run test:coverage` | Run tests with coverage report | Jest      | No         | Yes             |

**Test location**: `*.spec.ts` files alongside source code

**Framework**: Jest with Jasmine compatibility layer

**Config**: `jest.config.js`, setup in `setup-jest.ts`

### E2E Tests (Playwright)

| Command                    | What it does                           | Browser Visible | Type          |
| -------------------------- | -------------------------------------- | --------------- | ------------- |
| `npm run test:e2e`         | Run all Playwright E2E tests           | No (headless)   | Full suite    |
| `npm run test:e2e:headed`  | Run E2E with visible browser           | Yes             | Full suite    |
| `npm run test:a11y`        | Run accessibility audit tests          | No (headless)   | Accessibility |
| `npm run test:a11y:headed` | Run accessibility with visible browser | Yes             | Accessibility |
| `npm run test:ui-quality`  | Run UI quality tests only              | No (headless)   | UI Quality    |
| `npm run test:mobile`      | Build mobile app + run E2E tests       | No (headless)   | Mobile E2E    |

**Test location**: `playwright/tests/`

**Config**: `playwright.config.ts`

**Accessibility**: Uses `@axe-core/playwright` for WCAG compliance testing

### Integration Tests

| Command                    | What it does          | Framework | Runs in Band |
| -------------------------- | --------------------- | --------- | ------------ |
| `npm run test:integration` | Run integration tests | Jest      | Yes (serial) |

**Config**: `jest.integration.config.js`

**Serial execution**: Tests run one at a time (`--runInBand`) to avoid conflicts

**Pass with no tests**: `--passWithNoTests` flag allows CI to pass if no integration tests exist yet

**Most used**:

- Development: `npm run test:watch` (unit tests)
- Debugging: `npm run test:e2e:headed` (see browser)
- CI/CD: `npm test` (all unit tests)
- Mobile testing: `npm run test:mobile` (full cycle)
- Accessibility: `npm run test:a11y` (WCAG compliance)

---

## 🔍 Code Quality Scripts (5 scripts)

Lint, format, and validate code quality.

| Command               | What it does                     | Tools Used    | Auto-fix | Exit on Error |
| --------------------- | -------------------------------- | ------------- | -------- | ------------- |
| `npm run lint`        | Check TypeScript/JavaScript code | ESLint        | No       | Yes           |
| `npm run lint:fix`    | Fix TypeScript/JavaScript issues | ESLint        | Yes      | Yes           |
| `npm run lint:styles` | Check SCSS/CSS styles            | Stylelint     | No       | Yes           |
| `npm run format`      | Format all files                 | Prettier      | Yes      | No            |
| `npm run quality`     | Run lint + all tests             | ESLint + Jest | No       | Yes           |

**ESLint config**: Uses Angular ESLint rules, TypeScript, import rules

**Stylelint config**: SCSS standards, Tailwind compatibility, browser feature checks

**Prettier config**: Includes `prettier-plugin-tailwindcss` for class sorting

**Lint-staged**: Automatically runs on pre-commit via Husky (see `package.json` → `lint-staged`)

**Before commit**: `npm run quality` (runs both linting and tests)

**Files checked**:

- `lint`: All `.ts` and `.js` files
- `lint:styles`: All `.scss` and `.css` files in `src/`
- `format`: All files (`.ts`, `.js`, `.html`, `.scss`, `.json`, `.md`)

---

## 🛠️ Utility Scripts (5 scripts)

Maintenance, cleanup, and configuration scripts.

| Command              | What it does                       | Removes                                                   | Reinstalls  |
| -------------------- | ---------------------------------- | --------------------------------------------------------- | ----------- |
| `npm run clean`      | Clean node modules and reinstall   | `node_modules/`, `package-lock.json`, `www/`, `.angular/` | npm install |
| `npm run clean:all`  | Clean everything (node + Android)  | Same as `clean` + Android build artifacts                 | npm install |
| `npm run i18n:check` | Check for missing translation keys | -                                                         | -           |
| `npm run cap:sync`   | Sync Capacitor plugins to native   | -                                                         | -           |
| `npm run cap:update` | Update Capacitor dependencies      | -                                                         | -           |

**When to use**:

- `clean` - Node modules corrupted or need fresh install
- `clean:all` - Everything is broken, nuclear option
- `i18n:check` - After adding new translation keys to check coverage
- `cap:sync` - After installing/removing Capacitor plugins
- `cap:update` - Updating to newer Capacitor version

**i18n:check**: Runs `scripts/check-i18n-missing.js` to compare `en.json` and `es.json`

**cap:sync**: Copies web assets to native projects and updates native dependencies

---

## ⚙️ Setup Scripts (2 scripts)

Automatic lifecycle scripts for project initialization.

| Command       | What it does                    | When it runs        | Auto/Manual |
| ------------- | ------------------------------- | ------------------- | ----------- |
| `prepare`     | Initialize Husky git hooks      | After `npm install` | Auto        |
| `postinstall` | Sync Capacitor if `www/` exists | After `npm install` | Auto        |

**Prepare**: Sets up Husky for git hooks (pre-commit linting/formatting)

**Postinstall**: Conditionally runs `cap sync` if the web app has been built (`www/` directory exists)

**Never call directly**: These run automatically as npm lifecycle hooks

---

## 📊 Script Categories Summary

Total scripts: **60+ scripts** organized across **9 categories**

| Category           | Count | Purpose                                  |
| ------------------ | ----- | ---------------------------------------- |
| Development Server | 4     | Start dev server with different backends |
| Web Build          | 6     | Build Angular/Ionic app for browser      |
| Mobile Build       | 7     | Build Capacitor Android app              |
| Android Specific   | 9     | Work with Android Studio, Gradle, ADB    |
| Deploy             | 3     | Deploy APK to devices                    |
| Testing            | 10    | Unit, E2E, integration, accessibility    |
| Code Quality       | 5     | Lint, format, validate code              |
| Utilities          | 5     | Maintenance, cleanup, i18n               |
| Setup              | 2     | Automatic lifecycle hooks                |

**Plus comment separators**: Package.json includes `// === CATEGORY ===` for organization

---

## 📋 Common Workflows

### First Time Setup

```bash
npm install               # Install dependencies (runs prepare + postinstall hooks)
npm run mobile:build      # First build takes ~3-5 min
```

### Daily Development (Web)

```bash
npm run start:mock        # Start dev server (most common)
# or
npm run start:local       # Test with local Docker backend
# or
npm run start:cloud       # Test with Heroku production API

# Make changes, browser auto-reloads
```

### Daily Development (Mobile)

```bash
# Option 1: Develop in browser first (faster iteration)
npm run start:mock        # Develop in browser with hot-reload
# Once ready for mobile testing:
npm run mobile:run        # Build + install + logs

# Option 2: Direct mobile development
npm run mobile:install    # Build and install
npm run android:logs      # Watch logs in separate terminal
```

### Before Commit

```bash
npm run format            # Format all files with Prettier
npm run lint:fix          # Auto-fix ESLint issues
npm run quality           # Run lint + all tests (final check)
```

**Git hooks**: Pre-commit hook automatically runs lint-staged (formatting + linting)

### Deploy to Device

```bash
# Most common: Build + install + view logs
npm run mobile:run

# Alternative: Build + force reinstall
npm run deploy:device

# Just get APK file
npm run deploy:apk
```

### Share APK with Someone

```bash
npm run deploy:apk
# Copy from: android/app/build/outputs/apk/debug/app-debug.apk
# Send the APK file via email, cloud storage, etc.
```

### Testing

```bash
# Unit tests (development)
npm run test:watch        # Watch mode for TDD

# Unit tests (CI/CD)
npm test                  # Run all tests once
npm run test:coverage     # With coverage report

# E2E tests (browser)
npm run test:e2e          # Headless
npm run test:e2e:headed   # Visible browser for debugging

# Accessibility tests
npm run test:a11y         # WCAG compliance audit
npm run test:ui-quality   # UI quality checks

# Mobile E2E
npm run test:mobile       # Build mobile + run E2E

# Integration tests
npm run test:integration  # Run integration suite
```

### Clean Build (Something's Broken)

```bash
# Clean mobile only
npm run mobile:rebuild    # Clean Android + rebuild

# Clean everything
npm run clean:all         # Clean node_modules + Android
# Then rebuild:
npm run mobile:build
```

### Update After Changing Capacitor Plugins

```bash
# After installing new plugin (e.g., npm install @capacitor/camera)
npm run cap:sync          # Sync to native projects
npm run mobile:build      # Rebuild mobile app
```

### Optimizing Bundle Size

```bash
npm run build:analyze     # Build with stats
npx webpack-bundle-analyzer dist/stats.json
# Analyze bundle composition and identify large dependencies
```

### Working with Android Studio

```bash
# Open in Android Studio
npm run android:open

# Make native changes, then:
npm run android:build     # Build APK only (no web rebuild)
npm run android:install   # Install to device

# Or full rebuild if web changes too:
npm run mobile:build
```

### Debugging Mobile Issues

```bash
# Terminal 1: View logs
npm run android:logs

# Terminal 2: Make changes and rebuild
npm run mobile:install

# Or combined:
npm run mobile:run        # Build + install + logs
```

### Managing Devices and Emulators

```bash
# Check connected devices
npm run android:devices

# Start emulator
npm run android:emulator  # Launches Medium_Phone_API_36.1

# Clear logcat before debugging
npm run android:clear-logs
```

### Translation Management

```bash
# After adding new i18n keys
npm run i18n:check        # Check for missing translations
# Manually update src/assets/i18n/en.json and es.json
```

---

## 🎨 Environment Variables

Control backend mode for the dev server and builds.

### ENV Variable

Set before running start commands:

```bash
ENV=mock npm start      # Mock backend (default, no API calls)
ENV=local npm start     # Local Docker at localhost:8000
ENV=cloud npm start     # Heroku production API (api-gateway.heroku.com)
```

Or use dedicated shortcuts:

```bash
npm run start:mock      # Same as ENV=mock npm start
npm run start:local     # Same as ENV=local npm start
npm run start:cloud     # Same as ENV=cloud npm start
```

### How It Works

The `scripts/start-with-env.mjs` script:

1. Reads the `ENV` variable
2. Updates `src/environments/environment.ts` with the correct `DEV_BACKEND_MODE`
3. Starts the Angular dev server

**Default**: If `ENV` is not set, defaults to `mock` mode

**Check current mode**: Look for "🚀 App Configuration" in browser console

---

## ⚡ Quick Reference Table

| I want to...                   | Command                              | Category     |
| ------------------------------ | ------------------------------------ | ------------ |
| **Start dev server**           | `npm run start:mock`                 | Development  |
| **Build for browser**          | `npm run build:prod`                 | Web Build    |
| **Build mobile app**           | `npm run mobile:build`               | Mobile Build |
| **Install on device**          | `npm run mobile:install`             | Mobile Build |
| **Build + install + see logs** | `npm run mobile:run`                 | Mobile Build |
| **Just build APK**             | `npm run deploy:apk`                 | Deploy       |
| **Share APK with someone**     | `npm run deploy:apk`                 | Deploy       |
| **Run unit tests**             | `npm test`                           | Testing      |
| **Run tests in watch mode**    | `npm run test:watch`                 | Testing      |
| **Run E2E tests**              | `npm run test:e2e`                   | Testing      |
| **Check accessibility (WCAG)** | `npm run test:a11y`                  | Testing      |
| **Fix code style**             | `npm run lint:fix && npm run format` | Code Quality |
| **Run all quality checks**     | `npm run quality`                    | Code Quality |
| **Clean node modules**         | `npm run clean`                      | Utilities    |
| **Clean everything**           | `npm run clean:all`                  | Utilities    |
| **Sync Capacitor**             | `npm run cap:sync`                   | Utilities    |
| **Check translations**         | `npm run i18n:check`                 | Utilities    |
| **Open Android Studio**        | `npm run android:open`               | Android      |
| **View mobile logs**           | `npm run android:logs`               | Android      |
| **Start emulator**             | `npm run android:emulator`           | Android      |
| **Check connected devices**    | `npm run android:devices`            | Android      |
| **Analyze bundle size**        | `npm run build:analyze`              | Web Build    |

---

## 💡 Pro Tips

### Development Workflow

1. **Most common command**: `npm run mobile:run`
   - Builds web app (production), Android APK, installs, shows filtered logs
   - Perfect for daily mobile development
   - Single command does everything

2. **Fastest iteration cycle**:
   - Develop in browser: `npm run start:mock` (instant hot-reload)
   - Test on mobile occasionally: `npm run mobile:run`
   - Browser is 10x faster for UI work

3. **Before commit checklist**:
   ```bash
   npm run format      # Format code
   npm run lint:fix    # Fix linting issues
   npm run quality     # Run lint + tests
   ```
   Git hooks will run lint-staged automatically on commit

### File Locations

4. **APK location**:
   - Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `android/app/build/outputs/apk/release/app-release.apk`
   - After any `mobile:build`, `android:build`, or deploy command

5. **Web build output**: `www/` directory
   - Generated by `npm run build` or `ng build`
   - Required before `cap sync` or mobile builds

6. **Test coverage reports**: `coverage/` directory
   - Generated by `npm run test:coverage`
   - Open `coverage/lcov-report/index.html` in browser

### Logs and Debugging

7. **Logs are filtered**:
   - `mobile:run` and `android:logs` use `grep -i 'diabetactic\|chromium\|capacitor'`
   - Filters out Android system noise
   - Only shows app-relevant logs

8. **Backend mode visibility**:
   - Check browser console for: "🚀 App Configuration"
   - Shows: Backend Mode, API Gateway URL, Production status
   - Helps verify correct environment

9. **Console debugging tips**:
   - See `docs/CONSOLE_LOG_TIPS.md` for debugging patterns
   - Use console.table() for structured data
   - Use console.group() for nested logs

### Project Organization

10. **No need to cd**:
    - All commands work from project root
    - Scripts handle directory changes internally
    - Simplifies workflow and automation

11. **Script organization in package.json**:
    - Organized with `// === CATEGORY ===` comments
    - Easy to find related scripts
    - Logical grouping by purpose

12. **Multiple terminals workflow**:
    - Terminal 1: `npm run start:mock` (dev server)
    - Terminal 2: `npm run test:watch` (tests)
    - Terminal 3: `npm run android:logs` (mobile logs when needed)

### Performance

13. **Build times**:
    - `build:dev`: ~10-20 seconds (no optimization)
    - `build:prod`: ~30-60 seconds (AOT + optimization)
    - `mobile:build`: ~60-90 seconds (web + Android)
    - `mobile:run`: ~90-120 seconds (full cycle)

14. **Incremental builds**:
    - `android:build` only rebuilds native code (~30 sec)
    - `mobile:sync` only syncs web assets (~10 sec)
    - Use when you know what changed

15. **Bundle analysis**:
    - `npm run build:analyze` creates `dist/stats.json`
    - Run `npx webpack-bundle-analyzer dist/stats.json`
    - Visual breakdown of bundle size by module

---

## 🆘 Troubleshooting

### Build Issues

| Problem                        | Solution                                       | Explanation                                  |
| ------------------------------ | ---------------------------------------------- | -------------------------------------------- |
| Build fails with Gradle errors | `npm run mobile:clean && npm run mobile:build` | Clean Android build cache and artifacts      |
| Build fails with npm errors    | `npm run clean && npm run mobile:build`        | Clean node_modules and reinstall             |
| Everything is broken           | `npm run clean:all && npm run mobile:build`    | Nuclear option: clean everything and rebuild |
| Web changes not in mobile      | `npm run mobile:sync`                          | Re-sync web assets to Capacitor              |
| Capacitor plugin not working   | `npm run cap:sync && npm run mobile:build`     | Sync plugin to native projects               |
| Angular build errors           | `rm -rf .angular www && npm run build:prod`    | Clear Angular cache and rebuild              |

### Device and Emulator Issues

| Problem                   | Solution                                              | Explanation                                 |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| Device not found          | `npm run android:devices`                             | Check USB debugging enabled and cable works |
| Emulator won't start      | `npm run android:emulator`                            | Launch default emulator                     |
| App won't install         | `npm run android:uninstall && npm run mobile:install` | Remove old version and reinstall            |
| Multiple devices detected | `adb devices` then `adb -s <device-id> install ...`   | Use specific device ID                      |

### Logging and Debugging Issues

| Problem                   | Solution                                             | Explanation                                    |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| Logs not showing          | `npm run android:clear-logs && npm run android:logs` | Clear logcat buffer and restart logging        |
| Too much log noise        | `npm run android:logs`                               | Use filtered logs (diabetactic/capacitor only) |
| Need full unfiltered logs | `adb logcat`                                         | View all system logs                           |
| App crashes on startup    | `npm run android:logs` then check for stack traces   | Look for Java exceptions or JS errors          |

### Testing Issues

| Problem                            | Solution                                            | Explanation                                  |
| ---------------------------------- | --------------------------------------------------- | -------------------------------------------- |
| Tests fail after dependency update | `rm -rf node_modules && npm install && npm test`    | Reinstall dependencies                       |
| Jest cache issues                  | `npx jest --clearCache && npm test`                 | Clear Jest cache                             |
| E2E tests timeout                  | `npm run test:e2e:headed`                           | Run with visible browser to see what's wrong |
| Accessibility tests fail           | Review axe violations in `playwright/test-results/` | Check WCAG compliance issues                 |

### Code Quality Issues

| Problem                        | Solution                                                             | Explanation                         |
| ------------------------------ | -------------------------------------------------------------------- | ----------------------------------- |
| Linting errors blocking commit | `npm run lint:fix && npm run format`                                 | Auto-fix most issues                |
| Stylelint errors               | `npm run lint:styles` then manually fix                              | CSS/SCSS issues need manual review  |
| Pre-commit hook fails          | Fix linting issues or use `git commit --no-verify` (not recommended) | Git hooks enforce quality standards |

### Environment and Configuration Issues

| Problem                  | Solution                                                 | Explanation                        |
| ------------------------ | -------------------------------------------------------- | ---------------------------------- |
| Wrong backend mode       | Check browser console for "🚀 App Configuration"         | Verify DEV_BACKEND_MODE is correct |
| ENV variable not working | Use `npm run start:mock` instead of `ENV=mock npm start` | Script wrappers more reliable      |
| Translations missing     | `npm run i18n:check` then update `en.json` and `es.json` | Check for missing translation keys |

### Performance Issues

| Problem           | Solution                                                          | Explanation                    |
| ----------------- | ----------------------------------------------------------------- | ------------------------------ |
| Slow builds       | Use incremental builds: `android:build` instead of `mobile:build` | Skip web rebuild if not needed |
| Large bundle size | `npm run build:analyze` then optimize imports                     | Identify large dependencies    |
| Slow dev server   | Clear `.angular` cache: `rm -rf .angular`                         | Angular build cache corruption |

### Advanced Troubleshooting

| Problem                           | Solution                                                  | Explanation                                |
| --------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| Android Studio won't open project | `npm run android:open` or manually open `android/` folder | Open as Android project, not Gradle script |
| Gradle daemon issues              | `cd android && ./gradlew --stop && cd ..`                 | Stop Gradle daemon and retry               |
| ADB not found                     | Add Android SDK platform-tools to PATH                    | See `docs/ANDROID_STUDIO_SETUP.md`         |
| Port 8100 already in use          | `lsof -ti:8100 \| xargs kill -9` then `npm start`         | Kill process using port 8100               |

**When all else fails**:

1. `npm run clean:all` - Clean everything
2. `rm -rf .angular www node_modules package-lock.json`
3. `npm install`
4. `npm run mobile:build`
5. Check `docs/` for specific setup guides

---

## 📚 Related Documentation

For more detailed information on specific topics:

| Documentation File        | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `ANDROID_STUDIO_SETUP.md` | Complete Android Studio, Java, SDK setup guide |
| `BACKEND_MODE_GUIDE.md`   | Backend modes (mock/local/cloud) configuration |
| `CONSOLE_LOG_TIPS.md`     | Browser console debugging patterns and tips    |
| `PATTERN_DESIGNS.md`      | Architecture patterns and design decisions     |
| `CLAUDE.md`               | Project overview and Claude Code guidance      |
| `README.md`               | Project introduction and getting started       |

**Project structure**:

- `src/` - Angular/Ionic application source code
- `android/` - Native Android project (Capacitor)
- `playwright/` - E2E tests and accessibility audits
- `scripts/` - Build and utility scripts
- `docs/` - Documentation files

**Configuration files**:

- `package.json` - Dependencies and npm scripts
- `angular.json` - Angular CLI configuration
- `capacitor.config.ts` - Capacitor configuration
- `jest.config.js` - Jest unit test configuration
- `playwright.config.ts` - Playwright E2E test configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

---

## 📝 Summary

This project uses **60+ npm scripts** organized into **9 categories** to manage:

1. **Development** - Dev server with mock/local/cloud backends
2. **Web Build** - Angular/Ionic builds with various optimizations
3. **Mobile Build** - Capacitor Android builds and installation
4. **Android** - Native Android development with Gradle and ADB
5. **Deploy** - APK distribution and device installation
6. **Testing** - Unit (Jest), E2E (Playwright), integration, accessibility
7. **Quality** - ESLint, Stylelint, Prettier, combined checks
8. **Utilities** - Cleanup, Capacitor sync, translation checks
9. **Setup** - Automatic git hooks and Capacitor initialization

**Most used commands**:

- `npm run start:mock` - Daily web development
- `npm run mobile:run` - Daily mobile development
- `npm run test:watch` - TDD unit testing
- `npm run quality` - Pre-commit quality check
- `npm run deploy:apk` - Build APK for sharing

**Key features**:

- All commands run from project root (no `cd` needed)
- Filtered logs for mobile debugging (diabetactic/capacitor only)
- Multiple backend modes for different environments
- Comprehensive testing suite (unit, E2E, integration, accessibility)
- Automated code quality checks with git hooks
- Incremental builds for faster iteration

For daily development, start with `npm run start:mock` for web or `npm run mobile:run` for mobile. Everything else builds on these foundations.
