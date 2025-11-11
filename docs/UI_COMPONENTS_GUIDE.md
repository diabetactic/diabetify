# UI Components Guide - Reusable Tailwind Components

This guide documents the reusable UI components built with **100% Tailwind CSS utilities** following the AI-safe patterns from `STYLING_GUIDE.md`.

## 🎯 Design Principles

All components follow these principles:
- ✅ **100% Tailwind utilities** (no custom CSS)
- ✅ **No `!important` declarations**
- ✅ **Dark mode via `dark:` prefix**
- ✅ **Consistent spacing** (4px grid)
- ✅ **Design tokens** from `global.scss`
- ✅ **AI-safe** (no cascade conflicts)
- ✅ **Full accessibility** support

---

## 📦 Components

### 1. Button Component

**Location:** `src/app/shared/components/ui-button/`

**Selector:** `<app-ui-button>`

#### Features
- Four variants: `primary`, `secondary`, `danger`, `ghost`
- Three sizes: `sm`, `md`, `lg`
- Loading state with animated spinner
- Icon support (leading/trailing)
- Full dark mode support
- Disabled state
- Full width option

#### API

```typescript
@Input() variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary';
@Input() size: 'sm' | 'md' | 'lg' = 'md';
@Input() disabled: boolean = false;
@Input() loading: boolean = false;
@Input() icon?: string; // Ionicons name (leading)
@Input() iconTrailing?: string; // Ionicons name (trailing)
@Input() fullWidth: boolean = false;
@Input() type: 'button' | 'submit' | 'reset' = 'button';

@Output() buttonClick = new EventEmitter<MouseEvent>();
```

#### Usage Examples

```html
<!-- Primary button (default) -->
<app-ui-button (buttonClick)="handleClick()">
  Click Me
</app-ui-button>

<!-- Secondary button with icon -->
<app-ui-button variant="secondary" icon="add" size="lg">
  Add Item
</app-ui-button>

<!-- Danger button with loading state -->
<app-ui-button variant="danger" [loading]="isDeleting">
  Delete
</app-ui-button>

<!-- Ghost button with trailing icon -->
<app-ui-button variant="ghost" iconTrailing="arrow-forward">
  Next
</app-ui-button>

<!-- Full width button -->
<app-ui-button [fullWidth]="true" variant="primary">
  Submit Form
</app-ui-button>

<!-- Disabled button -->
<app-ui-button [disabled]="true">
  Cannot Click
</app-ui-button>
```

#### Variant Classes

| Variant | Light Mode | Dark Mode | Use Case |
|---------|-----------|-----------|----------|
| `primary` | Blue background | Darker blue | Main actions |
| `secondary` | Gray background | Dark gray | Secondary actions |
| `danger` | Red background | Darker red | Destructive actions |
| `ghost` | Transparent | Transparent | Subtle actions |

---

### 2. Card Component

**Location:** `src/app/shared/components/ui-card/`

**Selector:** `<app-ui-card>`

#### Features
- Three variants: `default`, `elevated`, `outlined`
- Content projection slots (header, body, footer)
- Loading overlay with spinner
- Clickable with hover/scale effects
- Custom padding options
- Full dark mode support

#### API

```typescript
@Input() variant: 'default' | 'elevated' | 'outlined' = 'default';
@Input() loading: boolean = false;
@Input() clickable: boolean = false;
@Input() padding?: 'none' | 'sm' | 'md' | 'lg'; // default: md

@Output() cardClick = new EventEmitter<void>();
```

#### Usage Examples

```html
<!-- Basic card with body content -->
<app-ui-card>
  <div body>
    <p>Simple card content</p>
  </div>
</app-ui-card>

<!-- Card with header, body, and footer -->
<app-ui-card variant="elevated">
  <h3 header class="text-lg font-bold text-gray-900 dark:text-white">
    Card Title
  </h3>
  <div body>
    <p class="text-gray-600 dark:text-gray-300">
      Card content with multiple paragraphs.
    </p>
  </div>
  <div footer class="flex justify-end gap-2">
    <app-ui-button variant="ghost" size="sm">Cancel</app-ui-button>
    <app-ui-button variant="primary" size="sm">Save</app-ui-button>
  </div>
</app-ui-card>

<!-- Clickable card -->
<app-ui-card [clickable]="true" (cardClick)="navigateToDetails()">
  <div body>
    <h4 class="font-semibold">Glucose Reading</h4>
    <p class="text-2xl">120 mg/dL</p>
  </div>
</app-ui-card>

<!-- Outlined card with custom padding -->
<app-ui-card variant="outlined" padding="lg">
  <div body>
    Large padding content
  </div>
</app-ui-card>

<!-- Loading card -->
<app-ui-card [loading]="isLoadingData">
  <div body>
    Content will be dimmed with spinner overlay
  </div>
</app-ui-card>
```

#### Variant Classes

| Variant | Shadow | Border | Use Case |
|---------|--------|--------|----------|
| `default` | Medium | None | Standard cards |
| `elevated` | Large (hover: XL) | None | Emphasized cards |
| `outlined` | Small | 2px border | Subtle cards |

#### Content Slots

| Slot | Attribute | Border | Description |
|------|-----------|--------|-------------|
| Header | `header` | Bottom border | Title/header content |
| Body | `body` or default | None | Main content |
| Footer | `footer` | Top border | Actions/footer content |

---

### 3. Badge Component

**Location:** `src/app/shared/components/ui-badge/`

**Selector:** `<app-ui-badge>`

#### Features
- Five color variants: `success`, `warning`, `danger`, `info`, `neutral`
- Three sizes: `sm`, `md`, `lg`
- Three visual styles: `solid`, `outlined`, `subtle`
- Icon support
- Dismissible option
- Rounded (pill) option
- Full dark mode support

