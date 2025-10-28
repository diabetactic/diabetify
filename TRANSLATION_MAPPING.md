# Translation Key Mapping Document

This document maps all hardcoded strings in the application to their translation keys, making it easy to see where translations should be edited.

## Translation Files Location
- **English**: `src/assets/i18n/en.json`
- **Spanish**: `src/assets/i18n/es.json`

## Quick Edit Guide
1. To edit a translation, open the appropriate JSON file above
2. Find the key listed in this document
3. Update the translation value
4. Changes will be reflected immediately in development mode

---

## CRITICAL FIXES NEEDED

### Mixed Language Content (Spanish hardcoded in English app)

#### tabs.page.html
**File**: `src/app/tabs/tabs.page.html`
- Line 3: "Inicio" → `tabs.home`
- Line 7: "Lecturas" → `tabs.readings`
- Line 11: "Dispositivos" → `tabs.devices`
- Line 15: "Perfil" → `tabs.profile`

#### trends.page.html
**File**: `src/app/trends/trends.page.html`
- Line 3: "Tendencias" → `trends.title`
- Line 11: "Análisis de Tendencias" → `trends.analysisTitle`
- Line 12: "Próximamente" → `trends.comingSoon`
- Line 14: "Función en desarrollo" → `trends.inDevelopment`
- Line 15: "Ver estadísticas en" → `trends.seeStatsIn`
- Line 16: "Lecturas" → `tabs.readings`

#### devices.html
**File**: `src/app/devices/devices.html`
- Line 3: "Dispositivos" → `devices.title`
- Line 11: "Gestión de Dispositivos" → `devices.management`
- Line 12: "Próximamente" → `common.comingSoon`
- Line 14: "Función en desarrollo" → `common.inDevelopment`

---

## Dashboard Page

### dashboard.html
**File**: `src/app/dashboard/dashboard.html`
**Already uses translations**: ✅ (Most strings already translated)

**Hardcoded strings to fix**:
- Line 101: "Reason" → `appointments.reason`
- Line 115: "Share Last 30 Days of Readings" → `appointments.shareReadings`
- Line 123: "View Details" → `common.viewDetails`
- Line 179: "Recent Readings" → `dashboard.recentReadings`
- Line 181: "View All" → `common.viewAll`
- Line 189-191: Empty state strings → Already uses translations ✅

---

## Readings Page

### readings.html
**File**: `src/app/readings/readings.html`

**Title & Header**:
- Line 3: "Glucose Readings" → `readings.title`
- Line 8: "Export" → `export.title`

**Filter Section** (Lines 12-51):
- Line 13: "Filter Options" → `readings.filterOptions`
- Line 17: "Time Range" → `readings.timeRange`
- Line 19-25: Time options → `readings.filter.*` (today, week, month, months3, months6, year, all)
- Line 32: "Type" → `readings.type`
- Line 34-37: Type options → `glucose.type.*` (all, manual, cgm, meter)
- Line 44: "Sort By" → `readings.sortBy`
- Line 46-48: Sort options → `readings.sort.*` (newest, oldest, highFirst, lowFirst)

**Statistics Section** (Lines 55-125):
- Line 57: "Statistics" → `readings.statistics.title`
- Line 60-67: Stat labels → Already defined in `readings.statistics.*`
- Lines 72-125: Similar stats → Already defined

**Empty State** (Lines 133-139):
- Line 135: "No glucose readings yet" → `readings.emptyTitle`
- Line 136: "Start tracking your glucose levels" → `readings.emptyMessage`
- Line 137: "Add First Reading" → `readings.addFirst`

**Loading State** (Lines 143-146):
- Line 145: "Loading readings..." → `readings.loading`

---

## Add Reading Page

### add-reading.page.html
**File**: `src/app/add-reading/add-reading.page.html`

**Title & Header**:
- Line 3: "Add Reading" → `addReading.title`
- Line 6: "Cancel" → `common.cancel`

**Form Fields** (Lines 14-120):
- Line 18: "Glucose Value" → `addReading.glucoseValue`
- Line 29: "High", "Normal", "Low" badges → `glucose.status.*`
- Line 40: "Reading Type" → `addReading.readingType`
- Line 42-44: Type options → `glucose.type.*`
- Line 52: "Date & Time" → `addReading.dateTime`
- Line 65: "Notes (Optional)" → `addReading.notes`
- Line 75: "Meal Context" → `addReading.mealContext`
- Line 77-81: Meal options → `glucose.meal.*`
- Line 89: "Tags" → `addReading.tags`
- Line 91-99: Tag options → `glucose.tags.*`
- Line 106: "Device" → `addReading.device`
- Line 108-111: Device options → `addReading.devices.*`

**Buttons**:
- Line 117: "Save Reading" → `addReading.save`

---

## Profile Page

### profile.html
**File**: `src/app/profile/profile.html`

**Title & Header**:
- Line 3: "Profile" → `profile.title`
- Line 7: Settings icon → No text needed ✅

