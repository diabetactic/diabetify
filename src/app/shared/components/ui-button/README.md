# UI Button Component

Reusable button component built with **100% Tailwind CSS utilities**.

## Features

- ✅ Four variants: primary, secondary, danger, ghost
- ✅ Three sizes: sm, md, lg
- ✅ Loading state with animated spinner
- ✅ Icon support (leading/trailing)
- ✅ Full dark mode support (automatic with `.dark` class)
- ✅ Disabled state
- ✅ Full width option
- ✅ Accessibility (aria-busy, aria-disabled)

## Usage

```typescript
import { UiButtonComponent } from '@app/shared/components/ui-button/ui-button.component';

@Component({
  imports: [UiButtonComponent],
})
```

```html
<!-- Primary button -->
<app-ui-button variant="primary" (buttonClick)="handleClick()">
  Click Me
</app-ui-button>

<!-- Loading state -->
<app-ui-button [loading]="isLoading" variant="secondary">
  Save
</app-ui-button>

<!-- With icon -->
<app-ui-button variant="danger" icon="trash">
  Delete
</app-ui-button>
```

## API

See `/docs/UI_COMPONENTS_GUIDE.md` for complete API documentation.

## Design

- **AI-safe**: Uses only Tailwind utilities (no custom CSS)
- **No conflicts**: Atomic CSS prevents cascade issues
- **Dark mode**: Automatically responds to `.dark` class on `<html>`
- **Tested**: Comprehensive unit tests included
