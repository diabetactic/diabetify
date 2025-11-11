# CSS Migration Quick Reference

**Fast lookup guide for common migration patterns**

---

## 🚀 Quick Start Commands

```bash
# 1. Setup Tailwind (MUST DO FIRST)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init

# 2. Analyze a page
./scripts/analyze-scss.sh src/app/profile/profile.page.scss

# 3. Start migration
# Edit HTML template with Tailwind classes
# Keep Ionic properties in SCSS

# 4. Test
npm run test
npm run build
npm run test:e2e

# 5. Visual regression
npm run test:visual
```

---

## 📋 Migration Checklist (Copy per Page)

```markdown
## [PAGE_NAME] Migration

- [ ] 1. Backup original SCSS
- [ ] 2. Analyze SCSS (run analyze-scss.sh)
- [ ] 3. Identify "keep in SCSS" items:
  - [ ] Ionic CSS properties (`--`)
  - [ ] Keyframe animations (`@keyframes`)
  - [ ] Complex pseudo-classes (`:focus-within`, etc.)
- [ ] 4. Migrate to Tailwind:
  - [ ] Layout (flex, grid, spacing)
  - [ ] Colors (text, background, borders)
  - [ ] Typography (size, weight, line-height)
  - [ ] Responsive (breakpoints)
  - [ ] Dark mode (`dark:` prefix)
- [ ] 5. Test light mode (Chrome DevTools)
- [ ] 6. Test dark mode (toggle theme)
- [ ] 7. Test responsive:
  - [ ] 320px (iPhone SE)
  - [ ] 768px (iPad)
  - [ ] 1024px (Desktop)
- [ ] 8. Test i18n:
  - [ ] English
  - [ ] Spanish
- [ ] 9. Run visual regression test
- [ ] 10. ESLint/Prettier check
- [ ] 11. Update documentation
- [ ] 12. Create PR
```

---

## 🎨 Tailwind Quick Reference

### Layout

| SCSS | Tailwind | Notes |
|------|----------|-------|
| `display: flex` | `flex` | |
| `flex-direction: column` | `flex-col` | |
| `flex-direction: row` | `flex-row` | Default |
| `align-items: center` | `items-center` | |
| `align-items: start` | `items-start` | |
| `justify-content: center` | `justify-center` | |
| `justify-content: space-between` | `justify-between` | |
| `gap: 16px` | `gap-4` | 4 = 1rem = 16px |
| `gap: 8px` | `gap-2` | |
| `gap: 24px` | `gap-6` | |
| `display: grid` | `grid` | |
| `grid-template-columns: 1fr 1fr` | `grid-cols-2` | |
| `position: relative` | `relative` | |
| `position: absolute` | `absolute` | |
| `position: sticky` | `sticky` | |

### Spacing

| SCSS | Tailwind | Pixels |
|------|----------|--------|
| `padding: 8px` | `p-2` | 8px |
| `padding: 12px` | `p-3` | 12px |
| `padding: 16px` | `p-4` | 16px |
| `padding: 24px` | `p-6` | 24px |
| `padding: 32px` | `p-8` | 32px |
| `padding-top: 16px` | `pt-4` | |
| `padding-bottom: 16px` | `pb-4` | |
| `padding-left: 16px` | `pl-4` | |
| `padding-right: 16px` | `pr-4` | |
| `padding: 16px 24px` | `py-4 px-6` | |
| `margin: 16px` | `m-4` | |
| `margin-bottom: 12px` | `mb-3` | |
| `margin-top: 24px` | `mt-6` | |

