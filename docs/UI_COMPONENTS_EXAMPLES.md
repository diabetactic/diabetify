# UI Components - Live Usage Examples

This document provides copy-paste ready examples for using the Tailwind-based UI components.

## 🎯 Quick Import

All components are standalone and can be imported directly:

```typescript
import { UiButtonComponent } from '@app/shared/components/ui-button/ui-button.component';
import { UiCardComponent } from '@app/shared/components/ui-card/ui-card.component';
import { UiBadgeComponent } from '@app/shared/components/ui-badge/ui-badge.component';

@Component({
  // ...
  imports: [UiButtonComponent, UiCardComponent, UiBadgeComponent],
})
```

---

## 📱 Real-World Examples

### Example 1: Dashboard Stat Card with Actions

```html
<app-ui-card variant="elevated">
  <div header class="flex justify-between items-center">
    <h3 class="text-lg font-bold text-gray-900 dark:text-white">
      Glucose Levels
    </h3>
    <app-ui-badge variant="success" icon="checkmark" size="sm">
      Normal
    </app-ui-badge>
  </div>

  <div body class="space-y-4">
    <div class="text-center">
      <p class="text-4xl font-bold text-primary">120</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">mg/dL</p>
    </div>

    <div class="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span class="text-gray-600 dark:text-gray-400">Average:</span>
        <span class="font-semibold ml-1">115</span>
      </div>
      <div>
        <span class="text-gray-600 dark:text-gray-400">Range:</span>
        <span class="font-semibold ml-1">95-135</span>
      </div>
    </div>
  </div>

  <div footer class="flex justify-between">
    <app-ui-button variant="ghost" size="sm" icon="time">
      History
    </app-ui-button>
    <app-ui-button variant="primary" size="sm" icon="add">
      Add Reading
    </app-ui-button>
  </div>
</app-ui-card>
```

### Example 2: Form with Validation

```html
<form (ngSubmit)="onSubmit()" class="space-y-4">
  <app-ui-card>
    <h2 header class="text-xl font-bold">Patient Information</h2>

    <div body class="space-y-4">
      <!-- Name field -->
      <div>
        <label class="block text-sm font-medium mb-1">Full Name</label>
        <input
          type="text"
          [(ngModel)]="patientName"
          class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-primary focus:border-transparent">
        <app-ui-badge
          *ngIf="nameError"
          variant="danger"
          badgeStyle="subtle"
          size="sm"
          class="mt-1">
          Name is required
        </app-ui-badge>
      </div>

      <!-- Email field with success badge -->
      <div>
        <label class="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          [(ngModel)]="patientEmail"
          class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <app-ui-badge
          *ngIf="emailValid"
          variant="success"
          badgeStyle="subtle"
          icon="checkmark"
          size="sm"
          class="mt-1">
          Valid email
        </app-ui-badge>
      </div>
    </div>

    <div footer class="flex justify-end gap-2">
      <app-ui-button
        type="button"
        variant="ghost"
        (buttonClick)="onCancel()">
        Cancel
      </app-ui-button>
      <app-ui-button
        type="submit"
        variant="primary"
        [loading]="isSaving"
        [disabled]="!isFormValid">
        Save Patient
      </app-ui-button>
    </div>
  </app-ui-card>
</form>
```

### Example 3: Appointment List

```html
<div class="space-y-3">
  <app-ui-card
    *ngFor="let appointment of appointments"
    [clickable]="true"
    (cardClick)="openAppointment(appointment.id)">
    <div body class="flex items-start justify-between">
      <div class="flex-1">
        <h4 class="font-semibold text-gray-900 dark:text-white">
          {{ appointment.doctorName }}
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ appointment.date | date:'medium' }}
        </p>
        <div class="mt-2">
          <app-ui-badge
            [variant]="getAppointmentStatusVariant(appointment.status)"
            size="sm">
            {{ appointment.status }}
          </app-ui-badge>
        </div>
      </div>

      <ion-icon
        name="chevron-forward"
        class="text-gray-400 text-xl"></ion-icon>
    </div>
  </app-ui-card>
</div>
```

```typescript
// Component TypeScript
getAppointmentStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' {
  const variantMap: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    'confirmed': 'success',
    'pending': 'warning',
    'cancelled': 'danger',
    'scheduled': 'info',
  };
  return variantMap[status] || 'info';
}
```

### Example 4: Alert/Notification Banners

