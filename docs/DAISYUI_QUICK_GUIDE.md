# DaisyUI Quick Integration Guide

## Overview

DaisyUI v5.4.7 has been integrated into Diabetify as a **content component library** complementing Ionic Angular. This guide provides quick reference for using DaisyUI alongside Ionic components.

---

## Component Philosophy

**Two-Library Approach:**
- **Ionic Angular**: Native mobile interactions (navigation, gestures, platform-specific UI)
- **DaisyUI**: Content components (badges, cards, alerts, stats, forms)

**Why both?**
- Ionic provides mobile-first components with native feel
- DaisyUI adds semantic HTML components with Tailwind utility classes
- Together they provide comprehensive UI toolkit for mobile and web

---

## Components Added

### 1. Badges

DaisyUI badges provide semantic status indicators with consistent styling.

```html
<!-- Basic badge -->
<div class="badge">Default</div>
<div class="badge badge-primary">Primary</div>
<div class="badge badge-secondary">Secondary</div>

<!-- Status badges -->
<div class="badge badge-success">Normal</div>
<div class="badge badge-warning">Low</div>
<div class="badge badge-error">High</div>

<!-- Outline badges -->
<div class="badge badge-outline">Outline</div>
<div class="badge badge-outline badge-primary">Primary Outline</div>

<!-- Sizes -->
<div class="badge badge-lg">Large</div>
<div class="badge badge-md">Medium</div>
<div class="badge badge-sm">Small</div>
<div class="badge badge-xs">Tiny</div>
```

**Use Cases:**
- Glucose status indicators (normal, low, high)
- Notification counts
- Tag labels
- Status indicators in lists

### 2. Cards

DaisyUI cards provide structured content containers.

```html
<!-- Basic card -->
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Card Title</h2>
    <p>Card content goes here</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Action</button>
    </div>
  </div>
</div>

<!-- Card with image -->
<div class="card bg-base-100 shadow-xl">
  <figure><img src="image.jpg" alt="Description" /></figure>
  <div class="card-body">
    <h2 class="card-title">Title</h2>
    <p>Description</p>
  </div>
</div>

<!-- Compact card -->
<div class="card card-compact bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Compact</h2>
    <p>Less padding</p>
  </div>
</div>

<!-- Card with side image -->
<div class="card card-side bg-base-100 shadow-xl">
  <figure><img src="image.jpg" alt="Description" /></figure>
  <div class="card-body">
    <h2 class="card-title">Side Image</h2>
    <p>Content</p>
  </div>
</div>
```

**Use Cases:**
- Appointment cards
- Reading detail cards
- Profile information sections
- Dashboard overview sections

### 3. Alerts

DaisyUI alerts provide contextual feedback messages.

```html
<!-- Info alert -->
<div role="alert" class="alert alert-info">
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 shrink-0 stroke-current">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
  <span>New information available</span>
</div>

<!-- Success alert -->
<div role="alert" class="alert alert-success">
  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span>Reading saved successfully</span>
</div>

<!-- Warning alert -->
<div role="alert" class="alert alert-warning">
  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
  <span>Low glucose detected</span>
</div>

<!-- Error alert -->
<div role="alert" class="alert alert-error">
  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span>Sync failed. Please try again.</span>
</div>
```

**Use Cases:**
- Sync status messages
- Form validation feedback
- Glucose alerts
- Network error notifications

### 4. Forms

DaisyUI form components provide accessible, styled inputs.

