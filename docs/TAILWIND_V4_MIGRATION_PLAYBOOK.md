# Tailwind v4 + DaisyUI Migration Playbook

## Executive Summary

This playbook provides comprehensive guidance for completing the Tailwind v4 + DaisyUI transition across the Diabetactic mobile application. With Login (47% reduction) and Dashboard (52% reduction) already migrated, this document establishes patterns, quality standards, and automation strategies for migrating the remaining components.

**Current State:**
- **Migrated:** Login, Dashboard, StatCard (full Tailwind)
- **Design System:** Gradients, shadows, semantic colors, spacing, animations
- **Utilities:** card-elevated, card-glass, btn-glow, glass-surface, gradient-surface
- **Dark Mode:** Class-based with `.dark` variant
- **Remaining:** 15+ pages and 20+ components (~3,400 lines of SCSS)

**Migration Priorities:**
1. **High Impact** (449 lines): appointment-create, profile, add-reading
2. **Medium Impact** (241-267 lines): readings, dashboard-detail, service-monitor
3. **Components** (136-215 lines): alert-banner, language-switcher, reading-item
4. **Low Impact** (<155 lines): settings, appointments, welcome, tabs

---

## Table of Contents

1. [Migration Patterns](#1-migration-patterns)
2. [Reusable Pattern Library](#2-reusable-pattern-library)
3. [Quality Standards](#3-quality-standards)
4. [Ionic Integration Rules](#4-ionic-integration-rules)
5. [Tools and Automation](#5-tools-and-automation)
6. [Component-by-Component Guide](#6-component-by-component-guide)
7. [Anti-Patterns](#7-anti-patterns)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Migration Patterns

### 1.1 Page Layout Pattern (Ionic + Tailwind)

**SCSS Before (241 lines):**
```scss
.profile-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 16px 32px;
}

.profile-hero {
  background: linear-gradient(135deg, var(--ion-color-primary, #25aff4) 0%, var(--ion-color-primary-tint, #4dc2f8) 100%);
  border-radius: 20px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  color: #fff;
  box-shadow: 0 12px 24px rgb(37 175 244 / 20%);
}
```

**Tailwind After (<50 lines):**
```html
<!-- Use semantic utilities + Tailwind -->
<div class="flex flex-col gap-4 p-6 pb-8">
  <!-- Hero section with gradient-surface -->
  <div class="gradient-surface rounded-[20px] p-8 flex flex-col items-center text-center gap-3 shadow-glow-primary">
    <!-- Content -->
  </div>
</div>
```

**SCSS After (only Ionic CSS properties):**
```scss
// ONLY Ionic CSS properties that MUST stay in SCSS
ion-content {
  --background: #f5f7f8; // Ionic CSS property
}

:host-context(.dark-theme) {
  ion-content {
    --background: #0f172a;
  }
}
```

**Savings:** ~80% reduction, 241 lines → ~50 lines

---

### 1.2 Component Card Pattern

**SCSS Before (449 lines - appointment-create):**
```scss
.doctor-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;

  ion-avatar {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }

  .doctor-info {
    flex: 1;

    h3 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 600;
    }
  }
}
```

**Tailwind After:**
```html
<!-- Use card-elevated utility + Tailwind -->
<ion-card class="card-elevated m-2 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
          [class.border-2]="selected" [class.border-primary]="selected">
  <ion-card-content class="flex gap-4">
    <ion-avatar class="w-16 h-16 shrink-0"></ion-avatar>
    <div class="flex-1">
      <h3 class="m-0 mb-1 text-lg font-semibold">{{ doctor.name }}</h3>
      <p class="text-sm text-primary font-medium m-0">{{ doctor.specialty }}</p>
    </div>
  </ion-card-content>
</ion-card>
```

**SCSS After (minimal):**
```scss
// Only complex pseudo-selectors and animations
ion-card.selected {
  &::after { // Pseudo-element needs SCSS
    content: '';
    position: absolute;
    inset: -2px;
    border: 2px solid var(--ion-color-primary);
    border-radius: inherit;
    pointer-events: none;
  }
}
```

---

### 1.3 Form Elements Pattern

**SCSS Before:**
```scss
.time-slots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;

  ion-chip {
    cursor: pointer;
    transition: all 0.2s ease;

    &.selected {
      background: var(--ion-color-primary);
      color: white;
    }

    &:not([disabled]):hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
    }
  }
}
```

**Tailwind After:**
```html
<div class="flex flex-wrap gap-2 mt-2">
  <ion-chip *ngFor="let slot of timeSlots"
            class="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
            [class.bg-primary]="slot.selected"
            [class.text-white]="slot.selected"
            [disabled]="slot.disabled">
    {{ slot.time }}
  </ion-chip>
</div>
```

---

### 1.4 Button and CTA Pattern

**SCSS Before:**
```scss
.footer-buttons {
  display: flex;
  gap: 8px;
  padding: 8px;

  ion-button {
    flex: 1;

    &[fill='outline'] {
      flex: 0 0 auto;
      min-width: 100px;
    }
  }
}
```

**Tailwind After:**
```html
<div class="flex gap-2 p-2">
  <ion-button class="flex-1 btn-glow" fill="solid" color="primary">
    Continue
  </ion-button>
  <ion-button class="shrink-0 min-w-[100px]" fill="outline" color="medium">
    Back
  </ion-button>
</div>
```

---

### 1.5 List and Grid Pattern

**SCSS Before:**
```scss
.readings-list {
  padding-bottom: 80px;

  .reading-group {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}
```

**Tailwind After:**
```html
<div class="pb-20"> <!-- 80px = 20 * 4px -->
  <div *ngFor="let group of readingGroups; last as isLast"
       [class.mb-6]="!isLast">
    <!-- Group content -->
  </div>
</div>
```

---

### 1.6 Modal and Overlay Pattern

**SCSS Before:**
```scss
.confirmation-card {
  .confirmation-section {
    padding: 16px 0;

    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}
```

**Tailwind After:**
```html
<ion-card class="card-elevated">
  <div class="py-4">
    <h3 class="flex items-center gap-2 m-0 mb-3 text-sm font-semibold text-medium uppercase tracking-wide">
      <ion-icon name="checkmark-circle"></ion-icon>
      Confirmation
    </h3>
    <!-- Content -->
  </div>
</ion-card>
```

---

## 2. Reusable Pattern Library

### 2.1 Layout Patterns

```html
<!-- Full-width container with max-width -->
<div class="max-w-4xl mx-auto px-4 py-6">
  <!-- Content -->
</div>

<!-- Flex column with gap -->
<div class="flex flex-col gap-4">
  <!-- Items -->
</div>

<!-- Grid responsive -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Cards -->
</div>

<!-- Centered content -->
<div class="flex items-center justify-center min-h-[300px] p-8">
  <!-- Loading/Empty state -->
</div>
```

---

### 2.2 Card Patterns

```html
<!-- Elevated card (most common) -->
<ion-card class="card-elevated m-4 animate-fade-in-up">
  <ion-card-content class="p-6">
    <!-- Content -->
  </ion-card-content>
</ion-card>

<!-- Glass morphism card -->
<div class="card-glass p-6 animate-slide-up">
  <!-- Content -->
</div>

<!-- Gradient card (for stats/hero) -->
<div class="gradient-surface rounded-2xl p-8 text-white shadow-glow-primary">
  <!-- Content -->
</div>

<!-- Clickable card with hover -->
<ion-card class="card-elevated cursor-pointer transition-all hover:-translate-y-1 hover:shadow-elevated active:translate-y-0"
          (click)="onCardClick()">
  <ion-ripple-effect></ion-ripple-effect>
  <!-- Content -->
</ion-card>
```

---

### 2.3 Button Patterns

```html
<!-- Primary CTA with glow -->
<ion-button class="btn-glow font-semibold" color="primary" expand="block">
  Continue
</ion-button>

<!-- Outline button -->
<ion-button fill="outline" color="medium" class="transition-all hover:bg-medium/10">
  Cancel
</ion-button>

<!-- Icon button -->
<ion-button fill="clear" size="small" class="transition-transform active:scale-95">
  <ion-icon slot="icon-only" name="close"></ion-icon>
</ion-button>

<!-- Gradient button (custom) -->
<button class="gradient-surface px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95">
  Get Started
</button>
```

---

### 2.4 Form Element Patterns

```html
<!-- Input with label -->
<ion-item class="rounded-xl mb-4 shadow-sm">
  <ion-label position="stacked" class="text-sm font-medium text-dark mb-2">
    Full Name
  </ion-label>
  <ion-input class="mt-2" placeholder="Enter your name"></ion-input>
</ion-item>

<!-- Select -->
<ion-item class="rounded-xl shadow-sm">
  <ion-label position="stacked" class="text-sm font-medium text-dark mb-2">
    Language
  </ion-label>
  <ion-select interface="popover" class="mt-2">
    <ion-select-option value="en">English</ion-select-option>
    <ion-select-option value="es">Español</ion-select-option>
  </ion-select>
</ion-item>

<!-- Chip selection (multi-select) -->
<div class="flex flex-wrap gap-2">
  <ion-chip *ngFor="let option of options"
            class="cursor-pointer transition-all hover:-translate-y-0.5"
            [class.bg-primary]="option.selected"
            [class.text-white]="option.selected"
            (click)="toggleOption(option)">
    <ion-label>{{ option.label }}</ion-label>
  </ion-chip>
</div>

<!-- Date/Time picker -->
<ion-datetime-button class="w-full"></ion-datetime-button>
<ion-modal [keepContentsMounted]="true">
  <ng-template>
    <ion-datetime class="rounded-2xl"></ion-datetime>
  </ng-template>
</ion-modal>
```

---

### 2.5 List Patterns

```html
<!-- Simple list -->
<ion-list class="rounded-2xl overflow-hidden">
  <ion-item *ngFor="let item of items" class="hover:bg-light/50 transition-colors">
    <ion-label>{{ item.name }}</ion-label>
  </ion-item>
</ion-list>

<!-- List with icons -->
<ion-list class="bg-transparent">
  <ion-item *ngFor="let item of items" lines="none" class="mb-2 rounded-xl shadow-sm">
    <ion-icon slot="start" [name]="item.icon" class="text-primary"></ion-icon>
    <ion-label class="font-medium">{{ item.label }}</ion-label>
    <ion-icon slot="end" name="chevron-forward" class="text-medium"></ion-icon>
  </ion-item>
</ion-list>

<!-- Grid of cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
  <ion-card *ngFor="let item of items" class="card-elevated m-0 hover:-translate-y-1 transition-all">
    <ion-card-content class="p-4">
      <!-- Card content -->
    </ion-card-content>
  </ion-card>
</div>
```

---

### 2.6 State Patterns

```html
<!-- Loading state -->
<div class="flex flex-col items-center justify-center gap-4 min-h-[300px] p-8">
  <ion-spinner color="primary"></ion-spinner>
  <p class="text-medium text-sm m-0">Loading data...</p>
</div>

<!-- Empty state -->
<div class="flex flex-col items-center justify-center gap-4 min-h-[400px] p-8 text-center">
  <ion-icon name="documents-outline" class="text-6xl text-medium/50"></ion-icon>
  <h3 class="text-lg font-semibold text-dark m-0">No readings yet</h3>
  <p class="text-sm text-medium m-0 max-w-xs">Start tracking your glucose readings</p>
  <ion-button color="primary" class="btn-glow mt-4">
    Add Reading
  </ion-button>
</div>

<!-- Error state -->
<div class="card-elevated p-6 border-2 border-danger ring-4 ring-danger/10 animate-shake">
  <div class="flex items-center gap-3">
    <span class="material-symbols-outlined text-danger text-3xl">error_outline</span>
    <div class="flex-1">
      <h4 class="text-danger font-semibold m-0 mb-1">Unable to load</h4>
      <p class="text-sm text-medium m-0">Please try again</p>
    </div>
    <ion-button fill="outline" color="danger" size="small" (click)="retry()">
      Retry
    </ion-button>
  </div>
</div>
```

---

### 2.7 Animation Patterns

```html
<!-- Fade in on mount -->
<div class="animate-fade-in">
  <!-- Content -->
</div>

<!-- Slide up on mount -->
<div class="animate-slide-up">
  <!-- Content -->
</div>

<!-- Fade in down (hero sections) -->
<div class="animate-fade-in-down">
  <!-- Hero content -->
</div>

<!-- Staggered list animations (use ngFor index) -->
<div *ngFor="let item of items; index as i"
     class="animate-fade-in-up"
     [style.animation-delay]="(i * 100) + 'ms'">
  <!-- Item -->
</div>

<!-- Pulse glow for critical states -->
<div class="animate-pulse-glow">
  <!-- Critical content -->
</div>

<!-- Shake for errors -->
<div class="animate-shake" *ngIf="hasError">
  <!-- Error message -->
</div>
```

---

## 3. Quality Standards

### 3.1 Arbitrary Value Limits

**RULE:** Maximum 3 arbitrary values per component.

**Good:**
```html
<!-- 2 arbitrary values: min-h, rounded-[20px] -->
<div class="min-h-[160px] rounded-[20px] p-6 bg-white shadow-card">
  <!-- Content -->
</div>
```

**Bad:**
```html
<!-- 7 arbitrary values - should extract to utility -->
<div class="min-h-[182px] rounded-[23px] p-[19px] mt-[13px] mb-[27px] ml-[11px] mr-[9px]">
  <!-- Content -->
</div>
```

**When you hit the limit:**
1. Check if value exists in design tokens (spacing, radius, colors)
2. Round to nearest standard value (16px → 1rem → p-4)
3. Create semantic utility in `global.scss` if used 3+ times

---

### 3.2 Semantic Utility Usage

**TARGET:** 60% semantic utilities, 40% inline Tailwind

**Good balance:**
```html
<!-- 60% semantic: card-elevated, btn-glow, animate-fade-in -->
<!-- 40% inline: flex, gap-4, p-6 -->
<div class="card-elevated animate-fade-in">
  <div class="flex gap-4 p-6">
    <ion-button class="btn-glow">Click me</ion-button>
  </div>
</div>
```

**When to create new utilities:**
- Used in 3+ components
- Complex multi-property pattern
- Brand-specific styling (gradients, shadows)
- Animation sequences

**Examples of good semantic utilities:**
```scss
// global.scss
@layer components {
  .hero-section {
    @apply gradient-surface rounded-2xl p-8 text-white shadow-glow-primary animate-fade-in-down;
  }

  .stat-grid {
    @apply grid grid-cols-1 md:grid-cols-3 gap-4 p-4;
  }

  .form-field {
    @apply rounded-xl mb-4 shadow-sm;
  }
}
```

---

### 3.3 Dark Mode Coverage

**REQUIREMENT:** 100% dark mode coverage for all components

**Implementation:**
```html
<!-- Use Tailwind dark: variant -->
<div class="bg-white dark:bg-gray-900 text-dark dark:text-white">
  <!-- Content -->
</div>

<!-- Or use semantic utilities that handle dark mode -->
<div class="card-elevated"> <!-- Already has dark mode -->
  <!-- Content -->
</div>
```

**Dark mode checklist per component:**
- [ ] Background colors
- [ ] Text colors
- [ ] Border colors
- [ ] Shadow adjustments
- [ ] Icon colors
- [ ] Hover/focus states
- [ ] Custom CSS properties

**Testing:**
```typescript
// Component test
it('should apply dark mode classes', () => {
  document.documentElement.classList.add('dark');
  fixture.detectChanges();
  const element = fixture.nativeElement.querySelector('.card');
  expect(element.classList.contains('dark:bg-gray-900')).toBeTruthy();
});
```

---

### 3.4 When to Create New Utilities

**Create new utility if:**
1. ✅ Used in 3+ components
2. ✅ Complex multi-property pattern
3. ✅ Brand-specific (gradients, shadows, colors)
4. ✅ Animation sequences

**Keep inline if:**
1. ❌ Used only once or twice
2. ❌ Simple single property (p-4, text-lg)
3. ❌ Contextual styling (hover states)
4. ❌ Dynamic values from props

**Examples:**

**Good candidates for utilities:**
```scss
// Used in 8 components
.doctor-card {
  @apply card-elevated flex items-start gap-4 p-4 hover:-translate-y-0.5 transition-all;
}

// Complex animation sequence
.appointment-item-enter {
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Keep inline:**
```html
<!-- Simple layout - no need for utility -->
<div class="flex gap-2 p-4">
  <!-- Content -->
</div>

<!-- Contextual hover state -->
<button class="hover:bg-primary/10">
  Click
</button>
```

---

## 4. Ionic Integration Rules

### 4.1 Ionic CSS Properties (MUST stay in SCSS)

**These MUST be in SCSS files:**

```scss
// ✅ CORRECT: Ionic CSS properties in SCSS
ion-content {
  --background: #f5f7f8;
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-header {
  --background: var(--ion-color-primary);
  --color: white;
}

ion-toolbar {
  --background: transparent;
  --border-width: 0;
}

ion-button {
  --border-radius: 12px;
  --box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
}

ion-item {
  --background: white;
  --border-color: var(--ion-color-light-shade);
  --padding-start: 16px;
  --inner-padding-end: 16px;
}

ion-fab-button {
  --background: var(--ion-color-primary);
  --box-shadow: 0 4px 12px rgb(37 175 244 / 30%);
}
```

**These can be Tailwind classes:**
```html
<!-- ✅ CORRECT: Standard CSS properties in HTML -->
<ion-card class="rounded-2xl p-6 bg-white shadow-card">
  <ion-card-content class="flex flex-col gap-4">
    <!-- Content -->
  </ion-card-content>
</ion-card>
```

---

### 4.2 Complex States and Pseudo-Selectors

**Keep in SCSS:**

```scss
// ✅ Complex pseudo-selectors
.step-indicator {
  .step {
    &.active {
      .step-number {
        background: var(--ion-color-primary);
        color: white;
      }
    }

    &.completed {
      .step-number {
        background: var(--ion-color-success);

        &::after {
          content: '✓';
          position: absolute;
        }
      }
    }
  }
}

// ✅ Focus-within with child selectors
.form-group:focus-within {
  .label {
    color: var(--ion-color-primary);
    transform: translateY(-4px);
  }

  .input-border {
    border-color: var(--ion-color-primary);
  }
}

// ✅ Hover with complex transforms
.card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 32px rgb(0 0 0 / 15%);

  .card-icon {
    transform: rotate(360deg);
  }
}
```

**Use Tailwind for simple states:**
```html
<!-- ✅ Simple hover/focus -->
<button class="hover:bg-primary/10 focus:ring-2 focus:ring-primary active:scale-95">
  Click
</button>
```

---

### 4.3 Pseudo-Elements (::before, ::after)

**Always use SCSS for pseudo-elements:**

```scss
// ✅ Decorative pseudo-elements
.doctor-card.selected::after {
  content: '';
  position: absolute;
  inset: -2px;
  border: 2px solid var(--ion-color-primary);
  border-radius: inherit;
  pointer-events: none;
}

// ✅ Icon insertion
.step-completed::before {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
}

// ✅ Gradient overlays
.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent, rgb(0 0 0 / 40%));
  pointer-events: none;
}
```

---

### 4.4 Animations Requiring @keyframes

**Use SCSS for custom keyframe animations:**

```scss
// ✅ Custom animation sequence
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }

  50% {
    opacity: 0.5;
    transform: translateX(-5px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.appointment-item-enter {
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// ✅ Complex multi-property animation
@keyframes pulseGlowDanger {
  0%, 100% {
    box-shadow: 0 0 20px rgb(239 68 68 / 30%);
    transform: scale(1);
  }

  50% {
    box-shadow: 0 0 40px rgb(239 68 68 / 60%);
    transform: scale(1.05);
  }
}
```

**Use Tailwind for simple animations:**
```html
<!-- ✅ Simple built-in animations -->
<div class="animate-fade-in animate-slide-up animate-pulse-glow">
  <!-- Content -->
</div>
```

---

### 4.5 Shadow DOM Styling

**Use ::ng-deep sparingly and document:**

```scss
// ✅ Shadow DOM penetration (document why)
ion-modal {
  // REASON: Ionic modal uses Shadow DOM, can't style with classes
  ::ng-deep {
    .modal-wrapper {
      border-radius: 20px;
      overflow: hidden;
    }
  }
}

ion-datetime {
  // REASON: Datetime picker is in Shadow DOM
  ::ng-deep {
    .calendar-day.calendar-day-active {
      background: var(--ion-color-primary);
      color: white;
    }
  }
}
```

**Prefer CSS custom properties when possible:**
```html
<!-- ✅ BETTER: Use CSS properties instead of ::ng-deep -->
<ion-modal [style.--border-radius]="'20px'">
  <!-- Content -->
</ion-modal>
```

---

## 5. Tools and Automation

### 5.1 CSS Linter Rules

**Create `.stylelintrc.json`:**

```json
{
  "extends": ["stylelint-config-standard-scss", "stylelint-config-tailwindcss/scss"],
  "plugins": ["stylelint-scss"],
  "rules": {
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["tailwind", "apply", "layer", "theme"]
      }
    ],
    "scss/at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["tailwind", "apply", "layer", "theme"]
      }
    ],
    "max-nesting-depth": 3,
    "selector-max-specificity": "0,4,0",
    "declaration-no-important": true,
    "selector-class-pattern": "^([a-z][a-z0-9]*)(-[a-z0-9]+)*$",
    "custom-property-pattern": "^([a-z][a-z0-9]*)(-[a-z0-9]+)*$"
  }
}
```

**Add to `package.json`:**
```json
{
  "scripts": {
    "lint:css": "stylelint 'src/**/*.scss' --fix",
    "lint:css:check": "stylelint 'src/**/*.scss'"
  },
  "devDependencies": {
    "stylelint": "^15.10.0",
    "stylelint-config-standard-scss": "^11.0.0",
    "stylelint-config-tailwindcss": "^0.0.7",
    "stylelint-scss": "^5.1.0"
  }
}
```

---

### 5.2 Migration Scripts

**Script 1: Analyze SCSS file for migration candidates**

**Create `scripts/analyze-scss.js`:**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function analyzeScss(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const analysis = {
    file: filePath,
    totalLines: lines.length,
    patterns: {
      ionicVars: (content.match(/--ion-[a-z-]+:/g) || []).length,
      flexLayouts: (content.match(/display:\s*flex;/g) || []).length,
      gridLayouts: (content.match(/display:\s*grid;/g) || []).length,
      spacing: (content.match(/padding:|margin:/g) || []).length,
      colors: (content.match(/color:|background:/g) || []).length,
      shadows: (content.match(/box-shadow:/g) || []).length,
      borders: (content.match(/border(-radius)?:/g) || []).length,
      transitions: (content.match(/transition:/g) || []).length,
      pseudoElements: (content.match(/::before|::after/g) || []).length,
      pseudoSelectors: (content.match(/:hover|:focus|:active/g) || []).length,
      keyframes: (content.match(/@keyframes/g) || []).length,
    },
    migrationScore: 0,
  };

  // Calculate migration score (0-100)
  const ionicVarWeight = -10; // Keep in SCSS
  const layoutWeight = 5; // Easy to migrate
  const spacingWeight = 5; // Easy to migrate
  const colorWeight = 3; // Medium difficulty
  const shadowWeight = 4; // Use semantic utilities
  const pseudoWeight = -5; // Keep in SCSS
  const keyframesWeight = -10; // Keep in SCSS

  analysis.migrationScore = Math.max(0, Math.min(100,
    50 + // Base score
    (analysis.patterns.flexLayouts * layoutWeight) +
    (analysis.patterns.gridLayouts * layoutWeight) +
    (analysis.patterns.spacing * spacingWeight) +
    (analysis.patterns.colors * colorWeight) +
    (analysis.patterns.shadows * shadowWeight) +
    (analysis.patterns.ionicVars * ionicVarWeight) +
    (analysis.patterns.pseudoElements * pseudoWeight) +
    (analysis.patterns.keyframes * keyframesWeight)
  ));

  analysis.recommendation =
    analysis.migrationScore > 70 ? 'HIGH PRIORITY - Easy migration' :
    analysis.migrationScore > 40 ? 'MEDIUM - Some complexity' :
    'LOW - Complex patterns, migrate carefully';

  return analysis;
}

// Usage: node scripts/analyze-scss.js src/app/profile/profile.page.scss
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node analyze-scss.js <path-to-scss-file>');
  process.exit(1);
}

const analysis = analyzeScss(filePath);
console.log(JSON.stringify(analysis, null, 2));
```

**Run analysis:**
```bash
# Analyze single file
node scripts/analyze-scss.js src/app/profile/profile.page.scss

# Analyze all files
find src/app -name "*.scss" -exec node scripts/analyze-scss.js {} \; > migration-analysis.json
```

---

**Script 2: Generate migration report**

**Create `scripts/migration-report.js`:**

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function generateReport() {
  const scssFiles = await glob('src/app/**/*.scss');
  const analyses = scssFiles.map(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n').length;
    const ionicVars = (content.match(/--ion-[a-z-]+:/g) || []).length;
    const tailwindClasses = (content.match(/@apply/g) || []).length;

    return {
      file: path.relative(process.cwd(), file),
      lines,
      ionicVars,
      tailwindClasses,
      status: tailwindClasses > 0 ? 'MIGRATING' : 'NOT STARTED',
      priority: lines > 300 ? 'HIGH' : lines > 150 ? 'MEDIUM' : 'LOW',
    };
  });

  // Sort by priority and line count
  analyses.sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority] || b.lines - a.lines;
  });

  // Generate markdown report
  const report = `
# Tailwind v4 Migration Report

**Generated:** ${new Date().toISOString()}

## Summary

- **Total Files:** ${analyses.length}
- **Total Lines:** ${analyses.reduce((sum, a) => sum + a.lines, 0)}
- **Not Started:** ${analyses.filter(a => a.status === 'NOT STARTED').length}
- **In Progress:** ${analyses.filter(a => a.status === 'MIGRATING').length}

## Priority Files

### High Priority (>300 lines)

${analyses.filter(a => a.priority === 'HIGH').map(a =>
  `- [ ] \`${a.file}\` (${a.lines} lines, ${a.ionicVars} Ionic vars)`
).join('\n')}

