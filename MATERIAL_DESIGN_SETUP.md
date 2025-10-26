# Material Design Setup for Diabetify

This document describes the Material Design configuration for the Diabetify application.

## Overview

Diabetify uses Angular Material with a custom child-friendly color palette and enhanced typography for better readability. The app supports both light and dark themes with smooth transitions.

## Installed Packages

- `@angular/material@^18.2.14` - Angular Material components
- `@angular/cdk@^18.2.14` - Component Dev Kit for advanced functionality
- `@angular/animations` - Required for Material animations

## Color Palette

The application uses Material Design 3 with a custom child-friendly color palette:

### Primary Color: Teal (#00ACC1)

- Calming and trustworthy
- Used for primary actions and branding
- Accessible with white text (WCAG AA compliant)

### Secondary/Accent Color: Orange (#FFA726)

- Warm and encouraging
- Used for secondary actions and highlights
- Accessible with black text (WCAG AA compliant)

### Success Color: Green (#4CAF50)

- Encouraging and positive
- Used for success messages and positive feedback
- Accessible with white text

### Error/Warning Color: Red (#F44336)

- Clear but not scary
- Used for error states and warnings
- Accessible with white text

## Typography

The application uses the **Roboto** font family with enhanced sizes for better readability:

- **Headlines**: Increased by 2px for better visibility
- **Body Text**: 18px (increased from 16px)
- **Buttons**: 16px (increased from 14px)
- **Captions**: 14px (increased from 12px)

All typography follows Material Design guidelines with proper line height and letter spacing.

## Theme Service

The `ThemeService` (`src/app/core/services/theme.service.ts`) provides centralized theme management:

### Features

- **Automatic system theme detection**: Respects user's OS color scheme preference
- **Theme persistence**: Saves user preference to localStorage
- **Observable pattern**: Components can subscribe to theme changes
- **Dynamic theme switching**: Toggle between light and dark themes

### Usage Example

```typescript
import { ThemeService } from './core/services/theme.service';

export class MyComponent {
  constructor(private themeService: ThemeService) {
    // Subscribe to theme changes
    this.themeService.isDarkTheme$.subscribe(isDark => {
      console.log('Current theme:', isDark ? 'dark' : 'light');
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  setLightTheme() {
    this.themeService.setTheme(false);
  }

  setDarkTheme() {
    this.themeService.setTheme(true);
  }
}
```

## Ionic Integration

The application is configured to use Material Design mode for Ionic components:

```typescript
IonicModule.forRoot({
  mode: 'md', // Material Design mode
});
```

This ensures consistent Material Design styling across both Angular Material and Ionic components.

## File Structure

```
src/
├── theme/
│   └── material-theme.scss     # Material Design theme configuration
├── app/
│   └── core/
│       └── services/
│           ├── theme.service.ts
│           └── theme.service.spec.ts
├── global.scss                 # Global styles with Material theme import
└── index.html                  # Roboto font and Material Icons CDN links
```

## Custom CSS Variables

The theme defines custom CSS variables for easy access throughout the application:

```css
/* Colors */
--diabetify-primary: #00acc1 --diabetify-secondary: #ffa726 --diabetify-success: #4caf50
  --diabetify-error: #f44336 /* Border Radius */ --diabetify-border-radius: 12px
  --diabetify-border-radius-sm: 8px --diabetify-border-radius-lg: 16px /* Shadows */
  --diabetify-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1) --diabetify-shadow-md: 0 4px 8px
  rgba(0, 0, 0, 0.12) --diabetify-shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);
```

## Accessibility Features

The theme includes several accessibility enhancements:

1. **WCAG AA Compliant Colors**: All color combinations meet WCAG AA standards
2. **Large Touch Targets**: Minimum 44x44px for all interactive elements
3. **High Contrast Focus Indicators**: 3px outline with 2px offset
4. **Enhanced Typography**: Larger font sizes for better readability
5. **Semantic HTML**: Proper use of ARIA attributes (when using Material components)

## Material Components

To use Angular Material components in your modules, import them as needed:

```typescript
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@NgModule({
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    // ... other modules
  ],
})
export class MyModule {}
```

## Testing

All Material Design components and the theme service are fully tested:

```bash
npm test
```

The theme service tests verify:

- Theme initialization
- Light/dark theme switching
- Theme persistence
- System preference detection
- Observable theme changes

## Build Configuration

The Material theme is automatically included in the build process through `global.scss`:

```bash
npm run build      # Production build
npm start          # Development server
```

## Browser Support

The Material Design implementation supports:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements for the Material Design setup:

1. **Custom Material Components**: Create reusable child-friendly components
2. **Animation Presets**: Define standard animations for glucose readings
3. **Theme Variants**: Add high-contrast mode for better accessibility
4. **Component Library**: Build a Storybook for Material components
5. **Progressive Enhancement**: Add advanced features for modern browsers

## Resources

- [Angular Material Documentation](https://material.angular.io/)
- [Material Design Guidelines](https://m3.material.io/)
- [WCAG 2.1 Accessibility Standards](https://www.w3.org/WAI/WCAG21/quickref/)
- [Ionic Material Design Mode](https://ionicframework.com/docs/theming/platform-styles#material-design)
