# Nanobanana Image Generation Prompts

## Welcome Screen - Hero Illustration

### Reference

- Current file: `src/assets/images/welcome-kids.png`
- Mobile screenshot: `.playwright-mcp/welcome-mobile.png` (375x812 iPhone dimensions)
- Desktop screenshot: `.playwright-mcp/welcome-subtle-pattern.png`

### Current Design

- Two superhero kids (boy and girl) holding hands
- Boy: Teal/turquoise suit with red cape, diabetes symbol on chest
- Girl: Pink suit with yellow cape, heart symbol on chest
- Standing pose, friendly and confident
- Contained in rounded rectangle card with light blue gradient background

### Nanobanana Prompt

```
Create a friendly, colorful illustration of two cartoon superhero children for a diabetes management app for kids.

Scene:
- Two kids holding hands, standing confidently side by side
- Both wearing superhero capes and suits
- Clean, modern cartoon style with smooth gradients
- Warm, welcoming expressions with big smiles

Boy character (left):
- Teal/turquoise superhero suit
- Red flowing cape
- Small medical cross or diabetes ribbon symbol on chest
- Brown curly/wavy hair
- Friendly brown eyes
- Superhero pose (hand on hip or slightly raised)

Girl character (right):
- Pink superhero suit with gradient
- Yellow flowing cape
- Heart symbol on chest
- Brown curly hair
- Warm brown eyes
- Matching superhero pose

Art style:
- Modern flat illustration with subtle gradients
- Rounded, friendly character design
- Soft shadows for depth
- Clean vector-style appearance
- Optimistic, empowering vibe for kids 6-12 years old
- No text or logos

Background:
- Transparent or subtle light gradient
- Keep focus on characters
- Should work on light blue background (#dff2ff to #f1f7ff gradient)

Image specs:
- Square format (1:1 ratio)
- High resolution (at least 1024x1024)
- PNG with transparency
- File size optimized for web
```

---

## Login Screen - App Icon/Logo

### Reference

- Current file: `src/assets/images/welcome-kids.png` (reused from welcome)
- Mobile screenshot: `.playwright-mcp/login-mobile.png` (375x812 iPhone dimensions)
- Desktop screenshot: `.playwright-mcp/login-screen.png`
- App icon: `src/assets/icon/app-icon.png`

### Current Design

- Same superhero kids illustration in smaller square card
- Rounded corners with subtle border
- Light gradient background
- Used as visual branding element

### Nanobanana Prompt

```
Create a square app icon/logo for Diabetactic, a diabetes management app for kids.

Design concept:
- Same two superhero children from welcome screen
- Simplified/tighter composition for smaller icon format
- Kids positioned closer together, maybe high-fiving or fist-bumping
- Emphasis on friendship, teamwork, confidence

Characters (simplified for icon):
- Boy: Teal suit, red cape, diabetes symbol
- Girl: Pink suit, yellow cape, heart symbol
- Both with friendly expressions and superhero poses

Art style for icon:
- Clean, recognizable at small sizes (down to 48x48px)
- Bold outlines for clarity
- Vibrant colors that pop
- Friendly, approachable design for kids
- Modern flat illustration style
- No small details that won't be visible when scaled down

Background:
- Solid color or very simple gradient
- Light blue (#e0f2fe) to white
- Or transparent with rounded square card effect
- Ensure good contrast with characters

Icon variations needed:
1. Square version (1024x1024) - for main app icon
2. Rounded rectangle version - for hero illustration
3. Foreground layer (Android adaptive icon) - centered on larger canvas

Technical specs:
- PNG format
- Transparent background preferred
- High resolution source (1024x1024 minimum)
- Should scale well from 48px to 512px
```

---

## Alternative Welcome Screen Concepts

### Option A: Single Hero Character

```
Create a friendly cartoon superhero child for Diabetactic diabetes app welcome screen.

Character:
- Gender-neutral or alternating boy/girl
- Age 8-10 years old appearance
- Superhero cape and suit (teal/blue with medical cross)
- Confident, welcoming pose with open arms or waving
- Big friendly smile
- Brown skin tone with curly hair (diverse representation)

Scene:
- Character floating/flying with cape flowing
- Surrounded by subtle positive elements:
  - Small star sparkles
  - Soft glow/aura effect
  - Energy radiating confidence
- Transparent background

Style: Modern flat illustration, vibrant but not overwhelming
Purpose: Welcome kids to their diabetes management journey
Mood: Empowering, friendly, approachable, optimistic
```