### Medium Priority (150-300 lines)

${analyses.filter(a => a.priority === 'MEDIUM').map(a =>
  `- [ ] \`${a.file}\` (${a.lines} lines, ${a.ionicVars} Ionic vars)`
).join('\n')}

### Low Priority (<150 lines)

${analyses.filter(a => a.priority === 'LOW').map(a =>
  `- [ ] \`${a.file}\` (${a.lines} lines, ${a.ionicVars} Ionic vars)`
).join('\n')}
`;

  fs.writeFileSync('docs/MIGRATION_REPORT.md', report);
  console.log('Report generated: docs/MIGRATION_REPORT.md');
}

generateReport();
```

**Run report:**
```bash
node scripts/migration-report.js
```

---

### 5.3 Testing Strategy

**5.3.1 Visual Regression Testing**

**Install Percy (visual regression testing):**

```bash
npm install --save-dev @percy/cli @percy/playwright
```

**Add to `playwright.config.ts`:**

```typescript
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  use: {
    baseURL: 'http://localhost:4200',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'light',
      },
    },
    {
      name: 'chromium-dark',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
  ],
};

export default config;
```

**Create visual regression tests:**

**`playwright/tests/visual-regression.spec.ts`:**

```typescript
import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Visual Regression Tests', () => {
  test('Login page - light mode', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Login Page - Light');
  });

  test('Login page - dark mode', async ({ page, context }) => {
    await context.addInitScript(() => {
      document.documentElement.classList.add('dark');
    });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Login Page - Dark');
  });

  test('Dashboard - light mode', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Dashboard - Light');
  });

  test('Profile page - light mode', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Profile Page - Light');
  });
});
```

