# UI Card Component

Reusable card component built with **100% Tailwind CSS utilities**.

## Features

- ✅ Three variants: default, elevated, outlined
- ✅ Content projection slots (header, body, footer)
- ✅ Loading overlay with spinner
- ✅ Clickable with hover/scale effects
- ✅ Custom padding options
- ✅ Full dark mode support (automatic with `.dark` class)
- ✅ Accessibility (role=button, tabindex, aria-busy)

## Usage

```typescript
import { UiCardComponent } from '@app/shared/components/ui-card/ui-card.component';

@Component({
  imports: [UiCardComponent],
})
```

```html
<!-- Basic card -->
<app-ui-card>
  <div body>Card content here</div>
</app-ui-card>

<!-- Card with header and footer -->
<app-ui-card variant="elevated">
  <h3 header>Card Title</h3>
  <p body>Card content</p>
  <div footer>
    <button>Action</button>
  </div>
</app-ui-card>

<!-- Clickable card -->
<app-ui-card [clickable]="true" (cardClick)="handleClick()">
  <div body>Click anywhere on this card</div>
</app-ui-card>
```

## API

See `/docs/UI_COMPONENTS_GUIDE.md` for complete API documentation.

## Design

- **AI-safe**: Uses only Tailwind utilities (no custom CSS)
- **No conflicts**: Atomic CSS prevents cascade issues
- **Dark mode**: Automatically responds to `.dark` class on `<html>`
- **Tested**: Comprehensive unit tests included
