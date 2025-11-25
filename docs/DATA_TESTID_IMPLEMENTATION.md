# data-testid Implementation Guide

**Quick reference for adding test IDs to Ionic/Angular components**

---

## 🎯 Priority Components (Implement First)

### **1. Tab Navigation** (`src/app/tabs/tabs.page.html`)

```html
<ion-tabs>
  <ion-tab-button tab="dashboard" data-testid="tab-dashboard">
    <ion-icon name="home"></ion-icon>
    <ion-label>{{ 'TABS.DASHBOARD' | translate }}</ion-label>
  </ion-tab-button>

  <ion-tab-button tab="readings" data-testid="tab-readings">
    <ion-icon name="menu-book"></ion-icon>
    <ion-label>{{ 'TABS.READINGS' | translate }}</ion-label>
  </ion-tab-button>

  <ion-tab-button tab="appointments" data-testid="tab-appointments">
    <ion-icon name="calendar-today"></ion-icon>
    <ion-label>{{ 'TABS.APPOINTMENTS' | translate }}</ion-label>
  </ion-tab-button>

  <ion-tab-button tab="profile" data-testid="tab-profile">
    <ion-icon name="person"></ion-icon>
    <ion-label>{{ 'TABS.PROFILE' | translate }}</ion-label>
  </ion-tab-button>
</ion-tabs>
```

**Maestro Usage:**
```yaml
- tapOn:
    id: "tab-dashboard"
```

---

### **2. Login Form** (`src/app/login/login.page.html`)

```html
<form (ngSubmit)="login()">
  <ion-item>
    <ion-label position="floating">{{ 'LOGIN.USERNAME' | translate }}</ion-label>
    <ion-input
      type="text"
      [(ngModel)]="credentials.username"
      name="username"
      data-testid="username-input"
      required>
    </ion-input>
  </ion-item>

  <ion-item>
    <ion-label position="floating">{{ 'LOGIN.PASSWORD' | translate }}</ion-label>
    <ion-input
      type="password"
      [(ngModel)]="credentials.password"
      name="password"
      data-testid="password-input"
      required>
    </ion-input>
  </ion-item>

  <ion-button
    expand="block"
    type="submit"
    data-testid="login-submit-btn">
    {{ 'LOGIN.SUBMIT' | translate }}
  </ion-button>
</form>
```

**Maestro Usage:**
```yaml
- tapOn:
    id: "username-input"
- inputText: "1000"
- tapOn:
    id: "password-input"
- inputText: "tuvieja"
- tapOn:
    id: "login-submit-btn"
```

---

### **3. Settings/Profile Selectors** (`src/app/profile/profile.page.html`)

```html
<!-- Theme Selector -->
<ion-item>
  <ion-label>{{ 'SETTINGS.THEME' | translate }}</ion-label>
  <ion-select
    [(ngModel)]="selectedTheme"
    (ionChange)="changeTheme($event)"
    interface="alert"
    data-testid="theme-selector">
    <ion-select-option value="light">{{ 'SETTINGS.THEME.LIGHT' | translate }}</ion-select-option>
    <ion-select-option value="dark">{{ 'SETTINGS.THEME.DARK' | translate }}</ion-select-option>
    <ion-select-option value="auto">{{ 'SETTINGS.THEME.AUTO' | translate }}</ion-select-option>
  </ion-select>
</ion-item>

<!-- Language Selector -->
<ion-item>
  <ion-label>{{ 'SETTINGS.LANGUAGE' | translate }}</ion-label>
  <ion-select
    [(ngModel)]="selectedLanguage"
    (ionChange)="changeLanguage($event)"
    interface="alert"
    data-testid="language-selector">
    <ion-select-option value="en">English</ion-select-option>
    <ion-select-option value="es">Español</ion-select-option>
  </ion-select>
</ion-item>

<!-- Avatar Upload Button -->
<ion-button
  fill="outline"
  (click)="changeAvatar()"
  data-testid="avatar-upload-btn">
  <ion-icon slot="start" name="camera"></ion-icon>
  {{ 'PROFILE.CHANGE_PHOTO' | translate }}
</ion-button>
```

**Maestro Usage:**
```yaml
- tapOn:
    id: "theme-selector"
- tapOn: "Dark|Oscuro"
- tapOn: "OK"

- tapOn:
    id: "language-selector"
- tapOn: "English"
- tapOn: "OK"

- tapOn:
    id: "avatar-upload-btn"
```

---

### **4. Dashboard Components** (`src/app/dashboard/dashboard.page.html`)