**Run visual tests:**
```bash
# Set Percy token
export PERCY_TOKEN=your-token-here

# Run tests
npx percy exec -- npx playwright test visual-regression.spec.ts
```

---

**5.3.2 Component Testing (Tailwind class validation)**

**Create `src/app/tests/helpers/tailwind-test-utils.ts`:**

```typescript
import { DebugElement } from '@angular/core';

export class TailwindTestUtils {
  /**
   * Assert element has Tailwind classes
   */
  static expectHasClasses(element: DebugElement, classes: string[]) {
    const classList = Array.from(element.nativeElement.classList);
    classes.forEach(cls => {
      expect(classList).toContain(cls);
    });
  }

  /**
   * Assert element does NOT have arbitrary values (except allowed)
   */
  static expectNoArbitraryValues(element: DebugElement, allowedCount: number = 3) {
    const classList = Array.from(element.nativeElement.classList) as string[];
    const arbitraryClasses = classList.filter(cls => cls.includes('[') && cls.includes(']'));
    expect(arbitraryClasses.length).toBeLessThanOrEqual(allowedCount);
  }

  /**
   * Assert dark mode classes exist
   */
  static expectDarkModeSupport(element: DebugElement) {
    const classList = Array.from(element.nativeElement.classList) as string[];
    const hasDarkMode = classList.some(cls => cls.startsWith('dark:'));
    expect(hasDarkMode).toBeTruthy();
  }

  /**
   * Assert semantic utility usage
   */
  static expectSemanticUtilities(element: DebugElement, semanticClasses: string[]) {
    const classList = Array.from(element.nativeElement.classList);
    const hasSemanticClasses = semanticClasses.some(cls => classList.includes(cls));
    expect(hasSemanticClasses).toBeTruthy();
  }
}
```

