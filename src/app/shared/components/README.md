# Shared UI Components

This directory contains reusable UI components for the Diabetactic app. All components are standalone and follow the design patterns from the mockups.

## Components

### 1. StatCard Component

Displays statistics with gradient backgrounds and icons.

**Selector:** `app-stat-card`

**Inputs:**

- `title: string` - Card title (e.g., "HbA1c")
- `value: number | string` - The main value to display
- `unit: string` - Unit of measurement (e.g., "%", "mg/dL")
- `icon: string` - Material Symbols icon name (default: "analytics")
- `gradientColors: [string, string]` - Array of two hex colors for gradient (default: blue gradient)

**Example Usage:**

```html
<app-stat-card
  title="HbA1c"
  [value]="7.2"
  unit="%"
  icon="bloodtype"
  [gradientColors]="['#3b82f6', '#60a5fa']"
>
</app-stat-card>
```

**TypeScript:**

```typescript
import { StatCardComponent } from '@shared/components';

@Component({
  imports: [StatCardComponent]
})
```

---

### 2. ReadingItem Component

Displays individual glucose readings with status indicators.

**Selector:** `app-reading-item`

**Inputs:**

- `reading: LocalGlucoseReading` - Glucose reading object with value, units, time, and status

**Features:**

- Emoji status indicators (😊 normal, 😟 low, 😰 high)
- Color-coded status badges
- Formatted timestamps (Today, Yesterday, or date)
- Supports both mg/dL and mmol/L units

**Example Usage:**

```html
<app-reading-item [reading]="reading"></app-reading-item>
```

**TypeScript:**

```typescript
import { ReadingItemComponent } from '@shared/components';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';

@Component({
  imports: [ReadingItemComponent],
})
export class MyComponent {
  reading: LocalGlucoseReading = {
    id: '1',
    type: 'cbg',
    value: 120,
    units: 'mg/dL',
    time: '2025-10-25T10:30:00Z',
    status: 'normal',
    synced: true,
  };
}
```

---

### 3. AlertBanner Component

Displays colored alert banners with optional dismiss functionality.

**Selector:** `app-alert-banner`

**Inputs:**

- `type: 'success' | 'info' | 'warning'` - Alert type (default: "info")
- `message: string` - Alert message text
- `dismissible: boolean` - Whether the alert can be dismissed (default: false)

**Outputs:**

- `dismissed: EventEmitter<void>` - Emitted when alert is dismissed

**Example Usage:**

```html
<app-alert-banner
  type="success"
  message="Your data has been synced successfully!"
  [dismissible]="true"
  (dismissed)="onAlertDismissed()"
>
</app-alert-banner>
```

**TypeScript:**

```typescript
import { AlertBannerComponent } from '@shared/components';

@Component({
  imports: [AlertBannerComponent],
})
export class MyComponent {
  onAlertDismissed() {
    console.log('Alert dismissed');
  }
}
```

---

### 4. ProfileItem Component

Displays profile settings items with icons and various action types.

**Selector:** `app-profile-item`

**Inputs:**

- `icon: string` - Material Symbols icon name (default: "person")
- `title: string` - Main title text
- `subtitle: string` - Optional subtitle text
- `actionType: 'none' | 'toggle' | 'chevron' | 'badge'` - Type of right-side action (default: "chevron")
- `actionValue: any` - Value for the action (e.g., boolean for toggle, string for badge)
- `iconColor: string` - Hex color for icon container (default: "#3b82f6")

**Outputs:**

- `itemClick: EventEmitter<void>` - Emitted when item is clicked (not for toggle type)
- `toggleChange: EventEmitter<boolean>` - Emitted when toggle value changes

**Example Usage:**

```html
<!-- With chevron (navigable item) -->
<app-profile-item
  icon="person"
  title="Personal Information"
  subtitle="Name, email, date of birth"
  actionType="chevron"
  (itemClick)="navigateToProfile()"
>
</app-profile-item>

<!-- With toggle -->
<app-profile-item
  icon="dark_mode"
  title="Dark Mode"
  subtitle="Use dark theme"
  actionType="toggle"
  [actionValue]="isDarkMode"
  (toggleChange)="onDarkModeToggle($event)"
>
</app-profile-item>

<!-- With badge -->
<app-profile-item
  icon="notifications"
  title="Notifications"
  subtitle="Manage alerts"
  actionType="badge"
  actionValue="3"
  iconColor="#f59e0b"
>
</app-profile-item>
```

---

### 5. EmptyState Component

Displays centered empty state messages with illustrations.

**Selector:** `app-empty-state`

**Inputs:**

- `illustration: string` - Material Symbols icon name (default: "inbox")
- `heading: string` - Main heading text (default: "No data yet")
- `message: string` - Descriptive message (default: "Get started by adding your first item.")
- `ctaText: string` - Optional call-to-action button text (button hidden if empty)

**Outputs:**

- `ctaClick: EventEmitter<void>` - Emitted when CTA button is clicked

**Example Usage:**

```html
<app-empty-state
  illustration="glucose"
  heading="No readings yet"
  message="Connect your glucose meter or manually add readings to get started."
  ctaText="Add Reading"
  (ctaClick)="openAddReading()"
>
</app-empty-state>
```

**TypeScript:**

```typescript
import { EmptyStateComponent } from '@shared/components';

@Component({
  imports: [EmptyStateComponent],
})
export class MyComponent {
  openAddReading() {
    // Navigate to add reading page
  }
}
```

---

## Design Tokens

All components use design tokens defined in `/src/global.scss`:

### Colors

- Primary: `--ion-color-primary` (#3b82f6)
- Success: `--ion-color-success` (#22c55e)
- Warning: `--ion-color-warning` (#f59e0b)
- Danger: `--ion-color-danger` (#ef4444)

### Glucose Status Colors

- Normal: `--glucose-normal` (#22c55e)
- Low: `--glucose-low` (#f59e0b)
- High: `--glucose-high` (#ef4444)
- Critical: `--glucose-critical` (#dc2626)

### Gradient Colors

- Blue: `--gradient-blue-start` (#3b82f6) → `--gradient-blue-end` (#60a5fa)
- Purple: `--gradient-purple-start` (#8b5cf6) → `--gradient-purple-end` (#a78bfa)
- Green: `--gradient-green-start` (#10b981) → `--gradient-green-end` (#34d399)
- Yellow: `--gradient-yellow-start` (#f59e0b) → `--gradient-yellow-end` (#fbbf24)

### Typography

- Font Family: 'Be Vietnam Pro', 'Roboto', sans-serif
- Material Icons: Material Symbols Outlined

---

## Notes

- All components are **standalone** and import Ionic components individually
- Components support **dark mode** with automatic theme adjustments
- Accessibility features include proper ARIA labels and touch targets
- All components follow the **Ionic Angular standalone** patterns
- Components are fully **typed** with TypeScript interfaces
- Icons use **Lucide Angular** (not Material Icons)
