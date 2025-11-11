import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * UI Button Component - Reusable Button with Tailwind CSS
 *
 * Features:
 * - Four variants: primary, secondary, danger, ghost
 * - Three sizes: sm, md, lg
 * - Full dark mode support
 * - Loading and disabled states
 * - Icon support (leading/trailing)
 *
 * @example
 * ```html
 * <!-- Primary button -->
 * <app-ui-button variant="primary" size="md" (click)="handleClick()">
 *   Click Me
 * </app-ui-button>
 *
 * <!-- Loading state -->
 * <app-ui-button [loading]="isLoading" variant="secondary">
 *   Save
 * </app-ui-button>
 *
 * <!-- With icon -->
 * <app-ui-button variant="danger" icon="trash">
 *   Delete
 * </app-ui-button>
 * ```
 */
@Component({
  selector: 'app-ui-button',
  templateUrl: './ui-button.component.html',
  styleUrls: ['./ui-button.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class UiButtonComponent {
  /** Button variant */
  @Input() variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary';

  /** Button size */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /** Disabled state */
  @Input() disabled: boolean = false;

  /** Loading state (shows spinner, disables button) */
  @Input() loading: boolean = false;

  /** Icon name (Ionicons) - leading position */
  @Input() icon?: string;

  /** Icon name (Ionicons) - trailing position */
  @Input() iconTrailing?: string;

  /** Full width button */
  @Input() fullWidth: boolean = false;

  /** Button type attribute */
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  /** Click event emitter */
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  @HostBinding('class') get hostClasses(): string {
    const classes = ['ui-button-host'];
    if (this.fullWidth) {
      classes.push('block');
    } else {
      classes.push('inline-block');
    }
    return classes.join(' ');
  }

  /**
   * Get base button classes (shared across all variants)
   */
  get baseClasses(): string {
    return 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  }

  /**
   * Get variant-specific classes
   */
  get variantClasses(): string {
    const variants = {
      primary:
        'bg-primary hover:bg-primary-600 active:bg-primary-700 text-white focus:ring-primary-500 dark:focus:ring-primary-400',
      secondary:
        'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 focus:ring-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-white dark:focus:ring-gray-400',
      danger:
        'bg-danger hover:bg-red-600 active:bg-red-700 text-white focus:ring-danger dark:focus:ring-red-400',
      ghost:
        'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 focus:ring-gray-500 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:text-gray-300 dark:focus:ring-gray-400',
    };
    return variants[this.variant];
  }

  /**
   * Get size-specific classes
   */
  get sizeClasses(): string {
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
    };
    return sizes[this.size];
  }

  /**
   * Get full width class
   */
  get widthClass(): string {
    return this.fullWidth ? 'w-full' : '';
  }

  /**
   * Get all button classes
   */
  get buttonClasses(): string {
    return [this.baseClasses, this.variantClasses, this.sizeClasses, this.widthClass].join(' ');
  }

  /**
   * Check if button should be disabled
   */
  get isDisabled(): boolean {
    return this.disabled || this.loading;
  }

  /**
   * Handle button click
   */
  onClick(event: MouseEvent): void {
    if (!this.isDisabled) {
      this.buttonClick.emit(event);
    }
  }
}