**Example component test:**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilePage } from './profile.page';
import { TailwindTestUtils } from '../tests/helpers/tailwind-test-utils';

describe('ProfilePage - Tailwind Migration', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should use semantic utilities for cards', () => {
    const heroCard = fixture.debugElement.nativeElement.querySelector('.profile-hero');
    TailwindTestUtils.expectSemanticUtilities(heroCard, ['gradient-surface']);
  });

  it('should have dark mode support', () => {
    const overviewCards = fixture.debugElement.nativeElement.querySelectorAll('.overview-card');
    overviewCards.forEach((card: DebugElement) => {
      TailwindTestUtils.expectDarkModeSupport(card);
    });
  });

  it('should limit arbitrary values', () => {
    const container = fixture.debugElement.nativeElement.querySelector('.profile-container');
    TailwindTestUtils.expectNoArbitraryValues(container, 3);
  });

  it('should use Tailwind layout classes', () => {
    const grid = fixture.debugElement.nativeElement.querySelector('.overview-grid');
    TailwindTestUtils.expectHasClasses(grid, ['grid', 'gap-4']);
  });
});
```

---

**5.3.3 Accessibility Testing**

**Install axe-core:**

```bash
npm install --save-dev @axe-core/playwright
```

**Create accessibility tests:**

**`playwright/tests/accessibility.spec.ts`:**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests - Post Migration', () => {
  test('Profile page should have no accessibility violations', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Dark mode should maintain accessibility', async ({ page, context }) => {
    await context.addInitScript(() => {
      document.documentElement.classList.add('dark');
    });
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Touch targets should be 44x44px minimum', async ({ page }) => {
    await page.goto('/profile');

    const buttons = await page.locator('ion-button').all();
    for (const button of buttons) {
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
```