#### API

```typescript
@Input() variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
@Input() size: 'sm' | 'md' | 'lg' = 'md';
@Input() badgeStyle: 'solid' | 'outlined' | 'subtle' = 'solid';
@Input() icon?: string; // Ionicons name
@Input() dismissible: boolean = false;
@Input() rounded: boolean = false;
```

#### Usage Examples

```html
<!-- Basic success badge -->
<app-ui-badge variant="success">
  Active
</app-ui-badge>

<!-- Warning badge with icon -->
<app-ui-badge variant="warning" icon="warning" size="lg">
  Pending Review
</app-ui-badge>

<!-- Danger badge (outlined style) -->
<app-ui-badge variant="danger" badgeStyle="outlined">
  Error
</app-ui-badge>

<!-- Info badge (subtle style) -->
<app-ui-badge variant="info" badgeStyle="subtle">
  New Feature
</app-ui-badge>

<!-- Dismissible badge -->
<app-ui-badge variant="info" [dismissible]="true">
  Notification
</app-ui-badge>

<!-- Rounded pill badge -->
<app-ui-badge variant="success" [rounded]="true" icon="checkmark">
  Completed
</app-ui-badge>

<!-- Small neutral badge -->
<app-ui-badge size="sm" variant="neutral">
  Draft
</app-ui-badge>
```

#### Variant Colors

| Variant | Color | Use Case |
|---------|-------|----------|
| `success` | Green | Success, active, completed |
| `warning` | Amber | Warning, pending, caution |
| `danger` | Red | Error, critical, failed |
| `info` | Blue | Information, new, tips |
| `neutral` | Gray | Default, inactive, draft |

#### Styles

| Style | Appearance | Use Case |
|-------|-----------|----------|
| `solid` | Filled background | High emphasis |
| `outlined` | Border only | Medium emphasis |
| `subtle` | Light background | Low emphasis |

---

## 🎨 Integration with Existing Styles

All components use design tokens from `src/global.scss`:

```css
@theme {
  --color-primary-500: #25aff4;  /* Primary blue */
  --color-success: #22c55e;       /* Success green */
  --color-warning: #f59e0b;       /* Warning amber */
  --color-danger: #ef4444;        /* Danger red */
}
```

### Using Components in Templates

Components work seamlessly with Ionic and existing app styles:

```html
<ion-content>
  <div class="p-4">
    <!-- Card with buttons -->
    <app-ui-card variant="elevated">
      <h2 header class="text-xl font-bold">Glucose Readings</h2>
      <div body class="space-y-4">
        <div class="flex justify-between items-center">
          <span>Latest: 120 mg/dL</span>
          <app-ui-badge variant="success" icon="checkmark">
            Normal
          </app-ui-badge>
        </div>
        <ion-progress-bar value="0.75"></ion-progress-bar>
      </div>
      <div footer class="flex justify-end gap-2">
        <app-ui-button variant="ghost">View History</app-ui-button>
        <app-ui-button variant="primary" icon="add">
          Add Reading
        </app-ui-button>
      </div>
    </app-ui-card>
  </div>
</ion-content>
```

---

## 🧪 Testing

All components include comprehensive unit tests with:
- Variant testing
- Size testing
- State testing (loading, disabled, etc.)
- Event emission testing
- Accessibility testing
- Content projection testing (for Card)

Run tests:
```bash
npm run test -- --include='**/ui-*.spec.ts'
```

---

## 🚀 Adding New Components

Follow this pattern when creating new Tailwind-based components:

1. **Use Tailwind utilities exclusively** in templates
2. **Minimal SCSS** (< 50 lines, only for animations/special cases)
3. **TypeScript inputs** for all variants/sizes/states
4. **Dark mode** with `dark:` prefix
5. **Accessibility** attributes (aria-*, role)
6. **Comprehensive tests** for all variants

### Component Template

```typescript
import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-newComponent',
  templateUrl: './ui-new-component.component.html',
  styleUrls: ['./ui-new-component.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class UiNewComponentComponent {
  @Input() variant: 'default' | 'custom' = 'default';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get baseClasses(): string {
    return 'transition-all duration-200';
  }

  get variantClasses(): string {
    const variants = {
      default: 'bg-white dark:bg-gray-800',
      custom: 'bg-primary text-white',
    };
    return variants[this.variant];
  }

  get componentClasses(): string {
    return [this.baseClasses, this.variantClasses].join(' ');
  }
}
```

---

## 📚 References

- **Styling Guide**: `/docs/STYLING_GUIDE.md` - AI-safe patterns
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Ionic Components**: https://ionicframework.com/docs/components
- **Stat Card Example**: `src/app/shared/components/stat-card/` - Reference implementation

---

## ✅ Component Checklist

When creating/reviewing components:

- [ ] 100% Tailwind utilities (no custom CSS except animations)
- [ ] No `!important` declarations
- [ ] Dark mode with `dark:` prefix
- [ ] Consistent spacing (4px grid)
- [ ] Design tokens used (no hardcoded colors)
- [ ] Accessibility attributes included
- [ ] TypeScript types for all inputs
- [ ] Comprehensive unit tests
- [ ] Documentation with usage examples
- [ ] Standalone component (imports specified)

---

## 🎯 Summary

These three components demonstrate the AI-safe Tailwind pattern:

1. **Button** - Interactive actions with loading states
2. **Card** - Content containers with flexible slots
3. **Badge** - Status indicators with multiple styles

All components are:
- **Production-ready** with full test coverage
- **AI-safe** with no cascade conflicts
- **Dark mode compatible** automatically
- **Fully accessible** with proper ARIA attributes
- **Easily extensible** following the established pattern

Use these as templates for future component development in Diabetify!
