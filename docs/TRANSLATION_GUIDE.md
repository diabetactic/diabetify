# Translation Guide - Diabetactic

Multi-language support implementation and workflow for the Diabetactic application.

## Overview

Diabetactic supports multiple languages with automatic device language detection:
- **English (en)** - Default language
- **Spanish (es)** - Full translation

The app automatically detects and uses the device's language on first launch, with manual switching available.

## Architecture

### Translation Service

**Location**: `src/app/core/services/translation.service.ts`

**Features**:
- Auto-detect device language (Capacitor Device API)
- Persist user language preference
- Date/number/glucose value formatting
- Real-time language switching

### Translation Files

**Location**: `src/assets/i18n/`

```
i18n/
├── en.json    # English translations
└── es.json    # Spanish translations
```

### Language Switcher Component

**Location**: `src/app/shared/components/language-switcher/`

**Display Modes**:
- Button mode
- Select dropdown
- Popover menu

**Features**:
- Flag emoji indicators
- Instant language switching
- Persisted preference

## Adding Translations

### 1. Add Translation Keys

**English** (`assets/i18n/en.json`):
```json
{
  "COMMON": {
    "SAVE": "Save",
    "CANCEL": "Cancel",
    "EDIT": "Edit"
  },
  "DASHBOARD": {
    "TITLE": "Dashboard",
    "WELCOME": "Welcome, {{name}}"
  }
}
```

**Spanish** (`assets/i18n/es.json`):
```json
{
  "COMMON": {
    "SAVE": "Guardar",
    "CANCEL": "Cancelar",
    "EDIT": "Editar"
  },
  "DASHBOARD": {
    "TITLE": "Panel",
    "WELCOME": "Bienvenido, {{name}}"
  }
}
```

### 2. Use in Templates

```html
<!-- Simple translation -->
<h1>{{ 'DASHBOARD.TITLE' | translate }}</h1>

<!-- With parameters -->
<p>{{ 'DASHBOARD.WELCOME' | translate: {name: userName} }}</p>

<!-- In attributes -->
<button [attr.aria-label]="'COMMON.SAVE' | translate">
  {{ 'COMMON.SAVE' | translate }}
</button>
```

### 3. Use in TypeScript

```typescript
import { TranslateService } from '@ngx-translate/core';

constructor(private translate: TranslateService) {}

// Get translation
const title = this.translate.instant('DASHBOARD.TITLE');

// Get translation with params
const welcome = this.translate.instant('DASHBOARD.WELCOME', {
  name: 'John'
});

// Subscribe to language changes
this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
  console.log('Language changed to:', event.lang);
});
```

## Translation Workflow

### 1. Identify Text

Find all user-facing text that needs translation:
- UI labels and buttons
- Error messages
- Success messages
- Form placeholders
- Navigation items

### 2. Create Keys

Follow naming convention:
```
SECTION.SUBSECTION.KEY
```

Examples:
- `AUTH.LOGIN.TITLE`
- `ERRORS.NETWORK.MESSAGE`
- `VALIDATION.REQUIRED.FIELD`

### 3. Add to Both Files

Always add to **both** `en.json` and `es.json` simultaneously to maintain parity.

### 4. Check for Missing Translations

```bash
npm run i18n:missing
```

This script checks for:
- Keys in templates not in JSON files
- Mismatches between en.json and es.json

## Formatting Utilities

### Dates

```typescript
// TranslationService method
formatDate(date: Date): string {
  const locale = this.currentLang === 'es' ? 'es-ES' : 'en-US';
  return date.toLocaleDateString(locale);
}
```

### Numbers

```typescript
formatNumber(value: number): string {
  const locale = this.currentLang === 'es' ? 'es-ES' : 'en-US';
  return value.toLocaleString(locale);
}
```

### Glucose Values

```typescript
formatGlucose(value: number, unit: string): string {
  const formatted = this.formatNumber(value);
  return `${formatted} ${unit}`;
}
```

## Language Detection

### Initial Detection

```typescript
// TranslationService.initializeLanguage()
async initializeLanguage(): Promise<void> {
  // Try to get saved preference
  let savedLang = await this.preferences.get({ key: 'language' });

  if (!savedLang.value) {
    // Detect device language
    const info = await Device.getLanguageCode();
    const deviceLang = info.value.split('-')[0]; // 'en', 'es'

    savedLang.value = this.supportedLanguages.includes(deviceLang)
      ? deviceLang
      : this.defaultLanguage;
  }

  this.useLanguage(savedLang.value);
}
```

## Testing Translations

### Unit Tests

```typescript
it('should translate text correctly', () => {
  const translated = translateService.instant('COMMON.SAVE');
  expect(translated).toBe('Save');
});

it('should handle parameters', () => {
  const translated = translateService.instant(
    'DASHBOARD.WELCOME',
    { name: 'John' }
  );
  expect(translated).toBe('Welcome, John');
});
```

### E2E Tests

```typescript
test('should display in Spanish', async ({ page }) => {
  // Switch to Spanish
  await page.selectOption('select[name="language"]', 'es');

  // Verify translation
  await expect(page.locator('h1')).toContainText('Panel');
});
```

## Best Practices

### 1. Never Hardcode Text
❌ Bad:
```html
<button>Save</button>
```

✅ Good:
```html
<button>{{ 'COMMON.SAVE' | translate }}</button>
```

### 2. Use Meaningful Keys
❌ Bad:
```json
"TEXT1": "Save",
"TEXT2": "Cancel"
```

✅ Good:
```json
"COMMON": {
  "SAVE": "Save",
  "CANCEL": "Cancel"
}
```

### 3. Group Related Keys
```json
{
  "AUTH": {
    "LOGIN": { ... },
    "REGISTER": { ... },
    "FORGOT_PASSWORD": { ... }
  },
  "DASHBOARD": { ... },
  "PROFILE": { ... }
}
```

### 4. Handle Pluralization
```json
{
  "ITEMS": {
    "ZERO": "No items",
    "ONE": "1 item",
    "OTHER": "{{count}} items"
  }
}
```

### 5. Keep Translations Synchronized
Always update both language files together to avoid missing translations.

## Common Issues

### Missing Translation Key
Shows the key instead of text: `COMMON.SAVE`

**Solution**: Add the key to both en.json and es.json

### Translation Not Updating
Changes to JSON files not reflected in app.

**Solution**:
1. Restart dev server
2. Clear browser cache
3. Check file is saved

### Special Characters
Characters not displaying correctly.

**Solution**: Ensure JSON files are UTF-8 encoded

## Adding a New Language

### 1. Create Translation File
```bash
touch src/assets/i18n/fr.json  # French
```

### 2. Copy Base Translations
```bash
cp src/assets/i18n/en.json src/assets/i18n/fr.json
```

### 3. Update TranslationService
```typescript
private readonly supportedLanguages = ['en', 'es', 'fr'];
```

### 4. Translate Content
Edit `fr.json` with French translations

### 5. Test
```bash
npm run i18n:missing
npm test
```

## Resources

- [@ngx-translate Documentation](https://github.com/ngx-translate/core)
- [Angular i18n Guide](https://angular.dev/guide/i18n)
- [Ionic Localization](https://ionicframework.com/docs/angular/your-first-app/localization)

## Translation Status

Run this command to check translation coverage:
```bash
npm run i18n:missing
```

Current status:
- English: 100% (base language)
- Spanish: 100%

## Continuous Improvement

- Review translations with native speakers
- Update based on user feedback
- Add context comments for ambiguous terms
- Test with actual device language settings