```html
<!-- Success notification -->
<app-ui-card variant="outlined" padding="sm" class="mb-4">
  <div body class="flex items-center gap-3">
    <ion-icon
      name="checkmark-circle"
      class="text-success text-2xl"></ion-icon>
    <div class="flex-1">
      <p class="font-semibold text-success">Data synced successfully</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        All your glucose readings are up to date.
      </p>
    </div>
    <app-ui-badge
      variant="success"
      badgeStyle="subtle"
      [dismissible]="true">
      New
    </app-ui-badge>
  </div>
</app-ui-card>

<!-- Warning notification -->
<app-ui-card variant="outlined" padding="sm" class="mb-4">
  <div body class="flex items-center gap-3">
    <ion-icon
      name="warning"
      class="text-warning text-2xl"></ion-icon>
    <div class="flex-1">
      <p class="font-semibold text-warning">High glucose detected</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Your latest reading is 180 mg/dL. Consider consulting your doctor.
      </p>
    </div>
    <app-ui-button variant="ghost" size="sm">
      View
    </app-ui-button>
  </div>
</app-ui-card>

<!-- Error notification -->
<app-ui-card variant="outlined" padding="sm">
  <div body class="flex items-center gap-3">
    <ion-icon
      name="close-circle"
      class="text-danger text-2xl"></ion-icon>
    <div class="flex-1">
      <p class="font-semibold text-danger">Sync failed</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Unable to connect to Tidepool. Check your internet connection.
      </p>
    </div>
    <app-ui-button variant="danger" size="sm" icon="refresh">
      Retry
    </app-ui-button>
  </div>
</app-ui-card>
```

### Example 5: Settings Panel

```html
<app-ui-card>
  <h2 header class="text-xl font-bold">Notification Settings</h2>

  <div body class="space-y-4">
    <!-- Toggle option -->
    <div class="flex items-center justify-between">
      <div>
        <p class="font-medium">High glucose alerts</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Get notified when readings exceed 180 mg/dL
        </p>
      </div>
      <ion-toggle [(ngModel)]="highGlucoseAlerts"></ion-toggle>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700"></div>

    <!-- Toggle option with badge -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <p class="font-medium">Email notifications</p>
        <app-ui-badge variant="info" badgeStyle="subtle" size="sm">
          Beta
        </app-ui-badge>
      </div>
      <ion-toggle [(ngModel)]="emailNotifications"></ion-toggle>
    </div>
  </div>

  <div footer class="flex justify-end gap-2">
    <app-ui-button variant="ghost" (buttonClick)="resetToDefaults()">
      Reset to Defaults
    </app-ui-button>
    <app-ui-button
      variant="primary"
      [loading]="isSaving"
      (buttonClick)="saveSettings()">
      Save Changes
    </app-ui-button>
  </div>
</app-ui-card>
```

### Example 6: Loading States

```html
<!-- Loading card with skeleton -->
<app-ui-card [loading]="isLoadingData">
  <div body class="space-y-4">
    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
  </div>
</app-ui-card>

<!-- Button with loading state -->
<app-ui-button
  variant="primary"
  [loading]="isProcessing"
  [disabled]="!canProcess"
  (buttonClick)="processData()">
  Process Data
</app-ui-button>
```

### Example 7: Tag/Category System

```html
<div class="flex flex-wrap gap-2">
  <app-ui-badge
    *ngFor="let tag of selectedTags"
    variant="info"
    badgeStyle="outlined"
    [dismissible]="true"
    [rounded]="true"
    (dismiss)="removeTag(tag)">
    {{ tag }}
  </app-ui-badge>

  <app-ui-button
    variant="ghost"
    size="sm"
    icon="add"
    (buttonClick)="addTag()">
    Add Tag
  </app-ui-button>
</div>
```

### Example 8: Action Bar

```html
<div class="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
  <div class="flex gap-2 max-w-4xl mx-auto">
    <app-ui-button
      variant="ghost"
      [fullWidth]="true"
      icon="close"
      (buttonClick)="cancel()">
      Cancel
    </app-ui-button>
    <app-ui-button
      variant="secondary"
      [fullWidth]="true"
      icon="save"
      (buttonClick)="saveDraft()">
      Save Draft
    </app-ui-button>
    <app-ui-button
      variant="primary"
      [fullWidth]="true"
      [loading]="isSubmitting"
      icon="checkmark"
      (buttonClick)="submit()">
      Submit
    </app-ui-button>
  </div>
</div>
```

### Example 9: Empty State

```html
<app-ui-card>
  <div body class="text-center py-8">
    <ion-icon
      name="document-text-outline"
      class="text-gray-400 text-6xl mb-4"></ion-icon>
    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
      No appointments scheduled
    </h3>
    <p class="text-gray-600 dark:text-gray-400 mb-6">
      Get started by scheduling your first appointment
    </p>
    <app-ui-button
      variant="primary"
      icon="add"
      (buttonClick)="scheduleAppointment()">
      Schedule Appointment
    </app-ui-button>
  </div>
</app-ui-card>
```

