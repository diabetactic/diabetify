# Component Usage Examples

This file provides practical examples of using the shared components in your pages.

## Dashboard Page Example

```typescript
// dashboard.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { StatCardComponent, AlertBannerComponent } from '@shared/components';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  standalone: true,
  imports: [CommonModule, IonicModule, StatCardComponent, AlertBannerComponent],
})
export class DashboardPage {
  // Stats data
  hba1c = 7.2;
  timeInRange = 68;
  avgGlucose = 145;
  gmi = 7.5;

  // Alert data
  showSyncAlert = true;

  onSyncAlertDismissed() {
    this.showSyncAlert = false;
  }
}
```

```html
<!-- dashboard.page.html -->
<ion-header>
  <ion-toolbar>
    <ion-title>Dashboard</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="dashboard-container">
    <!-- Alert Banner -->
    <app-alert-banner
      *ngIf="showSyncAlert"
      type="success"
      message="Your data has been synced with Tidepool!"
      [dismissible]="true"
      (dismissed)="onSyncAlertDismissed()"
    >
    </app-alert-banner>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <app-stat-card
        title="HbA1c"
        [value]="hba1c"
        unit="%"
        icon="bloodtype"
        [gradientColors]="['#3b82f6', '#60a5fa']"
      >
      </app-stat-card>

      <app-stat-card
        title="Time in Range"
        [value]="timeInRange"
        unit="%"
        icon="timer"
        [gradientColors]="['#10b981', '#34d399']"
      >
      </app-stat-card>

      <app-stat-card
        title="Average"
        [value]="avgGlucose"
        unit="mg/dL"
        icon="trending_up"
        [gradientColors]="['#8b5cf6', '#a78bfa']"
      >
      </app-stat-card>

      <app-stat-card
        title="GMI"
        [value]="gmi"
        unit="%"
        icon="show_chart"
        [gradientColors]="['#f59e0b', '#fbbf24']"
      >
      </app-stat-card>
    </div>
  </div>
</ion-content>
```

```scss
// dashboard.page.scss
.dashboard-container {
  padding: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 16px;
}
```

---

## Readings Page Example

```typescript
// readings.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReadingItemComponent, EmptyStateComponent } from '@shared/components';
import { ReadingsService } from '@core/services/readings.service';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-readings',
  templateUrl: './readings.page.html',
  standalone: true,
  imports: [CommonModule, IonicModule, ReadingItemComponent, EmptyStateComponent],
})
export class ReadingsPage implements OnInit {
  readings$!: Observable<LocalGlucoseReading[]>;

  constructor(private readingsService: ReadingsService) {}

  ngOnInit() {
    this.readings$ = this.readingsService.readings$;
  }

  openAddReading() {
    // Navigate to add reading page or open modal
    console.log('Open add reading');
  }
}
```

```html
<!-- readings.page.html -->
<ion-header>
  <ion-toolbar>
    <ion-title>Readings</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="readings-container">
    <ng-container *ngIf="readings$ | async as readings">
      <!-- Show readings list -->
      <div *ngIf="readings.length > 0; else emptyState">
        <app-reading-item *ngFor="let reading of readings" [reading]="reading"> </app-reading-item>
      </div>

      <!-- Show empty state -->
      <ng-template #emptyState>
        <app-empty-state
          illustration="glucose"
          heading="No readings yet"
          message="Connect your glucose meter or manually add readings to get started."
          ctaText="Add Reading"
          (ctaClick)="openAddReading()"
        >
        </app-empty-state>
      </ng-template>
    </ng-container>
  </div>
</ion-content>
```

```scss
// readings.page.scss
.readings-container {
  padding: 16px;
}
```

---

## Profile Page Example