```html
<!-- Stat Cards -->
<app-stat-card
  [title]="'DASHBOARD.TIME_IN_RANGE' | translate"
  [value]="timeInRange + '%'"
  [icon]="'target'"
  data-testid="stat-time-in-range">
</app-stat-card>

<app-stat-card
  [title]="'DASHBOARD.AVERAGE_GLUCOSE' | translate"
  [value]="averageGlucose + ' mg/dL'"
  [icon]="'heart'"
  data-testid="stat-average-glucose">
</app-stat-card>

<!-- Quick Actions -->
<ion-button
  expand="block"
  (click)="addReading()"
  data-testid="quick-action-add-reading">
  <ion-icon slot="start" name="add-circle"></ion-icon>
  {{ 'DASHBOARD.ADD_READING' | translate }}
</ion-button>

<ion-button
  expand="block"
  (click)="syncNow()"
  data-testid="quick-action-sync">
  <ion-icon slot="start" name="sync"></ion-icon>
  {{ 'DASHBOARD.SYNC_NOW' | translate }}
</ion-button>

<!-- View All Readings -->
<ion-button
  fill="clear"
  (click)="viewAllReadings()"
  data-testid="view-all-readings-btn">
  {{ 'DASHBOARD.VIEW_ALL' | translate }}
</ion-button>
```

**Maestro Usage:**
```yaml
- assertVisible:
    id: "stat-time-in-range"
- assertVisible:
    id: "stat-average-glucose"
- tapOn:
    id: "quick-action-add-reading"
- tapOn:
    id: "view-all-readings-btn"
```

---

### **5. Readings Components** (`src/app/readings/readings.page.html`)

```html
<!-- Add Reading Button (FAB) -->
<ion-fab vertical="bottom" horizontal="end" slot="fixed">
  <ion-fab-button data-testid="fab-add-reading" (click)="addReading()">
    <ion-icon name="add"></ion-icon>
  </ion-fab-button>
</ion-fab>

<!-- Search Bar -->
<ion-searchbar
  [(ngModel)]="searchTerm"
  (ionChange)="filterReadings()"
  [placeholder]="'READINGS.SEARCH' | translate"
  data-testid="readings-search">
</ion-searchbar>

<!-- Reading List Items -->
<ion-item
  *ngFor="let reading of filteredReadings; let i = index"
  [attr.data-testid]="'reading-item-' + i"
  (click)="viewReading(reading)">
  <ion-label>
    <h2>{{ reading.value }} mg/dL</h2>
    <p>{{ reading.timestamp | date:'short' }}</p>
  </ion-label>
</ion-item>
```

**Maestro Usage:**
```yaml
- tapOn:
    id: "fab-add-reading"
- tapOn:
    id: "readings-search"
- inputText: "120"
- tapOn:
    id: "reading-item-0"  # First reading
```

---

### **6. Add Reading Form** (`src/app/add-reading/add-reading.page.html`)

```html
<form (ngSubmit)="saveReading()">
  <ion-item>
    <ion-label position="floating">{{ 'READINGS.GLUCOSE_VALUE' | translate }}</ion-label>
    <ion-input
      type="number"
      [(ngModel)]="reading.value"
      name="glucoseValue"
      data-testid="glucose-value-input"
      min="0"
      max="500"
      required>
    </ion-input>
  </ion-item>

  <ion-item>
    <ion-label>{{ 'READINGS.TIMESTAMP' | translate }}</ion-label>
    <ion-datetime
      [(ngModel)]="reading.timestamp"
      name="timestamp"
      data-testid="reading-timestamp-picker">
    </ion-datetime>
  </ion-item>

  <ion-item>
    <ion-label position="floating">{{ 'READINGS.NOTES' | translate }}</ion-label>
    <ion-textarea
      [(ngModel)]="reading.notes"
      name="notes"
      data-testid="reading-notes-input"
      rows="3">
    </ion-textarea>
  </ion-item>

  <ion-button
    expand="block"
    type="submit"
    data-testid="save-reading-btn">
    {{ 'READINGS.SAVE' | translate }}
  </ion-button>

  <ion-button
    expand="block"
    fill="clear"
    (click)="cancel()"
    data-testid="cancel-reading-btn">
    {{ 'COMMON.CANCEL' | translate }}
  </ion-button>
</form>
```

**Maestro Usage:**
```yaml
- tapOn:
    id: "glucose-value-input"
- eraseText
- inputText: "120"
- hideKeyboard

- tapOn:
    id: "reading-notes-input"
- inputText: "Before meal"
- hideKeyboard

- tapOn:
    id: "save-reading-btn"
```

---

### **7. Appointments Components** (`src/app/appointments/appointments.page.html`)