---

### 5.4 Pre-commit Hooks

**Install husky and lint-staged:**

```bash
npm install --save-dev husky lint-staged
npx husky install
```

**Add to `package.json`:**

```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.scss": [
      "stylelint --fix",
      "git add"
    ],
    "*.html": [
      "prettier --write",
      "git add"
    ],
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

**Create `.husky/pre-commit`:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged

# Run visual regression tests if Percy token exists
if [ -n "$PERCY_TOKEN" ]; then
  echo "Running visual regression tests..."
  npx percy exec -- npx playwright test visual-regression.spec.ts
fi
```

---

## 6. Component-by-Component Guide

### 6.1 High Priority (449 lines - appointment-create)

**Migration strategy:**
1. **Step indicator** → Use Tailwind flex + semantic utilities
2. **Doctor cards** → Use `card-elevated` + Tailwind grid
3. **Time slots** → Use Tailwind flex-wrap + chips
4. **Form elements** → Keep Ionic CSS properties, style with Tailwind
5. **Animations** → Use existing animations (slideIn, fadeIn)

**Estimated reduction:** 449 lines → ~80 lines (82% reduction)

**Key patterns:**
```html
<!-- Step indicator -->
<div class="flex items-center justify-between max-w-[600px] mx-auto p-3">
  <div class="flex flex-col items-center gap-1"
       [class.text-primary]="step.active">
    <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
          [class.bg-primary]="step.active"
          [class.text-white]="step.active"
          [class.bg-light-shade]="!step.active">
      {{ step.number }}
    </span>
    <span class="text-xs font-medium">{{ step.label }}</span>
  </div>
</div>

<!-- Doctor card -->
<ion-card class="card-elevated m-2 cursor-pointer transition-all hover:-translate-y-0.5"
          [class.border-2]="doctor.selected"
          [class.border-primary]="doctor.selected">
  <ion-card-content class="flex gap-4">
    <ion-avatar class="w-16 h-16 shrink-0"></ion-avatar>
    <div class="flex-1">
      <h3 class="m-0 mb-1 text-lg font-semibold">{{ doctor.name }}</h3>
      <p class="text-primary text-sm font-medium m-0">{{ doctor.specialty }}</p>
    </div>
  </ion-card-content>
</ion-card>
```

**SCSS after (Ionic properties only):**
```scss
ion-toolbar {
  --background: var(--ion-color-light);
}

ion-chip {
  &[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
```

---

### 6.2 Medium Priority (326 lines - profile)

**Migration strategy:**
1. **Hero section** → Use `gradient-surface` utility
2. **Overview cards** → Use Tailwind grid + `card-elevated`
3. **Preference rows** → Use Tailwind flex + border utilities
4. **Dark mode** → Replace `:host-context(.dark-theme)` with `dark:` variant

**Estimated reduction:** 326 lines → ~40 lines (88% reduction)