**Spacing Scale**: 0, 1(4px), 2(8px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 12(48px), 16(64px), 20(80px)

### Colors

| SCSS | Tailwind | Notes |
|------|----------|-------|
| `color: #666` | `text-gray-600` | |
| `color: #333` | `text-gray-800` | |
| `color: #000` | `text-black` | |
| `color: #fff` | `text-white` | |
| `background: #f5f5f5` | `bg-gray-100` | |
| `background: #e5e5e5` | `bg-gray-200` | |
| `background: #fff` | `bg-white` | |
| `border-color: #e0e0e0` | `border-gray-300` | |
| `color: var(--ion-color-primary)` | Keep in SCSS | Ionic variable |

**Ionic Colors**: Keep Ionic CSS variables in SCSS, don't migrate to Tailwind

### Typography

| SCSS | Tailwind | Pixels |
|------|----------|--------|
| `font-size: 12px` | `text-xs` | 12px |
| `font-size: 14px` | `text-sm` | 14px |
| `font-size: 16px` | `text-base` | 16px |
| `font-size: 18px` | `text-lg` | 18px |
| `font-size: 20px` | `text-xl` | 20px |
| `font-size: 24px` | `text-2xl` | 24px |
| `font-size: 30px` | `text-3xl` | 30px |
| `font-weight: 400` | `font-normal` | |
| `font-weight: 500` | `font-medium` | |
| `font-weight: 600` | `font-semibold` | |
| `font-weight: 700` | `font-bold` | |
| `text-align: center` | `text-center` | |
| `line-height: 1.5` | `leading-normal` | |

### Border & Radius

| SCSS | Tailwind | Pixels |
|------|----------|--------|
| `border: 1px solid` | `border` | |
| `border-width: 2px` | `border-2` | |
| `border-radius: 4px` | `rounded` | 4px |
| `border-radius: 8px` | `rounded-lg` | 8px |
| `border-radius: 12px` | `rounded-xl` | 12px |
| `border-radius: 16px` | `rounded-2xl` | 16px |
| `border-radius: 50%` | `rounded-full` | |

### Shadow

| SCSS | Tailwind | Description |
|------|----------|-------------|
| `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` | `shadow-sm` | Small |
| `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` | `shadow` | Default |
| `box-shadow: 0 10px 15px rgba(0,0,0,0.1)` | `shadow-md` | Medium |
| `box-shadow: 0 20px 25px rgba(0,0,0,0.1)` | `shadow-lg` | Large |
| `box-shadow: 0 25px 50px rgba(0,0,0,0.25)` | `shadow-2xl` | Extra large |

### Responsive

| SCSS | Tailwind | Breakpoint |
|------|----------|------------|
| `@media (min-width: 640px)` | `sm:` | 640px+ |
| `@media (min-width: 768px)` | `md:` | 768px+ |
| `@media (min-width: 1024px)` | `lg:` | 1024px+ |
| `@media (min-width: 1280px)` | `xl:` | 1280px+ |

**Example**: `<div class="text-base md:text-lg lg:text-xl">`

### Dark Mode

| SCSS | Tailwind | Notes |
|------|----------|-------|
| `.dark .card { color: #fff }` | `dark:text-white` | Add to same element |
| `.dark .card { background: #1a1a1a }` | `dark:bg-gray-900` | |

**Example**: `<div class="bg-white dark:bg-gray-900 text-black dark:text-white">`

---

## ⚠️ KEEP in SCSS (Do NOT Migrate)

### 1. Ionic CSS Properties

```scss
// ✅ KEEP - Ionic-specific
ion-button {
  --border-radius: 12px;
  --box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
  --background: var(--ion-color-primary);
  --color: white;
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
}

ion-segment-button {
  --indicator-color: var(--ion-color-primary);
  --color-checked: white;
}
```

### 2. Keyframe Animations

```scss
// ✅ KEEP - Can't be done in Tailwind
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-down {
  animation: fadeInDown 0.8s ease;
}
```

### 3. Complex Pseudo-Classes

```scss
// ✅ KEEP - Too complex for Tailwind
.form-item {
  &:focus-within {
    border-color: var(--ion-color-primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:not([disabled]):hover {
    transform: translateY(-2px);
  }
}
```

### 4. Nested Selectors with Ionic Components

```scss
// ✅ KEEP - Ionic nested styles
ion-item {
  ion-label {
    h2 {
      font-weight: 600;
      margin-bottom: 4px;
    }

    p {
      font-size: 12px;
      color: var(--ion-color-medium);
    }
  }
}
```

### 5. Pseudo-Elements

```scss
// ✅ KEEP - Pseudo-elements
.divider {
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.3);
  }
}
```

---

## ✅ MIGRATE to Tailwind

### Before (SCSS)
```scss
.profile-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 16px 32px;
  background: #f5f7f8;
}

.profile-hero {
  background: linear-gradient(135deg, #25aff4 0%, #4dc2f8 100%);
  border-radius: 20px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  color: #fff;
  box-shadow: 0 12px 24px rgba(37, 175, 244, 0.2);
}

.hero-greeting {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

@media (min-width: 768px) {
  .profile-container {
    padding: 32px 24px;
  }
}
```

### After (Tailwind + Minimal SCSS)

**HTML Template:**
```html
<div class="flex flex-col gap-4 p-6 pb-8 md:p-8 bg-gray-50 dark:bg-gray-900">
  <!-- profile-hero keeps gradient in SCSS -->
  <div class="profile-hero flex flex-col items-center text-center gap-3 text-white rounded-2xl p-8 shadow-lg">
    <h1 class="text-2xl font-bold m-0">{{ greeting }}</h1>
  </div>
</div>
```

**SCSS (minimal):**
```scss
// Only keep gradient (can't do in Tailwind easily)
.profile-hero {
  background: linear-gradient(135deg, #25aff4 0%, #4dc2f8 100%);
}
```

---

## 🔧 Common Patterns

### Pattern 1: Card with Hover
```html
<!-- Tailwind in HTML -->
<div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
  <h2 class="text-xl font-bold mb-2">Card Title</h2>
  <p class="text-gray-600 dark:text-gray-400">Card content</p>
</div>
```

### Pattern 2: Button with Icon
```html
<ion-button class="flex items-center gap-2 px-6 py-3 rounded-full font-bold">
  <ion-icon name="add"></ion-icon>
  <span>Add Reading</span>
</ion-button>

<!-- SCSS for Ionic properties -->
<style lang="scss">
ion-button {
  --border-radius: 9999px; // rounded-full
  --box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
```

### Pattern 3: Grid Layout
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="bg-white rounded-lg p-4 shadow">Item 1</div>
  <div class="bg-white rounded-lg p-4 shadow">Item 2</div>
  <div class="bg-white rounded-lg p-4 shadow">Item 3</div>
</div>
```

### Pattern 4: Sticky Header
```html
<div class="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b-2 border-primary px-4 py-3">
  <h2 class="text-lg font-semibold m-0">Date Header</h2>
</div>
```

### Pattern 5: Form Input
```html
<div class="form-item mb-4">
  <ion-label class="text-gray-600 dark:text-gray-400 font-medium">
    Email
  </ion-label>
  <ion-input type="email" class="text-base"></ion-input>
</div>

<!-- SCSS for Ionic properties -->
<style lang="scss">
.form-item {
  --background: transparent;
  --border-radius: 12px;

  border: 1px solid #e0e0e0;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:focus-within {
    border-color: var(--ion-color-primary);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
}
</style>
```

---

## 🧪 Testing Checklist

### Visual Testing
```bash
# 1. Light mode
- Open page in browser
- Check layout, colors, spacing
- Verify text is readable
- Check all interactive elements work

# 2. Dark mode
- Toggle theme switcher
- Check colors invert correctly
- Verify contrast is sufficient
- Check Ionic components adapt

# 3. Responsive
# 320px (iPhone SE)
- Check layout doesn't break
- Verify text wraps correctly
- Check buttons are tappable

# 768px (iPad)
- Check grid layouts adjust
- Verify spacing looks good
- Check multi-column layouts

# 1024px (Desktop)
- Check max-width constraints
- Verify larger text sizes
- Check desktop-specific layouts
```

### Functional Testing
```bash
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run visual regression
npm run test:visual

# Check bundle size
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/diabetify/stats.json
```

### Manual Testing
- [ ] Navigate to page
- [ ] Toggle dark mode
- [ ] Resize browser window (320px → 1920px)
- [ ] Test all interactive elements (buttons, forms, etc.)
- [ ] Switch language (English → Spanish)
- [ ] Check console for errors
- [ ] Test on real device (iOS/Android)

---

## 📊 Progress Tracking Template

```markdown
## [PAGE_NAME] - [DATE]

**Status**: 🟡 IN PROGRESS
**Started**: [TIME]
**Estimated Completion**: [TIME]
**Blocker**: None

### Completed
- [x] SCSS analysis
- [x] Layout migration
- [x] Color migration

### In Progress
- [ ] Typography migration (50%)

### TODO
- [ ] Dark mode testing
- [ ] Responsive testing
- [ ] Visual regression test

### Notes
- Kept gradient in SCSS (can't migrate)
- Changed grid from 2 to 3 columns on large screens
- Dark mode works great!

### Issues Found
- None yet

### Time Spent
- Analysis: 20min
- Migration: 1.5h
- Testing: (in progress)
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Tailwind classes not applying
**Symptom**: Classes in HTML but no styles
**Solution**:
1. Check `tailwind.config.js` has correct `content` paths
2. Restart dev server (`npm start`)
3. Clear Angular cache (`rm -rf .angular/cache`)

### Issue 2: Ionic components breaking
**Symptom**: Buttons/items look wrong
**Solution**:
- Keep Ionic CSS properties in SCSS
- Don't migrate `--` properties to Tailwind
- Example: `--border-radius`, `--background`, `--color`

### Issue 3: Dark mode not working
**Symptom**: `dark:` classes not applying
**Solution**:
1. Ensure `dark` class is on `<body>` or root element
2. Check Tailwind config has `darkMode: 'class'`
3. Use `dark:` prefix on every color class

### Issue 4: Gradients not working
**Symptom**: Solid colors instead of gradients
**Solution**:
- Keep gradients in SCSS (easier than Tailwind)
- Or use Tailwind gradient utilities:
  - `bg-gradient-to-r from-blue-500 to-purple-500`

### Issue 5: Animations not working
**Symptom**: No animation effects
**Solution**:
- Keep `@keyframes` in SCSS
- Apply animation classes from SCSS
- Tailwind has `animate-pulse`, `animate-spin`, etc. for simple cases

---

## 📝 Git Workflow

### Branch Naming
```bash
git checkout -b feat/css-migration-[PAGE_NAME]
# Examples:
git checkout -b feat/css-migration-welcome
git checkout -b feat/css-migration-profile
```

### Commit Messages
```bash
git commit -m "refactor(css): migrate [PAGE_NAME] to Tailwind"
git commit -m "refactor(css): migrate profile page layout to Tailwind"
git commit -m "refactor(css): migrate reading-item component to Tailwind"
```

### PR Template
```markdown
## CSS Migration: [PAGE_NAME]

### Changes
- Migrated layout to Tailwind (flex, spacing, etc.)
- Migrated colors to Tailwind utilities
- Migrated typography to Tailwind classes
- Kept Ionic properties in SCSS
- Kept animations in SCSS

### Testing
- [x] Light mode ✅
- [x] Dark mode ✅
- [x] Responsive (320px, 768px, 1024px) ✅
- [x] i18n (English, Spanish) ✅
- [x] Visual regression test ✅
- [x] Unit tests pass ✅

### Before/After Screenshots
[Attach screenshots]

### SCSS Reduction
- Before: [X] lines
- After: [Y] lines
- Reduction: [Z]% (-[X-Y] lines)

### Notes
- Gradient kept in SCSS (better than Tailwind approach)
- Focus-within state kept in SCSS (complex pseudo-class)

### Reviewer Checklist
- [ ] Code follows migration pattern
- [ ] No regressions in functionality
- [ ] Dark mode works
- [ ] Responsive works
- [ ] Tests pass
```

---

## 🎯 Quick Decision Tree

```
Is it an Ionic CSS property (--)?
├─ YES → Keep in SCSS
└─ NO → Continue

Is it a keyframe animation (@keyframes)?
├─ YES → Keep in SCSS
└─ NO → Continue

Is it a complex pseudo-class (:focus-within, :not(), etc.)?
├─ YES → Keep in SCSS
└─ NO → Continue

Is it a gradient (linear-gradient, radial-gradient)?
├─ YES → Keep in SCSS (unless simple)
└─ NO → Continue

Is it a pseudo-element (::before, ::after)?
├─ YES → Keep in SCSS
└─ NO → Continue

Is it layout, color, typography, spacing?
└─ YES → Migrate to Tailwind ✅
```

---

## 📚 Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Ionic + Tailwind Guide](https://ionicframework.com/docs/techniques/tailwind)
- [Tailwind Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- [Can I Use Tailwind? Checker](https://tailwind-caniuse.vercel.app/)

---

## 💡 Pro Tips

1. **Start with layout** - migrate `display`, `flex`, `grid` first
2. **Then colors** - text, background, borders
3. **Then typography** - font sizes, weights
4. **Last: responsive & dark mode** - add prefixes
5. **Keep SCSS minimal** - only Ionic properties and animations
6. **Test frequently** - after each section (layout, colors, etc.)
7. **Use DevTools** - Chrome/Firefox to inspect styles
8. **Compare before/after** - take screenshots
9. **Ask for help** - if stuck, escalate to team
10. **Celebrate wins** - each page migrated is progress!

---

**Last Updated**: 2025-11-11
**Version**: 1.0
