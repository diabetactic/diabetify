# Environment Setup - Memory for Claude

> **Purpose:** This document ensures Claude remembers the Android/Java/Gradle setup and lessons learned across sessions.

## ✅ Environment Already Configured

Your shell (`.zshrc`) is **already configured** with all necessary environment variables:

```bash
# Lines 112-116: Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/build-tools/35.0.0

# Lines 119-123: Java (via mise) + Warning Suppression
export JAVA_HOME=$(mise which java 2>/dev/null | xargs dirname | xargs dirname)
export JAVA_TOOL_OPTIONS="-XX:+IgnoreUnrecognizedVMOptions --add-opens java.base/sun.misc=ALL-UNNAMED --add-opens java.base/java.lang=ALL-UNNAMED"

# Lines 160-165: Maestro
export PATH="$PATH:$HOME/.maestro/bin"
```

## 🎯 Key Commands - No Environment Variables Needed

Thanks to shell configuration, these commands work directly:

```bash
# Android builds - Just use the gradle wrapper
cd android && ./gradlew installDebug

# Or use helper script
./scripts/android-build.sh installDebug

# Or use mise tasks
mise run android:install
mise run android:rebuild

# Maestro tests - No warnings
maestro test maestro/tests/smoke-test.yaml
```

## 🔥 Lessons Learned (November 2024)

### Issue 1: Java Version Requirements
- **Problem:** Gradle 8.x requires Java 21
- **Solution:** mise manages Java 21, JAVA_HOME auto-set in .zshrc
- **Status:** ✅ SOLVED - No manual JAVA_HOME needed

### Issue 2: Android SDK Path
- **Problem:** Gradle couldn't find Android SDK
- **Solution:** ANDROID_HOME set in .zshrc
- **Status:** ✅ SOLVED - Always available

### Issue 3: Gradle Wrapper Location
- **Problem:** Tried running `./gradlew` from wrong directory
- **Actual location:** `android/gradlew`
- **Solution:** Helper script `scripts/android-build.sh`
- **Status:** ✅ SOLVED - Script handles path automatically

### Issue 4: Maestro Java Warnings
- **Problem:** Tons of "deprecated API" warnings from Maestro dependencies
- **Impact:** Harmless - tests still work
- **Solution:** JAVA_TOOL_OPTIONS suppresses warnings (added to .zshrc)
- **Status:** ✅ SOLVED - Silent now

### Issue 5: Package Name Mismatch
- **Config shows:** `io.diabetactic.app`
- **Actual package:** `io.diabetify.app`
- **Solution:** Just documented, use correct name in commands
- **Status:** ✅ DOCUMENTED

## 📋 Development Workflow

### Full Clean Rebuild
```bash
# Clean everything
rm -rf .angular www android/app/build

# Rebuild for mock mode
npm run build:mock
npm run cap:sync

# Install on device
cd android && ./gradlew installDebug

# Or use mise shortcut
mise run android:rebuild
```

### Quick Install (after build)
```bash
# Just install
cd android && ./gradlew installDebug

# Or
mise run android:install

# Or
./scripts/android-build.sh installDebug
```

### Run Tests
```bash
# Unit tests
npm run test:ci

# Quality checks
npm run test:quality

# Maestro mobile tests (no warnings now!)
maestro test maestro/tests/smoke-test.yaml

# All tests all modes
npm run test:everything
```

## 🚀 For New Shell Sessions

**Nothing to do!** Environment is permanent in `.zshrc`.

Just start coding:
```bash
cd android && ./gradlew installDebug  # Works immediately
maestro test maestro/tests/           # No warnings
```

## 🔍 Troubleshooting

### If environment variables aren't set:
```bash
# Reload shell config
source ~/.zshrc

# Or open new terminal
```

### If Java version is wrong:
```bash
mise use java@21
source ~/.zshrc
```

### If Android SDK missing:
```bash
# Check installation
ls $ANDROID_HOME

# Should show: emulator/ platform-tools/ build-tools/ etc.
```

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `~/.zshrc` | Shell config with JAVA_HOME, ANDROID_HOME, Maestro PATH |
| `.envrc` | Project-specific env (for direnv users) |
| `mise.toml` | Tool versions + Android tasks |
| `scripts/android-build.sh` | Helper script for gradle commands |

## 🎓 For Claude's Memory

**Remember in future sessions:**

1. ✅ User's environment is **already configured** in `.zshrc`
2. ✅ No need to include `JAVA_HOME=` or `ANDROID_HOME=` in commands
3. ✅ Gradle wrapper is at `android/gradlew` (not root)
4. ✅ Maestro warnings are suppressed system-wide
5. ✅ Package name is `io.diabetify.app` (not `io.diabetactic.app`)
6. ✅ Use helper scripts or mise tasks for simplicity

**Simple commands always work:**
```bash
cd android && ./gradlew installDebug     # ✅ Just works
maestro test maestro/tests/              # ✅ No warnings
mise run android:rebuild                 # ✅ One command rebuild
```

**Never need to:**
- ❌ Manually set JAVA_HOME
- ❌ Manually set ANDROID_HOME
- ❌ Add JAVA_TOOL_OPTIONS to commands
- ❌ Navigate to root to find gradlew

**Always remember:**
- ✅ gradle is in `android/` directory
- ✅ Use mise tasks for simplicity
- ✅ Environment is permanent