**Key patterns:**
```html
<!-- Hero section -->
<div class="gradient-surface rounded-[20px] p-8 flex flex-col items-center text-center gap-3 shadow-glow-primary">
  <div class="w-28 h-28 rounded-full bg-white/15 flex items-center justify-center p-2">
    <ion-avatar class="w-full h-full border-[3px] border-white/50 shadow-lg">
      <img [src]="user.avatar" />
    </ion-avatar>
  </div>
  <h2 class="text-2xl font-bold text-white m-0">{{ user.name }}</h2>
  <p class="text-sm text-white/85 m-0">{{ user.email }}</p>
</div>

<!-- Overview grid -->
<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
  <div class="card-elevated flex items-center gap-4 p-4 hover:-translate-y-0.5 transition-all cursor-pointer">
    <ion-icon name="calendar" class="text-3xl text-primary"></ion-icon>
    <div class="flex-1">
      <h3 class="m-0 text-base font-semibold">{{ appointments.count }}</h3>
      <p class="m-0 mt-1 text-sm text-medium">Appointments</p>
    </div>
  </div>
</div>
```

**SCSS after:**
```scss
// Only Ionic CSS properties
ion-content {
  --background: #f5f7f8;
}

ion-select {
  --padding-start: 12px;
  --padding-end: 12px;
}

:host-context(.dark) {
  ion-content {
    --background: #0f172a;
  }
}
```

---

### 6.3 Components (170 lines - alert-banner)

**Migration strategy:**
1. **Variant classes** → Move to HTML with conditional classes
2. **Dark mode** → Use `dark:` variant
3. **Hover states** → Inline Tailwind classes

**Estimated reduction:** 170 lines → ~20 lines (88% reduction)

**Key patterns:**
```html
<!-- Alert banner with variants -->
<div class="flex items-center justify-between p-3 rounded-xl mb-4 gap-3"
     [class.bg-yellow-200/50]="type === 'success'"
     [class.text-yellow-800]="type === 'success'"
     [class.bg-blue-200/12]="type === 'info'"
     [class.text-blue-600]="type === 'info'"
     [class.dark:bg-yellow-200/25]="type === 'success'"
     [class.dark:text-yellow-100]="type === 'success'">
  <div class="flex items-center gap-3 flex-1">
    <span class="material-symbols-outlined text-2xl shrink-0"
          [class.text-yellow-600]="type === 'success'"
          [class.text-blue-600]="type === 'info'">
      {{ icon }}
    </span>
    <p class="m-0 text-sm font-medium flex-1">{{ message }}</p>
  </div>
  <button class="bg-transparent border-0 p-1 rounded-full transition-colors hover:bg-black/10"
          (click)="dismiss()">
    <span class="material-symbols-outlined text-xl">close</span>
  </button>
</div>
```

**SCSS after:**
```scss
// No SCSS needed! Pure Tailwind
```

---

### 6.4 Forms (267 lines - add-reading)

**Migration strategy:**
1. **Form layout** → Tailwind flex/grid
2. **Input styling** → Keep `ion-item` properties, add Tailwind classes
3. **Validation states** → Use conditional Tailwind classes
4. **Submit button** → Use `btn-glow` utility

**Key patterns:**
```html
<!-- Form layout -->
<form class="flex flex-col gap-4 p-4">
  <!-- Input group -->
  <ion-item class="rounded-xl shadow-sm mb-4" [class.border-2]="errors.value" [class.border-danger]="errors.value">
    <ion-label position="stacked" class="text-sm font-medium text-dark mb-2">
      Glucose Value
    </ion-label>
    <ion-input type="number"
               class="mt-2"
               placeholder="Enter value"
               [class.animate-shake]="errors.value">
    </ion-input>
  </ion-item>

  <!-- Error message -->
  <p *ngIf="errors.value" class="text-danger text-sm m-0 -mt-2 animate-fade-in">
    {{ errors.value }}
  </p>

  <!-- Submit -->
  <ion-button expand="block" class="btn-glow mt-4">
    Save Reading
  </ion-button>
</form>
```

**SCSS after:**
```scss
ion-item {
  --background: white;
  --border-color: var(--ion-color-light-shade);
  --inner-padding-end: 16px;

  &.error {
    --border-color: var(--ion-color-danger);
  }
}
```

---

## 7. Anti-Patterns

### 7.1 What NOT to Do

**❌ DON'T: Duplicate styles in SCSS and HTML**
```html
<!-- BAD -->
<div class="flex gap-4 p-6">...</div>

<!-- SCSS -->
.my-container {
  display: flex;
  gap: 16px;
  padding: 24px;
}
```

**✅ DO: Choose one approach**
```html
<!-- GOOD: Tailwind in HTML -->
<div class="flex gap-4 p-6">...</div>

<!-- OR -->

<!-- GOOD: Semantic utility in SCSS (if used 3+ times) -->
<div class="my-container">...</div>

.my-container {
  @apply flex gap-4 p-6;
}
```

---

**❌ DON'T: Use !important**
```scss
// BAD
.my-class {
  color: blue !important;
}
```

**✅ DO: Increase specificity or use Tailwind**
```html
<!-- GOOD -->
<div class="text-blue-600">...</div>

<!-- Or use Tailwind's important modifier if absolutely needed -->
<div class="!text-blue-600">...</div>
```

---

**❌ DON'T: Create utilities for one-off styles**
```scss
// BAD - used only once
.single-use-card {
  @apply rounded-2xl p-6 bg-white shadow-lg;
}
```

**✅ DO: Use inline Tailwind**
```html
<!-- GOOD -->
<div class="rounded-2xl p-6 bg-white shadow-lg">...</div>
```

---

**❌ DON'T: Mix arbitrary values with design tokens**
```html
<!-- BAD - inconsistent -->
<div class="p-[23px] rounded-[19px] mb-[37px]">...</div>
```

**✅ DO: Use design tokens consistently**
```html
<!-- GOOD -->
<div class="p-6 rounded-2xl mb-8">...</div>
```

---

**❌ DON'T: Forget dark mode**
```html
<!-- BAD -->
<div class="bg-white text-black">...</div>
```

**✅ DO: Always include dark mode**
```html
<!-- GOOD -->
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">...</div>

<!-- Or use semantic utility -->
<div class="card-elevated">...</div> <!-- Already has dark mode -->
```

---

**❌ DON'T: Use ::ng-deep unnecessarily**
```scss
// BAD
::ng-deep {
  .some-class {
    color: blue;
  }
}
```

**✅ DO: Use Tailwind classes or CSS custom properties**
```html
<!-- GOOD -->
<div class="text-blue-600">...</div>

<!-- Or for Ionic components -->
<ion-button [style.--color]="'blue'">...</ion-button>
```

---

**❌ DON'T: Create complex nested SCSS**
```scss
// BAD - 5 levels deep
.container {
  .row {
    .col {
      .card {
        .header {
          color: blue;
        }
      }
    }
  }
}
```

**✅ DO: Flatten structure with Tailwind**
```html
<!-- GOOD -->
<div class="text-blue-600">...</div>
```

---

### 7.2 Common Migration Mistakes

**Mistake 1: Not testing dark mode**
```typescript
// ❌ BAD: Only test light mode
it('should render card', () => {
  expect(fixture.nativeElement.querySelector('.card')).toBeTruthy();
});

// ✅ GOOD: Test both modes
it('should render card in light and dark mode', () => {
  // Light mode
  expect(fixture.nativeElement.querySelector('.card')).toBeTruthy();

  // Dark mode
  document.documentElement.classList.add('dark');
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.card.dark\\:bg-gray-900')).toBeTruthy();
});
```