```html
<!-- Text input -->
<label class="form-control w-full max-w-xs">
  <div class="label">
    <span class="label-text">Email</span>
  </div>
  <input type="text" placeholder="email@example.com" class="input input-bordered w-full max-w-xs" />
  <div class="label">
    <span class="label-text-alt">Helper text</span>
  </div>
</label>

<!-- Select -->
<label class="form-control w-full max-w-xs">
  <div class="label">
    <span class="label-text">Pick your favorite</span>
  </div>
  <select class="select select-bordered">
    <option disabled selected>Choose one</option>
    <option>Option 1</option>
    <option>Option 2</option>
  </select>
</label>

<!-- Checkbox -->
<div class="form-control">
  <label class="label cursor-pointer">
    <span class="label-text">Remember me</span>
    <input type="checkbox" checked class="checkbox" />
  </label>
</div>

<!-- Radio buttons -->
<div class="form-control">
  <label class="label cursor-pointer">
    <span class="label-text">Option A</span>
    <input type="radio" name="radio" class="radio" checked />
  </label>
</div>

<!-- Toggle -->
<input type="checkbox" class="toggle" checked />
<input type="checkbox" class="toggle toggle-primary" checked />
<input type="checkbox" class="toggle toggle-success" checked />

<!-- Range slider -->
<input type="range" min="0" max="100" value="50" class="range" />
```

**Use Cases:**
- Settings forms
- Profile editing
- Reading input forms
- Filter controls

### 5. Stats

DaisyUI stats provide data visualization containers.

```html
<!-- Single stat -->
<div class="stats shadow">
  <div class="stat">
    <div class="stat-figure text-primary">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-8 w-8 stroke-current">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
      </svg>
    </div>
    <div class="stat-title">Total Readings</div>
    <div class="stat-value">125</div>
    <div class="stat-desc">Last 30 days</div>
  </div>
</div>

<!-- Multiple stats -->
<div class="stats shadow">
  <div class="stat">
    <div class="stat-title">Avg Glucose</div>
    <div class="stat-value">126</div>
    <div class="stat-desc">mg/dL</div>
  </div>
  <div class="stat">
    <div class="stat-title">Time in Range</div>
    <div class="stat-value">78%</div>
    <div class="stat-desc">Target: 70-180</div>
  </div>
  <div class="stat">
    <div class="stat-title">HbA1c</div>
    <div class="stat-value">6.5%</div>
    <div class="stat-desc">Goal: <7%</div>
  </div>
</div>

<!-- Vertical stats -->
<div class="stats stats-vertical shadow">
  <div class="stat">
    <div class="stat-title">Downloads</div>
    <div class="stat-value">31K</div>
  </div>
  <div class="stat">
    <div class="stat-title">Users</div>
    <div class="stat-value">4,200</div>
  </div>
</div>
```

**Use Cases:**
- Dashboard statistics
- Glucose metrics display
- Reading summaries
- Profile metrics

---

## Theme Toggle

### Implementation

DaisyUI themes are controlled via the `data-theme` attribute on the `<html>` element.

**Theme Service:**
```typescript
// src/app/core/services/theme.service.ts
export class ThemeService {
  setTheme(theme: 'light' | 'dark' | 'system'): void {
    const html = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }

    // Also set for Ionic dark mode
    if (theme === 'dark' || (theme === 'system' && prefersDark)) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}
```

**Usage in Components:**
```typescript
// Example: Profile page
export class ProfilePage {
  constructor(private themeService: ThemeService) {}

  onThemeChange(event: any): void {
    const theme = event.detail.value;
    this.themeService.setTheme(theme);
    localStorage.setItem('theme', theme);
  }
}
```

**HTML Template:**
```html
<ion-select
  interface="alert"
  [value]="currentTheme"
  (ionChange)="onThemeChange($event)"
>
  <ion-select-option value="light">Light</ion-select-option>
  <ion-select-option value="dark">Dark</ion-select-option>
  <ion-select-option value="system">System</ion-select-option>
</ion-select>
```

### Available Themes

DaisyUI v5 includes 32 themes out of the box. Configure in `tailwind.config.js`:

```javascript
module.exports = {
  daisyui: {
    themes: ['light', 'dark'], // Enable only needed themes
    // Or use all: themes: true,
    // Or custom themes: themes: [{ mytheme: {...} }]
  }
}
```

**Default themes used:**
- `light` - Clean light theme
- `dark` - Dark mode theme

---

## Ionic Integration

### Shadow DOM Considerations

**Important:** Ionic components use Shadow DOM, which isolates styles. DaisyUI classes work in:
- Light DOM (regular Angular templates)
- Slotted content inside Ionic components

