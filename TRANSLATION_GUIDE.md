# Translation Guide - Diabetify

## Overview

The Diabetify app supports multiple languages with automatic device language detection. Currently supported languages:
- **English (en)** - Default language
- **Spanish (es)**

The translation system automatically detects and uses the device's language on first launch, with the ability for users to manually switch languages at any time.

## Architecture

### Core Components

1. **TranslationService** (`src/app/core/services/translation.service.ts`)
   - Manages language settings and switching
   - Auto-detects device language using Capacitor Device API
   - Persists user language preference
   - Provides formatting utilities for dates, numbers, and glucose values

2. **Translation Files** (`src/assets/i18n/`)
   - `en.json` - English translations
   - `es.json` - Spanish translations

3. **LanguageSwitcherComponent** (`src/app/shared/components/language-switcher/`)
   - Reusable component for language switching
   - Three display modes: button, select, popover
   - Visual feedback with flag emojis

## Features

### Automatic Device Language Detection

The app automatically detects and uses the device's language on:
- First app launch
- When no saved preference exists

```typescript
// Device language detection flow:
1. Check for saved preference
2. If none, detect device language via Capacitor
3. Map device language to supported language
4. Set and persist the language
```

### Language Persistence

User language preference is saved using Capacitor Preferences API:
- Survives app restarts
- Can be cleared to reset to device language
- Synced across app sessions

### Language-Specific Formatting

The translation service provides locale-aware formatting:

```typescript
// Date formatting
translationService.formatDate(date); // MM/DD/YYYY (EN) or DD/MM/YYYY (ES)

// Time formatting
translationService.formatTime(date); // 12h (EN) or 24h (ES)

// Number formatting
translationService.formatNumber(1234.56); // 1,234.56 (EN) or 1.234,56 (ES)

// Glucose formatting with unit conversion
translationService.formatGlucose(120, 'mg/dL'); // 120 mg/dL or 6.7 mmol/L
```

## Usage

### In Templates

Use the `translate` pipe for static text:

```html
<!-- Simple translation -->
<ion-title>{{ 'dashboard.title' | translate }}</ion-title>

<!-- With parameters -->
<p>{{ 'messages.welcome' | translate:{ name: userName } }}</p>
```

### In Components

Inject TranslationService for programmatic access:

```typescript
constructor(private translationService: TranslationService) {}

// Get instant translation
const title = this.translationService.instant('dashboard.title');

// Get translation observable
this.translationService.get('dashboard.title').subscribe(title => {
  console.log(title);
});

// Format values
const formatted = this.translationService.formatGlucose(120);
```

### Language Switcher Component

Add the language switcher to any page:

```html
<!-- Button mode (toggle between languages) -->
<app-language-switcher displayMode="button"></app-language-switcher>

<!-- Select dropdown -->
<app-language-switcher displayMode="select" [showNativeName]="true"></app-language-switcher>

<!-- Popover mode -->
<app-language-switcher displayMode="popover" [showIcon]="true" [showText]="true"></app-language-switcher>
```

Component options:
- `displayMode`: 'button' | 'select' | 'popover'
- `showIcon`: Display flag emoji
- `showText`: Display language name
- `showNativeName`: Use native language name (Español vs Spanish)

## Adding New Translations

### 1. Add Translation Keys

Add new keys to both language files:

`src/assets/i18n/en.json`:
```json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

`src/assets/i18n/es.json`:
```json
{
  "newFeature": {
    "title": "Nueva Función",
    "description": "Esta es una nueva función"
  }
}
```

### 2. Use in Component

```typescript
// In template
{{ 'newFeature.title' | translate }}

// In TypeScript
this.translationService.instant('newFeature.title')
```

## Adding a New Language

### 1. Create Translation File

Create `src/assets/i18n/[language-code].json`:

```json
{
  "app": {
    "name": "Diabetify",
    ...
  }
}
```

### 2. Update TranslationService

Add language configuration:

```typescript
// In translation.service.ts
private readonly LANGUAGES: Map<Language, LanguageConfig> = new Map([
  // ... existing languages
  [Language.FR, {
    code: Language.FR,
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: {
      decimal: ',',
      thousands: ' '
    },
    glucoseUnit: 'mmol/L'
  }]
]);
```

### 3. Update Language Enum

```typescript
export enum Language {
  EN = 'en',
  ES = 'es',
  FR = 'fr' // New language
}
```

### 4. Add Flag Emoji

Update getFlagEmoji method:

```typescript
getFlagEmoji(language: Language): string {
  switch (language) {
    case Language.EN: return '🇺🇸';
    case Language.ES: return '🇪🇸';
    case Language.FR: return '🇫🇷'; // New flag
    default: return '🌐';
  }
}
```

## Module Setup

For each lazy-loaded module that needs translations:

```typescript
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    // ... other imports
    TranslateModule, // Add this
  ]
})
export class YourModule {}
```

## Translation Keys Structure

The translation keys follow a hierarchical structure:

```
app.*           - Global app strings
auth.*          - Authentication related
dashboard.*     - Dashboard page
readings.*      - Glucose readings
glucose.*       - Glucose specific terms
devices.*       - Device management
appointments.*  - Appointments
profile.*       - User profile
settings.*      - Settings
sync.*          - Synchronization
export.*        - Data export
errors.*        - Error messages
messages.*      - User messages
time.*          - Time related strings
```

## Best Practices

1. **Use Semantic Keys**: Use descriptive, hierarchical keys
   - Good: `dashboard.syncStatus`
   - Bad: `sync_text_1`

2. **Provide Context**: Include context for translators
   - Add comments in translation files
   - Group related translations

3. **Handle Pluralization**: Use translation parameters
   ```json
   "items": "{{count}} items"
   ```

4. **Format in Service**: Use TranslationService for formatting
   - Don't hardcode date/number formats
   - Use provided formatting methods

5. **Test All Languages**: Always test UI with both languages
   - Check for text overflow
   - Verify date/number formats
   - Test RTL if applicable

## Troubleshooting

### Language Not Changing

1. Check if translation files are loaded
2. Verify TranslateModule is imported in module
3. Check browser console for errors
4. Clear app data and retry

### Missing Translations

If you see translation keys instead of text:
1. Verify key exists in translation file
2. Check for typos in key name
3. Ensure TranslateModule is imported
4. Check if translation file is valid JSON

### Device Language Not Detected

1. Check Capacitor Device plugin installation
2. Verify app permissions
3. Test on real device (not browser)
4. Check fallback to browser language

## Performance Considerations

- Translation files are loaded on demand
- Cached after first load
- Use `instant()` for synchronous translations when possible
- Minimize observable subscriptions

## Testing

### Unit Tests

```typescript
// Mock TranslationService
const mockTranslationService = {
  instant: jasmine.createSpy('instant').and.returnValue('Translated Text'),
  getCurrentConfig: jasmine.createSpy('getCurrentConfig').and.returnValue({
    glucoseUnit: 'mg/dL'
  })
};
```

### E2E Tests

```typescript
// Test language switching
await page.click('app-language-switcher');
await page.selectOption('ion-select', 'es');
expect(await page.textContent('ion-title')).toBe('Panel de Control');
```

## Future Enhancements

- [ ] Add more languages (French, Portuguese, German)
- [ ] Implement lazy loading for translation files
- [ ] Add translation management UI for admins
- [ ] Support for regional variants (es-MX, es-ES)
- [ ] Integrate with translation management service
- [ ] Add accessibility announcements for language changes