---

**Mistake 2: Converting Ionic CSS properties to Tailwind**
```html
<!-- ❌ BAD: Ionic CSS properties as classes (won't work) -->
<ion-content class="bg-white">
  <!-- ion-content needs --background -->
</ion-content>

<!-- ✅ GOOD: Keep in SCSS -->
<ion-content>
  <!-- Styled with SCSS -->
</ion-content>

<!-- SCSS -->
ion-content {
  --background: white;
}
```

---

**Mistake 3: Over-using semantic utilities**
```scss
// ❌ BAD: Utility used only once
.my-unique-card {
  @apply rounded-2xl p-6 bg-white shadow-lg;
}

// ✅ GOOD: Use inline for unique styles
// (No SCSS needed)
```
```html
<div class="rounded-2xl p-6 bg-white shadow-lg">...</div>
```

---

**Mistake 4: Ignoring existing animations**
```html
<!-- ❌ BAD: Creating custom animation -->
<div class="custom-fade-in">...</div>

<!-- custom-fade-in defined in SCSS -->

<!-- ✅ GOOD: Use existing animation -->
<div class="animate-fade-in">...</div>
```

---

## 8. Testing Strategy

### 8.1 Testing Checklist per Component

**Before migration:**
- [ ] Take screenshot (light + dark mode)
- [ ] Document current behavior
- [ ] Identify Ionic CSS properties (keep in SCSS)
- [ ] List custom animations and pseudo-elements

**During migration:**
- [ ] Migrate layout classes (flex, grid, spacing)
- [ ] Replace colors with design tokens or Tailwind classes
- [ ] Add dark mode variants
- [ ] Replace shadows with semantic utilities
- [ ] Keep Ionic CSS properties in SCSS
- [ ] Preserve animations and pseudo-elements in SCSS

**After migration:**
- [ ] Visual comparison (screenshot diff)
- [ ] Test dark mode toggle
- [ ] Test responsive breakpoints
- [ ] Run accessibility tests
- [ ] Check hover/focus states
- [ ] Validate touch targets (44x44px)
- [ ] Run Stylelint
- [ ] Measure line reduction
- [ ] Update documentation

---

### 8.2 Automated Test Suite

**Create `scripts/test-migration.sh`:**

```bash
#!/bin/bash
set -e

echo "🧪 Running Tailwind v4 Migration Tests"
echo "========================================"

# 1. Lint SCSS
echo "📝 Linting SCSS..."
npm run lint:css:check

# 2. Run unit tests
echo "🧪 Running unit tests..."
npm run test:ci

# 3. Run visual regression tests
if [ -n "$PERCY_TOKEN" ]; then
  echo "👁️  Running visual regression tests..."
  npx percy exec -- npx playwright test visual-regression.spec.ts
else
  echo "⚠️  Skipping visual regression (no PERCY_TOKEN)"
fi

# 4. Run accessibility tests
echo "♿ Running accessibility tests..."
npx playwright test accessibility.spec.ts

# 5. Generate migration report
echo "📊 Generating migration report..."
node scripts/migration-report.js

# 6. Check CSS bundle size
echo "📦 Checking CSS bundle size..."
npm run build
du -h dist/*/styles.*.css | tail -1

echo "✅ All tests passed!"
```

**Add to `package.json`:**
```json
{
  "scripts": {
    "test:migration": "bash scripts/test-migration.sh"
  }
}
```

---

### 8.3 Visual Regression Workflow

**1. Take baseline screenshots:**
```bash
# Before migration
npm start &
sleep 5
npx percy exec -- npx playwright test visual-regression.spec.ts --grep "Profile"
```

**2. Migrate component:**
```bash
# Edit profile.page.html and profile.page.scss
```

**3. Compare screenshots:**
```bash
# After migration
npx percy exec -- npx playwright test visual-regression.spec.ts --grep "Profile"
# Review diffs in Percy dashboard
```

**4. Approve or fix:**
- If visual diff is acceptable → Approve in Percy
- If visual diff is wrong → Fix code and re-run

---

### 8.4 Migration Metrics Dashboard

**Create `docs/MIGRATION_METRICS.md`:**

```markdown
# Tailwind v4 Migration Metrics

**Last Updated:** 2025-11-11

## Overall Progress

- **Total Files:** 35 SCSS files
- **Migrated:** 3 files (8.6%)
- **Remaining:** 32 files (91.4%)
- **Total Lines Migrated:** 455 lines → 124 lines (72.7% reduction)

## File-by-File Progress

| File | Status | Lines Before | Lines After | Reduction | Notes |
|------|--------|--------------|-------------|-----------|-------|
| login.page.scss | ✅ Done | 214 | 114 | 47% | Dark mode complete |
| dashboard.page.scss | ✅ Done | 241 | 10 | 96% | Only Ionic vars |
| stat-card.component.scss | ✅ Done | 50 | 36 | 28% | Custom animation kept |
| profile.page.scss | 🚧 In Progress | 326 | - | - | |
| appointment-create.page.scss | ⏳ Not Started | 449 | - | - | High priority |
| ... | | | | | |

## Quality Metrics

- **Arbitrary Values:** 12 total (target: <3 per component)
- **Semantic Utilities:** 8 created
- **Dark Mode Coverage:** 100% (3/3 migrated components)
- **Visual Regression Failures:** 0
- **Accessibility Violations:** 0

## Next Steps

1. ⏩ Migrate profile.page (326 lines)
2. ⏩ Migrate appointment-create.page (449 lines)
3. ⏩ Create semantic utilities for common patterns
```

---

## 9. Rollout Plan

### Phase 1: High-Impact Pages (Week 1-2)
- [ ] appointment-create (449 lines)
- [ ] profile (326 lines)
- [ ] add-reading (267 lines)

**Goal:** 1,042 lines → ~150 lines (85% reduction)

---

### Phase 2: Medium Pages (Week 3-4)
- [ ] service-monitor (260 lines)
- [ ] readings (248 lines)
- [ ] dashboard-detail (215 lines)

**Goal:** 723 lines → ~100 lines (86% reduction)

---

### Phase 3: Components (Week 5-6)
- [ ] alert-banner (170 lines)
- [ ] language-switcher (136 lines)
- [ ] reading-item (remaining)

**Goal:** 300+ lines → ~50 lines (83% reduction)

---

### Phase 4: Low-Priority Pages (Week 7-8)
- [ ] settings (155 lines)
- [ ] appointments (137 lines)
- [ ] welcome (164 lines)
- [ ] tabs (remaining)

**Goal:** 450+ lines → ~80 lines (82% reduction)

---

## 10. Success Metrics

**Target Outcomes:**
- 📉 **85%+ SCSS reduction** across all components
- 🎨 **60%+ semantic utility usage** (card-elevated, btn-glow, etc.)
- 🌙 **100% dark mode coverage** with automated tests
- ♿ **0 accessibility violations** in Axe tests
- 📦 **30% CSS bundle size reduction** (estimated)
- 🚀 **0 visual regressions** in Percy