```typescript
// profile.page.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { ProfileItemComponent } from '@shared/components';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  standalone: true,
  imports: [CommonModule, IonicModule, ProfileItemComponent],
})
export class ProfilePage {
  isDarkMode = false;
  notificationCount = 3;

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {
    this.isDarkMode = this.themeService.isDarkMode();
  }

  navigateToPersonalInfo() {
    this.router.navigate(['/profile/personal-info']);
  }

  navigateToPreferences() {
    this.router.navigate(['/profile/preferences']);
  }

  navigateToNotifications() {
    this.router.navigate(['/profile/notifications']);
  }

  navigateToPrivacy() {
    this.router.navigate(['/profile/privacy']);
  }

  onDarkModeToggle(enabled: boolean) {
    this.isDarkMode = enabled;
    this.themeService.setDarkMode(enabled);
  }

  logout() {
    // Handle logout
    console.log('Logout');
  }
}
```

```html
<!-- profile.page.html -->
<ion-header>
  <ion-toolbar>
    <ion-title>Profile</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="profile-container">
    <!-- User Section -->
    <div class="profile-section">
      <h2 class="section-title">Account</h2>

      <app-profile-item
        icon="person"
        title="Personal Information"
        subtitle="Name, email, date of birth"
        actionType="chevron"
        iconColor="#25aff4"
        (itemClick)="navigateToPersonalInfo()"
      >
      </app-profile-item>

      <app-profile-item
        icon="notifications"
        title="Notifications"
        subtitle="Manage alerts and reminders"
        actionType="badge"
        [actionValue]="notificationCount"
        iconColor="#f59e0b"
        (itemClick)="navigateToNotifications()"
      >
      </app-profile-item>
    </div>

    <!-- Settings Section -->
    <div class="profile-section">
      <h2 class="section-title">Settings</h2>

      <app-profile-item
        icon="dark_mode"
        title="Dark Mode"
        subtitle="Use dark theme"
        actionType="toggle"
        [actionValue]="isDarkMode"
        iconColor="#8b5cf6"
        (toggleChange)="onDarkModeToggle($event)"
      >
      </app-profile-item>

      <app-profile-item
        icon="tune"
        title="Preferences"
        subtitle="Units, target ranges, sync"
        actionType="chevron"
        iconColor="#10b981"
        (itemClick)="navigateToPreferences()"
      >
      </app-profile-item>

      <app-profile-item
        icon="lock"
        title="Privacy & Security"
        subtitle="Manage your data and privacy"
        actionType="chevron"
        iconColor="#ef4444"
        (itemClick)="navigateToPrivacy()"
      >
      </app-profile-item>
    </div>

    <!-- Logout Button -->
    <ion-button expand="block" color="danger" fill="outline" (click)="logout()">
      <ion-icon name="log-out-outline" slot="start"></ion-icon>
      Logout
    </ion-button>
  </div>
</ion-content>
```

```scss
// profile.page.scss
.profile-container {
  padding: 16px;
}

.profile-section {
  margin-bottom: 32px;

  .section-title {
    margin: 0 0 16px 4px;
    font-size: 18px;
    font-weight: 600;
    color: var(--diabetactic-text-secondary);
  }
}
```

---

## Common Patterns

### Loading State with Empty State

```html
<ng-container *ngIf="isLoading; else content">
  <ion-spinner></ion-spinner>
</ng-container>

<ng-template #content>
  <div *ngIf="items.length > 0; else emptyState">
    <!-- Content here -->
  </div>

  <ng-template #emptyState>
    <app-empty-state illustration="inbox" heading="No items" message="Your list is empty.">
    </app-empty-state>
  </ng-template>
</ng-template>
```

### Alert Banners for Different States

```html
<!-- Success -->
<app-alert-banner type="success" message="Data saved successfully!" [dismissible]="true">
</app-alert-banner>

<!-- Info -->
<app-alert-banner type="info" message="Syncing with Tidepool..."> </app-alert-banner>

<!-- Warning -->
<app-alert-banner type="warning" message="You have 3 readings pending sync" [dismissible]="true">
</app-alert-banner>
```

### Stat Card Grid Layouts

```scss
// 2-column grid
.stats-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

// 1-column grid for mobile, 2-column for tablet
.stats-grid-responsive {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## TypeScript Path Aliases

To use the `@shared/components` import path, add this to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["src/app/shared/*"],
      "@core/*": ["src/app/core/*"]
    }
  }
}
```

Then import like this:

```typescript
import { StatCardComponent, ReadingItemComponent } from '@shared/components';
import { ReadingsService } from '@core/services/readings.service';
```