**User Info Section** (Lines 14-50):
- Line 28-29: User name & email → Dynamic data ✅
- Line 31: "Tidepool Account" → `profile.tidepoolAccount`
- Line 39: "Manage Account" → `profile.manageAccount`
- Line 43: "Sign Out" → `auth.signOut`

**Settings Section** (Lines 53-118):
- Line 56: "Settings" → `settings.title`
- Line 61: "Units" → `settings.units`
- Line 62: "Glucose Units" → `settings.glucoseUnits`
- Line 71: "Target Range" → `settings.targetRange`
- Line 72: Range values → Dynamic ✅
- Line 79: "Data & Privacy" → `settings.dataPrivacy`
- Line 80: "Export your glucose data" → `settings.exportDescription`
- Line 87: "Export Data" → `export.exportData`
- Line 94: "About" → `settings.about`
- Line 95: "App information and support" → `settings.aboutDescription`
- Line 102: "View Details" → `common.viewDetails`
- Line 109: "App Version" → `settings.appVersion`

---

## Appointments Page

### appointments.html
**File**: `src/app/appointments/appointments.html`

This file doesn't exist in the current codebase. The appointment functionality is integrated into the dashboard.

---

## Translation Keys to Add

Based on the audit above, here are the new translation keys that need to be added to both `en.json` and `es.json`:

```json
// Common keys
"common": {
  "comingSoon": "Coming Soon", // "Próximamente"
  "inDevelopment": "Feature in development", // "Función en desarrollo"
  "viewDetails": "View Details", // "Ver Detalles"
  "viewAll": "View All", // "Ver Todo"
  "cancel": "Cancel" // "Cancelar"
}

// Tabs
"tabs": {
  "home": "Home", // "Inicio"
  "readings": "Readings", // "Lecturas"
  "devices": "Devices", // "Dispositivos"
  "profile": "Profile" // "Perfil"
}

// Appointments
"appointments": {
  "reason": "Reason", // "Razón"
  "shareReadings": "Share Last 30 Days of Readings" // "Compartir Últimos 30 Días de Lecturas"
}

// Dashboard additions
"dashboard": {
  "recentReadings": "Recent Readings" // "Lecturas Recientes"
}

// Trends page
"trends": {
  "title": "Trends", // "Tendencias"
  "analysisTitle": "Trend Analysis", // "Análisis de Tendencias"
  "comingSoon": "Coming Soon", // "Próximamente"
  "inDevelopment": "Feature in development", // "Función en desarrollo"
  "seeStatsIn": "See statistics in" // "Ver estadísticas en"
}

// Devices page
"devices": {
  "title": "Devices", // "Dispositivos"
  "management": "Device Management" // "Gestión de Dispositivos"
}

// Readings page additions
"readings": {
  "filterOptions": "Filter Options", // "Opciones de Filtro"
  "timeRange": "Time Range", // "Rango de Tiempo"
  "type": "Type", // "Tipo"
  "sortBy": "Sort By", // "Ordenar Por"
  "loading": "Loading readings..." // "Cargando lecturas..."
}

// Add Reading page
"addReading": {
  "title": "Add Reading", // "Agregar Lectura"
  "glucoseValue": "Glucose Value", // "Valor de Glucosa"
  "readingType": "Reading Type", // "Tipo de Lectura"
  "dateTime": "Date & Time", // "Fecha y Hora"
  "notes": "Notes (Optional)", // "Notas (Opcional)"
  "mealContext": "Meal Context", // "Contexto de Comida"
  "tags": "Tags", // "Etiquetas"
  "device": "Device", // "Dispositivo"
  "save": "Save Reading", // "Guardar Lectura"
  "devices": {
    "manual": "Manual Entry", // "Entrada Manual"
    "meter": "Glucose Meter", // "Glucómetro"
    "cgm": "CGM", // "MCG"
    "pump": "Insulin Pump" // "Bomba de Insulina"
  }
}
```

## Implementation Priority

1. **HIGH PRIORITY - Fix Mixed Language Issues**:
   - tabs.page.html (Navigation labels)
   - trends.page.html (Spanish in English app)
   - devices.html (Spanish in English app)

2. **MEDIUM PRIORITY - User-Facing Pages**:
   - readings.html (Main data view)
   - add-reading.page.html (Data entry)
   - profile.html (User settings)

3. **LOW PRIORITY - Already Mostly Translated**:
   - dashboard.html (Only minor fixes needed)

## How to Update

1. Add missing keys to `src/assets/i18n/en.json` and `src/assets/i18n/es.json`
2. Replace hardcoded strings in HTML files with: `{{ 'key.path' | translate }}`
3. For TypeScript files, use: `this.translationService.instant('key.path')`
4. Test both languages using the language switcher component

## Testing Checklist

- [ ] All navigation tabs show correct language
- [ ] No Spanish text appears when English is selected
- [ ] No English text appears when Spanish is selected
- [ ] Language persists after app restart
- [ ] All forms and inputs are translated
- [ ] Error messages appear in correct language
- [ ] Date/time formats match selected locale