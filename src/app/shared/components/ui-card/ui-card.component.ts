import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostBinding,
  ContentChild,
  TemplateRef,
  AfterContentInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * UI Card Component - Reusable Card with Tailwind CSS
 *
 * Features:
 * - Three variants: default, elevated, outlined
 * - Header, body, and footer content slots
 * - Full dark mode support
 * - Optional click handler
 * - Loading state
 *
 * @example
 * ```html
 * <!-- Basic card -->
 * <app-ui-card>
 *   <div body>Card content here</div>
 * </app-ui-card>
 *
 * <!-- Card with header and footer -->
 * <app-ui-card variant="elevated">
 *   <h3 header>Card Title</h3>
 *   <p body>Card content with multiple paragraphs</p>
 *   <div footer>
 *     <button>Action</button>
 *   </div>
 * </app-ui-card>
 *
 * <!-- Clickable card -->
 * <app-ui-card [clickable]="true" (cardClick)="handleClick()">
 *   <div body>Click anywhere on this card</div>
 * </app-ui-card>
 *
 * <!-- Outlined card -->
 * <app-ui-card variant="outlined">
 *   <div body>Outlined style</div>
 * </app-ui-card>
 * ```
 */
@Component({
  selector: 'app-ui-card',
  templateUrl: './ui-card.component.html',
  styleUrls: ['./ui-card.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class UiCardComponent implements AfterContentInit {
  /** Card variant */
  @Input() variant: 'default' | 'elevated' | 'outlined' = 'default';

  /** Loading state */
  @Input() loading: boolean = false;

  /** Clickable state (adds hover effects and cursor pointer) */
  @Input() clickable: boolean = false;

  /** Custom padding (overrides default) */
  @Input() padding?: 'none' | 'sm' | 'md' | 'lg';

  /** Click event emitter (only emits when clickable is true) */
  @Output() cardClick = new EventEmitter<void>();

  @ContentChild('header', { read: TemplateRef }) headerTemplate?: TemplateRef<any>;
  @ContentChild('footer', { read: TemplateRef }) footerTemplate?: TemplateRef<any>;

  hasHeaderContent = false;
  hasFooterContent = false;

  @HostBinding('class') get hostClasses(): string {
    return 'ui-card-host block';
  }

  ngAfterContentInit(): void {
    // Detect if header/footer content is present
    // This is a simple detection based on template refs
    this.hasHeaderContent = !!this.headerTemplate;
    this.hasFooterContent = !!this.footerTemplate;
  }

  /**
   * Get base card classes (shared across all variants)
   */
  get baseClasses(): string {
    return 'rounded-2xl transition-all duration-200 bg-white dark:bg-gray-800';
  }

  /**
   * Get variant-specific classes
   */
  get variantClasses(): string {
    const variants = {
      default: 'shadow-md',
      elevated: 'shadow-lg hover:shadow-xl',
      outlined: 'border-2 border-gray-200 dark:border-gray-700 shadow-sm',
    };
    return variants[this.variant];
  }

  /**
   * Get padding classes
   */
  get paddingClasses(): string {
    if (this.padding === 'none') return '';

    const paddings = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return paddings[this.padding || 'md'];
  }

  /**
   * Get clickable classes
   */
  get clickableClasses(): string {
    if (!this.clickable) return '';
    return 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]';
  }

  /**
   * Get loading classes
   */
  get loadingClasses(): string {
    if (!this.loading) return '';
    return 'opacity-60 pointer-events-none';
  }

  /**
   * Get all card classes
   */
  get cardClasses(): string {
    return [this.baseClasses, this.variantClasses, this.clickableClasses, this.loadingClasses].join(
      ' '
    );
  }

  /**
   * Get header classes
   */
  get headerClasses(): string {
    const padding = this.padding || 'md';
    const paddings = {
      none: '',
      sm: 'px-3 pt-3 pb-2',
      md: 'px-4 pt-4 pb-3',
      lg: 'px-6 pt-6 pb-4',
    };
    return `${paddings[padding]} border-b border-gray-200 dark:border-gray-700`;
  }

  /**
   * Get body classes
   */
  get bodyClasses(): string {
    return this.paddingClasses;
  }

  /**
   * Get footer classes
   */
  get footerClasses(): string {
    const padding = this.padding || 'md';
    const paddings = {
      none: '',
      sm: 'px-3 pb-3 pt-2',
      md: 'px-4 pb-4 pt-3',
      lg: 'px-6 pb-6 pt-4',
    };
    return `${paddings[padding]} border-t border-gray-200 dark:border-gray-700`;
  }

  /**
   * Handle card click
   */
  onClick(): void {
    if (this.clickable && !this.loading) {
      this.cardClick.emit();
    }
  }
}