**Example - Works:**
```html
<ion-content>
  <!-- DaisyUI works here (Light DOM) -->
  <div class="alert alert-info">
    <span>This works!</span>
  </div>
</ion-content>
```

**Example - Doesn't Work:**
```html
<!-- Cannot style Shadow DOM internals with DaisyUI -->
<ion-button class="btn btn-primary">
  Won't apply DaisyUI styles
</ion-button>
```

**Solution:**
Use Ionic components for Ionic elements, DaisyUI for content:
```html
<ion-button color="primary">
  <!-- Use Ionic styling -->
  Submit
</ion-button>

<div class="badge badge-success">
  <!-- Use DaisyUI for content components -->
  Saved
</div>
```

### Best Practices

1. **Navigation:** Use Ionic components
   ```html
   <ion-header>
     <ion-toolbar>
       <ion-title>Page Title</ion-title>
     </ion-toolbar>
   </ion-header>
   ```

2. **Content Cards:** Use DaisyUI
   ```html
   <div class="card bg-base-100 shadow-xl">
     <div class="card-body">
       <h2 class="card-title">Reading Details</h2>
       <p>Glucose: 126 mg/dL</p>
     </div>
   </div>
   ```

3. **Forms:** Mix both
   ```html
   <!-- Ionic form container -->
   <ion-list>
     <ion-item>
       <ion-label>Email</ion-label>
       <!-- DaisyUI input inside -->
       <input type="email" class="input input-bordered" />
     </ion-item>
   </ion-list>
   ```

4. **Buttons:** Use Ionic for actions, DaisyUI for decorative
   ```html
   <!-- Action button - Ionic -->
   <ion-button expand="block" (click)="save()">
     Save Reading
   </ion-button>

   <!-- Decorative badge - DaisyUI -->
   <div class="badge badge-success">Synced</div>
   ```

---

## Custom Utilities Kept

### Button Glow Effect

Custom utility for glowing buttons, works with both Ionic and DaisyUI:

```scss
// src/global.scss
.btn-glow {
  box-shadow: var(--shadow-glow-primary);
  @apply transition-all hover:scale-105 active:scale-95;
}
```

**Usage:**
```html
<ion-button class="btn-glow" color="primary">
  Glowing Button
</ion-button>

<button class="btn btn-primary btn-glow">
  DaisyUI Glow
</button>
```

### Card Utilities

Custom card styles for advanced use cases:

```scss
.card-elevated {
  @apply shadow-card rounded-2xl bg-white p-6 backdrop-blur-xl dark:bg-gray-900;
}

.card-gradient {
  background: var(--gradient-primary);
  @apply rounded-2xl p-6 text-white shadow-xl;
}

.card-glass {
  background: var(--color-glass-light);
  @apply rounded-2xl p-6 backdrop-blur-xl dark:bg-gray-900/95;
  border: 1px solid rgb(255 255 255 / 18%);
}
```

**Usage:**
```html
<!-- Elevated card -->
<div class="card-elevated">
  <h3>Elevated Card</h3>
  <p>Content with shadow</p>
</div>

<!-- Gradient card -->
<div class="card-gradient">
  <h3>Gradient Background</h3>
  <p>Beautiful colors</p>
</div>

<!-- Glass morphism -->
<div class="card-glass">
  <h3>Frosted Glass</h3>
  <p>Blurred background</p>
</div>
```

### Animation Utilities

Custom animations for enhanced UX:

```scss
.animate-fade-in { animation: fadeIn 0.6s ease-out; }
.animate-fade-in-down { animation: fadeInDown 0.8s ease-out; }
.animate-fade-in-up { animation: fadeInUp 0.8s ease-out; }
.animate-slide-up { animation: slideUp 0.5s ease-out; }
.animate-pulse-glow { animation: pulseGlow 2s infinite; }
.animate-shake { animation: shake 0.3s ease; }
```

**Usage:**
```html
<div class="alert alert-success animate-fade-in">
  Success message with fade-in
</div>

<div class="card animate-slide-up">
  Card slides up on load
</div>
```

