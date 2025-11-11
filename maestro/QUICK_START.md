# Maestro Tests - Quick Start Guide

## ✅ Setup Complete

Your Diabetify app is installed and Maestro tests are ready to run!

## 🚀 Running Tests

### Smoke Test (10 seconds)
```bash
maestro test maestro/tests/smoke-test-v2.yaml
```

### All Working Tests
```bash
# Dashboard navigation with coordinates
maestro test maestro/tests/dashboard-navigation.yaml

# Health statistics validation
maestro test maestro/tests/dashboard-stats.yaml

# Readings tab interaction
maestro test maestro/tests/readings-interaction.yaml

# Appointments validation
maestro/tests/appointments-tab.yaml

# Profile settings
maestro test maestro/tests/profile-settings.yaml
```

## 📱 Current App State

- **Package**: io.diabetify.app
- **Status**: Logged in (demo mode)
- **Language**: Spanish (ES)
- **Device**: emulator-5554 (Medium_Phone_API_36.1)

## 🎯 Test Results

✅ **smoke-test-v2.yaml** - PASSING
- App launches successfully
- Dashboard displays health data
- Tab navigation works (Home ↔ Readings)
- Screenshots captured

## 📸 Screenshots

Test screenshots are saved to:
```
maestro/tests/screenshots/
├── smoke-dashboard.png
├── smoke-readings.png
└── smoke-home.png
```

## 🔧 Test Approach

These tests work with the **current logged-in state** of the app:
- No login flow needed (app uses demo mode)
- Tests validate actual user workflows
- Coordinates used for icon-only tab navigation
- Bilingual assertions (Spanish|English)

## 📊 Coverage

| Feature | Status |
|---------|--------|
| App Launch | ✅ |
| Dashboard Display | ✅ |
| Tab Navigation | ✅ |
| Health Stats | ✅ |
| Screenshots | ✅ |

## 🎓 Next Steps

1. Run all tests: `maestro test maestro/tests/`
2. Add more assertions based on actual UI
3. Integrate with CI/CD
4. Add performance benchmarks

## 💡 Tips

- Use `maestro studio` for interactive test development
- Check `maestro/tests/screenshots/` for visual validation
- Tab positions: Home(10%), Readings(25%), Add(50%), Appointments(75%), Profile(90%)
- App is in Spanish - assertions use regex patterns like "Mi Salud|My Health"