### Option B: Superhero Team

```
Create an inclusive group of 3-4 diverse cartoon superhero kids for diabetes management app.

Group composition:
- 3-4 kids of different ethnicities
- Mix of genders
- All wearing coordinated superhero suits in app colors:
  - Teal/turquoise
  - Pink/magenta
  - Yellow/orange
  - Purple/violet
- Each with unique cape color
- Standing together in confident team pose

Diversity requirements:
- Different skin tones (light, medium, dark brown)
- Various hair types (straight, wavy, curly, coily)
- Different hair colors (black, brown, blonde)
- Mix of body types (realistic representation)

Mood: Teamwork, support, community, strength in numbers
Message: "You're not alone in managing diabetes"
Style: Modern, inclusive, celebratory
Background: Transparent or light gradient
```

---

## Background Pattern (Already Updated in CSS)

### Current Status

Pattern opacity reduced from 40% → 8% (light mode) and 35% → 6% (dark mode)

Files:

- `src/assets/images/pattern-light.png` - tiny hearts and blood drops
- `src/assets/images/pattern-dark.png` - dark mode version

### If Regenerating Patterns

```
Create a subtle, barely-visible repeating pattern for kids diabetes app background.

Elements:
- Tiny simple icons in soft pastel colors:
  - Small hearts (love, care)
  - Blood drop icons (diabetes monitoring)
  - Star sparkles (achievement)
  - Optional: small medical cross symbols

Design:
- Very small icons (10-15px)
- Scattered/random placement (not in grid)
- Light pastel colors: soft pink, light blue, pale yellow
- Low contrast - should be BARELY visible
- Seamless tile (200x200px)

Usage:
- Will be set to 8% opacity for light mode
- Will be set to 6% opacity for dark mode
- Should not distract from main content
- Pattern should recede into background

Technical:
- PNG with transparency
- 200x200px tile size
- Optimized file size
```

---

## Usage Instructions

### For Gemini/Claude with Nanobanana

1. **Copy the appropriate prompt above**
2. **Add**: "Use nanobanana to generate this image"
3. **Include screenshot reference**:
   - Welcome: `.playwright-mcp/welcome-subtle-pattern.png`
   - Login: `.playwright-mcp/login-screen.png`
4. **Specify output location**: `src/assets/images/[filename].png`

### Example Command for Gemini

```
Use nanobanana to generate a new welcome screen hero illustration.

Reference mobile screenshot: .playwright-mcp/welcome-mobile.png
Current image: src/assets/images/welcome-kids.png

Prompt:
[Paste the "Welcome Screen - Hero Illustration" Nanobanana prompt from above]

Output specifications:
- Format: PNG with transparency
- Dimensions: 1024x1024 (square)
- Target display size: ~350px width on mobile
- Must work on light background (#dff2ff to #f1f7ff gradient)

Save output to: src/assets/images/welcome-kids-new.png
```

### Example Command for Login Icon

```
Use nanobanana to generate an app icon/logo for the login screen.

Reference mobile screenshot: .playwright-mcp/login-mobile.png
Current image: src/assets/images/welcome-kids.png

Prompt:
[Paste the "Login Screen - App Icon/Logo" Nanobanana prompt from above]

Output specifications:
- Format: PNG with transparency
- Dimensions: 1024x1024 (square, for adaptive icon processing)
- Must be recognizable at 192px (launcher icon size)
- Clean edges, works on any background color

Save output to: src/assets/icon/app-icon-new.png
```

### After Generation

1. Review generated image
2. If approved, replace current image:
   ```bash
   mv src/assets/images/welcome-kids-new.png src/assets/images/welcome-kids.png
   ```
3. Test on welcome and login screens
4. Check responsive behavior at different screen sizes
5. Verify image loads quickly (optimize if needed)

---

## Image Optimization

After generating with nanobanana, optimize images:

```bash
# Install imagemagick if needed
sudo apt install imagemagick

# Optimize PNG (reduce file size, maintain quality)
convert src/assets/images/welcome-kids.png -strip -quality 90 -resize 1024x1024 src/assets/images/welcome-kids.png

# Or use pngquant for better compression
pngquant --quality=80-95 src/assets/images/welcome-kids.png --output src/assets/images/welcome-kids.png --force
```