---

## Bundle Impact

### Size Analysis

**Before DaisyUI:**
- Main bundle: ~280 KB
- Vendor bundle: ~1.2 MB

**After DaisyUI v5.4.7:**
- Main bundle: ~292 KB (+12 KB)
- Vendor bundle: ~1.2 MB (unchanged)
- Gzipped impact: **+12-15 KB**

### Performance Considerations

1. **Tree Shaking:** DaisyUI v5 uses CSS-only components, only used classes are included
2. **No JavaScript:** Components are pure CSS/HTML, no runtime overhead
3. **Minimal Impact:** Gzipped bundle increase is negligible (~15 KB)
4. **Mobile Performance:** No measurable impact on mobile load times

### Build Optimization

DaisyUI is automatically optimized in production builds:
```bash
npm run build
# Tailwind CSS automatically purges unused DaisyUI classes
```

---

## Rollback Procedure

If DaisyUI causes issues, follow these steps to remove it:

### 1. Remove Package

```bash
npm uninstall daisyui
```

### 2. Update Tailwind Config

Remove DaisyUI plugin from `tailwind.config.js`:

```javascript
// Before
module.exports = {
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
  }
}

// After
module.exports = {
  plugins: [],
  // Remove daisyui config
}
```

### 3. Update Global Styles

Remove DaisyUI import from `src/global.scss`:

```scss
// Before
@import 'tailwindcss';
@plugin "daisyui";

// After
@import 'tailwindcss';
// Remove @plugin "daisyui";
```

### 4. Update Component Templates

Replace DaisyUI classes with equivalent Ionic or Tailwind classes:

```html
<!-- Before (DaisyUI) -->
<div class="alert alert-success">
  <span>Success message</span>
</div>

<!-- After (Ionic) -->
<ion-card color="success">
  <ion-card-content>
    Success message
  </ion-card-content>
</ion-card>

<!-- Or (Tailwind) -->
<div class="rounded-lg bg-green-100 p-4 text-green-800">
  <span>Success message</span>
</div>
```

### 5. Test Application

```bash
# Clean build
npm run clean

# Run tests
npm run test:ci
npm run lint

# Development server
npm start
```

### 6. Verify Bundle Size

```bash
npm run build
# Check dist/ folder size
du -sh dist/
```

---

## Quick Reference

### When to Use DaisyUI

- Content badges and labels
- Card layouts for data display
- Alert/notification messages
- Form inputs and controls
- Statistical displays (stats component)

### When to Use Ionic

- Navigation (header, toolbar, tabs)
- Mobile gestures (swipe, pull-to-refresh)
- Native-feeling buttons and lists
- Modal dialogs and action sheets
- Platform-specific UI patterns

### Common Patterns

**Dashboard Card:**
```html
<ion-content>
  <div class="p-4">
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Glucose Stats</h2>
        <div class="stats stats-vertical">
          <div class="stat">
            <div class="stat-title">Average</div>
            <div class="stat-value">126</div>
            <div class="stat-desc">mg/dL</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</ion-content>
```

**Alert with Ionic:**
```html
<ion-content>
  <div class="p-4">
    <div role="alert" class="alert alert-warning">
      <svg><!-- icon --></svg>
      <span>Low glucose detected</span>
      <div>
        <ion-button size="small" (click)="handleAlert()">
          Action
        </ion-button>
      </div>
    </div>
  </div>
</ion-content>
```

---

## Further Reading

- [DaisyUI Documentation](https://daisyui.com/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/)
- [Ionic Framework Documentation](https://ionicframework.com/docs)
- [docs/CSS_MIGRATION_QUICK_REFERENCE.md](./CSS_MIGRATION_QUICK_REFERENCE.md) - Full CSS migration guide
- [docs/STYLING_GUIDE.md](./STYLING_GUIDE.md) - Project styling conventions

---

**Last Updated:** 2025-11-14
**DaisyUI Version:** 5.4.7
**Tailwind CSS Version:** 4.0.0-beta.2
