# Diabetactic Branding Assets

This folder contains all branding variations for the Diabetactic app.

## Current Active: Variation 1 - "Calm Data Companion"

## Directory Structure

```
branding/
├── original/              # Original branding (backup)
│   ├── icon.png
│   ├── icon-512.png
│   ├── icon-192.png
│   ├── favicon.png
│   └── splash.png
├── variation-1-calm-data/       # Variation 1: Calm Data Companion (ACTIVE)
│   ├── icon.png (1024x1024)
│   └── splash.png (1024x1024)
├── variation-2-daily-life/      # Variation 2: Daily Life & Balance
│   ├── icon.png (1024x1024)
│   └── splash.png (1024x1024)
└── variation-3-smart-dashboard/ # Variation 3: Smart Dashboard
    ├── icon.png (1024x1024)
    └── splash.png (1024x1024)
```

## How to Switch Branding Variations

Run the following commands from the project root, replacing `VARIATION_FOLDER` with the desired variation:

```bash
# Choose your variation
VARIATION="variation-2-daily-life"  # or variation-3-smart-dashboard, or original

SOURCE_ICON="src/assets/branding/$VARIATION/icon.png"
SOURCE_SPLASH="src/assets/branding/$VARIATION/splash.png"
ANDROID_RES="android/app/src/main/res"

# Get background color from splash
BG_COLOR=$(magick "$SOURCE_SPLASH" -format "%[pixel:p{512,900}]" info:)

# Generate Android icons (mipmap)
magick "$SOURCE_ICON" -resize 48x48 "$ANDROID_RES/mipmap-mdpi/ic_launcher.png"
magick "$SOURCE_ICON" -resize 72x72 "$ANDROID_RES/mipmap-hdpi/ic_launcher.png"
magick "$SOURCE_ICON" -resize 96x96 "$ANDROID_RES/mipmap-xhdpi/ic_launcher.png"
magick "$SOURCE_ICON" -resize 144x144 "$ANDROID_RES/mipmap-xxhdpi/ic_launcher.png"
magick "$SOURCE_ICON" -resize 192x192 "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher.png"

# Generate round icons
for size in 48:mdpi 72:hdpi 96:xhdpi 144:xxhdpi 192:xxxhdpi; do
  s=${size%:*}
  d=${size#*:}
  r=$((s/2))
  magick "$SOURCE_ICON" -resize ${s}x${s} \
    \( +clone -threshold -1 -draw "circle $r,$r $r,0" \) \
    -alpha Off -compose Copy_Opacity -composite \
    "$ANDROID_RES/mipmap-$d/ic_launcher_round.png"
done

# Generate foreground icons
magick "$SOURCE_ICON" -resize 48x48 "$ANDROID_RES/mipmap-mdpi/ic_launcher_foreground.png"
magick "$SOURCE_ICON" -resize 72x72 "$ANDROID_RES/mipmap-hdpi/ic_launcher_foreground.png"
magick "$SOURCE_ICON" -resize 96x96 "$ANDROID_RES/mipmap-xhdpi/ic_launcher_foreground.png"
magick "$SOURCE_ICON" -resize 144x144 "$ANDROID_RES/mipmap-xxhdpi/ic_launcher_foreground.png"
magick "$SOURCE_ICON" -resize 192x192 "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher_foreground.png"

# Generate portrait splash screens
magick "$SOURCE_SPLASH" -resize 320x320 -gravity center -background "$BG_COLOR" -extent 320x480 "$ANDROID_RES/drawable-port-mdpi/splash.png"
magick "$SOURCE_SPLASH" -resize 480x480 -gravity center -background "$BG_COLOR" -extent 480x800 "$ANDROID_RES/drawable-port-hdpi/splash.png"
magick "$SOURCE_SPLASH" -resize 720x720 -gravity center -background "$BG_COLOR" -extent 720x1280 "$ANDROID_RES/drawable-port-xhdpi/splash.png"
magick "$SOURCE_SPLASH" -resize 960x960 -gravity center -background "$BG_COLOR" -extent 960x1600 "$ANDROID_RES/drawable-port-xxhdpi/splash.png"
magick "$SOURCE_SPLASH" -resize 1280x1280 -gravity center -background "$BG_COLOR" -extent 1280x1920 "$ANDROID_RES/drawable-port-xxxhdpi/splash.png"

# Generate landscape splash screens
magick "$SOURCE_SPLASH" -resize 320x320 -gravity center -background "$BG_COLOR" -extent 480x320 "$ANDROID_RES/drawable-land-mdpi/splash.png"
magick "$SOURCE_SPLASH" -resize 480x480 -gravity center -background "$BG_COLOR" -extent 800x480 "$ANDROID_RES/drawable-land-hdpi/splash.png"
magick "$SOURCE_SPLASH" -resize 720x720 -gravity center -background "$BG_COLOR" -extent 1280x720 "$ANDROID_RES/drawable-land-xhdpi/splash.png"
magick "$SOURCE_SPLASH" -resize 960x960 -gravity center -background "$BG_COLOR" -extent 1600x960 "$ANDROID_RES/drawable-land-xxhdpi/splash.png"
magick "$SOURCE_SPLASH" -resize 1280x1280 -gravity center -background "$BG_COLOR" -extent 1920x1280 "$ANDROID_RES/drawable-land-xxxhdpi/splash.png"

# Base drawable splash
magick "$SOURCE_SPLASH" -resize 320x320 -gravity center -background "$BG_COLOR" -extent 480x320 "$ANDROID_RES/drawable/splash.png"

# Web assets
cp "$SOURCE_ICON" src/assets/icon/app-icon.png
magick "$SOURCE_ICON" -resize 512x512 src/assets/icon/app-icon-512.png
magick "$SOURCE_ICON" -resize 192x192 src/assets/icon/app-icon-192.png
magick "$SOURCE_ICON" -resize 32x32 src/assets/icon/favicon.png

echo "Branding switched to $VARIATION"
```

## Variation Descriptions

### Original

The default Diabetactic branding used before the rebrand.

### Variation 1: Calm Data Companion (ACTIVE)

A calming, approachable design focusing on glucose monitoring as a helpful companion. Teal/aqua color palette with soft gradients.

### Variation 2: Daily Life & Balance

Emphasizes daily wellness and balance in diabetes management. Lifestyle-oriented imagery.

### Variation 3: Smart Dashboard

Tech-forward design highlighting the data visualization and smart features. Modern, dashboard-inspired aesthetic.

## Requirements

- ImageMagick 7+ (`magick` command)
- Install on Linux: `sudo pacman -S imagemagick` or `sudo apt install imagemagick`

## After Switching

1. Clean the Android build: `npm run mobile:clean`
2. Rebuild: `npm run mobile:build`