```html
<!-- Create Appointment Button -->
<ion-button
  expand="block"
  (click)="createAppointment()"
  data-testid="create-appointment-btn">
  <ion-icon slot="start" name="add"></ion-icon>
  {{ 'APPOINTMENTS.CREATE' | translate }}
</ion-button>

<!-- Appointment List Items -->
<ion-item
  *ngFor="let appointment of appointments; let i = index"
  [attr.data-testid]="'appointment-item-' + i"
  (click)="viewAppointment(appointment)">
  <ion-label>
    <h2>{{ appointment.doctor }}</h2>
    <p>{{ appointment.date | date:'short' }}</p>
    <p>{{ appointment.reason }}</p>
  </ion-label>
</ion-item>
```

**Appointment Form:**
```html
<form (ngSubmit)="saveAppointment()">
  <ion-item>
    <ion-label position="floating">{{ 'APPOINTMENTS.DOCTOR' | translate }}</ion-label>
    <ion-input
      [(ngModel)]="appointment.doctor"
      name="doctor"
      data-testid="appointment-doctor-input"
      required>
    </ion-input>
  </ion-item>

  <ion-item>
    <ion-label>{{ 'APPOINTMENTS.DATE' | translate }}</ion-label>
    <ion-datetime
      [(ngModel)]="appointment.date"
      name="date"
      data-testid="appointment-date-input"
      presentation="date">
    </ion-datetime>
  </ion-item>

  <ion-item>
    <ion-label>{{ 'APPOINTMENTS.TIME' | translate }}</ion-label>
    <ion-datetime
      [(ngModel)]="appointment.time"
      name="time"
      data-testid="appointment-time-input"
      presentation="time">
    </ion-datetime>
  </ion-item>

  <ion-item>
    <ion-label position="floating">{{ 'APPOINTMENTS.REASON' | translate }}</ion-label>
    <ion-textarea
      [(ngModel)]="appointment.reason"
      name="reason"
      data-testid="appointment-reason-input"
      rows="3">
    </ion-textarea>
  </ion-item>

  <ion-button
    expand="block"
    type="submit"
    data-testid="appointment-submit-btn">
    {{ 'APPOINTMENTS.SAVE' | translate }}
  </ion-button>
</form>
```

---

## 📋 Implementation Checklist

### **Phase 1: Critical Components (2-3 hours)**
- [ ] Add testid to tabs (tabs.page.html)
- [ ] Add testid to login form (login.page.html)
- [ ] Add testid to theme/language selectors (profile.page.html)
- [ ] Add testid to dashboard buttons (dashboard.page.html)
- [ ] Update existing tests to use new IDs

### **Phase 2: Readings & Appointments (2-3 hours)**
- [ ] Add testid to readings components
- [ ] Add testid to add-reading form
- [ ] Add testid to appointments components
- [ ] Add testid to appointment form
- [ ] Create new tests for readings calculations
- [ ] Create Heroku integration tests

### **Phase 3: Comprehensive Coverage (4-6 hours)**
- [ ] Add testid to all stat cards
- [ ] Add testid to all buttons and interactive elements
- [ ] Add testid to all form inputs
- [ ] Add testid to all list items (use index pattern)
- [ ] Add testid to all modals and dialogs
- [ ] Document all test IDs in central registry

---

## 🎯 Naming Conventions

### **Pattern: `{component}-{element}-{type}`**

**Examples:**
- `tab-dashboard` (tab button for dashboard)
- `username-input` (username input field)
- `login-submit-btn` (login submit button)
- `reading-item-0` (first reading in list, use index)
- `quick-action-sync` (quick action button for sync)
- `stat-average-glucose` (stat card for average glucose)
- `fab-add-reading` (floating action button to add reading)

### **Lists with Dynamic Items:**
Use index pattern:
```html
<ion-item
  *ngFor="let item of items; let i = index"
  [attr.data-testid]="'item-' + i">
```

### **Conditional Elements:**
Add testid even if element is conditionally rendered:
```html
<div *ngIf="showError" data-testid="error-message">
  {{ errorMessage }}
</div>
```

---

## ✅ Verification

After adding data-testid attributes, verify with:

**1. Inspect View Hierarchy:**
```bash
maestro test maestro/tests/smoke-test.yaml
# Check maestro output for resource-id matches
```

**2. Run Updated Tests:**
```bash
maestro test maestro/tests/03-theme-toggle.yaml
maestro test maestro/tests/04-language-switch.yaml
```

**3. Check for Missing IDs:**
```bash
# Search for components without testid
grep -r "ion-button" src/app --include="*.html" | grep -v "data-testid"
grep -r "ion-input" src/app --include="*.html" | grep -v "data-testid"
```

---

## 🚀 Next Steps

1. **Start with Phase 1** (tabs, login, settings)
2. **Test immediately** with existing Maestro tests
3. **Move to Phase 2** (readings, appointments)
4. **Create new tests** using the reliable selectors
5. **Complete Phase 3** for full coverage

**Estimated Total Time:** 8-12 hours for complete implementation
