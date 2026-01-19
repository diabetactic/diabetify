# Play Store Publication Checklist

## Pre-Submission Checklist

### Account Setup

- [ ] Create Google Play Developer Account at https://play.google.com/console
- [ ] Pay $25 one-time registration fee
- [ ] Complete identity verification (may take 48 hours)

### App Configuration (✅ DONE)

- [x] App ID: `io.diabetactic.app`
- [x] Version: 1.0.0 (versionCode: 1)
- [x] Target SDK: API 36 (exceeds requirement)
- [x] Minimum SDK: API 23 (Android 6.0)
- [x] Release keystore configured

### Assets Required

#### App Icons (✅ DONE)

- [x] All densities (mdpi → xxxhdpi)
- [x] Adaptive icons configured
- [x] Round icons included

#### Play Store Graphics (MANUAL)

- [ ] **High-res icon**: 512×512 PNG (exists at `docs/assets/images/app-icon-512.png`)
- [ ] **Feature Graphic**: 1024×500 PNG (CREATE THIS - banner for store listing)
- [ ] **Screenshots** (2-8 images):
  - [ ] Phone: 1080×1920 or 16:9 aspect ratio
  - [ ] Use existing screenshots from `docs/assets/screenshots/` and resize

### Store Listing Content (✅ DONE)

- [x] Title (30 chars max): "Diabetactic - Glucose Manager"
- [x] Short description (80 chars): Created in `fastlane/metadata/android/en-US/`
- [x] Full description (4000 chars): Created
- [x] Changelog: Created

### Legal Requirements

- [x] Privacy Policy: Created at `docs/PRIVACY_POLICY.md`
- [ ] **Host Privacy Policy** at public URL (required by Play Store)
  - Option 1: GitHub Pages - enable in repo settings
  - Option 2: Add to your website
  - URL format: `https://diabetactic.github.io/diabetify/PRIVACY_POLICY`

### Play Console Forms (MANUAL - in Play Console)

- [ ] **Content Rating**: Complete IARC questionnaire
  - Category: Health & Fitness
  - Contains: Health information tracking
  - No violence, no gambling, no user-generated content
- [ ] **Data Safety**: Declare data handling
  - Collects: Health data (glucose), Personal info (name, email)
  - Shares: No (data not shared with third parties)
  - Security: Encrypted in transit, can be deleted on request

---

## Build Commands

```bash
# Build signed AAB for Play Store
pnpm run mobile:build:bundle

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab

# Or via GitHub Actions:
# 1. Go to Actions → Android → Run workflow
# 2. Download "release-aab" artifact
```

---

## Upload Process

### First Time Setup

1. Go to https://play.google.com/console
2. Click "Create app"
3. Enter app details:
   - App name: Diabetactic
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free
4. Complete all required sections (dashboard will show progress)

### Upload AAB

1. Go to Release → Production (or Internal testing first)
2. Click "Create new release"
3. Upload `app-release.aab`
4. Add release notes
5. Review and roll out

### Play App Signing (Recommended)

1. Go to Setup → App signing
2. Choose "Use Google Play App Signing" (recommended)
3. Upload your keystore OR let Google generate
4. If using your keystore:
   - Export upload key: `keytool -export -rfc -keystore release-keystore.jks -alias diabetactic-release -file upload_certificate.pem`
   - Upload to Play Console

---

## Testing Tracks (Recommended Order)

1. **Internal testing**: Up to 100 testers, instant review
2. **Closed testing**: Invite-only, limited users
3. **Open testing**: Anyone can join, still in "testing"
4. **Production**: Full public release

---

## Automation (Future)

### Fastlane Setup (Optional)

```bash
# Install fastlane
gem install fastlane

# Initialize for Android
cd android
fastlane init

# Deploy to Play Store
fastlane supply --aab app/build/outputs/bundle/release/app-release.aab
```

### GitHub Action for Auto-Deploy (Future)

The `android.yml` workflow already builds AAB. To auto-deploy:

1. Add service account JSON to secrets
2. Add fastlane supply step after build

---

## MCPs / Automation Tools Found

### No Direct Play Store MCP Found

Research found NO direct MCP for Google Play Store interaction. Available options:

1. **Fastlane** (Ruby CLI) - Most popular
   - `fastlane supply` - Upload to Play Store
   - `fastlane screengrab` - Automated screenshots
2. **gradle-play-publisher** (Gradle plugin)
   - Native Android integration
   - `./gradlew publishBundle`

3. **Google Play Developer API** (REST)
   - Direct API access for advanced automation
   - Requires service account setup

---

## Quick Start Summary

1. **You do**: Create Play Console account ($25)
2. **You do**: Create feature graphic (1024×500 banner)
3. **You do**: Host privacy policy (enable GitHub Pages)
4. **Run**: `pnpm run mobile:build:bundle`
5. **Upload**: `android/app/build/outputs/bundle/release/app-release.aab`
6. **Complete**: Forms in Play Console
7. **Submit**: For review (usually 1-3 days)

Good luck! 🚀