### Example 10: Complex Dashboard Grid

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
  <!-- Glucose card -->
  <app-ui-card variant="elevated" [clickable]="true" (cardClick)="viewGlucose()">
    <div body>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Latest Reading</span>
        <app-ui-badge variant="success" size="sm" icon="checkmark">
          Normal
        </app-ui-badge>
      </div>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">120</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">mg/dL</p>
    </div>
  </app-ui-card>

  <!-- Appointments card -->
  <app-ui-card variant="elevated" [clickable]="true" (cardClick)="viewAppointments()">
    <div body>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Upcoming</span>
        <app-ui-badge variant="warning" size="sm">
          2
        </app-ui-badge>
      </div>
      <p class="text-3xl font-bold text-gray-900 dark:text-white">3</p>
      <p class="text-sm text-gray-600 dark:text-gray-400">Appointments</p>
    </div>
  </app-ui-card>

  <!-- Sync status card -->
  <app-ui-card variant="elevated">
    <div body>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Sync Status</span>
        <app-ui-badge variant="info" badgeStyle="subtle" size="sm" icon="sync">
          Active
        </app-ui-badge>
      </div>
      <p class="text-sm font-medium text-gray-900 dark:text-white">
        Last synced 5 minutes ago
      </p>
      <app-ui-button
        variant="ghost"
        size="sm"
        icon="refresh"
        [loading]="isSyncing"
        (buttonClick)="syncNow()"
        class="mt-2">
        Sync Now
      </app-ui-button>
    </div>
  </app-ui-card>
</div>
```

---

## 🎨 Styling Tips

### Combining with Ionic Components

```html
<!-- Card with Ionic list -->
<app-ui-card>
  <h3 header class="text-lg font-bold">Recent Readings</h3>
  <ion-list body class="bg-transparent">
    <ion-item *ngFor="let reading of readings">
      <ion-label>
        <h4>{{ reading.value }} mg/dL</h4>
        <p>{{ reading.date | date:'short' }}</p>
      </ion-label>
      <app-ui-badge
        slot="end"
        [variant]="reading.status"
        size="sm">
        {{ reading.label }}
      </app-ui-badge>
    </ion-item>
  </ion-list>
</app-ui-card>
```

### Dark Mode Toggle

```html
<!-- Theme toggle button -->
<app-ui-button
  variant="ghost"
  icon="moon"
  (buttonClick)="toggleDarkMode()">
  Dark Mode
</app-ui-button>
```

```typescript
// Component TypeScript
toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
```

### Responsive Layouts

```html
<!-- Stack on mobile, side-by-side on desktop -->
<div class="flex flex-col md:flex-row gap-4">
  <app-ui-card class="flex-1">
    <div body>Left content</div>
  </app-ui-card>
  <app-ui-card class="flex-1">
    <div body>Right content</div>
  </app-ui-card>
</div>

<!-- Grid that adapts to screen size -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <app-ui-button variant="primary" [fullWidth]="true">Action 1</app-ui-button>
  <app-ui-button variant="secondary" [fullWidth]="true">Action 2</app-ui-button>
  <app-ui-button variant="danger" [fullWidth]="true">Action 3</app-ui-button>
  <app-ui-button variant="ghost" [fullWidth]="true">Action 4</app-ui-button>
</div>
```

---

## 🧪 Testing Examples

```typescript
// Component test example
describe('DashboardPage', () => {
  it('should display glucose reading in card', () => {
    const card = fixture.debugElement.query(By.directive(UiCardComponent));
    expect(card).toBeTruthy();

    const badge = fixture.debugElement.query(By.directive(UiBadgeComponent));
    expect(badge.componentInstance.variant).toBe('success');
  });

  it('should emit event when action button clicked', () => {
    spyOn(component, 'addReading');
    const button = fixture.debugElement.query(By.directive(UiButtonComponent));
    button.nativeElement.click();
    expect(component.addReading).toHaveBeenCalled();
  });
});
```

---

## 📝 Notes

- All examples use Tailwind utilities exclusively
- Components are fully accessible with ARIA attributes
- Dark mode works automatically with `.dark` class on `<html>`
- All components are standalone and can be imported individually
- Icons use Ionicons (available globally in Ionic apps)

For more details, see:
- **Component API Reference**: `/docs/UI_COMPONENTS_GUIDE.md`
- **Styling Patterns**: `/docs/STYLING_GUIDE.md`
- **Component Source**: `/src/app/shared/components/ui-*/`