**Weekly Tracking:**
- Lines of SCSS removed
- Semantic utilities created
- Components migrated
- Tests passing
- Visual regression checks
- Accessibility score

---

## 11. Resources

### Documentation
- [Tailwind v4 Docs](https://tailwindcss.com/docs)
- [DaisyUI Components](https://daisyui.com/components/)
- [Ionic CSS Properties](https://ionicframework.com/docs/theming/css-variables)
- [Angular Material Theming](https://material.angular.io/guide/theming)

### Tools
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) (VSCode extension)
- [Stylelint](https://stylelint.io/) (CSS linter)
- [Percy](https://percy.io/) (Visual regression)
- [Axe DevTools](https://www.deque.com/axe/devtools/) (Accessibility)

### Migration Helpers
- `scripts/analyze-scss.js` - Analyze SCSS complexity
- `scripts/migration-report.js` - Generate status report
- `scripts/test-migration.sh` - Run full test suite
- `src/app/tests/helpers/tailwind-test-utils.ts` - Test utilities

---

## 12. Support and Questions

**Common Questions:**

**Q: Should I migrate all SCSS to Tailwind?**
A: No! Keep Ionic CSS properties, complex pseudo-selectors, custom animations, and Shadow DOM styles in SCSS.

**Q: How many arbitrary values are allowed?**
A: Maximum 3 per component. Use design tokens or create semantic utilities if you need more.

**Q: What about ::ng-deep?**
A: Use sparingly and only for Shadow DOM. Prefer CSS custom properties when possible.

**Q: Should I create a utility or use inline classes?**
A: Create utility if used 3+ times, complex pattern, brand-specific, or animation sequence. Otherwise use inline.

**Q: How do I test dark mode?**
A: Use `.dark` class on HTML element. Add dark: variants to all color/shadow classes. Test with Playwright.

---

## Appendix A: Complete Semantic Utility Reference

```scss
// global.scss - Current semantic utilities

@layer components {
  // === CARDS ===
  .card-elevated {
    @apply rounded-2xl bg-white p-6 shadow-card backdrop-blur-xl dark:bg-gray-900;
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

  // === BUTTONS ===
  .btn-glow {
    box-shadow: var(--shadow-glow-primary);
    @apply transition-all hover:scale-105 active:scale-95;
  }

  // === SURFACES ===
  .glass-surface {
    background: var(--color-glass-light);
    @apply backdrop-blur-xl dark:bg-gray-900/95;
    border: 1px solid rgb(255 255 255 / 18%);
  }

  .gradient-surface {
    background: var(--gradient-primary);
    @apply text-white;
  }
}

// === ANIMATIONS ===
@layer utilities {
  .animate-fade-in { animation: fadeIn 0.6s ease-out; }
  .animate-fade-in-down { animation: fadeInDown 0.8s ease-out; }
  .animate-fade-in-up { animation: fadeInUp 0.8s ease-out; }
  .animate-slide-up { animation: slideUp 0.5s ease-out; }
  .animate-slide-in-up { animation: slideInUp 0.8s ease-out; }
  .animate-pulse-glow { animation: pulseGlow 2s infinite; }
  .animate-shake { animation: shake 0.3s ease; }
}
```

---

## Appendix B: Design Token Reference

```scss
// From global.scss @theme

// === GRADIENTS ===
--gradient-login: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--gradient-primary: linear-gradient(135deg, #3b82f6, #60a5fa);
--gradient-secondary: linear-gradient(135deg, #00c6ae, #1accb6);
--gradient-success: linear-gradient(135deg, #22c55e, #10b981);
--gradient-warning: linear-gradient(135deg, #f59e0b, #fb923c);
--gradient-danger: linear-gradient(135deg, #ef4444, #f87171);

// === SHADOWS ===
--shadow-card: 0 20px 40px rgb(0 0 0 / 10%);
--shadow-card-dark: 0 20px 40px rgb(0 0 0 / 50%);
--shadow-elevated: 0 10px 30px rgb(0 0 0 / 15%);
--shadow-floating: 0 25px 50px rgb(0 0 0 / 25%);
--shadow-glow-primary: 0 10px 30px rgb(37 175 244 / 30%);

// === SPACING ===
--spacing-xs: 0.5rem;   /* 8px */
--spacing-sm: 1rem;     /* 16px */
--spacing-md: 1.5rem;   /* 24px */
--spacing-lg: 2rem;     /* 32px */
--spacing-xl: 3rem;     /* 48px */

// === BORDER RADIUS ===
--radius-sm: 0.75rem;   /* 12px */
--radius-md: 1rem;      /* 16px */
--radius-lg: 1.25rem;   /* 20px */
--radius-xl: 1.5rem;    /* 24px */
```

---

## Appendix C: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│ TAILWIND V4 MIGRATION QUICK REFERENCE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🎯 WHEN TO USE SCSS:                                        │
│   ✓ Ionic CSS properties (--background, --padding-*)       │
│   ✓ Complex pseudo-selectors (:focus-within + children)    │
│   ✓ Pseudo-elements (::before, ::after)                    │
│   ✓ Custom @keyframes animations                           │
│   ✓ Shadow DOM styling (::ng-deep)                         │
│                                                             │
│ 🎨 WHEN TO USE TAILWIND:                                    │
│   ✓ Layout (flex, grid, spacing)                           │
│   ✓ Colors and backgrounds                                 │
│   ✓ Typography (text-*, font-*)                            │
│   ✓ Simple hover/focus states                              │
│   ✓ Dark mode variants (dark:)                             │
│                                                             │
│ 📦 SEMANTIC UTILITIES:                                      │
│   • card-elevated    → White card with shadow              │
│   • card-glass       → Glass morphism effect               │
│   • btn-glow         → Button with glow shadow             │
│   • gradient-surface → Primary gradient background         │
│   • animate-fade-in  → Fade in animation                   │
│   • animate-shake    → Shake animation for errors          │
│                                                             │
│ 🎯 QUALITY STANDARDS:                                       │
│   • Max 3 arbitrary values per component                   │
│   • 60% semantic utilities, 40% inline Tailwind            │
│   • 100% dark mode coverage                                │
│   • Create utility if used 3+ times                        │
│                                                             │
│ ✅ BEFORE COMMITTING:                                       │
│   npm run lint:css                                          │
│   npm run test:migration                                    │
│   npx playwright test visual-regression.spec.ts            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Conclusion

This playbook provides everything needed to complete the Tailwind v4 + DaisyUI migration across the Diabetactic application. Follow the patterns, respect the quality standards, use the automation tools, and test thoroughly. The goal is **85%+ SCSS reduction** while maintaining perfect visual fidelity, accessibility, and dark mode support.

**Remember the golden rules:**
1. Keep Ionic CSS properties in SCSS
2. Use semantic utilities for repeated patterns
3. Test dark mode for every component
4. Limit arbitrary values to 3 per component
5. Run visual regression tests before merging

Good luck with the migration! 🚀
