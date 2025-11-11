# UI Badge Component

Reusable badge component built with **100% Tailwind CSS utilities**.

## Features

- ✅ Five color variants: success, warning, danger, info, neutral
- ✅ Three sizes: sm, md, lg
- ✅ Three visual styles: solid, outlined, subtle
- ✅ Icon support
- ✅ Dismissible option
- ✅ Rounded (pill) option
- ✅ Full dark mode support (automatic with `.dark` class)
- ✅ Accessibility (role=status, aria-label)

## Usage

```typescript
import { UiBadgeComponent } from '@app/shared/components/ui-badge/ui-badge.component';

@Component({
  imports: [UiBadgeComponent],
})
```

```html
<!-- Success badge -->
<app-ui-badge variant="success">
  Active
</app-ui-badge>

<!-- Warning badge with icon -->
<app-ui-badge variant="warning" icon="warning" size="lg">
  Pending Review
</app-ui-badge>

<!-- Outlined style -->
<app-ui-badge variant="info" badgeStyle="outlined">
  New Feature
</app-ui-badge>

<!-- Dismissible badge -->
<app-ui-badge variant="info" [dismissible]="true">
  Notification
</app-ui-badge>
```

## API

See `/docs/UI_COMPONENTS_GUIDE.md` for complete API documentation.

## Design

- **AI-safe**: Uses only Tailwind utilities (no custom CSS)
- **No conflicts**: Atomic CSS prevents cascade issues
- **Dark mode**: Automatically responds to `.dark` class on `<html>`
- **Tested**: Comprehensive unit tests included
